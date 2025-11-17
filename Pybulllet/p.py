"""
Refined RT-2 PyBullet simulation driver.

Provides a reusable RT2Simulation class that can be plugged into backend services
while still supporting an interactive CLI for quick testing.
"""

from __future__ import annotations

import argparse
import io
import logging
import re
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pybullet as p
import pybullet_data
import torch
from PIL import Image

try:
    from sentence_transformers import SentenceTransformer, util
except ImportError as exc:  # pragma: no cover - keeps helpful error
    raise ImportError(
        "sentence-transformers is required. Install it with 'pip install sentence-transformers'."
    ) from exc


SIM_WIDTH = 320
SIM_HEIGHT = 240
MODEL_NAME = "all-MiniLM-L6-v2"
EE_LINK_INDEX = 6
TIME_STEP = 1.0 / 240.0


@dataclass
class ObjectInfo:
    uid: int
    name: str
    color: Tuple[float, float, float, float]
    home_position: Tuple[float, float, float]


@dataclass
class MatcherDecision:
    pick_uid: Optional[int]
    place_uid: Optional[int]
    debug: Dict[str, Any]


@dataclass
class CommandResult:
    command: str
    pick_uid: Optional[int]
    place_uid: Optional[int]
    drop_position: Optional[Tuple[float, float, float]]
    debug: Dict[str, Any]
    frame_png: Optional[bytes] = None


@dataclass
class CameraConfig:
    target: Tuple[float, float, float] = (0.6, 0.0, 0.05)
    distance: float = 0.9
    yaw: float = 90.0
    pitch: float = -20.0
    roll: float = 0.0
    up_axis_index: int = 2
    fov: float = 60.0
    near: float = 0.01
    far: float = 3.1


def mask_for_uid(seg: np.ndarray, uid: int) -> np.ndarray:
    return (seg == uid) | ((seg % 1000) == uid)


def seg_to_object_crops(img: np.ndarray, seg: np.ndarray, uids: List[int]) -> Dict[int, np.ndarray]:
    crops: Dict[int, np.ndarray] = {}
    if img.size == 0:
        return crops
    h, w, _ = img.shape
    for uid in uids:
        mask = mask_for_uid(seg, uid)
        if not mask.any():
            continue
        ys, xs = np.where(mask)
        y0 = max(0, int(ys.min()) - 2)
        y1 = min(h - 1, int(ys.max()) + 2)
        x0 = max(0, int(xs.min()) - 2)
        x1 = min(w - 1, int(xs.max()) + 2)
        if y1 < y0 or x1 < x0:
            continue
        crop = img[y0 : y1 + 1, x0 : x1 + 1, :]
        if crop.size == 0:
            continue
        crops[uid] = crop
    return crops


