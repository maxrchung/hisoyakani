import bpy
import bmesh
import json
import bpy_extras
import pprint

print()
print("start")

"""
{
    frame: number,
    triangles: Frame_Data[]
}
"""
data = []

scene = bpy.data.scenes[0]
camera = scene.camera

frame_end = 250
frame = 0
frame_rate = 10

while frame < frame_end:
    """
    {
        points: [Vector, Vector],
        material: string
    }
    """
    frame_data = []
    scene.frame_set(frame)

    objects = []
    for object in bpy.data.objects:
        if object.name == "Camera":
            continue
        
        # Only consider objects that have some scale value
        if object.scale.x == 0.0:
            continue
        
        objects.append(object)
            
    visible_faces = []
    for object in objects:
        mesh = bmesh.new()
        mesh.from_mesh(object.data)
        
        # bmesh will initially be in local coordinates
        # We need to transform so that we get it in world coordinates
        mesh.transform(object.matrix_world)

        # Some faces will have 4 or more points so this will guarantee 3 point faces    
        bmesh.ops.triangulate(mesh, faces=mesh.faces)
        # Dunno but this seems necessary after triangulate operation
        mesh.faces.ensure_lookup_table()
        
        for face in mesh.faces:
            # Simple backface cull by comparing normal against camera position
            # This doesn't seem like it takes account perspective so ionno if it's a perfect solution
            location = face.calc_center_median()
            camera_location = camera.matrix_world.translation
            view_direction = (location - camera_location).normalized()
            normal = face.normal
            if normal.dot(view_direction) > 0:
                continue

            points = []
            for index in range(3):
                points.append(
                    # Transform point to how it looks in camera
                    bpy_extras.object_utils.world_to_camera_view(scene, camera, face.verts[index].co),
                )
                
            # Check out of bounds
            is_out_of_bounds = True
            for point in points:
                # If there is a point that is in bounds, then we keep the face
                if point.x > 0.0 and point.x < 1.0 and point.y > 0.0 and point.y < 1.0:
                    is_out_of_bounds = False
                    break
            
            if is_out_of_bounds:
                continue
            
            
            max_z = max(points, key=lambda point: point.z)
            
            material = face.material_index
            
            
            face_data = {
                "points": points,
                "material": material,
                "max_z": max_z
            }
            
            frame_data.append(face_data)
                    
        mesh.free()
        
        
    # Sort the faces by descending Z value so we can draw back to front
    frame_data = sorted(frame_data, key=lambda face_data: -face_data["max_z"])

    # Remap so we can drop the Z data
    frame_data = [
        {
            "points": [[point.x, point.y] for point in face_data["points"]],
            "material": material,
        }
    for face_data in frame_data]

    data.append({
        "frame": frame,
        "triangles": frame_data,
    })


    frame += frame_rate
    
with open("hisoyakani.json", "w") as file:
    json.dump(data, file)

print("end")
print()