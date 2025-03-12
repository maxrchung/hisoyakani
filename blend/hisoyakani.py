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

frame = 690
frame_end = 5250
frame_end = 690

# Must be multiple of 3 so actual time rounds to an integer
frame_rate = 9

epsilon = 1e-5

def create_triangle(verts, material, scene, camera):
    points = []
    for index in range(3):
        vert = verts[index]
        # Transform point to how it looks in camera
        point = bpy_extras.object_utils.world_to_camera_view(scene, camera, vert)
        points.append(point)
        
    triangle = {
        "points": points,
        "material": material,
        "verts": verts,
    }
    
    return triangle

# Check if a triangle is degenerate (area ~ 0 or vertices too close)
def is_degenerate(triangle):
    verts = triangle["verts"]
    
    v1, v2, v3 = verts

    # Check if any two points are too close
    if (v1 - v2).length < epsilon or (v2 - v3).length < epsilon or (v3 - v1).length < epsilon:
        return True

    # Compute triangle area using cross product
    edge1 = v2 - v1
    edge2 = v3 - v1
    area = edge1.cross(edge2).length / 2  # Area of triangle

    return area < epsilon

class BSPNode:
    def __init__(self, triangles, front, back):
        self.triangles = triangles
        self.front = front
        self.back = back

# Get plane equation from vertices of triangle
def compute_plane(triangle):
    verts = triangle["verts"]
    
    a = verts[0]
    b = verts[1]
    c = verts[2]
    
    ab = b - a
    ac = c - a

    normal = ab.cross(ac)
    # Don't know if this is needed
    normal.normalize()
    D = -(normal.dot(a))
    
    return normal, D

def compare_vert(vert, plane):
    normal, D = plane
    d = normal.dot(vert) + D
    
    if abs(d) < epsilon:
        return "O"
         
    if d > 0:
        return "F" # front

    return "B" # back

def classify_triangle(triangle, plane):
    checks = []
    for vert in triangle["verts"]:
        check = compare_vert(vert, plane)
        checks.append(check)

    if all(check == "O" for check in checks):
        return "O"

    if all(check == "F" or check == "O" for check in checks):
        return "F" # front

    if all(check == "B" or check == "O" for check in checks):
        return "B" # back
    
    return "S" # spanning

def interpolate(v1, v2, d1, d2):
    """ Linearly interpolate between v1 and v2 at plane intersection """
    t = d1 / (d1 - d2)
    return v1 + t * (v2 - v1)    

# Fixes triangles point order
def wind_triangles(triangles, original_normal):
    for triangle in triangles:
        verts = triangle["verts"]
        split_normal = (verts[1] - verts[0]).cross(verts[2] - verts[0])
        split_normal.normalize()
        compare_normal = split_normal.dot(original_normal)
        
        if compare_normal < 0:
            points = triangle["points"]
            verts[1], verts[0] = verts[0], verts[1]
            points[1], points[0] = points[0], points[1]
                
def split_triangle(triangle, plane, scene, camera):
    verts = triangle["verts"]
    material = triangle["material"]
    
    normal, D = plane
    distances = [normal.dot(vert) + D for vert in verts]
    
    # Need this for triangle winding order
    original_normal = (verts[1] - verts[0]).cross(verts[2] - verts[0])
    original_normal.normalize()
    
    front = []
    back = []
    on = []
    
    for i, d in enumerate(distances):
        if abs(d) < epsilon:
            on.append((verts[i], d))
        
        if abs(d) < epsilon or d > 0:
            # Track original triangle with d
            front.append((verts[i], d))
        else:
            back.append((verts[i], d))
    
    # Special case where we can split into 2 triangles instead of 3
    if len(on) > 0:
        f = front[0]
        b = back[0]
        o = on[0]
        
        split = interpolate(f[0], b[0], f[1], b[1])
        
        fronts = [create_triangle([split, b[0], o[0]], material, scene, camera)]
        backs = [create_triangle([o[0], b[0], split], material, scene, camera)]
    
    # Most cases will be split into 3 triangles
    else:
        if len(front) == 2:
            single = back[0]
            far1 = front[0]
            far2 = front[1]
                
        else: # len(back) == 2:
            single = front[0]
            far1 = back[0]
            far2 = back[1]
            
        split1 = interpolate(far1[0], single[0], far1[1], single[1])
        split2 = interpolate(far2[0], single[0], far2[1], single[1])
        
        triangles = [
            create_triangle([far1[0], split2, split1], material, scene, camera),
            create_triangle([far1[0], far2[0], split2], material, scene, camera),
            create_triangle([split1, split2, single[0]], material, scene, camera)
        ]
        
        if len(front) == 2:
            fronts = [triangles[0], triangles[1]]
            backs = [triangles[2]]
        else:
            fronts = [triangles[2]]
            backs = [triangles[0], triangles[1]]
    
    wind_triangles(fronts, original_normal)
    wind_triangles(backs, original_normal)
    
    camera_location = camera.matrix_world.translation
    camera_d = normal.dot(camera_location) + D
    
    if camera_d >= 0:
        return fronts, backs
    
    return backs, fronts

