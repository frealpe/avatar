import os
import sys
import numpy as np
import trimesh
import smplx
import torch
import lxml.etree as ET
import json
import argparse


# =========================
# XML GENERATOR
# =========================
def generate_vit_xml(measurements, output_path):
    root = ET.Element("vit")
    
    ET.SubElement(root, "version").text = "0.3.3"
    ET.SubElement(root, "unit").text = "cm"
    
    body_measurements = ET.SubElement(root, "body-measurements")
    
    for name, value in measurements.items():
        m = ET.SubElement(body_measurements, "m")
        m.set("name", name)
        m.set("value", f"{value:.2f}")
    
    tree = ET.ElementTree(root)
    tree.write(output_path, encoding='utf-8', xml_declaration=True, pretty_print=True)


# =========================
# SAFE SECTION
# =========================
def safe_section_length(mesh, y_level):
    try:
        section = mesh.section(
            plane_origin=[0, y_level, 0],
            plane_normal=[0, 1, 0]
        )
        if section is None:
            return 0.0
        return float(section.length)
    except:
        return 0.0


# =========================
# POSE BUILDER (FIX REAL 🔥)
# =========================

def euler_to_axis_angle(euler_angles):
    import numpy as np
    import math
    x, y, z = euler_angles

    cx, sx = math.cos(x), math.sin(x)
    cy, sy = math.cos(y), math.sin(y)
    cz, sz = math.cos(z), math.sin(z)

    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])

    R_mat = Rz @ Ry @ Rx

    angle = math.acos(np.clip((np.trace(R_mat) - 1) / 2, -1.0, 1.0))
    if angle < 1e-6:
        return [0.0, 0.0, 0.0]

    x_axis = R_mat[2, 1] - R_mat[1, 2]
    y_axis = R_mat[0, 2] - R_mat[2, 0]
    z_axis = R_mat[1, 0] - R_mat[0, 1]

    norm = math.sqrt(x_axis**2 + y_axis**2 + z_axis**2)
    if norm < 1e-6:
        return [0.0, 0.0, 0.0]

    return [angle * x_axis/norm, angle * y_axis/norm, angle * z_axis/norm]

def build_pose(pose_type, device, pose_data=None, **kwargs):
    body_pose = torch.zeros((1, 63), device=device)

    if pose_data:
        if 'shoulder_l' in pose_data and pose_data['shoulder_l']:
            body_pose[0, 16*3 : 16*3+3] = torch.tensor(euler_to_axis_angle(pose_data['shoulder_l']))
        if 'shoulder_r' in pose_data and pose_data['shoulder_r']:
            body_pose[0, 17*3 : 17*3+3] = torch.tensor(euler_to_axis_angle(pose_data['shoulder_r']))
        if 'elbow_l' in pose_data and pose_data['elbow_l']:
            body_pose[0, 18*3 : 18*3+3] = torch.tensor(euler_to_axis_angle(pose_data['elbow_l']))
        if 'elbow_r' in pose_data and pose_data['elbow_r']:
            body_pose[0, 19*3 : 19*3+3] = torch.tensor(euler_to_axis_angle(pose_data['elbow_r']))
    else:
        # Defaults for 'modeling' / 'a-pose'
        shoulder_l_z = kwargs.get('shoulder_l_z', -1.3)
        shoulder_r_z = kwargs.get('shoulder_r_z', -1.3)
        elbow_l_x = kwargs.get('elbow_l_x', 0.0)
        elbow_r_x = kwargs.get('elbow_r_x', 0.0)

        if pose_type in ['a-pose', 'modeling', 'relaxed']:
            body_pose[0, 16*3 + 2] = shoulder_l_z
            body_pose[0, 17*3 + 2] = shoulder_r_z
            body_pose[0, 18*3 + 0] = elbow_l_x
            body_pose[0, 19*3 + 0] = elbow_r_x

            if 'shoulder_l_x' not in kwargs: body_pose[0, 16*3 + 0] = 0.1
            if 'shoulder_r_x' not in kwargs: body_pose[0, 17*3 + 0] = 0.1

    return body_pose




