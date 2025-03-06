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

frame = 1000
frame_end = 5250
frame_end = 1000

# Must be multiple of 3 so actual time rounds to an integer
frame_rate = 9

epsilon = 1e-4

class BSPNode:
    def __init__(self, frame_data, front, back):
        self.triangle = triangle
        self.front = []
        self.back = []

# Get plane equation from vertices of triangle
def compute_plane(triangle):
    a = triangle[0]
    b = triangle[1]
    c = triangle[2]
    
    ab = b - a
    ac = c - a

    normal = ab.cross(ac)
    # Don't know if this is needed
    normal.normalize()
    D = -(normal.dot(a))
    
    return normal, D

def compare_triangle(vert, plane):
    normal, D = plane
    d = normal.dot(vert) + D
    
    if d >= 0:
        return "F" # front

    return "B" # back

def classify_triangle(triangle, plane):
    checks = []
    for vert in triangle["verts"]:
        check = compare_vert(vert, plane)
        checks.append(check)

    # I think it's fine if we just decide that if it's on the plane to consider it front
    if all(check == "F" for check in checks):
        return "F" # front

    if all(check == "B" for check in checks):
        return "B" # behind
    
    return "S" # spanning

def interpolate(v1, v2, d1, d2):
        """ Linearly interpolate between v1 and v2 at plane intersection """
        t = d1 / (d1 - d2)
        return v1 + t * (v2 - v1)

def create_triangle(verts, material, scene, camera):
    points = []
    for index in range(3):
        # Transform point to how it looks in camera
        point = bpy_extras.object_utils.world_to_camera_view(scene, camera, vert)
        points.append(point)
        
    triangle = {
        "points": points,
        "material": material,
        "verts": verts,
    }
    
    return triangle
    

def split_triangle(triangle, plane, scene, camera):
    verts = triangle["verts"
    material = triangle["material"]
    normal, D = plane
    distances = [(vert - D).dot(normal) for vert in verts]
    camera_location = camera.matrix_world.translation
    d = camera_location - D.dot(normal)
    
    front = []
    back = []
    
    for i, d in enumerate(distances):
        if d >= 0:
            # Track original triangle with d
            front.append(triangle[i], d)
        else:
            back.append(triangle[i], d)
            
    if len(front) == 2 and d >= 0:
        single = back[0]
        far1 = front[0]
        far2 = front[1]
    else: # len(back) == 2:
        single = front[0]
        far1 = back[0]
        far2 = back[1]

    split1 = interpolate(far1[0], single[0], far1[1], single[1])
    split2 = interpolate(far2[0], single[0], far2[1], single[1])
    
    return [
        create_triangle((far1[0], split1, split2), material, scene, camera),
        create_triangle((far1[0], split2, far2[0]), material, scene, camera),
        create_triangle((split1, single[0], split2), material, scene, camera)
    ]

def build_bsp(triangles, scene, camera):
    front = []
    back = []
    
    pivot = triangles[len(triangles) // 2]
    plane = compute_plane(pivot)
    classification = classify_triangles(triangle, plane)

    for triangle in triangles:
        if triangle == pivot:
            continue
        
        if classification == "F":
            front.append(triangle)
            continue
        
        if classification == "B":
            back.append(triangle)
            continue
        
        fronts, backs = split_triangle(triangle, plane, scene, camera)
        front += fronts
        back += backs
    
    root = BSPNode(pivot, build_bsp(front), build_bsp(back))
    return root

def traverse_bsp(bsp, camera_location, visited):
    return

while frame <= frame_end:
    print("Processing ", frame)
    
    """
    {
        points: [Vector, Vector, Vector],
        material: string
    }
    """
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
        
    triangles = []
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
        # Dunno but this seems necessary for triangulate operation?
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
            for index in range(3):
                vert = face.verts[index].co.copy()
                verts.append(vert)
            # This will be something like red, skin, black, etc.
            material = material_slots[face.material_index].name
            triangle = create_triangle(vert, material, scene, camera)
            points = triangle["points"]
            
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

            triangles.append(triangle)
        
        evaluated_object.to_mesh_clear()
        mesh.free()
    
    bsp = build_bsp(triangles, scene, camera)
    
    triangles=[]
    traverse_bsp(bsp, camera_location, triangles)
    
    # Reverse so back is drawn first in storyboard
    triangles.reverse()

    # Remap so we can drop unnecessary data
    triangles = [
        {
            "points": [[point.x, point.y] for point in points],
            "material": triangle["material"],
        }
    for triangle in triangles]

    data.append({
        "frame": frame,
        "triangles": triangles,
    })

    frame += frame_rate


directory = os.path.dirname(bpy.data.filepath)
path = os.path.join(directory, "hisoyakani.json")

with open(path, "w") as file:
    json.dump(data, file)

print("end")
print()