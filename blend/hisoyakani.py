import bpy
import bmesh
import json
import bpy_extras
import pprint
import os
from functools import cmp_to_key
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

depsgraph = bpy.context.evaluated_depsgraph_get()

frame = 0
frame_end = 5250
frame_end = 1000

# Must be multiple of 3 so actual time rounds to an integer
frame_rate = 9

epsilon = 1e-6

# Get plane equation from vertices of triangle
def plane_equation(verts):
    a = verts[0]
    b = verts[1]
    c = verts[2]
    
    ab = b - a
    ac = c - a

    normal = ab.cross(ac)
    A, B, C = normal.x, normal.y, normal.z
    D = -(A * a.x + B * a.y + C * a.z)
    
    return A, B, C, D

def compare_vert(plane, vert):
    A, B, C, D = plane
    d = A * vert.x + B * vert.y + C * vert.z + D
    
    if abs(d) < epsilon:
        return "O"
    
    if d > 0:
        return "F" # front

    return "B" # behind
    

def compare_verts(plane, verts):
    checks = []
    for vert in verts:
        check = compare_vert(plane, vert)
        checks.append(check)
        
    if all(check == "F" or check == "O" for check in checks):
        return "F" # front
    
    if all(check == "B" or check == "O" for check in checks):
        return "B" # behind
    
    return "I" # indeterminate
    
# Compare function that denotes draw order
# -1 means should be behind, 1 means should be in front
# Use a closure so we can reference camera location
def compare_triangles(camera_location):
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
            
            # We're screwed at this point, try to do a simple Z test
            if check == "I":
                minA = min(vertsA, key=lambda vert: (camera_location - vert).length_squared)
                minB = min(vertsB, key=lambda vert: (camera_location - vert).length_squared)
                
                if minA < minB:
                    return 1
                
                if minA > minB:
                    return -1
                            
                return 0
        
        if camera == "O":
            return 0
        
        if check == camera:
            return 1 * swapped
    
        return -1 * swapped
    
                
    return compare
    
while frame <= frame_end:
    print("Processing ", frame)
    
    """
    {
        points: [Vector, Vector, Vector],
        material: string
    }
    """
    frame_data = []
    scene.frame_set(frame)
    camera_location = camera.matrix_world.translation

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
        mesh.verts.ensure_lookup_table()

        for face in mesh.faces:
            # Simple backface cull by comparing normal against camera position
            # This doesn't seem like it takes account perspective so ionno if it's a perfect solution
            location = face.calc_center_median()
            view_direction = (location - camera_location).normalized()
            normal = face.normal
            if normal.dot(view_direction) > 0:
                continue

            verts = []
            points = []
            for index in range(3):
                vert = face.verts[index].co.copy()
                verts.append(vert)
                
                # Transform point to how it looks in camera
                point = bpy_extras.object_utils.world_to_camera_view(scene, camera, vert)
                points.append(point)
            
            # ??? Some weird cases where points could equal each other
            if (abs(points[0].x - points[1].x) < epsilon and abs(points[0].y - points[1].y) < epsilon) or \
               (abs(points[0].x - points[2].x) < epsilon and abs(points[0].y - points[2].y) < epsilon) or \
               (abs(points[1].x - points[2].x) < epsilon and abs(points[1].y - points[2].y) < epsilon):
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
                "points": [[point.x, point.y] for point in points],
                "material": material,
                "verts": verts,
            }
            frame_data.append(face_data)
        
        evaluated_object.to_mesh_clear()
        mesh.free()
        
    # Do a quick sort of the faces by descending Z value for a rough 
    # frame_data = sorted(frame_data, key=cmp_to_key(compare_triangles(camera_location)))
    
    # I have a suspicion sorted() doesn't work well because of way depth checks work
    # So here we try a rudimentary bubble sort where we compare every triangle to each other
    n = len(frame_data)
    compare = compare_triangles(camera_location)
    for i in range(n):
        max = n - i - 1
        for j in range(max):
            comparison = compare(frame_data[j], frame_data[max])
            if comparison == 1:
                # Swap
                frame_data[j], frame_data[max] = frame_data[max], frame_data[j]

    # Remap so we can drop unnecessary data
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