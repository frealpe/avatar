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
    print(f"[HEAL] Procesando: {filepath}...")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=filepath)
    
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            print(f"[HEAL] Reparando malla: {obj.name}")
            bpy.context.view_layer.objects.active = obj
            
            # 1. Aplicar transformaciones iniciales
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            
            # 2. Curación Avanzada con BMesh
            import bmesh
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            
            # Cerrar huecos agresivamente (Capa 1: Topología)
            bmesh.ops.holes_fill(bm, edges=bm.edges, sides=4)
            # Eliminar duplicados
            bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
            
            bm.to_mesh(obj.data)
            bm.free()

            # 3. Remesh (Capa 2: Estructural - Asegurar que sea Watertight)
            # Usar Voxel Remesh para unir partes desconectadas y sellar huecos grandes
            mod_remesh = obj.modifiers.new("HealRemesh", 'REMESH')
            mod_remesh.mode = 'VOXEL'
            mod_remesh.voxel_size = 0.005 # 5mm para mantener detalle pero cerrar huecos
            mod_remesh.adaptivity = 0.01
            
            # 4. Corrective Smooth (Capa 3: Estética - Recuperar forma)
            mod_smooth = obj.modifiers.new("HealSmooth", 'SMOOTH')
            mod_smooth.iterations = 15
            mod_smooth.factor = 0.5
            
            # Aplicar modificadores de curación
            bpy.ops.object.modifier_apply(modifier="HealRemesh")
            bpy.ops.object.modifier_apply(modifier="HealSmooth")
            
            # 5. Normales y Sombreado
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.mesh.normals_make_consistent(inside=False)
            bpy.ops.object.mode_set(mode='OBJECT')
            bpy.ops.object.modifier_apply(modifier="HealSmooth")
            bpy.ops.object.shade_smooth()

    bpy.ops.export_scene.gltf(filepath=filepath, export_format='GLB', export_apply=True)
    print(f"Saved healed file to {filepath}")

if __name__ == "__main__":
    heal_file(sys.argv[-1])
