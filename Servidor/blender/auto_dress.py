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
# HEAL MESH (SANACIÓN)
# =========================
def heal_mesh(obj):
    print("[ENGINE] Sanando malla (Fusión + Sellado de Huecos + Normales)...", flush=True)
    bpy.context.view_layer.objects.active = obj
    
    # 1. Asegurar que estamos en modo objeto para aplicar escala
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # 2. Entrar en modo edición para operaciones de malla
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    
    # Fusionar vértices muy cercanos (Weld)
    bpy.ops.mesh.remove_doubles(threshold=0.001)
    
    # Sellar huecos (Fill Holes)
    # sides=0 intenta sellar todos los huecos independientemente del número de lados
    bpy.ops.mesh.fill_holes(sides=0)
    
    # Corregir normales (Hacia afuera)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    
    # 3. Volver a modo objeto
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # 4. Modificador de Suavizado (Smooth) para un acabado premium
    mod_smooth = obj.modifiers.new("FinalSmooth", 'SMOOTH')
    mod_smooth.iterations = 10
    mod_smooth.factor = 0.5
    bpy.ops.object.modifier_apply(modifier="FinalSmooth")
    
    # 5. Sombreado suave
    bpy.ops.object.shade_smooth()
    
    print("[ENGINE] Sanación completada", flush=True)

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
    # POSITION (TORSO ALIGNMENT)
    # =========================
    cloth.location = avatar.location

    # Align to torso based on bounding box
    av_center_z = av_min.z + av_dim.z / 2.0
    cloth_center_z = g_min.z + g_dim.z / 2.0 * scale
    cloth.location.z += (av_center_z - cloth_center_z)

    bpy.ops.object.transform_apply(location=True)

    # =========================
    # SHRINKWRAP (FITTING)
    # =========================
    # Adapt garment closer to the avatar to prevent clipping and improve alignment
    mod_shrink = cloth.modifiers.new("Shrinkwrap", 'SHRINKWRAP')
    mod_shrink.target = avatar
    mod_shrink.offset = 0.005 # 5mm offset to prevent clipping
    mod_shrink.wrap_method = 'TARGET_PROJECT'
    mod_shrink.wrap_mode = 'OUTSIDE'

    # Pre-relax to improve shrinkwrap result
    bpy.context.view_layer.objects.active = cloth
    for i in range(2):
        mod_sm_pre = cloth.modifiers.new(name=f"SmoothPre_{i}", type='SMOOTH')
        mod_sm_pre.iterations = 3
        bpy.ops.object.modifier_apply(modifier=mod_sm_pre.name)

    bpy.ops.object.modifier_apply(modifier=mod_shrink.name)

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
    # ARMATURE & RIGGING TRANSFER
    # =========================
    if armature:
        # Transfer vertex weights if the garment doesn't have an armature already
        # or if it needs to match the avatar's armature
        print("[ENGINE] Transferring rigging weights...", flush=True)
        bpy.context.view_layer.objects.active = cloth

        # Add Data Transfer Modifier to transfer vertex groups
        mod_data = cloth.modifiers.new(name="DataTransfer", type='DATA_TRANSFER')
        mod_data.object = avatar
        mod_data.use_vert_data = True
        mod_data.data_types_verts = {'VGROUP_WEIGHTS'}
        mod_data.vert_mapping = 'NEAREST'

        # Crucial step: Generate the data layers (vertex groups) on the target mesh before applying
        bpy.ops.object.datalayout_transfer(modifier=mod_data.name)

        # Apply the Data Transfer modifier
        bpy.ops.object.modifier_apply(modifier=mod_data.name)

        # Set armature parent and modifier
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
    mod_names = [m.name for m in cloth.modifiers if m.type != 'ARMATURE']
    for name in mod_names:
        try:
            bpy.ops.object.modifier_apply(modifier=name)
        except:
            print(f"[ENGINE] Warning: Could not apply {name}")

    # =========================
    # HEAL & BEAUTIFY
    # =========================
    heal_mesh(cloth)

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

    # Make sure we select the elements we want to export (Avatar + Rig + Cloth)
    bpy.ops.object.select_all(action='DESELECT')
    if armature:
        armature.select_set(True)
    avatar.select_set(True)
    cloth.select_set(True)

    # Draco conditional enable
    draco_path = os.environ.get('BLENDER_EXTERN_DRACO_LIBRARY_PATH')
    enable_draco = bool(draco_path and os.path.exists(draco_path))
    if enable_draco:
        print(f"[ENGINE] Draco habilitado (Path: {draco_path})", flush=True)
    else:
        print("[ENGINE] Draco deshabilitado (Path no configurado o inválido)", flush=True)

    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=True, # Only export the selected elements (Avatar, Rig, Garment)
        export_animations=True, # Ensure animations are preserved
        export_apply=True,
        export_draco_mesh_compression_enable=enable_draco,
        export_draco_mesh_compression_level=6
    )

    print("\n[ENGINE] ✅ PIPELINE COMPLETO\n", flush=True)

# =========================
# ENTRY
# =========================
if __name__ == "__main__":
    argv = sys.argv
    args = argv[argv.index("--") + 1:]

    run(args[0], args[1], args[2])