class SemanticMatcher:
    def __init__(self, model_name: str = MODEL_NAME):
        logging.info("Loading sentence-transformer model '%s'...", model_name)
        self.model = SentenceTransformer(model_name)

    def decide(
        self,
        command: str,
        objects: Dict[int, ObjectInfo],
        img: np.ndarray,
        seg: np.ndarray,
    ) -> MatcherDecision:
        if not objects:
            return MatcherDecision(None, None, {"error": "no visible objects"})

        normalized = command.strip()
        if not normalized:
            return MatcherDecision(None, None, {"error": "empty command"})

        txt = normalized.lower()
        debug: Dict[str, Any] = {}
        pick_match = re.search(r"(?:pick|grab|take|lift|pick up)\s+(?:the\s+)?(.+?)(?:\s+(?:and|then|,)|$)", txt)
        place_match = re.search(r"(?:place|put|set|drop|stack)\s+(?:it\s+)?(?:on|onto|in|into|at|over)?\s*(?:the\s+)?(.+?)(?:\s+(?:and|then|,)|$)", txt)
        pick_phrase = pick_match.group(1).strip() if pick_match else None
        place_phrase = place_match.group(1).strip() if place_match else None
        debug["pick_phrase"] = pick_phrase
        debug["place_phrase"] = place_phrase

        candidate_texts: List[str] = []
        candidate_uid: List[int] = []
        uid_to_texts: Dict[int, List[str]] = {}
        for uid, meta in objects.items():
            descriptors = [
                f"{meta.name} cube",
                f"{meta.name} block",
                f"{meta.name} object",
                f"{meta.name} colored cube",
            ]
            uid_to_texts[uid] = descriptors
            for desc in descriptors:
                candidate_texts.append(desc)
                candidate_uid.append(uid)

        texts_to_embed: List[str] = [txt]
        include_pick = False
        include_place = False
        if pick_phrase:
            texts_to_embed.append(pick_phrase)
            include_pick = True
        if place_phrase and place_phrase != pick_phrase:
            texts_to_embed.append(place_phrase)
            include_place = True
        texts_to_embed.extend(candidate_texts)

        embeddings = self.model.encode(
            texts_to_embed,
            convert_to_tensor=True,
            normalize_embeddings=True,
        )
        user_emb = embeddings[0]
        idx = 1
        pick_emb = None
        place_emb = None
        if include_pick:
            pick_emb = embeddings[idx]
            idx += 1
        if include_place:
            place_emb = embeddings[idx]
            idx += 1
        candidate_embs = embeddings[idx:]
        if candidate_embs.size(0) == 0:
            return MatcherDecision(None, None, {"error": "no candidate embeddings"})

        def best_uid_for(embedding: torch.Tensor) -> Tuple[Optional[int], Optional[float]]:
            scores = util.cos_sim(embedding.unsqueeze(0), candidate_embs)[0]
            best_index = int(torch.argmax(scores).item())
            return candidate_uid[best_index], float(scores[best_index].item())

        pick_uid: Optional[int] = None
        place_uid: Optional[int] = None

        if pick_emb is not None:
            pick_uid, pick_score = best_uid_for(pick_emb)
            debug["pick_score"] = pick_score
        if place_emb is not None:
            place_uid, place_score = best_uid_for(place_emb)
            debug["place_score"] = place_score

        if pick_uid is None or place_uid is None:
            scores_full = util.cos_sim(user_emb.unsqueeze(0), candidate_embs)[0]
            uid_scores: Dict[int, float] = {}
            for score, uid in zip(scores_full, candidate_uid):
                val = float(score.item())
                uid_scores[uid] = max(uid_scores.get(uid, -1.0), val)
            sorted_uids = sorted(uid_scores.items(), key=lambda item: item[1], reverse=True)
            debug["fallback_scores"] = sorted_uids
            if pick_uid is None and sorted_uids:
                pick_uid = sorted_uids[0][0]
            if place_uid is None and len(sorted_uids) > 1:
                place_uid = sorted_uids[1][0]

        if pick_uid is not None and place_uid is not None and pick_uid == place_uid and len(objects) > 1:
            scores_full = util.cos_sim(user_emb.unsqueeze(0), candidate_embs)[0]
            sorted_uids = sorted(
                ((uid, float(scores_full[i].item())) for i, uid in enumerate(candidate_uid)),
                key=lambda item: item[1],
                reverse=True,
            )
            for uid, score in sorted_uids:
                if uid != pick_uid:
                    place_uid = uid
                    debug["resolved_same_object"] = score
                    break

        debug["uid_to_texts"] = uid_to_texts
        return MatcherDecision(pick_uid, place_uid, debug)


