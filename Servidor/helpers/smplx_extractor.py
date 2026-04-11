import os
os.environ['WARP_LOG_LEVEL'] = 'ERR'
import sys
import json
import argparse
import numpy as np
import torch
import trimesh
import anny
from anny.anthropometry import Anthropometry

def main():
    parser = argparse.ArgumentParser(description="Anny Model Extractor")
    parser.add_argument("--model_dir", type=str, help="Path to models (not used by anny but kept for compatibility)")
    parser.add_argument("--betas", type=float, nargs="+", help="10-12 shape parameters")
    parser.add_argument("--gender", type=str, default="neutral", help="male, female or neutral")
    parser.add_argument("--pose_type", type=str, default="t-pose", help="t-pose, a-pose")
    parser.add_argument("--output_glb", type=str, required=True, help="Output GLB path")
    parser.add_argument("--output_vit", type=str, help="Output VIT path (optional)")
    parser.add_argument("--scales", type=str, help="Local scales in JSON format (head, torso, arms, legs)")
    parser.add_argument("--shoulder_l_z", type=float)
    parser.add_argument("--shoulder_r_z", type=float)
    parser.add_argument("--elbow_l_x", type=float)
    parser.add_argument("--elbow_r_x", type=float)

    args = parser.parse_args()

    # 1. Initialize ANNY model with all phenotypes (needed for cupsize/firmness)
    model = anny.create_fullbody_model(all_phenotypes=True)
    anthro = Anthropometry(model)

    # 2. Map Betas to ANNY Phenotypes
    # ['gender', 'age', 'muscle', 'weight', 'height', 'proportions', 'cupsize', 'firmness', ...]
    def normalize_beta(idx, default=0.5, invert=False):
        if args.betas and len(args.betas) > idx:
            val = args.betas[idx]
            if invert: val = -val
            # Normalize [-5, 5] to [0, 1]
            return float(np.clip((val + 2) / 4, 0.0, 1.0))
        return default

    gender_val = 0.5 # Default neutral
    if args.gender == "male" or args.gender == "male-only": gender_val = 0.0
    elif args.gender == "female": gender_val = 1.0
    
    phenotypes = {
        'gender': gender_val,
        'height': normalize_beta(0),   # Beta 0 -> Estatura
        'weight': normalize_beta(1),   # Beta 1 -> Peso
        'muscle': normalize_beta(2),   # Beta 2 -> Complexión
        'proportions': normalize_beta(3, invert=True), # Beta 3 -> Hombros
        'age': normalize_beta(4, 0.5), # Beta 4 -> Cadera (mapped to age/global for now)
        'cupsize': normalize_beta(11, 0.5), # Beta 11 -> Busto / Pecho
        'firmness': 0.5
    }

    # Set default values for race if not provided
    for race in ['african', 'asian', 'caucasian']:
        phenotypes[race] = 1.0/3.0

    # 2.1 Extract implicit scales from additional betas if --scales not provided
    implicit_scales = {}
    if args.betas:
        def beta_to_scale(idx, default=1.0):
            if len(args.betas) > idx:
                val = args.betas[idx]
                # Map [-5, 5] to [0.7, 1.3]
                return float(np.clip(1.0 + (val * 0.06), 0.7, 1.3))
            return default
            
        implicit_scales['head'] = beta_to_scale(9)  # Beta 9 -> Cabeza
        implicit_scales['head'] *= (beta_to_scale(7) * 0.5 + 0.5) # Beta 7 (Cuello) impacts head too
        implicit_scales['legs'] = beta_to_scale(5)  # Beta 5 -> Piernas
        implicit_scales['arms'] = beta_to_scale(10) # Beta 10 -> Brazos
        implicit_scales['torso'] = beta_to_scale(6) # Beta 6 -> Cintura
        implicit_scales['torso'] *= (beta_to_scale(8) * 0.5 + 0.5) # Beta 8 (Profundidad) impacts torso
        # Cadera (4) is handled by Age/Proportions mostly, but could impact Torso-Lower or Legs-Upper

    # 3. Generate Mesh
    with torch.no_grad():
        result = model.forward(phenotype_kwargs=phenotypes)
        vertices = result['vertices'][0].detach().cpu().numpy()
        faces = model.faces.detach().cpu().numpy()

    # 3.1 Apply Local Scales if provided
    active_scales = None
    if args.scales:
        try:
            active_scales = json.loads(args.scales)
        except Exception as e:
            print(f"Error parsing scales argument: {e}", file=sys.stderr)
    elif implicit_scales:
        active_scales = implicit_scales

    if active_scales:
        try:
            # Define regions (Anny is Z-up, height ~1.6m, hips at ~0)
            # Head: > 0.55
            # Torso: -0.1 to 0.55
            # Legs: < -0.1
            # Arms: |X| > 0.25 (and Z > -0.1)
            
            s_head = active_scales.get('head', 1.0)
            s_torso = active_scales.get('torso', 1.0)
            s_arms = active_scales.get('arms', 1.0)
            s_legs = active_scales.get('legs', 1.0)

            # Apply Head
            head_mask = vertices[:, 2] > 0.55
            vertices[head_mask] *= s_head
            
            # Apply Arms (Rough approximation by X distance)
            arms_mask = (np.abs(vertices[:, 0]) > 0.25) & (vertices[:, 2] > -0.1)
            vertices[arms_mask] *= s_arms
            
            # Apply Legs
            legs_mask = vertices[:, 2] < -0.1
            vertices[legs_mask] *= s_legs
            
            # Apply Torso (The rest)
            torso_mask = ~(head_mask | arms_mask | legs_mask)
            vertices[torso_mask] *= s_torso

        except Exception as e:
            print(f"Error applying scales: {e}", file=sys.stderr)

    # 4. Create Trimesh and Export
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
    
    # Rotate -90 degrees around X to convert Z-up (Anny) to Y-up (Three.js/GLB)
    rotation = trimesh.transformations.rotation_matrix(np.radians(-90), [1, 0, 0])
    mesh.apply_transform(rotation)
    
    # Ensure directory exists
    dir_name = os.path.dirname(args.output_glb)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    mesh.export(args.output_glb)

    # 5. Calculate Biometrics
    measurements = anthro(result['vertices'])
    
    # result structure for controller
    output_biometrics = {
        "height": float(measurements['height'].item() * 100), # to cm
        "waist": float(measurements['waist_circumference'].item() * 100),
        "weight": float(measurements['mass'].item()),
        "bmi": float(measurements['bmi'].item()),
        "chest": float(measurements['waist_circumference'].item() * 1.1 * 100), # Mocked relation
        "hips": float(measurements['waist_circumference'].item() * 1.2 * 100)  # Mocked relation
    }

    # 6. Save VIT if requested
    if args.output_vit:
        with open(args.output_vit, 'w') as f:
            json.dump(output_biometrics, f)

    # Output JSON to stdout for the controller to pick up
    print(json.dumps(output_biometrics))

if __name__ == "__main__":
    main()