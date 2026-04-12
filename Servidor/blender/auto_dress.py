import bpy
import sys
import os
import numpy as np

# =========================
# NUMPY FIX
# =========================
if not hasattr(np, 'bool'):
    np.bool = bool

from mathutils import Vector

# =========================
# GPU SETUP
# =========================
def enable_gpu():
    print("[ENGINE] Activando GPU...", flush=True)

    prefs = bpy.context.preferences
    cycles = prefs.addons['cycles'].preferences

    for backend in ['OPTIX', 'CUDA', 'HIP']:
        try:
            cycles.compute_device_type = backend
            print(f"[ENGINE] Backend: {backend}")
            break
        except:
            continue

    for device in cycles.devices:
        device.use = True
        print(f"[ENGINE] Device: {device.name}")

    bpy.context.scene.cycles.device = 'GPU'

# =========================
# CLEAN
# =========================
def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

# =========================
# IMPORT
# =========================
def import_glb(path):
    pre = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    post = set(bpy.data.objects)
    return list(post - pre)

# =========================
# NORMALIZE
# =========================
def normalize(obj):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

# =========================
# BBOX
# =========================
def bbox(obj):
    pts = [obj.matrix_world @ Vector(v) for v in obj.bound_box]
    min_v = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    max_v = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return min_v, max_v, max_v - min_v

# =========================
# SHAPE KEYS (PIPELINE HIBRIDO)
# =========================
def create_shape_keys(obj):
    print("[ENGINE] Generando Shape Keys...", flush=True)

    bpy.context.view_layer.objects.active = obj

    if not obj.data.shape_keys:
        obj.shape_key_add(name="Basis")

    # SLIM
    sk_slim = obj.shape_key_add(name="Slim")
    for v in obj.data.vertices:
        sk_slim.data[v.index].co = v.co * Vector((0.95, 0.95, 1.0))

    # LARGE
    sk_large = obj.shape_key_add(name="Large")
    for v in obj.data.vertices:
        sk_large.data[v.index].co = v.co * Vector((1.08, 1.08, 1.0))

    print("[ENGINE] Shape Keys OK")

