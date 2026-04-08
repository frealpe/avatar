import os
import torch
import smplx
import trimesh
import numpy as np

def generate_real_smplx(output_path, gender='neutral', betas=None):
    """
    Genera una malla SMPL-X real usando la librería y los archivos .pkl.
    """
    model_path = os.path.join(os.getcwd(), "models", "smplx")
    
    # Crear el modelo
    model = smplx.create(model_path, model_type='smplx',
                         gender=gender, use_face_contour=True,
                         num_betas=10, ext='pkl')

    # Parámetros por defecto (pose neutral)
    if betas is None:
        betas = torch.zeros([1, 10], dtype=torch.float32)
    else:
        betas = torch.tensor([betas], dtype=torch.float32)

    output = model(betas=betas, return_verts=True)
    vertices = output.vertices.detach().cpu().numpy().squeeze()
    faces = model.faces

    # Crear malla y exportar
    mesh = trimesh.Trimesh(vertices, faces)
    
    # Orientación: SMPL-X viene en un espacio diferente a veces, corregimos si es necesario
    # Por defecto trimesh exporta bien a GLB
    mesh.export(output_path)
    print(f"✨ SMPL-X REAL ({gender}) generado en: {output_path}")

def main():
    target_dir = os.path.join(os.getcwd(), "public", "avatars")
    os.makedirs(target_dir, exist_ok=True)
    
    # Definiciones de modelos para el catálogo
    # standard_male -> MALE
    # standard_female -> FEMALE
    # standard_curvy -> NEUTRAL o FEMALE con betas de curvas
    
    catalog_models = [
        ("standard_male.glb", "male", [0]*10),
        ("standard_female.glb", "female", [0]*10),
        ("standard_curvy.glb", "neutral", [2.0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    ]
    
    print("🚀 Iniciando generación de catálogo SMPL-X real...")
    
    for filename, gender, betas in catalog_models:
        path = os.path.join(target_dir, filename)
        try:
            generate_real_smplx(path, gender, betas)
        except Exception as e:
            print(f"❌ Error generando {filename}: {e}")
            print("⚠️ Cayendo en modo placeholder para este modelo...")
            # Aquí podrías llamar a la función de placeholder si falla
            
if __name__ == "__main__":
    main()
