"""
RT-2 Simulation with CLIP and Action Tokenization Integration
Combines visual understanding, natural language processing, and action token generation
"""

import pybullet as p
import pybullet_data
import time
import numpy as np
import re
import torch
from PIL import Image
import clip
import math

# --------------------------- Configuration ---------------------------
SIM_WIDTH = 320
SIM_HEIGHT = 240
CLIP_MODEL = 'ViT-B/32'
EE_LINK_INDEX = 6

# ========================== ACTION TOKENIZER ==========================
class ActionTokenizerV2:
    """
    Converts continuous robot actions to discrete tokens
    Adapted from your folder structure
    """
    def __init__(self, env_size_meters=3.0, env_height_meters=1.0):
        """Initialize tokenizer for workspace discretization"""
        half_size = env_size_meters / 2.0
        self.x_bins = torch.linspace(-half_size, half_size, 11) 
        self.y_bins = torch.linspace(-half_size, half_size, 11)
        self.z_bins = torch.linspace(0, env_height_meters, 11)
        self.yaw_bins = torch.linspace(-math.pi/2, math.pi/2, 11)
        print("[Tokenizer] Initialized with 11 bins per dimension")

    def discretize(self, value, bins, prefix):
        """Find closest bin index and convert to token"""
        if not isinstance(value, torch.Tensor):
            value = torch.tensor(float(value))
        idx = torch.argmin(torch.abs(bins - value)).item()
        token_val = idx - 5  # Center at 0: [-5, -4, ..., 0, ..., 4, 5]
        return f"{prefix}_{token_val:+d}"

    def position_to_tokens(self, pos, rotation=0.0):
        """Convert 3D position to discrete tokens"""
        x_token = self.discretize(pos[0], self.x_bins, "POS_X")
        y_token = self.discretize(pos[1], self.y_bins, "POS_Y")
        z_token = self.discretize(pos[2], self.z_bins, "POS_Z")
        yaw_token = self.discretize(rotation, self.yaw_bins, "ROT_YAW")
        return [x_token, y_token, z_token, yaw_token]

    def action_to_tokens(self, action_type, pos, rotation=0.0):
        """Generate complete action token sequence"""
        tokens = [f"ACTION_{action_type.upper()}"]
        tokens.extend(self.position_to_tokens(pos, rotation))
        return tokens

# ========================== OBJECT DATABASE ==========================
class ObjectDatabase:
    """
    Tracks all objects in the environment
    Similar to your object_db.py but integrated with PyBullet
    """
    def __init__(self):
        self.objects = {}
        print("[Database] Initialized object tracking")
    
    def update_from_pybullet(self, cubes_dict):
        """Update object positions from PyBullet simulation"""
        self.objects = {}
        for uid, meta in cubes_dict.items():
            pos, orn = p.getBasePositionAndOrientation(uid)
            euler = p.getEulerFromQuaternion(orn)
            self.objects[meta['name']] = {
                'uid': uid,
                'pos': pos,
                'rotation': euler[2],  # yaw
                'type': 'item',
                'meta': meta
            }
    
    def find_object(self, name):
        """Find object by name"""
        for obj_name, data in self.objects.items():
            if name.lower() in obj_name.lower():
                return data
        return None

