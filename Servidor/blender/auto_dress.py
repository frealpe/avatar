"""
╔══════════════════════════════════════════════════════════════════╗
║           AUTO-DRESS PRO v2.0 — Industrial Fitting Engine       ║
║  Automated 3D Garment Fitting Pipeline for Trellis + Anny       ║
║  8-Stage Modular Architecture · Blender 3.0+ Headless           ║
╚══════════════════════════════════════════════════════════════════╝

Pipeline:
  1. NORMALIZATION   — Scale, transforms, axis alignment
  2. SEMANTIC DETECT — Body regions, anatomical landmarks
  3. ALIGNMENT       — BBox matching, torso positioning
  4. FITTING         — Shrinkwrap + volume preservation
  5. RIGGING         — Weight transfer, armature binding
  6. SIMULATION      — Cloth physics, collision, bake
  7. OPTIMIZATION    — Decimate, material unification
  8. EXPORT          — Web-ready GLB for Three.js / R3F
"""

import bpy
import bmesh
import sys
import os
import math
import numpy as np

# ──────────────────────────────────────────
# NUMPY COMPAT (Blender 3.x + NumPy 1.24+)
# ──────────────────────────────────────────
if not hasattr(np, 'bool'):
    np.bool = bool

from mathutils import Vector, Matrix


# ============================================================
#  UTILITIES
# ============================================================

def log(stage, msg, flush=True):
    print(f"[S{stage}] {msg}", flush=flush)


def bbox(obj):
    """Returns (min, max, dimensions, center) of an object's world-space bounding box."""
    pts = [obj.matrix_world @ Vector(v) for v in obj.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    dim = mx - mn
    center = (mn + mx) / 2.0
    return mn, mx, dim, center


def ensure_active(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)


def apply_modifier_safe(obj, name):
    """Apply a modifier, catching errors gracefully."""
    try:
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=name)
    except Exception as e:
        log("?", f"Warning: Could not apply modifier '{name}': {e}")


# ============================================================
#  STAGE 1: NORMALIZATION
# ============================================================

def stage_1_normalize(obj, label="Object"):
    """Convert to metric scale, apply transforms, align axes."""
    log(1, f"Normalizing {label}: '{obj.name}'")

    ensure_active(obj)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)

    # Apply all transforms (location, rotation, scale)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Auto-detect if the model is in centimeters (height > 50 units → likely cm)
    _, _, dim, _ = bbox(obj)
    max_dim = max(dim.x, dim.y, dim.z)
    if max_dim > 10:
        scale_factor = 1.0 / 100.0  # cm → m
        obj.scale = (scale_factor, scale_factor, scale_factor)
        bpy.ops.object.transform_apply(scale=True)
        log(1, f"  Auto-scaled from cm to meters (factor: {scale_factor})")

    log(1, f"  Final dims: {bbox(obj)[2]}")


# ============================================================
#  STAGE 2: SEMANTIC DETECTION
# ============================================================

class BodyLandmarks:
    """Anatomical landmarks derived from the avatar mesh."""

    def __init__(self, avatar_obj):
        mn, mx, dim, center = bbox(avatar_obj)
        self.height = dim.z
        self.center = center
        self.feet = mn.z
        self.head = mx.z

        # Estimate body regions as ratios of height (SMPL/Anny proportions)
        self.waist_z  = self.feet + self.height * 0.55
        self.chest_z  = self.feet + self.height * 0.72
        self.neck_z   = self.feet + self.height * 0.85
        self.hip_z    = self.feet + self.height * 0.48
        self.shoulder_z = self.feet + self.height * 0.80

        # Transversal dimensions at chest level (estimate from bbox)
        self.torso_width = dim.x * 0.85   # ~85% of bbox X
        self.torso_depth = dim.y * 0.75   # ~75% of bbox Y

        log(2, f"Body height: {self.height:.3f}m")
        log(2, f"Chest Z: {self.chest_z:.3f}, Waist Z: {self.waist_z:.3f}, Hip Z: {self.hip_z:.3f}")
        log(2, f"Torso width: {self.torso_width:.3f}, depth: {self.torso_depth:.3f}")


