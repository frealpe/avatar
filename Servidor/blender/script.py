import bpy
import bmesh
import sys
import os
import numpy as np

# [ENGINE] Industrial Patch: NumPy 1.24+ compatibility for Blender 3.x
if not hasattr(np, 'bool'):
    np.bool = bool

def clean_scene():
    """Clears the entire scene for a clean simulation environment."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # Ensure no orphan data remains
    for block in bpy.data.meshes: bpy.data.meshes.remove(block)
    for block in bpy.data.curves: bpy.data.curves.remove(block)

def setup_cloth_simulation(avatar_path, svg_path, output_path, fabric_type='cotton'):
    print("\n[ENGINE] ===============================================", flush=True)
    print("[ENGINE] STARTING INDUSTRIAL 3D SIMULATION PIPELINE", flush=True)
    print("[ENGINE] ===============================================\n", flush=True)
    
    clean_scene()

    # 1. IMPORT AVATAR & CONFIGURE COLLISION
    avatar_obj = None
    if os.path.exists(avatar_path):
        print(f"[ENGINE] Importing Avatar Mesh: {os.path.basename(avatar_path)}", flush=True)
        bpy.ops.import_scene.gltf(filepath=avatar_path)
        
        # Identify the main mesh to act as collision body (pick the one with most vertices)
        mesh_objs = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
        if mesh_objs:
            avatar_obj = max(mesh_objs, key=lambda o: len(o.data.vertices))
            bpy.context.view_layer.objects.active = avatar_obj
            bpy.ops.object.modifier_add(type='COLLISION')
            # Standard Collision Settings for Blender 3.0
            avatar_obj.collision.use_culling = True
            avatar_obj.collision.thickness_outer = 0.005
            print(f"[ENGINE] SUCCESS: Avatar Collision Body Configured: {avatar_obj.name} ({len(avatar_obj.data.vertices)} vertices)", flush=True)
        else:
            print("[ENGINE] WARNING: No mesh found in imported avatar file.", flush=True)

    else:
        print(f"[ENGINE] CRITICAL ERROR: Avatar file not found: {avatar_path}", flush=True)
        sys.exit(1)

    # 2. IMPORT SVG GARMENT PATTERN
    if os.path.exists(svg_path):
        print(f"[ENGINE] Importing SVG Pattern: {os.path.basename(svg_path)}", flush=True)
        bpy.ops.import_curve.svg(filepath=svg_path)
    else:
        print(f"[ENGINE] CRITICAL ERROR: SVG file not found: {svg_path}", flush=True)
        sys.exit(1)

    # 3. GEOMETRY ENGINE: CONVERT & RECONSTRUCT MESH
    garment_mesh_objects = []
    # Collect all curve objects imported from SVG
    curves = [obj for obj in bpy.context.scene.objects if obj.type == 'CURVE']
    
    if not curves:
        print("[ENGINE] CRITICAL ERROR: No curves found after SVG import.", flush=True)
        sys.exit(1)

    for curve_obj in curves:
        print(f"[ENGINE] Processing garment piece: {curve_obj.name}", flush=True)

        
        # 3.1 Path Stabilization: Close all open splines
        for spline in curve_obj.data.splines:
            spline.use_cyclic_u = True
        
        # 3.2 High-Fidelity Conversion to Mesh
        curve_obj.data.dimensions = '2D'
        curve_obj.data.fill_mode = 'BOTH' # Initial surface generation
        bpy.context.view_layer.objects.active = curve_obj
        curve_obj.select_set(True)
        bpy.ops.object.convert(target='MESH')
        
        # 3.3 Reconstruction using BMesh for Topological Integrity
        bm = bmesh.new()
        bm.from_mesh(curve_obj.data)
        
        # Removal of duplicate/overlapping vertices from Seamly2D export
        # Cierre de Costuras: Usar un umbral de proximidad para fusionar vértices en las uniones
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.005)
        
        # Face Validation & Hole Filling
        if len(bm.faces) == 0:
            print(f"[ENGINE] INFO: Filling geometry holes for {curve_obj.name}...", flush=True)
            bmesh.ops.holes_fill(bm, edges=bm.edges, sides=4)
        
        # Industrial-grade Triangulation
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
        
        bm.to_mesh(curve_obj.data)
        
        # 3.4 Empty Mesh Safety: Skip if no geometry was generated
        if len(bm.verts) == 0:
            print(f"[ENGINE] SKIPPING: {curve_obj.name} has no valid geometry.", flush=True)
            bm.free()
            continue
            
        bm.free()
        
        # 3.5 Physical Density: Subdivide to ensure realistic cloth folds
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        # Subdividing creates more points for simulation to act upon
        bpy.ops.mesh.subdivide(number_cuts=2)
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        
        # 3.5 Industrial Thickness (Solidify)
        bpy.ops.object.modifier_add(type='SOLIDIFY')
        thickness_val = 0.002
        if fabric_type == 'silk':
            thickness_val = 0.001
        elif fabric_type == 'denim':
            thickness_val = 0.003

        curve_obj.modifiers["Solidify"].thickness = thickness_val
        curve_obj.modifiers["Solidify"].offset = 0.0
        # Normales y Orientación: Ensure high quality normals
        curve_obj.modifiers["Solidify"].use_quality_normals = True
        
        # 3.6 Automated Positioning (Torso Alignment)
        if avatar_obj:
            # Normalize scale to meters (Standard Seamly2D SVG scale)
            curve_obj.scale = (1, 1, 1) 
            bpy.ops.object.transform_apply(scale=True)
            
            # Align to Avatar Chest/Torso area
            curve_obj.location = avatar_obj.location
            curve_obj.location.y += 0.20 # Move to front of chest
            curve_obj.location.z += 1.05 # Chest area at approx 1m height
        
        # 3.7 CLOTH PHYSICS ENGINE CONFIGURATION
        bpy.ops.object.modifier_add(type='CLOTH')
        c_settings = curve_obj.modifiers["Cloth"].settings
        
        c_settings.quality = 8
        c_settings.mass = 0.3 # 300g per unit area
        c_settings.tension_stiffness = 15
        c_settings.compression_stiffness = 15
        c_settings.shear_stiffness = 15
        c_settings.bending_stiffness = 0.5
        
        # Collision settings within Cloth
        curve_obj.modifiers["Cloth"].collision_settings.use_collision = True
        curve_obj.modifiers["Cloth"].collision_settings.use_self_collision = True
        curve_obj.modifiers["Cloth"].collision_settings.collision_quality = 5
        curve_obj.modifiers["Cloth"].collision_settings.self_distance_min = 0.005
        # Margen de Piel: Garantizar distancia de colisión mínima con el avatar de Anny
        curve_obj.modifiers["Cloth"].collision_settings.distance_min = 0.005

        # 3.8 Self-Intersection Repair (Smooth Modifier)
        bpy.ops.object.modifier_add(type='SMOOTH')
        curve_obj.modifiers["Smooth"].iterations = 5
        
        garment_mesh_objects.append(curve_obj)

    # 4. HEADLESS SIMULATION ENGINE (PHYSICS BAKE)
    print(f"\n[ENGINE] Starting Physics Simulation Sequence (150 Frames)...", flush=True)
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 150
    
    for frame in range(1, 151):
        bpy.context.scene.frame_set(frame)
        if frame % 25 == 0:
            print(f"[ENGINE] SIMULATION PROGRESS: {frame}/150 frames computed.", flush=True)

    # 5. POST-PROCESSING & GLTF EXPORT
    print(f"\n[ENGINE] Finalizing geometry and baking keys...", flush=True)
    for obj in garment_mesh_objects:
        bpy.context.view_layer.objects.active = obj
        # Apply all modifiers to "bake" the simulation into the mesh
        for mod in obj.modifiers:
            print(f"[ENGINE] Applying Modifier: {mod.name} on {obj.name}", flush=True)
            bpy.ops.object.modifier_apply(modifier=mod.name)
            
    # Remove avatar (we only want the garment in the final GLB)
    if avatar_obj:
        print(f"[ENGINE] Decoupling avatar from export...", flush=True)
        bpy.data.objects.remove(avatar_obj, do_unlink=True)
        
    # Remove any non-mesh leftovers
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            bpy.data.objects.remove(obj, do_unlink=True)

    # Export Sequence
    print(f"[ENGINE] EXPORTING FINAL GLB: {output_path}", flush=True)
    bpy.ops.export_scene.gltf(filepath=output_path, use_selection=False)
    
    print("\n[ENGINE] ===============================================", flush=True)
    print("[ENGINE] SUCCESS: AUTOMATED 3D GARMENT PIPELINE COMPLETE", flush=True)
    print("[ENGINE] ===============================================\n", flush=True)


if __name__ == "__main__":
    try:
        # Standard Blender CLI arg parsing
        argv = sys.argv
        if "--" not in argv:
            print("[ENGINE] ERROR: No '--' separator found in command line.")
            sys.exit(1)
            
        args = argv[argv.index("--") + 1:]
        if len(args) < 3:
            print("[ENGINE] ERROR: Missing arguments. Required: <avatar> <svg> <output> [<fabric_type>]")
            sys.exit(1)
            
        fabric_t = 'cotton'
        if len(args) >= 4:
            fabric_t = args[3]

        setup_cloth_simulation(args[0], args[1], args[2], fabric_t)
        
    except Exception as e:
        print(f"\n[ENGINE] CRITICAL FAILURE IN PIPELINE: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