# ========================== ACTION EXECUTOR ==========================
class ActionExecutor:
    """
    Generates 8D action vectors for robot control
    Adapted from your robot_systems.py
    """
    def __init__(self):
        self.home_pos = (0, 0, 0.7)
        self.home_rot = (0, 0, 0)
        self.gripper_open = 1
        print("[Executor] Initialized at home position")
    
    def generate_pick_actions(self, pos, is_final=False):
        """Generate 8D action sequence for picking"""
        actions = []
        pos_above = (pos[0], pos[1], pos[2] + 0.1)
        
        # Move above
        actions.append((0, *pos_above, *self.home_rot, 1))
        # Move down
        actions.append((0, *pos, *self.home_rot, 1))
        # Close gripper
        self.gripper_open = 0
        actions.append((0, *pos, *self.home_rot, 0))
        # Lift (terminate if this is the final action)
        terminate_flag = 1 if is_final else 0
        actions.append((terminate_flag, *pos_above, *self.home_rot, 0))
        
        return actions
    
    def generate_place_actions(self, pos, is_final=False):
        """Generate 8D action sequence for placing"""
        actions = []
        pos_above = (pos[0], pos[1], pos[2] + 0.1)
        
        # Move above
        actions.append((0, *pos_above, *self.home_rot, 0))
        # Move down
        actions.append((0, *pos, *self.home_rot, 0))
        # Open gripper
        self.gripper_open = 1
        actions.append((0, *pos, *self.home_rot, 1))
        # Lift and return home (terminate if this is the final action)
        terminate_flag = 1 if is_final else 0
        actions.append((0, *pos_above, *self.home_rot, 1))
        # Final home position with terminate flag
        actions.append((terminate_flag, *self.home_pos, *self.home_rot, 1))
        
        return actions
    
    def format_action(self, action_vector):
        """Format 8D vector for display"""
        return (f"({action_vector[0]}, "
                f"{action_vector[1]:.2f}, {action_vector[2]:.2f}, {action_vector[3]:.2f}, "
                f"{action_vector[4]:.2f}, {action_vector[5]:.2f}, {action_vector[6]:.2f}, "
                f"{action_vector[7]})")

