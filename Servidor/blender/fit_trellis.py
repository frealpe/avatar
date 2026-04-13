import bpy
import sys
import os
import math
from mathutils import Vector

# [ENGINE] NumPy 1.24+ compatibility for Blender 3.x
import numpy as np
if not hasattr(np, 'bool'):
    np.bool = bool

def log(msg):
    print(f"[FIT_TRELLIS] {msg}", flush=True)

def ensure_active(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

def bbox(obj):
    """Returns (min, max, dimensions, center) of an object's bounding box."""
    pts = [obj.matrix_world @ Vector(v) for v in obj.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    dim = mx - mn
    center = (mn + mx) / 2.0
    return mn, mx, dim, center

def import_obj(filepath):
    pre = set(bpy.data.objects)
    if hasattr(bpy.ops.wm, 'obj_import'):
        # Blender 4.0+
        bpy.ops.wm.obj_import(filepath=filepath)
    else:
        # Blender 3.x
        bpy.ops.import_scene.obj(filepath=filepath)
    new_objs = list(set(bpy.data.objects) - pre)
    if new_objs:
        return new_objs[0]
    return None

def process_fitting(avatar_path, trellis_path, output_path):
    log(f"Starting fitting process.")
    log(f"Avatar: {avatar_path}")
    log(f"Garment (Trellis): {trellis_path}")
    log(f"Output: {output_path}")

    # Clean Scene
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for block in bpy.data.meshes: bpy.data.meshes.remove(block)

    # 1. Import Avatar
    avatar_obj = import_obj(avatar_path)
    if not avatar_obj:
        log("CRITICAL ERROR: Failed to import Avatar.")
        sys.exit(1)

    avatar_obj.name = "Avatar"
    ensure_active(avatar_obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # 2. Import Garment
    garment_obj = import_obj(trellis_path)
    if not garment_obj:
        log("CRITICAL ERROR: Failed to import Garment.")
        sys.exit(1)

    garment_obj.name = "Garment"
    ensure_active(garment_obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # 3. Scale Normalization (95% of avatar width)
    av_mn, av_mx, av_dim, av_center = bbox(avatar_obj)
    g_mn, g_mx, g_dim, g_center = bbox(garment_obj)

    target_width = av_dim.x * 0.95
    if g_dim.x > 0.001:
        scale_factor = target_width / g_dim.x
        garment_obj.scale = (scale_factor, scale_factor, scale_factor)
        bpy.ops.object.transform_apply(scale=True)
        log(f"Scaled garment by factor: {scale_factor:.4f}")

    # Recalculate garment bounds after scaling
    g_mn, g_mx, g_dim, g_center = bbox(garment_obj)

    # 4. Alignment (Center Torso using BBox)
    # Align X and Y centers
    offset_x = av_center.x - g_center.x
    offset_y = av_center.y - g_center.y
    # Align to upper part of body roughly, assuming dress covers torso
    # Let's align centers in Z as a starting point.
    offset_z = av_center.z - g_center.z

    garment_obj.location = (offset_x, offset_y, offset_z)
    bpy.ops.object.transform_apply(location=True)
    log("Aligned garment to avatar center.")

    # 5. Mesh Cleanup (Laplacian Smooth)
    ensure_active(garment_obj)
    mod_smooth = garment_obj.modifiers.new("LaplaceSmooth", 'LAPLACIANSMOOTH')
    mod_smooth.iterations = 5
    mod_smooth.lambda_factor = 1.0
    bpy.ops.object.modifier_apply(modifier=mod_smooth.name)
    log("Applied Laplacian Smooth.")

    # 6. Geometric Fitting (Shrinkwrap Target Project)
    mod_shrink = garment_obj.modifiers.new("Shrinkwrap", 'SHRINKWRAP')
    mod_shrink.target = avatar_obj
    mod_shrink.wrap_method = 'TARGET_PROJECT'
    mod_shrink.wrap_mode = 'OUTSIDE_SURFACE'
    mod_shrink.offset = 0.005 # 5mm offset to prevent Z-fighting
    bpy.ops.object.modifier_apply(modifier=mod_shrink.name)
    log("Applied Shrinkwrap fitting.")

    # 7. Weight Transfer (Data Transfer)
    mod_dt = garment_obj.modifiers.new("WeightTransfer", 'DATA_TRANSFER')
    mod_dt.object = avatar_obj
    mod_dt.use_vert_data = True
    mod_dt.data_types_verts = {'VGROUP_WEIGHTS'}
    mod_dt.vert_mapping = 'POLYINTERP_NEAREST'

    # Generate data layout for vertex groups
    try:
        bpy.ops.object.datalayout_transfer(modifier=mod_dt.name)
        log("Data layout generated for Vertex Groups.")
    except Exception as e:
        log(f"Warning: datalayout_transfer failed: {e}")

    bpy.ops.object.modifier_apply(modifier=mod_dt.name)
    log("Applied Data Transfer for Weights.")

    # Look for Armature in scene (if imported avatar was actually a glb with bones, though obj doesnt have bones.
    # The requirement said to link armature if it exists in avatar, but .obj usually doesn't have armature.
    # We'll just check if there is an armature object.
    armature = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            armature = obj
            break

    if armature:
        garment_obj.parent = armature
        garment_obj.matrix_parent_inverse = armature.matrix_world.inverted()
        mod_arm = garment_obj.modifiers.new("Armature", 'ARMATURE')
        mod_arm.object = armature
        log("Armature modifier linked.")

    # 8. Export as GLB
    bpy.ops.object.select_all(action='DESELECT')
    avatar_obj.select_set(True)
    garment_obj.select_set(True)
    if armature:
        armature.select_set(True)

    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True
    )
    log(f"Exported final GLB to: {output_path}")

if __name__ == "__main__":
    argv = sys.argv
    if "--" not in argv:
        log("ERROR: No '--' separator in args")
        sys.exit(1)

    args = argv[argv.index("--") + 1:]
    if len(args) < 3:
        log("Usage: blender -b -P fit_trellis.py -- <avatar.obj> <vestido_trellis.obj> <output.glb>")
        sys.exit(1)

    avatar_path = args[0]
    trellis_path = args[1]
    output_path = args[2]

    process_fitting(avatar_path, trellis_path, output_path)