# =========================
# MAIN
# =========================
def run_extraction(model_path, betas_vector, gender='neutral',
                   pose_type='t-pose', output_vit=None, output_glb=None, pose_data=None, **kwargs):


    device = torch.device('cpu')


    # =========================
    # BETAS
    # =========================
    full_betas = list(betas_vector)[:10]  # SMPL-X standard uses 10 betas
    if len(full_betas) < 10:
        full_betas += [0.0] * (10 - len(full_betas))


    betas = torch.tensor([full_betas], dtype=torch.float32, device=device)

    # =========================
    # MODEL
    # =========================
    # =========================
    # MODEL (With Auto-Fallback)
    # =========================
    try:
        model = smplx.create(
            model_path,
            model_type='smplx',
            gender=gender,
            use_pca=False,
            num_betas=len(full_betas)
        ).to(device)
    except Exception as e:
        print(f"⚠️ Warning: CUDA error detector: {str(e)}. Falling back to CPU.", file=sys.stderr)
        device = torch.device('cpu')
        model = smplx.create(
            model_path,
            model_type='smplx',
            gender=gender,
            use_pca=False,
            num_betas=len(full_betas)
        ).to(device)


    # =========================
    # T-POSE MEDIDAS
    # =========================
    output_t = model(betas=betas)

    vertices_t = output_t.vertices[0].detach().cpu().numpy()
    vertices_cm = vertices_t * 100

    mesh_cm = trimesh.Trimesh(vertices_cm, model.faces, process=False)

    max_y = np.max(vertices_cm[:, 1])
    min_y = np.min(vertices_cm[:, 1])
    height = max_y - min_y

    chest_y = min_y + (height * 0.72)
    waist_y = min_y + (height * 0.60)
    hips_y = min_y + (height * 0.48)

    joints_cm = output_t.joints[0].detach().cpu().numpy() * 100

    measurements = {
        "height": float(height),
        "chest": safe_section_length(mesh_cm, chest_y),
        "waist": safe_section_length(mesh_cm, waist_y),
        "hips": safe_section_length(mesh_cm, hips_y),
        "shoulder_width": float(
            np.linalg.norm(joints_cm[16] - joints_cm[17])
        )
    }

    # =========================
    # POSE FINAL
    # =========================
    body_pose = build_pose(pose_type, device, pose_data=pose_data, **kwargs)


    output_p = model(betas=betas, body_pose=body_pose)
    vertices_p = output_p.vertices[0].detach().cpu().numpy()

    # =========================
    # EXPORT GLB
    # =========================
    if output_glb:
        mesh = trimesh.Trimesh(vertices_p, model.faces, process=False)
        mesh.export(output_glb)

    # =========================
    # EXPORT VIT
    # =========================
    if output_vit:
        generate_vit_xml(measurements, output_vit)

    return measurements


# =========================
# CLI
# =========================
if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument('--model_dir', type=str, required=True)
    parser.add_argument('--betas', type=float, nargs='+', required=True)
    parser.add_argument('--gender', type=str, default='neutral')
    parser.add_argument('--pose_type', type=str, default='t-pose')
    parser.add_argument('--output_vit', type=str)

    parser.add_argument('--output_glb', type=str)
    
    # Dynamic Pose Args
    parser.add_argument('--shoulder_l_z', type=float)
    parser.add_argument('--shoulder_r_z', type=float)
    parser.add_argument('--elbow_l_x', type=float)
    parser.add_argument('--elbow_r_x', type=float)

    parser.add_argument('--pose_json', type=str, help='JSON string with full euler joint angles')


    args = parser.parse_args()

    try:


        pose_kwargs = {
            'shoulder_l_z': args.shoulder_l_z,
            'shoulder_r_z': args.shoulder_r_z,
            'elbow_l_x': args.elbow_l_x,
            'elbow_r_x': args.elbow_r_x
        }
        pose_kwargs = {k: v for k, v in pose_kwargs.items() if v is not None}

        pose_data = None
        if args.pose_json:
            try:
                pose_data = json.loads(args.pose_json)
            except Exception as e:
                pass

        result = run_extraction(
            args.model_dir,
            args.betas,
            args.gender,
            args.pose_type,
            args.output_vit,
            args.output_glb,
            pose_data=pose_data,
            **pose_kwargs
        )


        print(json.dumps(result))


    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)