# ========================== CLIP MATCHER ==========================
class CLIPMatcher:
    """Visual-language understanding using CLIP"""
    def __init__(self, model_name=CLIP_MODEL):
        print(f'[CLIP] Loading model: {model_name}...')
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model, self.preprocess = clip.load(model_name, device=self.device)
        self.model.eval()
        print(f'[CLIP] Loaded on device: {self.device}')
        self._warmup()
        print('[CLIP] Ready!')
    
    def _warmup(self):
        """Warm up model to avoid first-run delays"""
        dummy_texts = ["red cube", "blue block", "green object"]
        with torch.no_grad():
            _ = self.encode_text(dummy_texts)
        if self.device == "cuda":
            torch.cuda.empty_cache()

    def encode_text(self, texts):
        """Encode text using CLIP"""
        if isinstance(texts, str):
            texts = [texts]
        text_tokens = clip.tokenize(texts, truncate=True).to(self.device)
        with torch.no_grad():
            text_features = self.model.encode_text(text_tokens)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
        return text_features.float()

    def compute_similarity(self, query_features, candidate_features):
        """Compute cosine similarity"""
        similarity = (query_features @ candidate_features.T).squeeze()
        return similarity

    def pick_and_place_from_text(self, text, objects_meta):
        """
        Parse command to identify pick and place targets
        Returns: (pick_uid, place_uid_or_special, debug_scores)
        """
        txt = text.lower()
        
        # Check for ground placement
        ground_keywords = ['ground', 'table', 'floor', 'down', 'surface']
        place_on_ground = any(keyword in txt for keyword in ground_keywords)
        
        pick_phrase = None
        place_phrase = None

        # Extract pick phrase
        pick_patterns = [
            r"(?:pick\s+up|pick|grab|take|lift|get)\s+(?:the\s+)?(\w+)",
            r"(?:pick\s+up|pick|grab|take|lift|get)\s+(?:the\s+)?(\w+\s+\w+)",
        ]
        for pattern in pick_patterns:
            pick_match = re.search(pattern, txt)
            if pick_match:
                pick_phrase = pick_match.group(1).strip()
                break

        # Extract place phrase
        place_patterns = [
            r"(?:place|put|set|drop|move).*?(?:on|onto|to|at|over)\s+(?:the\s+)?(\w+)",
            r"(?:on|onto|to|at|over)\s+(?:the\s+)?(\w+\s+\w+)",
            r"(?:on|onto|to|at|over)\s+(?:the\s+)?(\w+)",
        ]
        for pattern in place_patterns:
            place_match = re.search(pattern, txt)
            if place_match:
                place_phrase = place_match.group(1).strip()
                if any(keyword in place_phrase for keyword in ground_keywords):
                    place_on_ground = True
                break

        # Build candidate descriptions
        uid_list = list(objects_meta.keys())
        uid_to_texts = {}
        lookup_texts = []
        cand_index_to_uid = []
        
        for uid, meta in objects_meta.items():
            color_name = meta.get('name', 'object')
            texts = [
                f"{color_name}",
                f"{color_name} cube",
                f"{color_name} block",
                f"the {color_name}",
                f"the {color_name} cube",
            ]
            uid_to_texts[uid] = texts
            for t in texts:
                lookup_texts.append(t)
                cand_index_to_uid.append(uid)

        cand_features = self.encode_text(lookup_texts)

        def best_uid_for(phrase, exclude_uid=None):
            """Find best matching object"""
            phrase_variations = [
                phrase,
                f"the {phrase}",
                f"{phrase} cube",
                f"{phrase} block",
            ]
            
            all_sims = []
            for var in phrase_variations:
                phrase_feature = self.encode_text([var])
                similarities = self.compute_similarity(phrase_feature, cand_features)
                all_sims.append(similarities)
            
            max_sims = torch.stack(all_sims).max(dim=0)[0]
            
            uid_scores = {}
            for idx, sim in enumerate(max_sims):
                uid = cand_index_to_uid[idx]
                if exclude_uid and uid == exclude_uid:
                    continue
                score = float(sim)
                uid_scores[uid] = max(uid_scores.get(uid, -1.0), score)
            
            if not uid_scores:
                return None, 0.0
                
            best_uid = max(uid_scores.items(), key=lambda x: x[1])
            return best_uid[0], best_uid[1]

        pick_uid = None
        place_uid = None
        debug_scores = {'place_on_ground': place_on_ground}

        if pick_phrase:
            pick_uid, pick_score = best_uid_for(pick_phrase)
            debug_scores['pick_score'] = pick_score
            debug_scores['pick_phrase'] = pick_phrase
            print(f"[CLIP] Pick: '{pick_phrase}' -> uid={pick_uid}, score={pick_score:.3f}")
        
        if place_on_ground:
            place_uid = "GROUND"
            debug_scores['ground_detected'] = True
            print(f"[CLIP] Ground placement detected")
        elif place_phrase and place_phrase != pick_phrase:
            place_uid, place_score = best_uid_for(place_phrase, exclude_uid=pick_uid)
            debug_scores['place_score'] = place_score
            debug_scores['place_phrase'] = place_phrase
            print(f"[CLIP] Place: '{place_phrase}' -> uid={place_uid}, score={place_score:.3f}")

        if pick_uid is None:
            print("[CLIP] Using fallback matching")
            for uid, meta in objects_meta.items():
                color = meta['name']
                if color in txt:
                    pick_uid = uid
                    debug_scores['direct_color_match'] = color
                    break
            
            if pick_uid is None:
                pick_uid, score = best_uid_for(txt)
                debug_scores['fallback_pick_score'] = score

        return pick_uid, place_uid, debug_scores

# ========================== ROBOT CONTROLLER ==========================
class SimpleController:
    """IK-based robot controller"""
    def __init__(self, robot_id):
        self.robot = robot_id
        self.ee_index = EE_LINK_INDEX

    def move_to(self, target_pos, target_ori=None, steps=120):
        if target_ori is None:
            target_ori = p.getQuaternionFromEuler([0, 3.14, 0])
        for i in range(steps):
            joint_poses = p.calculateInverseKinematics(
                self.robot, self.ee_index, target_pos, target_ori
            )
            num_joints = p.getNumJoints(self.robot)
            for j in range(num_joints):
                info = p.getJointInfo(self.robot, j)
                if info[2] == p.JOINT_FIXED:
                    continue
                try:
                    p.setJointMotorControl2(
                        self.robot, j, p.POSITION_CONTROL, 
                        joint_poses[j], force=200
                    )
                except Exception:
                    pass
            p.stepSimulation()
            time.sleep(1.0/240.0)

    def pick(self, obj_id):
        pos, orn = p.getBasePositionAndOrientation(obj_id)
        pre_pos = [pos[0], pos[1], pos[2] + 0.18]
        grasp_pos = [pos[0], pos[1], pos[2] + 0.02]
        self.move_to(pre_pos, steps=80)
        self.move_to(grasp_pos, steps=80)
        cid = p.createConstraint(
            self.robot, self.ee_index, obj_id, -1, 
            p.JOINT_FIXED, [0,0,0], [0,0,0], [0,0,0]
        )
        lift_pos = [pos[0], pos[1], pos[2] + 0.25]
        self.move_to(lift_pos, steps=80)
        return cid

    def place_and_release(self, drop_pos, constraint_id):
        drop_above = [drop_pos[0], drop_pos[1], drop_pos[2] + 0.25]
        self.move_to(drop_above, steps=80)
        self.move_to([drop_pos[0], drop_pos[1], drop_pos[2] + 0.05], steps=60)
        if constraint_id is not None:
            try:
                p.removeConstraint(constraint_id)
            except Exception:
                pass
        self.move_to([drop_pos[0], drop_pos[1], drop_pos[2] + 0.3], steps=80)

