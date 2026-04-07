import sys
import os
import time

from pose import extract_pose
from segment import segment_clothing
from detect_cloth import detect_clothing_type
from pattern import extract_contours
from generate_avatar import generate_smpl_avatar
from generate_blender import run_blender_simulation

def main(image_path, output_glb_path):
    print("=" * 40)
    print(" COSTURERO IA DIGITAL - AI PIPELINE")
    print("=" * 40)

    # 1. Detect Clothing Type
    cloth_info = detect_clothing_type(image_path)
    print(f"[*] Detected: {cloth_info['type']} (Confidence: {cloth_info['confidence']})")
    time.sleep(0.5)

    # 2. Extract Pose
    pose_data = extract_pose(image_path)
    print(f"[*] Extracted Pose Parameters: {pose_data['pose']}")
    time.sleep(0.5)

    # 3. Generate SMPL Avatar
    avatar_info = generate_smpl_avatar(pose_data)
    print(f"[*] Avatar Generated: {avatar_info['avatar_obj']}")
    time.sleep(0.5)

    # 4. Segment Image using SAM
    mask_info = segment_clothing(image_path)
    print(f"[*] Image Segmented: {mask_info['mask_path']}")
    time.sleep(0.5)

    # 5. Extract Contours
    pattern_data = extract_contours(mask_info)
    print(f"[*] Extracted {len(pattern_data['vertices'])} vertices for cloth pattern")
    time.sleep(0.5)

    # 6. Blender Simulation
    print("[*] Starting Blender Simulation Pipeline...")
    success = run_blender_simulation(pattern_data['vertices'], avatar_info['avatar_obj'], output_glb_path)

    if success:
        print("\n[SUCCESS] Pipeline finished successfully.")
        print(f"Output saved to: {output_glb_path}")
    else:
        print("\n[ERROR] Pipeline failed during simulation.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python main.py <input_image_path> <output_glb_path>")
        sys.exit(1)

    in_img = sys.argv[1]
    out_glb = sys.argv[2]
    main(in_img, out_glb)
