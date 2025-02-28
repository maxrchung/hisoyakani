import bpy
import bmesh
import json
import bpy_extras
import pprint
import os
from functools import cmp_to_key


# Get plane equation from vertices of triangle
def plane_equation(verts):
    A = verts[0]
    B = verts[1]
    C = verts[2]
    
    AB = B - A
    BC = C - B

    normal = AB.cross(BC)
    planeA, planeB, planeC = normal.x, normal.y, normal.z
    
    return planeA, planeB, planeC

def compare_vert(plane, vert):
    A, B, C = plane
    D = A * vert.x + B * vert.y + C * vert.z
    
    if D >= 0:
        return "F" # front
    
    return "B" # behind

def compare_verts(plane, verts):
    A, B, C = plane
    
    checks = []
    for vert in verts:
        check = compare_vert(plane, vert)
        checks.append(check)
        
    if all(check == "front" in verts):
        return "F" # front
    
    if all(check == "behind" in verts):
        return "B" # behind
    
    return "I" # indeterminate
    
# Compare function that denotes draw order
# -1 means should be behind, 1 means should be in front
# Use a closure so we can reference camera location
def compare_triangles(camera_location)
    def compare(A, B):
        vertsA = A["verts"]
        vertsB = B["verts"]
        
        plane = plane_equation(vertsB)
        camera = compare_vert(plane, camera_location)
        check = compare_verts(plane, vertsA)
        swapped = 1
        
        if check == "I":
            plane = plane_equation(vertsA)
            camera = compare_vert(plane, camera_location)
            check = compare_verts(plane, vertsB)
            swapped = -1
            
            # We're screwed, abort
            if check == "I":
                return 0
        
        if check == "F" and camera == "F":
            return 1 * swapped
        
        if check == "F" and camera == "B":
            return -1 * swapped
        
        if check == "B" and camera == "F":
            return -1 * swapped
        
        # if check == "B" and camera == "B":
        return 1 * swapped
        
    return compare
    
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

depsgraph = bpy.context.evaluated_depsgraph_get()

frame = 0
frame_end = 5250
frame_end = 5250

# Must be multiple of 3 so actual time rounds to an integer
frame_rate = 9

while frame < frame_end:
    print("Processing ", frame)
    
    """
    {
        points: [Vector, Vector, Vector],
        material: string
    }
    """
    frame_data = []
    scene.frame_set(frame)

    objects = []
    for object in scene.objects:
        if not object.visible_get():
            continue
        
        # Ignore things like camera and rigs
        if object.type != "MESH":
            continue
        
        # Only consider objects that have some scale value
        if object.scale.x == 0.0:
            continue
        
        objects.append(object)
            
    for object in objects:
        material_slots = object.material_slots
        
        # Something about applying modifiers so armature applies
        evaluated_object = object.evaluated_get(depsgraph)
        evaluated_mesh = evaluated_object.to_mesh()
        
        mesh = bmesh.new()
        mesh.from_mesh(evaluated_mesh)

        # bmesh will initially be in local coordinates
        # We need to transform so that we get it in world coordinates
        mesh.transform(object.matrix_world)

        # Some faces will have 4 or more points so this will guarantee 3 point faces    
        bmesh.ops.triangulate(mesh, faces=mesh.faces)
        # Dunno but this seems necessary for triangulate operation
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

            verts = []
            points = []
            for index in range(3):
                vert = face.verts[index].co
                verts.append(vert)
                
                # Transform point to how it looks in camera
                point = bpy_extras.object_utils.world_to_camera_view(scene, camera, vert)
                points.append(point)
                
            # ??? Some weird case where all points could equal each other
            if points[0].x == points[1].x and points[0].x == points[2].x and points[0].y == points[1].y and points[0].y == points[2].y:
                continue
                  
            # Check out of bounds
            is_out_of_bounds = True
            for point in points:
                # If there is a point that is in bounds, then we keep the face
                # point.z check is needed because there could objects behind camera that are in bounds
                if point.z > 0 and point.x > 0.0 and point.x < 1.0 and point.y > 0.0 and point.y < 1.0:
                    is_out_of_bounds = False
                    break
            
            if is_out_of_bounds:
                continue
            
            # This will be something like red, skin, black, etc.
            material = material_slots[face.material_index].name
            
            face_data = {
                # Just keep the X, Y positions for points
                "points": [[point.x, point.y] for point in points],
                "material": material,
                "verts": verts
            }
            frame_data.append(face_data)
        
        evaluated_object.to_mesh_clear()
        mesh.free()
        
        
    # Sort the faces by descending Z value so we can draw back to front
    frame_data = sorted(frame_data, key=cmp_to_key(compare_triangles(camera.location))

    # Remap so we can drop the verts data
    frame_data = [
        {
            "points": face_data["points"],
            "material": face_data["material"],
        }
    for face_data in frame_data]

    data.append({
        "frame": frame,
        "triangles": frame_data,
    })


    frame += frame_rate


directory = os.path.dirname(bpy.data.filepath)
path = os.path.join(directory, "hisoyakani.json")

with open(path, "w") as file:
    json.dump(data, file)

print("end")
print()