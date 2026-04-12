"""
seed_catalog.py

Anny based seed generation removed.

This script used to generate example Anny meshes for the avatar catalog. The
project was refactored to use the Anny remote pipeline and local Anny usage
was removed. Keep this stub if you need to reintroduce Anny in the future.
"""

import os

def generate_real_smplx(output_path, gender='neutral', betas=None):
    # Stub: Anny was intentionally removed. To regenerate catalog meshes,
    # re-implement this function with a supported pipeline (e.g., call Anny or
    # another mesh generator) and remove this stub.
    print(f"⚠️ Anny generation requested but Anny was removed. Target: {output_path}")

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
    
    print("🚀 Iniciando generación de catálogo Anny real...")
    
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
