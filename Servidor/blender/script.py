import bpy
import sys
import os
import numpy as np

# [ENGINE] STATUS: Industrial Patch: NumPy 1.24+ compatibility for Blender 3.x
if not hasattr(np, 'bool'):
    np.bool = bool

def clean_scene():
    """Clears the entire scene for a clean simulation environment."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for block in bpy.data.meshes: bpy.data.meshes.remove(block)
    for block in bpy.data.armatures: bpy.data.armatures.remove(block)
    for block in bpy.data.curves: bpy.data.curves.remove(block)
    for block in bpy.data.materials: bpy.data.materials.remove(block)

def get_imported_objects(initial_objects):
    """Returns objects that were added to the scene after an import."""
    current_objects = set(bpy.context.scene.objects)
    return list(current_objects - initial_objects)

def import_model(filepath):
    """Imports a 3D model based on its extension."""
    initial_objects = set(bpy.context.scene.objects)
    ext = os.path.splitext(filepath)[1].lower()

    if ext == '.glb' or ext == '.gltf':
        bpy.ops.import_scene.gltf(filepath=filepath)
    elif ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath=filepath)
    elif ext == '.obj':
        bpy.ops.import_scene.obj(filepath=filepath)
    else:
        print(f"[ENGINE] STATUS: ERROR - Unsupported file format: {ext}", flush=True)
        sys.exit(1)

    return get_imported_objects(initial_objects)

def setup_rigging_pipeline(avatar_path, garment_path, output_path):
    print("\n[ENGINE] STATUS: ===============================================", flush=True)
    print("[ENGINE] STATUS: STARTING AUTOMATED RIGGING PIPELINE", flush=True)
    print("[ENGINE] STATUS: ===============================================\n", flush=True)

    clean_scene()

    # 1. IMPORT AVATAR
    print(f"[ENGINE] STATUS: Importing Avatar Model: {os.path.basename(avatar_path)}", flush=True)
    avatar_objects = import_model(avatar_path)

    avatar_armature = None
    avatar_mesh = None
    
    for obj in avatar_objects:
        if obj.type == 'ARMATURE':
            avatar_armature = obj
        elif obj.type == 'MESH':
            if avatar_mesh is None or len(obj.data.vertices) > len(avatar_mesh.data.vertices):
                avatar_mesh = obj

    if not avatar_armature or not avatar_mesh:
        print("[ENGINE] STATUS: ERROR - Avatar must contain at least one ARMATURE and one MESH.", flush=True)
        sys.exit(1)

    print(f"[ENGINE] STATUS: Identified Avatar Armature: {avatar_armature.name}", flush=True)
    print(f"[ENGINE] STATUS: Identified Avatar Mesh: {avatar_mesh.name}", flush=True)

    # 2. IMPORT GARMENT
    print(f"[ENGINE] STATUS: Importing Garment Model: {os.path.basename(garment_path)}", flush=True)
    garment_objects = import_model(garment_path)

    garment_mesh = None
    for obj in garment_objects:
        if obj.type == 'MESH':
            if garment_mesh is None or len(obj.data.vertices) > len(garment_mesh.data.vertices):
                garment_mesh = obj

    if not garment_mesh:
        print("[ENGINE] STATUS: ERROR - Garment must contain at least one MESH.", flush=True)
        sys.exit(1)
        
    print(f"[ENGINE] STATUS: Identified Garment Mesh: {garment_mesh.name}", flush=True)

    # Delete any armature that came with the garment (we will use the avatar's)
    for obj in garment_objects:
        if obj.type == 'ARMATURE':
            print(f"[ENGINE] STATUS: Removing Garment Armature: {obj.name}", flush=True)
            bpy.data.objects.remove(obj, do_unlink=True)

    # 3. NORMALIZATION
    print("[ENGINE] STATUS: Normalizing Models...", flush=True)

    # Deselect all
    bpy.ops.object.select_all(action='DESELECT')

    # Apply transforms to Garment
    garment_mesh.select_set(True)
    bpy.context.view_layer.objects.active = garment_mesh

    # Clear location, rotation, and scale to align with origin
    bpy.ops.object.location_clear(clear_delta=False)
    bpy.ops.object.rotation_clear(clear_delta=False)

    # Apply transforms
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Apply transforms to Avatar
    bpy.ops.object.select_all(action='DESELECT')
    avatar_mesh.select_set(True)
    avatar_armature.select_set(True)
    bpy.context.view_layer.objects.active = avatar_mesh
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # 4. GARMENT ADJUSTMENT (Shrinkwrap, Smooth, Solidify)
    print("[ENGINE] STATUS: Adjusting Garment Geometry...", flush=True)
    bpy.ops.object.select_all(action='DESELECT')
    garment_mesh.select_set(True)
    bpy.context.view_layer.objects.active = garment_mesh

    # Shrinkwrap modifier to wrap clothing around avatar
    shrinkwrap_mod = garment_mesh.modifiers.new(name="Fit_Shrinkwrap", type='SHRINKWRAP')
    shrinkwrap_mod.target = avatar_mesh
    shrinkwrap_mod.wrap_method = 'PROJECT'
    shrinkwrap_mod.wrap_mode = 'OUTSIDE'
    shrinkwrap_mod.offset = 0.005 # Small offset to avoid clipping

    # Smooth modifier
    smooth_mod = garment_mesh.modifiers.new(name="Fit_Smooth", type='SMOOTH')
    smooth_mod.factor = 0.5
    smooth_mod.iterations = 5

    # Solidify modifier for thickness
    solidify_mod = garment_mesh.modifiers.new(name="Fit_Solidify", type='SOLIDIFY')
    solidify_mod.thickness = 0.002
    solidify_mod.offset = 1.0

    # Apply modifiers (except Armature which doesn't exist yet)
    print("[ENGINE] STATUS: Applying adjustment modifiers...", flush=True)
    for mod in garment_mesh.modifiers:
        bpy.ops.object.modifier_apply(modifier=mod.name)

    # 5. WEIGHT TRANSFER
    print("[ENGINE] STATUS: Transferring Weights from Avatar to Garment...", flush=True)

    # Add Data Transfer Modifier
    data_transfer_mod = garment_mesh.modifiers.new(name="Transfer_Weights", type='DATA_TRANSFER')
    data_transfer_mod.object = avatar_mesh
    data_transfer_mod.use_vert_data = True
    data_transfer_mod.data_types_verts = {'VGROUP_WEIGHTS'}
    data_transfer_mod.vert_mapping = 'NEAREST'

    # Generate Data Layers (creates the actual vertex groups on the garment)
    bpy.ops.object.datalayout_transfer(modifier=data_transfer_mod.name)

    # Apply Data Transfer Modifier
    bpy.ops.object.modifier_apply(modifier=data_transfer_mod.name)

    # 6. RIGGING
    print("[ENGINE] STATUS: Rigging Garment to Avatar Armature...", flush=True)

    # Add Armature Modifier
    armature_mod = garment_mesh.modifiers.new(name="Armature", type='ARMATURE')
    armature_mod.object = avatar_armature
    armature_mod.use_vertex_groups = True

    # Parent Garment to Armature
    garment_mesh.parent = avatar_armature
    garment_mesh.parent_type = 'OBJECT'

    # 7. CLEANUP
    print("[ENGINE] STATUS: Performing Cleanup...", flush=True)

    # Recalculate Normals
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')

    # Remove empty vertex groups
    print("[ENGINE] STATUS: Removing unused vertex groups...", flush=True)
    # Using a threshold to remove vertex groups with zero weights
    bpy.ops.object.vertex_group_clean(group_select_mode='ALL', limit=0.001, keep_single=False)

    # 8. EXPORT
    print(f"[ENGINE] STATUS: Exporting Final GLB to: {output_path}", flush=True)

    # Deselect all, then select Avatar Mesh, Garment Mesh, and Armature
    bpy.ops.object.select_all(action='DESELECT')
    avatar_armature.select_set(True)
    avatar_mesh.select_set(True)
    garment_mesh.select_set(True)
    
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        use_selection=True,
        export_format='GLB',
        export_apply=True,
        export_animations=True,
        export_skins=True,
        export_armature_bone_pose_export=True
    )

    print("\n[ENGINE] STATUS: ===============================================", flush=True)
    print("[ENGINE] STATUS: SUCCESS: PIPELINE COMPLETE", flush=True)
    print("[ENGINE] STATUS: ===============================================\n", flush=True)

if __name__ == "__main__":
    try:
        argv = sys.argv
        if "--" not in argv:
            print("[ENGINE] STATUS: ERROR - No '--' separator found in command line.")
            sys.exit(1)
            
        args = argv[argv.index("--") + 1:]
        if len(args) < 3:
            print("[ENGINE] STATUS: ERROR - Missing arguments. Required: <avatar_model> <garment_model> <output_glb>")
            sys.exit(1)
            
        setup_rigging_pipeline(args[0], args[1], args[2])
        
    except Exception as e:
        print(f"\n[ENGINE] STATUS: CRITICAL FAILURE IN PIPELINE: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
