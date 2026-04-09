import os
import sys
import numpy as np
import trimesh
import smplx
import torch
import lxml.etree as ET
import json
import argparse

def generate_vit_xml(measurements, output_path):
    root = ET.Element("vit")
    version = ET.SubElement(root, "version")
    version.text = "0.3.3"
    unit = ET.SubElement(root, "unit")
    unit.text = "cm"
    
    body_measurements = ET.SubElement(root, "body-measurements")
    for name, value in measurements.items():
        m = ET.SubElement(body_measurements, "m")
        m.set("name", name)
        m.set("value", f"{value:.2f}")
    
    tree = ET.ElementTree(root)
    tree.write(output_path, encoding='utf-8', xml_declaration=True, pretty_print=True)
    return output_path

def run_extraction(model_path, betas_vector, gender='neutral', pose_type='t-pose', output_vit=None, output_glb=None):
    device = torch.device('cpu')
    
    full_betas = list(betas_vector)
    if len(full_betas) < 10:
        full_betas += [0.0] * (10 - len(full_betas))
    
    num_betas = len(full_betas)
    model = smplx.create(model_path, model_type='smplx', gender=gender, use_pca=False, num_betas=num_betas).to(device)
    betas = torch.tensor([full_betas], dtype=torch.float32).to(device)
    
    # 1. GENERATE T-POSE FOR MEASUREMENTS
    output_t = model(betas=betas)
    vertices_t = output_t.vertices[0].detach().cpu().numpy()
    vertices_cm_t = vertices_t * 100
    mesh_cm_t = trimesh.Trimesh(vertices_cm_t, model.faces)
    
    # Calculate Measurements from T-Pose
    max_y = np.max(vertices_cm_t[:, 1])
    min_y = np.min(vertices_cm_t[:, 1])
    height = max_y - min_y
    
    def get_circ(y_level, mesh):
        section = mesh.section(plane_origin=[0, y_level, 0], plane_normal=[0, 1, 0])
        if section is None: return 0
        return section.length

    chest_y = min_y + (height * 0.72)
    waist_y = min_y + (height * 0.60)
    hips_y = min_y + (height * 0.48)
    
    joints_cm_t = output_t.joints[0].detach().cpu().numpy() * 100
    shoulder_width = np.linalg.norm(joints_cm_t[16] - joints_cm_t[17])

    measurements = {
        "height": float(height),
        "chest": float(get_circ(chest_y, mesh_cm_t)),
        "waist": float(get_circ(waist_y, mesh_cm_t)),
        "hips": float(get_circ(hips_y, mesh_cm_t)),
        "shoulder_width": float(shoulder_width)
    }

    # 2. GENERATE POSED MESH FOR GLB
    body_pose = torch.zeros((1, 63)).to(device)
    if pose_type in ['relaxed', 'modeling']:
        # L_Shoulder: 15, R_Shoulder: 16, L_Elbow: 17, R_Elbow: 18
        body_pose[0, 15*3 + 2] = 1.1 # L Shoulder down
        body_pose[0, 16*3 + 2] = -1.1 # R Shoulder down
        body_pose[0, 17*3 + 1] = -0.4 # L Elbow
        body_pose[0, 18*3 + 1] = 0.4  # R Elbow
        
        # Hombros un poco hacia atrás (X/Y balance)
        body_pose[0, 15*3 + 1] = 0.2
        body_pose[0, 16*3 + 1] = -0.2

        # Pose de pasarela: piernas estables pero naturales
        body_pose[0, 1*3] = 0.15 # L Hip forward
        body_pose[0, 2*3] = -0.1 # R Hip back

    output_p = model(betas=betas, body_pose=body_pose)
    vertices_p = output_p.vertices[0].detach().cpu().numpy()
    
    if output_glb:
        mesh_m_p = trimesh.Trimesh(vertices_p, model.faces)
        mesh_m_p.export(output_glb)
    
    if output_vit:
        generate_vit_xml(measurements, output_vit)
        
    return measurements

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--model_dir', type=str, required=True)
    parser.add_argument('--betas', type=float, nargs='+', required=True)
    parser.add_argument('--gender', type=str, default='neutral')
    parser.add_argument('--pose_type', type=str, default='t-pose')
    parser.add_argument('--output_vit', type=str)
    parser.add_argument('--output_glb', type=str)
    
    args = parser.parse_args()

    try:
        res = run_extraction(args.model_dir, args.betas, args.gender, args.pose_type, args.output_vit, args.output_glb)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
