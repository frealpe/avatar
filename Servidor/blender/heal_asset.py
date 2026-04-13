import bpy
import sys
import os
import numpy as np

# =========================
# NUMPY FIX FOR BLENDER 3.x
# =========================
if not hasattr(np, 'bool'):
    np.bool = bool

def heal_file(filepath):
    print(f"Healing {filepath}...")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=filepath)
    
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            bpy.context.view_layer.objects.active = obj
            
            # Heal
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.mesh.remove_doubles(threshold=0.001)
            bpy.ops.mesh.fill_holes(sides=0)
            bpy.ops.mesh.normals_make_consistent(inside=False)
            bpy.ops.object.mode_set(mode='OBJECT')
            
            mod_smooth = obj.modifiers.new("HealSmooth", 'SMOOTH')
            mod_smooth.iterations = 10
            bpy.ops.object.modifier_apply(modifier="HealSmooth")
            bpy.ops.object.shade_smooth()

    bpy.ops.export_scene.gltf(filepath=filepath, export_format='GLB', export_apply=True)
    print(f"Saved healed file to {filepath}")

if __name__ == "__main__":
    heal_file(sys.argv[-1])
