import os
import sys
import json
import argparse
import trimesh

def main():
    parser = argparse.ArgumentParser(description="Garment GLB Analyzer")
    parser.add_argument("--input", type=str, required=True, help="Path to input GLB/OBJ")
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(json.dumps({"ok": False, "msg": "File not found"}))
        return

    try:
        # Load the mesh
        scene = trimesh.load(args.input)
        
        if isinstance(scene, trimesh.Scene) and len(scene.geometry) == 0:
            print(json.dumps({"ok": False, "msg": f"No geometry found in scene. Keys: {list(scene.geometry.keys())}"}))
            return
            
        # Use bounds to get the bounding box of everything in the scene/mesh
        bounds = scene.bounds
        extents = bounds[1] - bounds[0]
        
        # In most 3D garments:
        # X: Width (Ancho)
        # Y: Height (Largo)
        # Z: Depth (Profundidad)
        # We assume units are meters, so we convert to cm
        
        width_cm = round(float(extents[0]) * 100, 2)
        height_cm = round(float(extents[1]) * 100, 2)
        depth_cm = round(float(extents[2]) * 100, 2)

        # Basic identification (if it's tall, it might be a trouser, if it's wide, it might be a shirt)
        # For now we just return the raw numbers
        
        result = {
            "ok": True,
            "measurements": {
                "ancho_cm": width_cm,
                "largo_cm": height_cm,
                "profundidad_cm": depth_cm,
                "brazo_cm": round(width_cm * 0.4, 2), # Mock estimated
                "pecho_cm": round(width_cm * 0.8, 2), # Mock estimated
                "cintura_cm": round(width_cm * 0.75, 2) # Mock estimated
            }
        }
        
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"ok": False, "msg": str(e)}))

if __name__ == "__main__":
    main()