# Pick the best pivot to reduce splits
def pick_pivot(triangles):
    best_pivot = triangles[0]
    best_splits = 999999
    
    for pivot in triangles:
        splits = 0
        plane = compute_plane(pivot)
        
        for triangle in triangles:
            if classify_triangle(triangle, plane) == 'S':
                splits += 1
                
        if splits == 0:
            return pivot
        
        if splits < best_splits:
            best_splits = splits
            best_pivot = pivot
            
    return best_pivot
    

def build_bsp(triangles, scene, camera):
    if len(triangles) == 0:
        return None
    
    pivot = pick_pivot(triangles)
    #pivot = triangles[len(triangles) // 2]
    plane = compute_plane(pivot)
    normal, D = plane
    camera_location = camera.matrix_world.translation
    camera_d = normal.dot(camera_location) + D

    coplane = [pivot]
    front = []
    back = []
    
    didSplit = False
    
    for triangle in triangles:            
        if triangle == pivot:
            continue
        
        classification = classify_triangle(triangle, plane)
        
        if classification == "O":
            coplane.append(triangle)
            continue
        
        if classification == "F":
            if camera_d >= 0:
                front.append(triangle)
            else:
                back.append(triangle)
            continue
        
        if classification == "B":
            if camera_d >= 0:
                back.append(triangle)
            else:
                front.append(triangle)
            continue

        fronts, backs = split_triangle(triangle, plane, scene, camera)
        fronts = [front for front in fronts if not is_degenerate(front)]
        backs = [back for back in backs if not is_degenerate(back)]
        
        front += fronts
        back += backs
        didSplit = True

    if didSplit:
        # triangle["material"] = "debug"
        pass

    node = BSPNode(coplane, build_bsp(front, scene, camera), build_bsp(back, scene, camera))
    
    return node

def is_point_in_triangle(p, triangle, threshold):
    """
    Check if point `p` is inside the triangle defined by points `a`, `b`, and `c`
    using barycentric coordinates.

    Parameters:
    - p: mathutils.Vector (Point to test)
    - a, b, c: mathutils.Vector (Triangle vertices)

    Returns:
    - True if p is inside the triangle, otherwise False
    """
    
    points = triangle["points"]
    a = points[0]
    b = points[1]
    c = points[2]

    # Compute vectors
    v0 = c - a
    v1 = b - a
    v2 = p - a

    # Compute dot products
    dot00 = v0.dot(v0)
    dot01 = v0.dot(v1)
    dot02 = v0.dot(v2)
    dot11 = v1.dot(v1)
    dot12 = v1.dot(v2)

    # Compute barycentric coordinates
    denom = dot00 * dot11 - dot01 * dot01
    if denom == 0:
        return False  # Degenerate triangle (shouldn't happen in valid geometry)

    u = (dot11 * dot02 - dot01 * dot12) / denom
    v = (dot00 * dot12 - dot01 * dot02) / denom

    # Check if the point is inside the triangle
    return (u >= threshold) and (v >= threshold) and (u + v <= 1 - threshold)

# Loop through all triangles to see if triangle lies in those areas
def is_in_triangles(triangle, triangles):
    points = triangle["points"]
    
    for triangle in triangles:
        if is_point_in_triangle(points[0], triangle, 0.05) and \
           is_point_in_triangle(points[1], triangle, 0.05) and \
           is_point_in_triangle(points[2], triangle, 0.05):
            return True            

    """
    # This might be too lax because it's possible the middle parts of triangle aren't accounted for properly
    hasFirst = False
    hasSecond = False
    hasThird = False
    
    for triangle in triangles:
        if not hasFirst and is_point_in_triangle(points[0], triangle, 0.25):
            hasFirst = True
            
        if not hasSecond and is_point_in_triangle(points[1], triangle, 0.25):
            hasSecond = True
            
        if not hasThird and is_point_in_triangle(points[2], triangle, 0.25):
            hasThird = True
        
        if hasFirst and hasSecond and hasThird:
            return True
    """
    
    return False

def traverse_bsp(bsp, triangles):
    if bsp is None:
        return
    
    traverse_bsp(bsp.front, triangles)
    
   
    for triangle in bsp.triangles:
        # if not is_in_triangles(triangle, triangles):
            triangles.append(triangle)
        
    traverse_bsp(bsp.back, triangles)

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
            triangle = create_triangle(verts, material, scene, camera)
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

            if is_degenerate(triangle):
                continue

            triangles.append(triangle)
        
        evaluated_object.to_mesh_clear()
        mesh.free()
    
    bsp = build_bsp(triangles, scene, camera)
    
    triangles = []
    traverse_bsp(bsp, triangles)
    
    # Reverse so back is drawn first in storyboard
    triangles.reverse()

    # Remap so we can drop unnecessary data
    triangles = [
        {
            "points": [[point.x, point.y] for point in triangle["points"]],
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