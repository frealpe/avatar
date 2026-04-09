import bpy
import sys
import os
import numpy as np

# Industrial Patch: NumPy 1.24+ compatibility for Blender 3.x
if not hasattr(np, 'bool'):
    np.bool = bool

print("[ENGINE] STATUS: Blender script loaded and np.bool patched.")

def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def setup_cloth_simulation(avatar_path, svg_path, output_path):
    clean_scene()

    # 1. Import Avatar (.glb)
    if os.path.exists(avatar_path):
        bpy.ops.import_scene.gltf(filepath=avatar_path)

    # Set avatar as collision object
    avatar_obj = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            avatar_obj = obj
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.modifier_add(type='COLLISION')
            break

    # 2. Import SVG
    if os.path.exists(svg_path):
        bpy.ops.import_curve.svg(filepath=svg_path)

    # 3. Convert curves to mesh & process cloth pieces
    cloth_objects = []
    for obj in bpy.context.scene.objects:
        if obj.type == 'CURVE':
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            
            # Convert to Mesh
            bpy.ops.object.convert(target='MESH')
            
            # --- INDUSTRIAL MESH RECONSTRUCTION ---
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            
            # 3.1 Create faces (Required for Cloth)
            # Try to build faces from the SVG outlines
            bpy.ops.mesh.edge_face_add() 
            
            # Triangulate to ensure good topology for simulation
            bpy.ops.mesh.quads_convert_to_tris(quad_method='BEAUTY', poly_method='BEAUTY')
            
            # Basic Mesh Quality (Merge by distance)
            bpy.ops.mesh.remove_doubles(threshold=0.001)
            
            # Add thickness (Solidify)
            bpy.ops.object.mode_set(mode='OBJECT')
            
            # Scale fix: Seamly2D SVGs are often in points/pixels. 
            # We scale them to be roughly 10-50cm wide if they are too small.
            # Default SVG import in Blender is often 0.001 scale.
            obj.scale = (10.0, 10.0, 10.0) # 10x scale jump for visibility
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

            bpy.ops.object.modifier_add(type='SOLIDIFY')
            obj.modifiers["Solidify"].thickness = 0.002 # 2mm is enough for simulations
            
            # 3.2 Position around Avatar (Torso alignment)
            if avatar_obj:
                # Get avatar center
                avatar_center = avatar_obj.location
                # Reset cloth location to center
                obj.location = avatar_center
                # Move slightly in front (Y+) and at chest height (Z+)
                obj.location.y += 0.15 
                obj.location.z += 1.0 # Chest height approximation
                
                # Scale SVG to real-world dimensions (Approximate multiplier if needed)
                # Blender imports 1 unit = 1 meter usually, but SVGs can be small
                # obj.scale = (1.0, 1.0, 1.0) 

            # 3.3 Add cloth modifier
            bpy.ops.object.modifier_add(type='CLOTH')
            obj.modifiers["Cloth"].settings.tension_stiffness = 15
            obj.modifiers["Cloth"].settings.compression_stiffness = 15
            
            cloth_objects.append(obj)

    # 4. Simulate (frames 1-150)
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 150

    # Simple bake simulation loop (mock implementation for headless run)
    for frame in range(1, 151):
        bpy.context.scene.frame_set(frame)

    # 5. Apply modifiers
    for obj in cloth_objects:
        bpy.context.view_layer.objects.active = obj
        for mod in obj.modifiers:
            bpy.ops.object.modifier_apply(modifier=mod.name)

    # Remove avatar so we only export the cloth, or export both?
    # The requirement says "prenda.glb (NUEVO)" so we export only the cloth
    if avatar_obj:
        bpy.data.objects.remove(avatar_obj, do_unlink=True)

    # Remove any unwanted objects
    for obj in bpy.context.scene.objects:
        if obj not in cloth_objects and obj.type != 'MESH':
            bpy.data.objects.remove(obj, do_unlink=True)

    # 6. Export .glb
    bpy.ops.export_scene.gltf(filepath=output_path, use_selection=False)

if __name__ == "__main__":
    # Ensure correct arguments are passed after '--'
    try:
        argv = sys.argv
        if "--" not in argv:
            print("Error: '--' separator not found in arguments.")
            sys.exit(1)

        args = argv[argv.index("--") + 1:]
        if len(args) < 3:
            print("Usage: blender -b -P script.py -- <avatar.glb> <pattern.svg> <output.glb>")
            sys.exit(1)

        avatar_path = args[0]
        svg_path = args[1]
        output_path = args[2]

        setup_cloth_simulation(avatar_path, svg_path, output_path)
        print("Cloth simulation completed successfully.")

    except Exception as e:
        print(f"Error during simulation: {e}")
        sys.exit(1)