def stage_2_detect(avatar_obj):
    """Detect anatomical landmarks from avatar geometry."""
    log(2, "Detecting anatomical landmarks...")
    landmarks = BodyLandmarks(avatar_obj)
    return landmarks


# ============================================================
#  STAGE 3: INITIAL ALIGNMENT
# ============================================================

def stage_3_align(cloth_obj, avatar_obj, landmarks):
    """Position garment over the avatar using bounding box matching."""
    log(3, "Aligning garment to avatar...")

    ensure_active(cloth_obj)

    # Get garment bounds
    g_mn, g_mx, g_dim, g_center = bbox(cloth_obj)
    a_mn, a_mx, a_dim, a_center = bbox(avatar_obj)

    # ── Smart Scale ──
    # Scale garment to match avatar torso proportions
    # Use the SMALLEST axis ratio × a small offset (1.08) to avoid crushing
    scale_x = (landmarks.torso_width / g_dim.x) if g_dim.x > 0.001 else 1
    scale_y = (landmarks.torso_depth / g_dim.y) if g_dim.y > 0.001 else 1
    scale_z = (a_dim.z / g_dim.z) if g_dim.z > 0.001 else 1

    # Use uniform scale to preserve garment proportions
    scale = min(scale_x, scale_y, scale_z) * 1.08
    cloth_obj.scale = (scale, scale, scale)
    bpy.ops.object.transform_apply(scale=True)
    log(3, f"  Scale factor: {scale:.4f}")

    # ── Position ──
    # Center garment horizontally on avatar
    _, _, g_dim_new, g_center_new = bbox(cloth_obj)

    # Align centers (X, Y) and place at chest level (Z)
    offset = a_center - g_center_new
    cloth_obj.location = offset
    bpy.ops.object.transform_apply(location=True)

    log(3, f"  Offset applied: {offset}")


# ============================================================
#  STAGE 4: ADVANCED FITTING (Shrinkwrap + Volume Preservation)
# ============================================================

def stage_4_fit(cloth_obj, avatar_obj):
    """Apply Shrinkwrap-based fitting with volume preservation."""
    log(4, "Fitting garment to body surface...")

    ensure_active(cloth_obj)

    # ── 4.1: Surface Deform (binds garment topology to body surface) ──
    mod_sd = cloth_obj.modifiers.new("SurfDeform", 'SURFACE_DEFORM')
    mod_sd.target = avatar_obj
    try:
        bpy.ops.object.surfacedeform_bind(modifier=mod_sd.name)
        log(4, "  Surface Deform bound successfully")
    except Exception as e:
        log(4, f"  Surface Deform bind failed ({e}), falling back to Shrinkwrap")
        cloth_obj.modifiers.remove(mod_sd)
        mod_sd = None

    # ── 4.2: Shrinkwrap (project onto body with offset) ──
    mod_sw = cloth_obj.modifiers.new("Shrinkwrap", 'SHRINKWRAP')
    mod_sw.target = avatar_obj
    mod_sw.wrap_method = 'NEAREST_SURFACEPOINT'
    mod_sw.wrap_mode = 'OUTSIDE_SURFACE'
    mod_sw.offset = 0.004  # 4mm gap to prevent clipping
    log(4, f"  Shrinkwrap offset: {mod_sw.offset}m")

    # ── 4.3: Smooth pass to prevent harsh deformations ──
    mod_sm = cloth_obj.modifiers.new("FitSmooth", 'SMOOTH')
    mod_sm.iterations = 8
    mod_sm.factor = 0.5

    # ── 4.4: Solidify for physical thickness ──
    mod_sol = cloth_obj.modifiers.new("Solidify", 'SOLIDIFY')
    mod_sol.thickness = 0.003  # 3mm fabric thickness
    mod_sol.offset = 1.0       # Grow outward only
    mod_sol.use_quality_normals = True

    # Apply fitting modifiers in order
    for name in ["SurfDeform", "Shrinkwrap", "FitSmooth", "Solidify"]:
        if name in [m.name for m in cloth_obj.modifiers]:
            apply_modifier_safe(cloth_obj, name)

    # ── 4.5: Post-fit normals fix ──
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.shade_smooth()

    log(4, "  Fitting complete — normals corrected, smooth shading applied")