class IKController:
    def __init__(self, robot_id: int, client_id: int, time_step: float, sleep: bool = True):
        self.robot_id = robot_id
        self.client_id = client_id
        self.time_step = time_step
        self.sleep = sleep
        self.ee_index = EE_LINK_INDEX

    def move_to(
        self,
        target_pos: Tuple[float, float, float],
        target_ori: Optional[Tuple[float, float, float, float]] = None,
        steps: int = 120,
    ) -> None:
        if target_ori is None:
            target_ori = p.getQuaternionFromEuler([0.0, 3.14159, 0.0])
        for _ in range(steps):
            joint_poses = p.calculateInverseKinematics(
                self.robot_id,
                self.ee_index,
                target_pos,
                target_ori,
                physicsClientId=self.client_id,
            )
            num_joints = p.getNumJoints(self.robot_id, physicsClientId=self.client_id)
            for j in range(num_joints):
                info = p.getJointInfo(self.robot_id, j, physicsClientId=self.client_id)
                if info[2] == p.JOINT_FIXED or j >= len(joint_poses):
                    continue
                p.setJointMotorControl2(
                    self.robot_id,
                    j,
                    p.POSITION_CONTROL,
                    joint_poses[j],
                    force=200,
                    physicsClientId=self.client_id,
                )
            p.stepSimulation(physicsClientId=self.client_id)
            if self.sleep:
                time.sleep(self.time_step)

    def pick(self, obj_id: int) -> int:
        pos, orn = p.getBasePositionAndOrientation(obj_id, physicsClientId=self.client_id)
        approach = (float(pos[0]), float(pos[1]), float(pos[2] + 0.18))
        grasp = (float(pos[0]), float(pos[1]), float(pos[2] + 0.02))
        self.move_to(approach, steps=80)
        self.move_to(grasp, steps=80)

        ee_state = p.getLinkState(self.robot_id, self.ee_index, physicsClientId=self.client_id)
        ee_pos, ee_orn = ee_state[4], ee_state[5]
        ee_inv_pos, ee_inv_orn = p.invertTransform(ee_pos, ee_orn)
        rel_pos, rel_orn = p.multiplyTransforms(ee_inv_pos, ee_inv_orn, pos, orn)

        constraint_id = p.createConstraint(
            self.robot_id,
            self.ee_index,
            obj_id,
            -1,
            p.JOINT_FIXED,
            [0, 0, 0],
            rel_pos,
            rel_orn,
            [0, 0, 0],
            [0, 0, 0, 1],
            physicsClientId=self.client_id,
        )

        lift = (float(pos[0]), float(pos[1]), float(pos[2] + 0.25))
        self.move_to(lift, steps=80)
        return constraint_id

    def place_and_release(
        self,
        drop_pos: Tuple[float, float, float],
        constraint_id: Optional[int],
    ) -> Optional[int]:
        drop_above = (drop_pos[0], drop_pos[1], drop_pos[2] + 0.25)
        self.move_to(drop_above, steps=80)
        self.move_to((drop_pos[0], drop_pos[1], drop_pos[2] + 0.05), steps=60)
        if constraint_id is not None:
            try:
                p.removeConstraint(constraint_id, physicsClientId=self.client_id)
            except Exception:
                pass
            constraint_id = None
        self.move_to((drop_pos[0], drop_pos[1], drop_pos[2] + 0.30), steps=80)
        return constraint_id