# =========================
# MAIN PIPELINE
# =========================
def run(av_path, cloth_path, out_path):

    print("\n[ENGINE] ===== AUTO DRESS PRO =====\n", flush=True)

    clean_scene()
    enable_gpu()

    # CPU THREADS
    bpy.context.scene.render.threads_mode = 'AUTO'
    bpy.context.scene.render.threads = os.cpu_count()

    # =========================
    # IMPORT AVATAR
    # =========================
    av_objs = import_glb(av_path)
    avatar = next(o for o in av_objs if o.type == 'MESH')
    armature = next((o for o in av_objs if o.type == 'ARMATURE'), None)

    normalize(avatar)
    av_min, av_max, av_dim = bbox(avatar)

    # =========================
    # IMPORT GARMENT
    # =========================
    g_objs = import_glb(cloth_path)
    meshes = [o for o in g_objs if o.type == 'MESH']
    if not meshes:
        print("[ENGINE] ERROR: No meshes found in garment")
        return

    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        for m in meshes:
            m.select_set(True)
        bpy.ops.object.join()

    cloth = bpy.context.view_layer.objects.active
    normalize(cloth)

    g_min, g_max, g_dim = bbox(cloth)

    # =========================
    # SMART SCALE
    # =========================
    scale = min(av_dim.x/g_dim.x, av_dim.y/g_dim.y, av_dim.z/g_dim.z) * 1.05
    cloth.scale = (scale, scale, scale)
    bpy.ops.object.transform_apply(scale=True)

    # =========================
    # POSITION
    # =========================
    cloth.location = avatar.location
    bpy.ops.object.transform_apply(location=True)

    # =========================
    # SOLIDIFY
    # =========================
    mod_sol = cloth.modifiers.new("Solidify", 'SOLIDIFY')
    mod_sol.thickness = 0.003

    # =========================
    # SURFACE DEFORM
    # =========================
    mod_sd = cloth.modifiers.new("SurfaceDeform", 'SURFACE_DEFORM')
    mod_sd.target = avatar

    bpy.context.view_layer.objects.active = cloth
    bpy.ops.object.surfacedeform_bind(modifier=mod_sd.name)

    # =========================
    # ARMATURE
    # =========================
    if armature:
        cloth.parent = armature
        mod_arm = cloth.modifiers.new("Armature", 'ARMATURE')
        mod_arm.object = armature

    # =========================
    # COLLISION
    # =========================
    bpy.context.view_layer.objects.active = avatar
    bpy.ops.object.modifier_add(type='COLLISION')
    avatar.collision.thickness_outer = 0.003

    # =========================
    # PRE-RELAX
    # =========================
    bpy.context.view_layer.objects.active = cloth
    for i in range(3):
        mod_sm = cloth.modifiers.new(name=f"Smooth_{i}", type='SMOOTH')
        mod_sm.iterations = 5
        bpy.ops.object.modifier_apply(modifier=mod_sm.name)

    # =========================
    # CLOTH
    # =========================
    bpy.ops.object.modifier_add(type='CLOTH')
    cloth_mod = cloth.modifiers["Cloth"]

    cloth_mod.settings.quality = 10
    cloth_mod.settings.mass = 0.3
    cloth_mod.settings.tension_stiffness = 25
    cloth_mod.settings.compression_stiffness = 25
    cloth_mod.settings.shear_stiffness = 20
    cloth_mod.settings.bending_stiffness = 5
    cloth_mod.settings.air_damping = 1

    cloth_mod.collision_settings.use_collision = True
    cloth_mod.collision_settings.use_self_collision = True
    cloth_mod.collision_settings.distance_min = 0.003

    # =========================
    # GRAVITY
    # =========================
    bpy.context.scene.gravity = (0, 0, -4)

    # =========================
    # SIMULATION
    # =========================
    frames = 60
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = frames

    print("[ENGINE] Simulando...", flush=True)
    for f in range(1, frames+1):
        bpy.context.scene.frame_set(f)
        # Feed progress every 5 frames for smoothness
        if f % 5 == 0 or f == 1:
            print(f"[ENGINE] Frame {f}/{frames}", flush=True)

    # =========================
    # APPLY MODIFIERS
    # =========================
    bpy.context.view_layer.objects.active = cloth
    
    # Aplicar modificadores de arriba hacia abajo (excepto armature)
    # Se usa una lista estática para evitar problemas al modificar la colección
    mod_names = [m.name for m in cloth.modifiers if m.type != 'ARMATURE']
    for name in mod_names:
        try:
            bpy.ops.object.modifier_apply(modifier=name)
        except:
            print(f"[ENGINE] Warning: Could not apply {name}")

    # =========================
    # SHAPE KEYS (PIPELINE WEB)
    # =========================
    create_shape_keys(cloth)

    # =========================
    # OPTIMIZATION
    # =========================
    if len(cloth.data.vertices) > 50000:
        mod_dec = cloth.modifiers.new("Decimate", 'DECIMATE')
        mod_dec.ratio = 0.5
        bpy.ops.object.modifier_apply(modifier="Decimate")

    # =========================
    # EXPORT WEB READY
    # =========================
    print("[ENGINE] Exportando...", flush=True)

    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        export_apply=True,
        # Draco disabled to avoid missing library issues (libextern_draco.so)
        export_draco_mesh_compression_enable=False 
    )

    print("\n[ENGINE] ✅ PIPELINE COMPLETO\n", flush=True)

# =========================
# ENTRY
# =========================
if __name__ == "__main__":
    argv = sys.argv
    args = argv[argv.index("--") + 1:]

    run(args[0], args[1], args[2])