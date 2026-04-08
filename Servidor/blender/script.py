import bpy
import sys
import os

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
            bpy.ops.object.convert(target='MESH')

            # Simple remesh/subdivision for cloth (Mocking complex logic)
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            # Mocking extruding / sewing here
            bpy.ops.object.mode_set(mode='OBJECT')

            # Move cloth piece slightly above/around avatar
            if avatar_obj:
                obj.location.y += 0.1
                obj.location.z += 1.0 # arbitrary position around torso

            # Add cloth modifier
            bpy.ops.object.modifier_add(type='CLOTH')
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
