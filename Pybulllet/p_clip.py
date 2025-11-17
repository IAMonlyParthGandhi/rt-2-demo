"""
RT-2 Simulation Starter (single-file) with CLIP-based perception

Replaces the SentenceTransformer-only matcher with a CLIP image-text matcher
so the system grounds language directly to what the camera sees.
"""

import pybullet as p
import pybullet_data
import time
import numpy as np
import re
import io
from PIL import Image

# CLIP & Torch
import torch
try:
    import clip  # openai/clip
except Exception as e:
    # try to auto-install CLIP (won't install torch due to CUDA/version constraints)
    import subprocess, sys
    try:
        print("CLIP not found — attempting to install CLIP package...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "git+https://github.com/openai/CLIP.git", "ftfy", "regex", "tqdm"])
        import clip
        print("CLIP installed successfully.")
    except Exception:
        raise ImportError(
            "The 'clip' package is missing and automatic install failed.\n"
            "Please install PyTorch first (match your CUDA) using instructions at https://pytorch.org/,\n"
            "then run: python -m pip install git+https://github.com/openai/CLIP.git ftfy regex tqdm\n"
        ) from e

# --------------------------- Configuration ---------------------------
SIM_WIDTH = 320
SIM_HEIGHT = 240
# End-effector index for KUKA iiwa in this URDF (commonly 6). If you use a different URDF, inspect joint info.
EE_LINK_INDEX = 6

# --------------------------- Helper utilities ---------------------------

def connect_pybullet(gui=True):
    if gui:
        p.connect(p.GUI)
    else:
        p.connect(p.DIRECT)
    p.setAdditionalSearchPath(pybullet_data.getDataPath())
    p.setGravity(0, 0, -9.81)


def create_scene():
    plane = p.loadURDF('plane.urdf')
    # load KUKA iiwa
    robot = p.loadURDF('kuka_iiwa/model.urdf', useFixedBase=True)

    # Create colored cubes (we keep their "color name" as metadata but the system will use visual matching)
    cube_colors = [([1,0,0,1], 'red'), ([0,1,0,1], 'green'), ([0,0,1,1], 'blue')]
    base_x = 0.55
    cube_ids = {}
    positions = [[base_x, -0.15, 0.03], [base_x, 0.0, 0.03], [base_x, 0.15, 0.03]]
    for (col, name), pos in zip(cube_colors, positions):
        visual = p.createVisualShape(p.GEOM_BOX, halfExtents=[0.03,0.03,0.03], rgbaColor=col)
        collision = p.createCollisionShape(p.GEOM_BOX, halfExtents=[0.03,0.03,0.03])
        uid = p.createMultiBody(baseMass=0.1, baseCollisionShapeIndex=collision,
                                baseVisualShapeIndex=visual, basePosition=pos)
        cube_ids[uid] = {'name': name, 'color': col}

    return robot, cube_ids


def get_camera_image_and_seg():
    # Camera placed to see the table area and objects
    cam_target = [0.6, 0, 0.05]
    distance = 0.9
    yaw = 90
    pitch = -20
    roll = 0
    up_axis_index = 2
    view = p.computeViewMatrixFromYawPitchRoll(cameraTargetPosition=cam_target,
                                              distance=distance, yaw=yaw, pitch=pitch, roll=roll,
                                              upAxisIndex=up_axis_index)
    proj = p.computeProjectionMatrixFOV(fov=60, aspect=SIM_WIDTH/SIM_HEIGHT, nearVal=0.01, farVal=3.1)
    w, h, px, depth, seg = p.getCameraImage(SIM_WIDTH, SIM_HEIGHT, viewMatrix=view, projectionMatrix=proj,
                                            renderer=p.ER_BULLET_HARDWARE_OPENGL)
    # px is a flat list, convert to numpy (h,w,4)
    img = np.reshape(px, (h, w, 4))[:, :, :3].astype(np.uint8)
    seg = np.array(seg).reshape((h, w))
    return img, seg


def seg_to_object_crops(img, seg, object_uids):
    """Return a dict uid -> cropped RGB numpy array (tight bounding box from segmentation)."""
    crops = {}
    h, w, _ = img.shape
    for uid in object_uids:
        mask = (seg == uid)
        if mask.sum() == 0:
            continue
        ys, xs = np.where(mask)
        y0, y1 = max(0, ys.min()-2), min(h-1, ys.max()+2)
        x0, x1 = max(0, xs.min()-2), min(w-1, xs.max()+2)
        # Ensure bounds
        if y1 < y0 or x1 < x0:
            continue
        crop = img[y0:y1+1, x0:x1+1, :]
        # If crop is empty fallback to tiny center crop
        if crop.size == 0 or crop.shape[0] < 4 or crop.shape[1] < 4:
            cy, cx = h//2, w//2
            y0, y1 = max(0, cy-16), min(h-1, cy+16)
            x0, x1 = max(0, cx-16), min(w-1, cx+16)
            crop = img[y0:y1+1, x0:x1+1, :]
        crops[uid] = crop
    return crops


# --------------------------- CLIP-based Semantic Matching ---------------------------

class CLIPSemanticMatcher:
    def __init__(self, device=None, clip_model_name="ViT-B/32"):
        # device
        self.device = device if device is not None else ("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[CLIP] loading model {clip_model_name} on {self.device} ...")
        self.model, self.preprocess = clip.load(clip_model_name, device=self.device)
        self.model.eval()
        # small helper tokenization batch size
        self.max_text_batch = 64

    def _prepare_image_features(self, crops):
        """
        crops: dict uid -> numpy array (H,W,3) uint8
        returns: dict uid -> normalized torch tensor (D,)
        """
        uids = []
        tensors = []
        for uid, crop in crops.items():
            # convert numpy to PIL
            pil = Image.fromarray(crop)
            img_tensor = self.preprocess(pil).unsqueeze(0).to(self.device)  # 1,C,H,W
            uids.append(uid)
            tensors.append(img_tensor)
        if len(tensors) == 0:
            return {}
        images_b = torch.cat(tensors, dim=0)
        with torch.no_grad():
            feats = self.model.encode_image(images_b)  # (N, D)
            feats = feats / feats.norm(dim=-1, keepdim=True)
        # map back
        return {uid: feats[i].detach() for i, uid in enumerate(uids)}

    def _encode_text(self, texts):
        """Encode a list of texts to normalized embeddings as a single tensor (N,D)."""
        if not texts:
            return torch.empty((0, self.model.ln_final.normalized_shape[0]), device=self.device)
        # CLIP tokenization and encoding supports batching; do chunking
        all_feats = []
        with torch.no_grad():
            for i in range(0, len(texts), self.max_text_batch):
                batch = texts[i:i+self.max_text_batch]
                tok = clip.tokenize(batch).to(self.device)
                tfeat = self.model.encode_text(tok)
                tfeat = tfeat / tfeat.norm(dim=-1, keepdim=True)
                all_feats.append(tfeat)
            all_feats = torch.cat(all_feats, dim=0)
        return all_feats

    def pick_and_place_from_text(self, text, objects_meta, img, seg):
        """
        text: user command string
        objects_meta: dict uid -> metadata (name,color,...)
        img, seg: camera outputs (numpy)
        returns: pick_uid, place_uid, debug_scores
        """
        txt = text.lower().strip()

        # 1) Extract pick/place short phrases using regex (same as original)
        pick_phrase = None
        place_phrase = None
        pick_match = re.search(r"(?:pick|grab|take|lift|pick up)\s+(?:the\s+)?(.+?)(?:\s+(?:and|then|,)|$)", txt)
        place_match = re.search(r"(?:place|put|set|drop|stack)\s+(?:it\s+)?(?:on|onto|in|into|at|over|onto)?\s*(?:the\s+)?(.+?)(?:\s+(?:and|then|,)|$)", txt)
        if pick_match:
            pick_phrase = pick_match.group(1).strip()
        if place_match:
            place_phrase = place_match.group(1).strip()

        # 2) Build image crops for visible objects
        visible_uids = list(objects_meta.keys())
        crops = seg_to_object_crops(img, seg, visible_uids)
        if len(crops) == 0:
            return None, None, {"error": "no visible crops"}

        image_feats = self._prepare_image_features(crops)  # uid -> feat tensor

        # 3) Helper to find best uid for a phrase (text -> image)
        debug_scores = {}
        def best_uid_for_phrase(phrase):
            if phrase is None or phrase.strip() == "":
                return None, None
            # encode the phrase
            t_emb = self._encode_text([phrase])[0]  # (D,)
            # compute similarity with all image feats
            sims = []
            uids = []
            for uid, ifeat in image_feats.items():
                # cos sim = dot (both normalized)
                s = float((t_emb @ ifeat).item())
                sims.append(s)
                uids.append(uid)
            if len(sims) == 0:
                return None, None
            best_idx = int(np.argmax(sims))
            return uids[best_idx], sims[best_idx]

        pick_uid, pick_score = None, None
        place_uid, place_score = None, None

        # If we have explicit phrases, try them first (CLIP visual matching)
        if pick_phrase:
            pick_uid, pick_score = best_uid_for_phrase(pick_phrase)
            if pick_score is not None:
                debug_scores['pick_phrase'] = (pick_phrase, pick_uid, pick_score)
        if place_phrase:
            place_uid, place_score = best_uid_for_phrase(place_phrase)
            if place_score is not None:
                debug_scores['place_phrase'] = (place_phrase, place_uid, place_score)

        # Fallback: if we didn't find pick/place from phrases, match whole command to images
        if pick_uid is None or place_uid is None:
            # Use full text -> images
            t_emb = self._encode_text([txt])[0]
            # compute per-image similarity
            uid_scores = {}
            for uid, ifeat in image_feats.items():
                s = float((t_emb @ ifeat).item())
                uid_scores[uid] = s
            # sort by score desc
            sorted_uids = sorted(uid_scores.items(), key=lambda x: x[1], reverse=True)
            if pick_uid is None and len(sorted_uids) >= 1:
                pick_uid, pick_score = sorted_uids[0][0], float(sorted_uids[0][1])
                debug_scores['fallback_pick'] = (pick_uid, pick_score)
            if place_uid is None and len(sorted_uids) >= 2:
                # pick second best as a simple heuristic for place target
                place_uid, place_score = sorted_uids[1][0], float(sorted_uids[1][1])
                debug_scores['fallback_place'] = (place_uid, place_score)
            elif place_uid is None and len(sorted_uids) == 1:
                # only one visible object -> no place target
                place_uid, place_score = None, None

        # final: avoid picking & placing the same object as a trivial constraint: if they are same and more than 1 visible uid, pick alternative
        if pick_uid is not None and place_uid is not None and pick_uid == place_uid:
            # try to select second best for place (based on full-text fallback)
            all_scores = {}
            t_emb = self._encode_text([txt])[0]
            for uid, ifeat in image_feats.items():
                all_scores[uid] = float((t_emb @ ifeat).item())
            sorted_uids = sorted(all_scores.items(), key=lambda x: x[1], reverse=True)
            for uid, s in sorted_uids:
                if uid != pick_uid:
                    place_uid, place_score = uid, s
                    debug_scores['resolved_same'] = (pick_uid, place_uid)
                    break

        # Attach some textual candidate debug info (which object mapped to which color-name candidate)
        # build candidate textual descriptions (for debug only)
        uid_to_texts = {}
        for uid, meta in objects_meta.items():
            color_name = meta.get('name', 'object')
            texts = [f"{color_name} cube", f"{color_name} block", f"a {color_name} object", f"{color_name} colored cube"]
            uid_to_texts[uid] = texts
        debug_scores['visible_uids'] = list(objects_meta.keys())

        return pick_uid, place_uid, debug_scores


# --------------------------- Controller (simple IK + grasp) ---------------------------

class SimpleController:
    def __init__(self, robot_id):
        self.robot = robot_id
        self.ee_index = EE_LINK_INDEX
        self.constraint_id = None
        print(f"[SimpleController] initialized with ee_index={self.ee_index}")

    def move_to(self, target_pos, target_ori=None, steps=120):
        if target_ori is None:
            target_ori = p.getQuaternionFromEuler([0, 3.14, 0])
        print(f"[move_to] moving to pos={tuple(round(x,3) for x in target_pos)} in {steps} steps")
        for i in range(steps):
            try:
                joint_poses = p.calculateInverseKinematics(self.robot, self.ee_index, target_pos, target_ori)
                num_joints = p.getNumJoints(self.robot)
                # apply joint poses to the actuated joints only
                for j in range(num_joints):
                    info = p.getJointInfo(self.robot, j)
                    joint_type = info[2]
                    if joint_type == p.JOINT_FIXED:
                        continue
                    try:
                        p.setJointMotorControl2(self.robot, j, p.POSITION_CONTROL, joint_poses[j], force=200)
                    except Exception as ex:
                        print(f"[move_to] warning: joint {j} control failed: {ex}")
                p.stepSimulation()
                time.sleep(1.0/240.0)
            except Exception as ex:
                print(f"[move_to] IK failed at step {i}: {ex}")
                break
        print(f"[move_to] completed")

    def pick(self, obj_id):
        """Pick object and attach via fixed constraint. Use correct child link frame."""
        print(f"[pick] starting pick for obj_id={obj_id}")
        pos, orn = p.getBasePositionAndOrientation(obj_id)
        print(f"[pick] object pos={tuple(round(x,3) for x in pos)}")
        
        # Approach above the object
        pre_pos = [pos[0], pos[1], pos[2] + 0.18]
        grasp_pos = [pos[0], pos[1], pos[2] + 0.02]
        
        print(f"[pick] moving to pre-grasp pos")
        self.move_to(pre_pos, steps=80)
        
        print(f"[pick] moving to grasp pos")
        self.move_to(grasp_pos, steps=80)
        
        # Get current EE position and orientation
        ee_state = p.getLinkState(self.robot, self.ee_index)
        ee_pos, ee_orn = ee_state[4], ee_state[5]
        print(f"[pick] EE at pos={tuple(round(x,3) for x in ee_pos)}, orn={tuple(round(x,3) for x in ee_orn)}")
        
        # Compute relative transform from EE to object
        # child_in_parent = inv(parent_transform) * child_transform
        ee_inv_pos, ee_inv_orn = p.invertTransform(ee_pos, ee_orn)
        rel_pos, rel_orn = p.multiplyTransforms(ee_inv_pos, ee_inv_orn, pos, orn)
        print(f"[pick] relative frame: pos={tuple(round(x,3) for x in rel_pos)}, orn={tuple(round(x,3) for x in rel_orn)}")
        
        # Create fixed constraint with correct child link frame
        # parent_link_frame = rel_pos, rel_orn (where object sits relative to EE)
        cid = p.createConstraint(
            parentBodyUniqueId=self.robot,
            parentLinkIndex=self.ee_index,
            childBodyUniqueId=obj_id,
            childLinkIndex=-1,  # base link of object
            jointType=p.JOINT_FIXED,
            jointAxis=[0, 0, 0],
            parentFramePosition=rel_pos,
            parentFrameOrientation=rel_orn,
            childFramePosition=[0, 0, 0],
            childFrameOrientation=[0, 0, 0, 1]
        )
        self.constraint_id = cid
        print(f"[pick] constraint created: id={cid}")
        
        # Lift
        lift_pos = [pos[0], pos[1], pos[2] + 0.25]
        print(f"[pick] lifting object")
        self.move_to(lift_pos, steps=80)
        print(f"[pick] pick complete")
        return cid

    def place_and_release(self, drop_pos, constraint_id):
        """Place object at drop_pos and release constraint."""
        print(f"[place_and_release] placing at pos={tuple(round(x,3) for x in drop_pos)}")
        
        # Move above drop
        drop_above = [drop_pos[0], drop_pos[1], drop_pos[2] + 0.25]
        print(f"[place_and_release] moving to above drop")
        self.move_to(drop_above, steps=80)
        
        print(f"[place_and_release] moving to drop pos")
        self.move_to([drop_pos[0], drop_pos[1], drop_pos[2] + 0.05], steps=60)
        
        # release constraint
        if constraint_id is not None:
            try:
                p.removeConstraint(constraint_id)
                print(f"[place_and_release] constraint removed")
                self.constraint_id = None
            except Exception as ex:
                print(f"[place_and_release] warning: failed to remove constraint: {ex}")
        
        # move away
        print(f"[place_and_release] moving away")
        self.move_to([drop_pos[0], drop_pos[1], drop_pos[2] + 0.3], steps=80)
        print(f"[place_and_release] place complete")


# --------------------------- Debug Helpers -------