class RT2Simulation:
    def __init__(
        self,
        gui: bool = True,
        model_name: str = MODEL_NAME,
        time_step: float = TIME_STEP,
    ):
        self.gui = gui
        self.model_name = model_name
        self.time_step = time_step
        self.physics_client: Optional[int] = None
        self.robot_id: Optional[int] = None
        self.plane_id: Optional[int] = None
        self.objects: Dict[int, ObjectInfo] = {}
        self.camera = CameraConfig()
        self.matcher = SemanticMatcher(model_name=model_name)
        self.controller: Optional[IKController] = None
        self.default_drop = (0.4, 0.0, 0.05)

    def start(self) -> None:
        if p.isConnected():
            p.disconnect()
        mode = p.GUI if self.gui else p.DIRECT
        self.physics_client = p.connect(mode)
        p.resetSimulation(physicsClientId=self.physics_client)
        p.setAdditionalSearchPath(pybullet_data.getDataPath())
        p.setGravity(0, 0, -9.81, physicsClientId=self.physics_client)
        p.setTimeStep(self.time_step, physicsClientId=self.physics_client)
        self._load_scene()
        if self.robot_id is None:
            raise RuntimeError("Robot failed to load")
        self.controller = IKController(
            self.robot_id,
            self.physics_client,
            self.time_step,
            sleep=self.gui,
        )
        logging.info("Simulation ready (client=%s)", self.physics_client)

    def _load_scene(self) -> None:
        if self.physics_client is None:
            raise RuntimeError("Simulation not connected")
        self.objects.clear()
        self.plane_id = p.loadURDF("plane.urdf", physicsClientId=self.physics_client)
        self.robot_id = p.loadURDF(
            "kuka_iiwa/model.urdf",
            useFixedBase=True,
            physicsClientId=self.physics_client,
        )
        cube_specs = [([1, 0, 0, 1], "red"), ([0, 1, 0, 1], "green"), ([0, 0, 1, 1], "blue")]
        positions = [(0.55, -0.15, 0.03), (0.55, 0.0, 0.03), (0.55, 0.15, 0.03)]
        for (rgba, name), position in zip(cube_specs, positions):
            visual = p.createVisualShape(
                shapeType=p.GEOM_BOX,
                halfExtents=[0.03, 0.03, 0.03],
                rgbaColor=rgba,
                physicsClientId=self.physics_client,
            )
            collision = p.createCollisionShape(
                shapeType=p.GEOM_BOX,
                halfExtents=[0.03, 0.03, 0.03],
                physicsClientId=self.physics_client,
            )
            uid = p.createMultiBody(
                baseMass=0.1,
                baseCollisionShapeIndex=collision,
                baseVisualShapeIndex=visual,
                basePosition=position,
                physicsClientId=self.physics_client,
            )
            self.objects[uid] = ObjectInfo(
                uid=uid,
                name=name,
                color=tuple(rgba),
                home_position=tuple(position),
            )
        self.settle(steps=120)

    def _ensure_started(self) -> None:
        if self.physics_client is None or self.robot_id is None or self.controller is None:
            raise RuntimeError("Simulation not started. Call start() first.")

    def settle(self, steps: int = 30) -> None:
        if self.physics_client is None:
            return
        for _ in range(steps):
            p.stepSimulation(physicsClientId=self.physics_client)
            if self.gui:
                time.sleep(self.time_step)

    def reset_scene(self) -> None:
        self._ensure_started()
        for obj in self.objects.values():
            p.resetBasePositionAndOrientation(
                obj.uid,
                obj.home_position,
                [0, 0, 0, 1],
                physicsClientId=self.physics_client,
            )
        self.settle(steps=60)

    def capture_frame(self) -> Tuple[np.ndarray, np.ndarray]:
        self._ensure_started()
        cam = self.camera
        view = p.computeViewMatrixFromYawPitchRoll(
            cameraTargetPosition=cam.target,
            distance=cam.distance,
            yaw=cam.yaw,
            pitch=cam.pitch,
            roll=cam.roll,
            upAxisIndex=cam.up_axis_index,
        )
        proj = p.computeProjectionMatrixFOV(
            fov=cam.fov,
            aspect=SIM_WIDTH / SIM_HEIGHT,
            nearVal=cam.near,
            farVal=cam.far,
        )
        width, height, rgb, _, seg = p.getCameraImage(
            SIM_WIDTH,
            SIM_HEIGHT,
            viewMatrix=view,
            projectionMatrix=proj,
            renderer=p.ER_BULLET_HARDWARE_OPENGL,
            flags=p.ER_SEGMENTATION_MASK_OBJECT_AND_LINKINDEX,
            physicsClientId=self.physics_client,
        )
        img = np.reshape(rgb, (height, width, 4))[:, :, :3].astype(np.uint8)
        seg = np.reshape(seg, (height, width))
        return img, seg

    def capture_frame_png(self) -> bytes:
        img, _ = self.capture_frame()
        buffer = io.BytesIO()
        Image.fromarray(img).save(buffer, format="PNG")
        return buffer.getvalue()

    def get_state_snapshot(self) -> Dict[str, Any]:
        self._ensure_started()
        snapshot = {"objects": []}
        for obj in self.objects.values():
            pos, orn = p.getBasePositionAndOrientation(obj.uid, physicsClientId=self.physics_client)
            snapshot["objects"].append(
                {
                    "uid": obj.uid,
                    "name": obj.name,
                    "position": tuple(round(x, 4) for x in pos),
                    "orientation": tuple(round(x, 4) for x in orn),
                }
            )
        return snapshot

    def handle_command(
        self,
        command: str,
        *,
        capture_frame: bool = True,
        auto_reset: bool = False,
    ) -> CommandResult:
        self._ensure_started()
        self.settle(steps=15)
        img, seg = self.capture_frame()

        visible = {
            uid: obj
            for uid, obj in self.objects.items()
            if mask_for_uid(seg, uid).any()
        }

        decision = self.matcher.decide(command, visible, img, seg)
        debug: Dict[str, Any] = dict(decision.debug)

        positions: Dict[int, Tuple[float, float, float]] = {}
        for uid in visible:
            pos, _ = p.getBasePositionAndOrientation(uid, physicsClientId=self.physics_client)
            positions[uid] = tuple(round(x, 4) for x in pos)
        debug["visible_objects"] = {
            uid: {"name": visible[uid].name, "position": positions[uid]}
            for uid in visible
        }

        if decision.pick_uid is None:
            return CommandResult(
                command=command,
                pick_uid=None,
                place_uid=decision.place_uid,
                drop_position=None,
                debug={**debug, "warning": "pick target unresolved"},
            )

        constraint_id: Optional[int] = None
        drop_position: Optional[Tuple[float, float, float]] = None
        try:
            constraint_id = self.controller.pick(decision.pick_uid)
            if decision.place_uid is not None and decision.place_uid in self.objects:
                target_uid = decision.place_uid
                base_pos, _ = p.getBasePositionAndOrientation(
                    target_uid,
                    physicsClientId=self.physics_client,
                )
                drop_position = (
                    float(base_pos[0]),
                    float(base_pos[1]),
                    float(base_pos[2] + 0.06),
                )
            else:
                drop_position = (
                    float(self.default_drop[0]),
                    float(self.default_drop[1]),
                    float(self.default_drop[2]),
                )
            constraint_id = self.controller.place_and_release(drop_position, constraint_id)
        finally:
            if constraint_id is not None:
                try:
                    p.removeConstraint(constraint_id, physicsClientId=self.physics_client)
                except Exception:
                    pass

        debug["drop_position"] = (
            tuple(round(x, 4) for x in drop_position) if drop_position else None
        )

        self.settle(steps=30)
        frame_png = self.capture_frame_png() if capture_frame else None

        result = CommandResult(
            command=command,
            pick_uid=decision.pick_uid,
            place_uid=decision.place_uid,
            drop_position=drop_position,
            debug=debug,
            frame_png=frame_png,
        )

        if auto_reset:
            self.reset_scene()

        return result

    def shutdown(self) -> None:
        if self.physics_client is not None:
            try:
                p.disconnect(self.physics_client)
            except Exception:
                pass
        self.physics_client = None
        self.robot_id = None
        self.controller = None

    def cli_loop(self, auto_reset: bool = False) -> None:
        print("\n=== RT-2 Simulation (refined) ===")
        print("Type commands such as: 'pick up the red cube and place it on the blue cube'")
        print("Type 'exit' to quit.\n")
        while True:
            try:
                raw = input("Enter command: ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\nExiting...")
                break
            if not raw:
                continue
            if raw.lower() in {"exit", "quit"}:
                print("Goodbye!")
                break
            try:
                result = self.handle_command(raw, auto_reset=auto_reset)
            except Exception as exc:  # pragma: no cover - CLI diagnostics
                logging.exception("Command failed")
                print(f"[error] {exc}")
                continue
            if result.pick_uid is None:
                print("[warn] Could not resolve pick target. Try a more specific command.")
                continue
            print(
                f"[ok] pick={result.pick_uid} place={result.place_uid} drop={result.drop_position}"
            )


def main() -> None:
    parser = argparse.ArgumentParser(description="RT-2 PyBullet simulation driver")
    parser.add_argument("--headless", action="store_true", help="Run without the PyBullet GUI")
    parser.add_argument("--model", default=MODEL_NAME, help="Sentence-transformer model name")
    parser.add_argument(
        "--time-step",
        type=float,
        default=TIME_STEP,
        help="Physics time-step in seconds",
    )
    parser.add_argument(
        "--auto-reset",
        action="store_true",
        help="Reset the scene after each command",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), logging.INFO),
        format="%(levelname)s | %(message)s",
    )

    sim = RT2Simulation(gui=not args.headless, model_name=args.model, time_step=args.time_step)
    try:
        sim.start()
        sim.cli_loop(auto_reset=args.auto_reset)
    finally:
        sim.shutdown()


if __name__ == "__main__":
    main()
