import bpy
obj = bpy.data.objects.new("test", None)
bpy.context.scene.collection.objects.link(obj)
bpy.context.view_layer.objects.active = obj
bpy.ops.object.modifier_add(type='COLLISION')
print("--- COLLISION ATTRS ---")
for attr in dir(obj.collision):
    print(attr)
print("--- END ---")