# ============================================================
#  STAGE 5: RIGGING TRANSFER
# ============================================================

def stage_5_rig(cloth_obj, avatar_obj, armature):
    """Transfer rigging weights from avatar to garment."""
    log(5, "Transferring rigging...")

    ensure_active(cloth_obj)

    if not armature:
        log(5, "  No armature found — skipping rigging")
        return

    # ── 5.1: Parent to armature ──
    cloth_obj.parent = armature
    cloth_obj.matrix_parent_inverse = armature.matrix_world.inverted()

    # ── 5.2: Add Armature modifier ──
    mod_arm = cloth_obj.modifiers.new("Armature", 'ARMATURE')
    mod_arm.object = armature
    log(5, f"  Armature modifier linked to: {armature.name}")

    # ── 5.3: Data Transfer (weight painting from avatar) ──
    mod_dt = cloth_obj.modifiers.new("WeightTransfer", 'DATA_TRANSFER')
    mod_dt.object = avatar_obj
    mod_dt.use_vert_data = True
    mod_dt.data_types_verts = {'VGROUP_WEIGHTS'}
    mod_dt.vert_mapping = 'POLYINTERP_NEAREST'
    log(5, "  Weight transfer configured (nearest surface interpolation)")

    # Apply data transfer
    apply_modifier_safe(cloth_obj, "WeightTransfer")

    # ── 5.4: Normalize vertex groups ──
    bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
    try:
        bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
        log(5, "  Vertex groups normalized")
    except:
        log(5, "  Vertex group normalization skipped")
    bpy.ops.object.mode_set(mode='OBJECT')

    log(5, "  Rigging transfer complete")


# ============================================================
#  STAGE 6: CLOTH SIMULATION
# ============================================================

def stage_6_simulate(cloth_obj, avatar_obj, frames=60):
    """Run cloth physics simulation for natural draping."""
    log(6, f"Starting cloth simulation ({frames} frames)...")

    ensure_active(avatar_obj)

    # ── 6.1: Collision body (avatar) ──
    bpy.ops.object.modifier_add(type='COLLISION')
    avatar_obj.collision.thickness_outer = 0.003
    avatar_obj.collision.use_culling = True
    log(6, "  Collision body configured on avatar")

    # ── 6.2: Pre-simulation relaxation ──
    ensure_active(cloth_obj)
    for i in range(3):
        mod = cloth_obj.modifiers.new(f"PreRelax_{i}", 'SMOOTH')
        mod.iterations = 5
        mod.factor = 0.5
        apply_modifier_safe(cloth_obj, f"PreRelax_{i}")

    # ── 6.3: Cloth modifier ──
    bpy.ops.object.modifier_add(type='CLOTH')
    cloth_mod = cloth_obj.modifiers["Cloth"]

    # Quality
    cloth_mod.settings.quality = 10
    cloth_mod.settings.time_scale = 1.0

    # Physical Properties (Cotton-like)
    cloth_mod.settings.mass = 0.3
    cloth_mod.settings.tension_stiffness = 25
    cloth_mod.settings.compression_stiffness = 25
    cloth_mod.settings.shear_stiffness = 20
    cloth_mod.settings.bending_stiffness = 5
    cloth_mod.settings.air_damping = 1

    # Collisions
    cloth_mod.collision_settings.use_collision = True
    cloth_mod.collision_settings.use_self_collision = True
    cloth_mod.collision_settings.distance_min = 0.003
    cloth_mod.collision_settings.self_distance_min = 0.005
    cloth_mod.collision_settings.collision_quality = 5

    # ── 6.4: Gravity ──
    bpy.context.scene.gravity = (0, 0, -4.0)

    # ── 6.5: Bake simulation ──
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = frames

    for f in range(1, frames + 1):
        bpy.context.scene.frame_set(f)
        if f % 5 == 0 or f == 1:
            pct = int((f / frames) * 100)
            log(6, f"  Frame {f}/{frames} ({pct}%)")

    # ── 6.6: Apply cloth modifier (freeze the result) ──
    mod_names = [m.name for m in cloth_obj.modifiers if m.type != 'ARMATURE']
    for name in mod_names:
        apply_modifier_safe(cloth_obj, name)

    log(6, "  Simulation complete — modifiers applied")