# ========================== SCENE SETUP ==========================
def connect_pybullet(gui=True):
    if gui:
        p.connect(p.GUI)
    else:
        p.connect(p.DIRECT)
    p.setAdditionalSearchPath(pybullet_data.getDataPath())
    p.setGravity(0, 0, -9.81)

def create_scene():
    plane = p.loadURDF('plane.urdf')
    robot = p.loadURDF('kuka_iiwa/model.urdf', useFixedBase=True)

    cube_colors = [([1,0,0,1], 'red'), ([0,1,0,1], 'green'), ([0,0,1,1], 'blue')]
    base_x = 0.55
    cube_ids = {}
    positions = [[base_x, -0.15, 0.03], [base_x, 0.0, 0.03], [base_x, 0.15, 0.03]]
    
    for (col, name), pos in zip(cube_colors, positions):
        visual = p.createVisualShape(
            p.GEOM_BOX, halfExtents=[0.03,0.03,0.03], rgbaColor=col
        )
        collision = p.createCollisionShape(
            p.GEOM_BOX, halfExtents=[0.03,0.03,0.03]
        )
        uid = p.createMultiBody(
            baseMass=0.1, 
            baseCollisionShapeIndex=collision,
            baseVisualShapeIndex=visual, 
            basePosition=pos
        )
        cube_ids[uid] = {'name': name, 'color': col}

    return robot, cube_ids

def get_camera_image_and_seg():
    cam_target = [0.6, 0, 0.05]
    distance = 0.9
    yaw = 90
    pitch = -20
    roll = 0
    
    view = p.computeViewMatrixFromYawPitchRoll(
        cameraTargetPosition=cam_target,
        distance=distance, yaw=yaw, pitch=pitch, 
        roll=roll, upAxisIndex=2
    )
    proj = p.computeProjectionMatrixFOV(
        fov=60, aspect=SIM_WIDTH/SIM_HEIGHT, 
        nearVal=0.01, farVal=3.1
    )
    w, h, px, depth, seg = p.getCameraImage(
        SIM_WIDTH, SIM_HEIGHT, 
        viewMatrix=view, projectionMatrix=proj,
        renderer=p.ER_BULLET_HARDWARE_OPENGL
    )
    img = np.reshape(px, (h, w, 4))[:, :, :3]
    seg = np.array(seg).reshape((h, w))
    return img, seg

