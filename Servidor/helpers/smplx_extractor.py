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
    """
    Genera un archivo .vit compatible con Seamly2D.
    """
    root = ET.Element("vit")
    version = ET.SubElement(root, "version")
    version.text = "0.3.3"
    unit = ET.SubElement(root, "unit")
    unit.text = "cm"
    
    personal = ET.SubElement(root, "personal")
    # Nota: Quitamos <custom> para compatibilidad segun logs previos
    for name, value in measurements.items():
        m = ET.SubElement(personal, "m")
        m.set("name", name)
        m.set("value", f"{value:.2f}")
        m.set("description", "")
        m.set("full_description", "")

    tree = ET.ElementTree(root)
    tree.write(output_path, encoding='utf-8', xml_declaration=True, pretty_print=True)
    return output_path

def run_extraction(model_path, betas_vector, gender='neutral', output_vit=None, output_glb=None):
    """
    Extrae medidas y genera malla de un modelo SMPL-X.
    """
    # Usar CPU para evitar problemas de drivers en headless servers
    device = torch.device('cpu')
    
    # Cargar modelo
    model = smplx.create(model_path, model_type='smplx', gender=gender, use_pca=False).to(device)
    
    betas = torch.tensor([betas_vector], dtype=torch.float32).to(device)
    output = model(betas=betas)
    vertices = output.vertices[0].detach().cpu().numpy()
    
    # 1. Exportar Malla (GLB)
    # Importante: Para visualización, solemos usar metros o aplicar escala en el viewer
    # Pero para trimesh y cálculos, pasamos a CM
    vertices_cm = vertices * 100
    mesh_cm = trimesh.Trimesh(vertices_cm, model.faces)
    
    if output_glb:
        # Exportamos en metros para que el visor 3D no lo vea gigante
        mesh_m = trimesh.Trimesh(vertices, model.faces)
        mesh_m.export(output_glb)
        print(f"DEBUG: Malla guardada en {output_glb}")

    # 2. Medidas (en cm)
    max_y = np.max(vertices_cm[:, 1])
    min_y = np.min(vertices_cm[:, 1])
    height = max_y - min_y
    
    def get_circ(y_level):
        section = mesh_cm.section(plane_origin=[0, y_level, 0], plane_normal=[0, 1, 0])
        if section is None: return 0
        return section.length

    chest_y = min_y + (height * 0.72)
    waist_y = min_y + (height * 0.60)
    hips_y = min_y + (height * 0.48)
    
    measurements = {
        "height": float(height),
        "chest": float(get_circ(chest_y)),
        "waist": float(get_circ(waist_y)),
        "hips": float(get_circ(hips_y)),
        "shoulder_width": float(np.linalg.norm(vertices_cm[model.joints[0, 16]] - vertices_cm[model.joints[0, 17]]))
    }
    
    if output_vit:
        generate_vit_xml(measurements, output_vit)
        print(f"DEBUG: VIT guardado en {output_vit}")
        
    return measurements

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='SMPL-X Measurement & Mesh Extractor')
    parser.add_argument('--model_dir', type=str, default='./models/smplx', help='Path to SMPL-X models')
    parser.add_argument('--betas', type=float,勇nargs='+', default=[0.0]*10, help='10 shape parameters')
    parser.add_argument('--gender', type=str, default='neutral', choices=['male', 'female', 'neutral'])
    parser.add_argument('--output_vit', type=str, help='Path to save Seamly2D .vit file')
    parser.add_argument('--output_glb', type=str, help='Path to save 3D mesh .glb')
    
    args = parser.parse_args()

    if not os.path.exists(args.model_dir):
        print(json.dumps({"error": f"Model directory {args.model_dir} not found"}))
        sys.exit(1)

    try:
        res = run_extraction(args.model_dir, args.betas, args.gender, args.output_vit, args.output_glb)
        # Devolver JSON al stdout para que Node.js lo capture
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