# ============================================================
#  STAGE 7: OPTIMIZATION
# ============================================================

def create_premium_material(name="PremiumFabric", color=(0.05, 0.05, 0.15, 1.0)):
    """Create a PBR material for web rendering."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()

    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = 0.45
    bsdf.inputs['Metallic'].default_value = 0.0
    bsdf.inputs['Specular'].default_value = 0.3

    output = nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    return mat


def stage_7_optimize(cloth_obj, avatar_obj):
    """Optimize geometry and materials for web delivery."""
    log(7, "Optimizing for web...")

    ensure_active(cloth_obj)

    # ── 7.1: Heal mesh topology ──
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.001)
    bpy.ops.mesh.fill_holes(sides=0)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.shade_smooth()

    # ── 7.2: Decimation (if needed) ──
    vert_count = len(cloth_obj.data.vertices)
    if vert_count > 50000:
        target_ratio = 50000 / vert_count
        mod_dec = cloth_obj.modifiers.new("Decimate", 'DECIMATE')
        mod_dec.ratio = max(target_ratio, 0.3)
        apply_modifier_safe(cloth_obj, "Decimate")
        log(7, f"  Decimated: {vert_count} → {len(cloth_obj.data.vertices)} verts")
    else:
        log(7, f"  Vertex count OK: {vert_count}")

    # ── 7.3: Material Intelligence ──
    # Ensure garment has a proper material (not white/grey default)
    has_good_material = False
    for mat in cloth_obj.data.materials:
        if mat and mat.use_nodes:
            bsdf = mat.node_tree.nodes.get('Principled BSDF')
            if bsdf:
                c = bsdf.inputs['Base Color'].default_value
                # If NOT a washed-out grey/white
                if not (c[0] > 0.7 and c[1] > 0.7 and c[2] > 0.7):
                    has_good_material = True
                    break
                else:
                    # Recolor to premium dark tone
                    bsdf.inputs['Base Color'].default_value = (0.05, 0.05, 0.15, 1.0)
                    bsdf.inputs['Roughness'].default_value = 0.45
                    has_good_material = True
                    log(7, f"  Recolored washed-out material: {mat.name}")

    if not has_good_material or len(cloth_obj.data.materials) == 0:
        cloth_obj.data.materials.clear()
        cloth_obj.data.materials.append(create_premium_material())
        log(7, "  Assigned premium PBR material")

    # ── 7.4: Also optimize avatar materials for web ──
    for mat in avatar_obj.data.materials:
        if mat and mat.use_nodes:
            bsdf = mat.node_tree.nodes.get('Principled BSDF')
            if bsdf:
                # Ensure reasonable PBR values for web
                if bsdf.inputs['Roughness'].default_value > 0.9:
                    bsdf.inputs['Roughness'].default_value = 0.6

    log(7, "  Optimization complete")


# ============================================================
#  STAGE 8: WEB-READY EXPORT
# ============================================================

def stage_8_export(cloth_obj, avatar_obj, armature, out_path):
    """Export avatar + garment as a single GLB for Three.js."""
    log(8, f"Exporting to: {out_path}")

    # ── 8.1: Select only avatar + garment (+ armature if present) ──
    bpy.ops.object.select_all(action='DESELECT')
    avatar_obj.select_set(True)
    cloth_obj.select_set(True)
    if armature:
        armature.select_set(True)

    # ── 8.2: Draco compression (if available) ──
    draco_path = os.environ.get('BLENDER_EXTERN_DRACO_LIBRARY_PATH')
    enable_draco = bool(draco_path and os.path.exists(draco_path))
    if enable_draco:
        log(8, f"  Draco compression enabled")
    else:
        log(8, f"  Draco not available — standard export")

    # ── 8.3: Export GLB ──
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        export_apply=True,
        use_selection=True,
        export_draco_mesh_compression_enable=enable_draco,
        export_draco_mesh_compression_level=6
    )

    # Verify output
    if os.path.exists(out_path):
        size_mb = os.path.getsize(out_path) / (1024 * 1024)
        log(8, f"  Export successful: {size_mb:.2f} MB")
    else:
        log(8, "  ERROR: Export file not found!")


# ============================================================
#  MAIN PIPELINE
# ============================================================

def run(av_path, cloth_path, out_path):
    """Execute the full 8-stage Auto-Dress pipeline."""

    print("\n" + "=" * 60, flush=True)
    print("  AUTO-DRESS PRO v2.0 — Industrial Fitting Engine", flush=True)
    print("=" * 60 + "\n", flush=True)

    # ── Clean Scene ──
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # ── GPU Setup ──
    try:
        prefs = bpy.context.preferences
        cycles = prefs.addons['cycles'].preferences
        for backend in ['OPTIX', 'CUDA', 'HIP']:
            try:
                cycles.compute_device_type = backend
                log(0, f"GPU backend: {backend}")
                break
            except:
                continue
        for d in cycles.devices:
            d.use = True
        bpy.context.scene.cycles.device = 'GPU'
    except:
        log(0, "GPU setup skipped")

    bpy.context.scene.render.threads_mode = 'AUTO'
    bpy.context.scene.render.threads = os.cpu_count()

    # ── Import Avatar ──
    log(0, f"Importing avatar: {os.path.basename(av_path)}")
    pre = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=av_path)
    av_objs = list(set(bpy.data.objects) - pre)

    avatar = None
    armature = None
    for o in av_objs:
        if o.type == 'MESH' and (avatar is None or len(o.data.vertices) > len(avatar.data.vertices)):
            avatar = o
        if o.type == 'ARMATURE':
            armature = o

    if not avatar:
        log(0, "CRITICAL: No mesh found in avatar file!")
        return

    log(0, f"Avatar mesh: {avatar.name} ({len(avatar.data.vertices)} verts)")
    if armature:
        log(0, f"Armature: {armature.name} ({len(armature.data.bones)} bones)")

    # ── Import Garment ──
    log(0, f"Importing garment: {os.path.basename(cloth_path)}")
    pre = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=cloth_path)
    g_objs = list(set(bpy.data.objects) - pre)

    meshes = [o for o in g_objs if o.type == 'MESH']
    if not meshes:
        log(0, "CRITICAL: No mesh found in garment file!")
        return

    # Join multiple meshes into one
    if len(meshes) > 1:
        bpy.ops.object.select_all(action='DESELECT')
        for m in meshes:
            m.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.join()
        cloth = bpy.context.view_layer.objects.active
    else:
        cloth = meshes[0]

    log(0, f"Garment mesh: {cloth.name} ({len(cloth.data.vertices)} verts)")

    # ══════════════════════════════════════
    #  EXECUTE PIPELINE
    # ══════════════════════════════════════

    stage_1_normalize(avatar, "Avatar")
    stage_1_normalize(cloth, "Garment")

    landmarks = stage_2_detect(avatar)

    stage_3_align(cloth, avatar, landmarks)

    stage_4_fit(cloth, avatar)

    stage_5_rig(cloth, avatar, armature)

    stage_6_simulate(cloth, avatar, frames=60)

    stage_7_optimize(cloth, avatar)

    stage_8_export(cloth, avatar, armature, out_path)

    print("\n" + "=" * 60, flush=True)
    print("  ✅ AUTO-DRESS PRO — PIPELINE COMPLETE", flush=True)
    print("=" * 60 + "\n", flush=True)


# ============================================================
#  ENTRY POINT
# ============================================================
if __name__ == "__main__":
    argv = sys.argv
    if "--" not in argv:
        print("[ENGINE] ERROR: No '--' separator in args")
        sys.exit(1)

    args = argv[argv.index("--") + 1:]
    if len(args) < 3:
        print("[ENGINE] Usage: blender -b -P auto_dress.py -- <avatar.glb> <garment.glb> <output.glb>")
        sys.exit(1)

    run(args[0], args[1], args[2])