# ========================== MAIN LOOP ==========================
def main():
    # Initialize all systems
    connect_pybullet(gui=True)
    robot, cubes = create_scene()
    
    controller = SimpleController(robot)
    matcher = CLIPMatcher()
    tokenizer = ActionTokenizerV2(env_size_meters=3.0, env_height_meters=1.0)
    executor = ActionExecutor()
    database = ObjectDatabase()

    print('\n' + '='*60)
    print('RT-2 INTEGRATED SYSTEM WITH ACTION TOKENIZATION')
    print('='*60)
    print('Commands generate both:')
    print('  1. Action Tokens (discrete representation)')
    print('  2. 8D Action Vectors (continuous control)')
    print('\nExample commands:')
    print("  - 'pick up the red cube and place it on the ground'")
    print("  - 'put the blue block on the green cube'")
    print("  - 'grab the red cube and place it on the table'")
    print('\nType "exit" to quit.\n')
    print('='*60 + '\n')

    while True:
        # Simulation step
        for _ in range(15):
            p.stepSimulation()
            time.sleep(1.0/240.0)

        # Get scene information
        img, seg = get_camera_image_and_seg()
        visible_uids = [u for u in cubes.keys() if (seg == u).any()]
        objects_meta = {u: cubes[u] for u in visible_uids}
        
        # Update object database
        database.update_from_pybullet(cubes)

        print('\n📦 Visible objects:')
        for u, m in objects_meta.items():
            pos, _ = p.getBasePositionAndOrientation(u)
            print(f"  • {m['name']} cube at ({pos[0]:.2f}, {pos[1]:.2f}, {pos[2]:.2f})")

        # Get user command
        user = input('\n🤖 Enter command: ').strip()
        if user.lower() in ('exit', 'quit'):
            print('Exiting simulation...')
            break
        if len(user) == 0:
            continue

        print('\n' + '-'*60)
        print('PROCESSING COMMAND')
        print('-'*60)

        # Parse command with CLIP
        pick_uid, place_uid, dbg = matcher.pick_and_place_from_text(user, objects_meta)
        
        if pick_uid is None:
            print('❌ Could not identify object to pick. Try a clearer command.')
            continue

        # Get object positions
        pick_pos, pick_orn = p.getBasePositionAndOrientation(pick_uid)
        pick_euler = p.getEulerFromQuaternion(pick_orn)
        
        print(f'\n✓ Pick target: {objects_meta[pick_uid]["name"]} cube')
        
        # Generate PICK tokens
        pick_tokens = tokenizer.action_to_tokens("PICK", pick_pos, pick_euler[2])
        print(f'\n📝 ACTION TOKENS (PICK):')
        print(f'   {" ".join(pick_tokens)}')
        
        # Generate 8D action vectors for PICK
        pick_actions = executor.generate_pick_actions(pick_pos, is_final=False)
        print(f'\n🎮 8D ACTION VECTORS (PICK):')
        for i, action in enumerate(pick_actions, 1):
            print(f'   Step {i}: {executor.format_action(action)}')
        
        # Execute pick
        print(f'\n▶️  Executing PICK...')
        cid = controller.pick(pick_uid)

        # Determine drop location
        if place_uid == "GROUND":
            print(f'\n✓ Place target: ground/table')
            drop_pos = [pick_pos[0] - 0.1, pick_pos[1], 0.03]
        elif place_uid is not None:
            print(f'\n✓ Place target: {objects_meta[place_uid]["name"]} cube')
            tgt_pos, _ = p.getBasePositionAndOrientation(place_uid)
            drop_pos = [tgt_pos[0], tgt_pos[1], tgt_pos[2] + 0.06]
        else:
            print(f'\n✓ Place target: default ground location')
            drop_pos = [0.4, 0.0, 0.03]

        # Generate PLACE tokens
        place_tokens = tokenizer.action_to_tokens("PLACE", drop_pos, 0.0)
        print(f'\n📝 ACTION TOKENS (PLACE):')
        print(f'   {" ".join(place_tokens)}')
        
        # Generate 8D action vectors for PLACE
        place_actions = executor.generate_place_actions(drop_pos, is_final=True)
        print(f'\n🎮 8D ACTION VECTORS (PLACE):')
        for i, action in enumerate(place_actions, 1):
            print(f'   Step {i}: {executor.format_action(action)}')
            if action[0] == 1:  # Check for terminate flag
                print('   --- Stream Terminated ---')
        
        # Execute place
        print(f'\n▶️  Executing PLACE...')
        controller.place_and_release(drop_pos, cid)
        
        print('\n✅ Task completed!')
        print('-'*60)

    p.disconnect()
    print('\nSimulation ended. Goodbye!')

if __name__ == '__main__':
    main()