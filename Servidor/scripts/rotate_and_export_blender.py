import bpy
import sys
import os
import math

# Usage: blender -b -P rotate_and_export_blender.py -- input.obj output.glb
argv = sys.argv
if "--" in argv:
    argv = argv[argv.index("--") + 1:]
else:
    argv = []

if len(argv) < 2:
    print("Usage: blender -b -P rotate_and_export_blender.py -- <input.obj> <output.glb>")
    sys.exit(1)

input_path = os.path.abspath(argv[0])
output_path = os.path.abspath(argv[1])

print(f"Importing OBJ: {input_path}")
print(f"Exporting GLB: {output_path}")

# Start with an empty scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import OBJ
try:
    bpy.ops.import_scene.obj(filepath=input_path)
except Exception as e:
    print('Failed to import OBJ:', e)
    sys.exit(2)

# Select all mesh objects and rotate 180 degrees on X to fix upside-down models
imported = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
if not imported:
    print('No mesh objects found after import')

for obj in imported:
    obj.select_set(True)
    # rotate -90 deg (-PI/2) on X as requested
    obj.rotation_euler[0] = (obj.rotation_euler[0] + (-math.pi / 2)) % (2 * math.pi)

# Make sure one object is active
if imported:
    bpy.context.view_layer.objects.active = imported[0]

# Apply rotations to bake them into the mesh
try:
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
except Exception as e:
    print('Warning: transform_apply failed or no objects selected:', e)

# Export to GLB
try:
    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB', export_apply=True)
    print('Export successful')
except Exception as e:
    print('Failed to export GLB:', e)
    sys.exit(3)
