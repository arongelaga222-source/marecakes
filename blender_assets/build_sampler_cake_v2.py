import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

# -------------------------------------------------------------
# 0. Clean Scene Setup
# -------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)

scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0

# Render settings
scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
scene.render.resolution_x = 1600
scene.render.resolution_y = 1200
scene.render.film_transparent = True

collection = bpy.context.collection

# -------------------------------------------------------------
# Material Factory: Principled PBR Material with Blender 4/5 Inputs
# -------------------------------------------------------------
def create_pbr_material(name, color=(0.8, 0.8, 0.8, 1.0), roughness=0.5, metallic=0.0, coat=0.0, transmission=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = color
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if "Coat Weight" in bsdf.inputs:
            bsdf.inputs["Coat Weight"].default_value = coat
        if "Transmission Weight" in bsdf.inputs:
            bsdf.inputs["Transmission Weight"].default_value = transmission
        if "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
            
    if transmission > 0.0 or alpha < 1.0:
        mat.blend_method = 'BLEND'
    return mat

# Materials Definition
mat_board = create_pbr_material("M_CakeBoard", color=(0.92, 0.92, 0.94, 1.0), roughness=0.18, metallic=0.92)
mat_collar = create_pbr_material("M_AcetateCollar", color=(0.96, 0.98, 1.0, 0.35), roughness=0.04, transmission=0.94, alpha=0.35)

# 1. Lotus Biscoff
mat_lotus_top = create_pbr_material("M_LotusTop", color=(0.86, 0.54, 0.22, 1.0), roughness=0.35, coat=0.6)  # Warm Speculoos caramel
mat_lotus_side = create_pbr_material("M_LotusSide", color=(0.93, 0.84, 0.70, 1.0), roughness=0.60) # Cream cheesecake body
mat_lotus_biscuit = create_pbr_material("M_LotusBiscuit", color=(0.74, 0.42, 0.16, 1.0), roughness=0.72)

# 2. Dark Chocolate Truffle
mat_choc_top = create_pbr_material("M_ChocTop", color=(0.08, 0.04, 0.03, 1.0), roughness=0.12, coat=0.95)   # Glossy dark mirror glaze
mat_choc_side = create_pbr_material("M_ChocSide", color=(0.14, 0.08, 0.05, 1.0), roughness=0.45) # Dark chocolate body
mat_gold = create_pbr_material("M_GoldLeaf", color=(1.0, 0.84, 0.22, 1.0), roughness=0.20, metallic=0.98)

# 3. Matcha Pistachio
mat_matcha_top = create_pbr_material("M_MatchaTop", color=(0.60, 0.72, 0.32, 1.0), roughness=0.30, coat=0.5) # Soft vibrant matcha glaze
mat_matcha_side = create_pbr_material("M_MatchaSide", color=(0.68, 0.78, 0.42, 1.0), roughness=0.55)
mat_pistachio = create_pbr_material("M_PistachioCrumb", color=(0.54, 0.66, 0.26, 1.0), roughness=0.78)
mat_matcha_pipe = create_pbr_material("M_MatchaPiping", color=(0.12, 0.06, 0.04, 1.0), roughness=0.20)

# 4. Red Velvet
mat_redvelvet_top = create_pbr_material("M_RedVelvetTop", color=(0.76, 0.08, 0.12, 1.0), roughness=0.88) # Vivid red crumb
mat_redvelvet_side = create_pbr_material("M_RedVelvetSide", color=(0.88, 0.45, 0.50, 1.0), roughness=0.65) # Cream pink/red side

# 5. Ube Velvet
mat_ube_top = create_pbr_material("M_UbeTop", color=(0.40, 0.12, 0.55, 1.0), roughness=0.10, coat=0.98) # Royal glossy purple mirror glaze
mat_ube_side = create_pbr_material("M_UbeSide", color=(0.62, 0.42, 0.72, 1.0), roughness=0.35) # Lavender mousse side

# 6. Cookies & Cream (Oreo)
mat_oreo_top = create_pbr_material("M_OreoTop", color=(0.20, 0.16, 0.14, 1.0), roughness=0.80) # Oreo crumb top
mat_oreo_side = create_pbr_material("M_OreoSide", color=(0.35, 0.32, 0.30, 1.0), roughness=0.75) # Cookies and cream speckle side
mat_whipped_cream = create_pbr_material("M_WhippedCream", color=(0.99, 0.99, 0.98, 1.0), roughness=0.22, coat=0.25)
mat_cherry = create_pbr_material("M_Cherry", color=(0.90, 0.01, 0.05, 1.0), roughness=0.05, coat=1.0)
mat_stem = create_pbr_material("M_CherryStem", color=(0.26, 0.34, 0.10, 1.0), roughness=0.50)

# -------------------------------------------------------------
# Cake Wedge Builder with Multi-Material Slots
# -------------------------------------------------------------
CAKE_RADIUS = 1.0
CAKE_HEIGHT = 0.56
SECTORS = 6

def build_wedge_mesh(name, start_angle, end_angle, mat_top, mat_side, segments=28):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()

    center_bottom = bm.verts.new(Vector((0, 0, 0)))
    center_top = bm.verts.new(Vector((0, 0, CAKE_HEIGHT)))

    bottom_arc = []
    top_arc = []

    for i in range(segments + 1):
        t = i / segments
        angle = start_angle + t * (end_angle - start_angle)
        x = CAKE_RADIUS * math.cos(angle)
        y = CAKE_RADIUS * math.sin(angle)
        vb = bm.verts.new(Vector((x, y, 0)))
        vt = bm.verts.new(Vector((x, y, CAKE_HEIGHT)))
        bottom_arc.append(vb)
        top_arc.append(vt)

    bm.verts.ensure_lookup_table()

    # Bottom pie sector (Slot 1: side/base material)
    for i in range(segments):
        f = bm.faces.new([center_bottom, bottom_arc[i + 1], bottom_arc[i]])
        f.material_index = 1

    # Top pie sector (Slot 0: Top Glaze material)
    for i in range(segments):
        f = bm.faces.new([center_top, top_arc[i], top_arc[i + 1]])
        f.material_index = 0

    # Curved outer wall (Slot 1: Outer side frosting)
    for i in range(segments):
        f = bm.faces.new([bottom_arc[i], bottom_arc[i + 1], top_arc[i + 1], top_arc[i]])
        f.material_index = 1

    # Radial side 1 (start angle)
    f1 = bm.faces.new([center_bottom, center_top, top_arc[0], bottom_arc[0]])
    f1.material_index = 1

    # Radial side 2 (end angle)
    f2 = bm.faces.new([center_bottom, bottom_arc[-1], top_arc[-1], center_top])
    f2.material_index = 1

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)

    # Slot 0 = Top, Slot 1 = Side
    obj.data.materials.append(mat_top)
    obj.data.materials.append(mat_side)

    # Bevel modifier for realistic soft organic edges
    bev = obj.modifiers.new("Bevel", 'BEVEL')
    bev.width = 0.012
    bev.segments = 3
    bev.limit_method = 'ANGLE'
    bev.angle_limit = math.radians(45)

    for poly in mesh.polygons:
        poly.use_smooth = True

    return obj

# -------------------------------------------------------------
# Detailed Topping Builders
# -------------------------------------------------------------
def build_lotus_biscuit(slice_angle_mid):
    length = 0.46
    width = 0.22
    thick = 0.038
    
    mesh = bpy.data.meshes.new("LotusBiscuitMesh")
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((length, width, thick)), verts=bm.verts)
    
    # Scalloped fluting along the perimeter
    for v in bm.verts:
        if abs(v.co.y) > 0.08:
            ripple = 0.010 * math.sin(v.co.x * 45.0)
            v.co.y += math.copysign(ripple, v.co.y)
            
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new("LotusBiscuit", mesh)
    collection.objects.link(obj)
    obj.data.materials.append(mat_lotus_biscuit)
    
    bev = obj.modifiers.new("Bevel", 'BEVEL')
    bev.width = 0.008
    bev.segments = 3
    
    dist = 0.58
    pos_x = dist * math.cos(slice_angle_mid)
    pos_y = dist * math.sin(slice_angle_mid)
    obj.location = (pos_x, pos_y, CAKE_HEIGHT + thick*0.8)
    obj.rotation_euler = Euler((math.radians(8), math.radians(-12), slice_angle_mid + math.radians(24)), 'XYZ')
    return obj

def build_chocolate_shard(slice_angle_mid):
    mesh = bpy.data.meshes.new("ChocShardMesh")
    bm = bmesh.new()
    
    # Pleated chocolate fan
    num_folds = 6
    verts_fan = []
    base_pt = bm.verts.new(Vector((0, 0, 0)))
    
    for f in range(num_folds + 1):
        ang = (f / num_folds) * math.radians(65) - math.radians(32)
        r = 0.32 + 0.06 * (f % 2)
        z = 0.18 + 0.04 * (f % 2)
        vx = r * math.cos(ang)
        vy = r * math.sin(ang)
        verts_fan.append(bm.verts.new(Vector((vx, vy, z))))
        
    for f in range(num_folds):
        bm.faces.new([base_pt, verts_fan[f], verts_fan[f+1]])
        
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new("ChocShard", mesh)
    collection.objects.link(obj)
    obj.data.materials.append(mat_choc_top)
    
    solid = obj.modifiers.new("Solidify", 'SOLIDIFY')
    solid.thickness = 0.014
    
    dist = 0.58
    pos_x = dist * math.cos(slice_angle_mid)
    pos_y = dist * math.sin(slice_angle_mid)
    obj.location = (pos_x, pos_y, CAKE_HEIGHT + 0.01)
    obj.rotation_euler = Euler((math.radians(28), math.radians(-18), slice_angle_mid - math.radians(35)), 'XYZ')
    
    # Gold leaf foil on tip
    gold_mesh = bpy.data.meshes.new("GoldLeafMesh")
    bm_g = bmesh.new()
    bmesh.ops.create_icosphere(bm_g, subdivisions=1, radius=0.038)
    bmesh.ops.scale(bm_g, vec=Vector((1.0, 0.7, 0.2)), verts=bm_g.verts)
    bm_g.to_mesh(gold_mesh)
    bm_g.free()
    
    gold_obj = bpy.data.objects.new("GoldLeaf", gold_mesh)
    collection.objects.link(gold_obj)
    gold_obj.data.materials.append(mat_gold)
    gold_obj.location = (pos_x - 0.03, pos_y + 0.04, CAKE_HEIGHT + 0.22)
    return [obj, gold_obj]

def build_pistachio_crumbs(start_angle, end_angle):
    crumbs = []
    num_crumbs = 22
    for i in range(num_crumbs):
        t = (i + 0.5) / num_crumbs
        angle = start_angle + t * (end_angle - start_angle)
        r = CAKE_RADIUS - 0.055 + (math.sin(i * 4.3) * 0.032)
        px = r * math.cos(angle)
        py = r * math.sin(angle)
        pz = CAKE_HEIGHT + 0.007
        
        mesh = bpy.data.meshes.new(f"PistachioCrumb_{i}")
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.019 + (math.cos(i)*0.006))
        bmesh.ops.scale(bm, vec=Vector((1.1, 0.8, 0.55)), verts=bm.verts)
        bm.to_mesh(mesh)
        bm.free()
        
        crumb = bpy.data.objects.new(f"PistachioCrumb_{i}", mesh)
        collection.objects.link(crumb)
        crumb.data.materials.append(mat_pistachio)
        crumb.location = (px, py, pz)
        crumb.rotation_euler = Euler((math.sin(i), math.cos(i), angle), 'XYZ')
        crumbs.append(crumb)
    return crumbs

def build_matcha_chevrons(slice_angle_mid):
    chevrons = []
    for step in range(1, 5):
        dist = 0.22 + step * 0.16
        mesh = bpy.data.meshes.new(f"MatchaChevron_{step}")
        bm = bmesh.new()
        
        ang_left = slice_angle_mid - math.radians(16)
        ang_right = slice_angle_mid + math.radians(16)
        
        p_center = Vector((dist * math.cos(slice_angle_mid), dist * math.sin(slice_angle_mid), CAKE_HEIGHT + 0.004))
        p_left = Vector(((dist - 0.075) * math.cos(ang_left), (dist - 0.075) * math.sin(ang_left), CAKE_HEIGHT + 0.004))
        p_right = Vector(((dist - 0.075) * math.cos(ang_right), (dist - 0.075) * math.sin(ang_right), CAKE_HEIGHT + 0.004))
        
        v_c = bm.verts.new(p_center)
        v_l = bm.verts.new(p_left)
        v_r = bm.verts.new(p_right)
        
        bm.edges.new([v_l, v_c])
        bm.edges.new([v_c, v_r])
        bm.to_mesh(mesh)
        bm.free()
        
        obj = bpy.data.objects.new(f"MatchaChevron_{step}", mesh)
        collection.objects.link(obj)
        obj.data.materials.append(mat_matcha_pipe)
        
        skin = obj.modifiers.new("Skin", 'SKIN')
        subd = obj.modifiers.new("Subdiv", 'SUBSURF')
        subd.levels = 1
        
        for v in obj.data.skin_vertices[0].data:
            v.radius = (0.006, 0.006)
            
        chevrons.append(obj)
    return chevrons

def build_whipped_cream_rosette(pos):
    mesh = bpy.data.meshes.new("CreamRosetteMesh")
    bm = bmesh.new()
    
    rings = 10
    points_per_ring = 18
    for r in range(rings):
        h = (r / (rings - 1)) * 0.17
        rad = 0.13 * (1.0 - (r / rings)**0.85)
        rot = (r / rings) * math.pi * 0.95
        for p in range(points_per_ring):
            ang = rot + (p / points_per_ring) * 2.0 * math.pi
            star_factor = 1.0 + 0.32 * math.sin(ang * 7.0)
            x = rad * star_factor * math.cos(ang)
            y = rad * star_factor * math.sin(ang)
            bm.verts.new(Vector((x, y, h)))
            
    top_center = bm.verts.new(Vector((0, 0, 0.18)))
    bm.verts.ensure_lookup_table()
    
    for r in range(rings - 1):
        for p in range(points_per_ring):
            p_next = (p + 1) % points_per_ring
            v0 = r * points_per_ring + p
            v1 = r * points_per_ring + p_next
            v2 = (r + 1) * points_per_ring + p_next
            v3 = (r + 1) * points_per_ring + p
            bm.faces.new([bm.verts[v0], bm.verts[v1], bm.verts[v2], bm.verts[v3]])
            
    for p in range(points_per_ring):
        p_next = (p + 1) % points_per_ring
        v0 = (rings - 1) * points_per_ring + p
        v1 = (rings - 1) * points_per_ring + p_next
        bm.faces.new([bm.verts[v0], bm.verts[v1], top_center])
        
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new("CreamRosette", mesh)
    collection.objects.link(obj)
    obj.data.materials.append(mat_whipped_cream)
    obj.location = pos
    
    for poly in mesh.polygons:
        poly.use_smooth = True
    return obj

def build_cherry_and_stem(pos):
    c_mesh = bpy.data.meshes.new("CherryMesh")
    bm_c = bmesh.new()
    bmesh.ops.create_uvsphere(bm_c, u_segments=28, v_segments=18, radius=0.058)
    for v in bm_c.verts:
        if v.co.z > 0.04:
            v.co.z -= 0.014
    bmesh.ops.scale(bm_c, vec=Vector((1.0, 1.0, 0.94)), verts=bm_c.verts)
    bm_c.to_mesh(c_mesh)
    bm_c.free()
    
    cherry = bpy.data.objects.new("Cherry", c_mesh)
    collection.objects.link(cherry)
    cherry.data.materials.append(mat_cherry)
    cherry.location = pos
    for poly in c_mesh.polygons:
        poly.use_smooth = True
        
    curve_data = bpy.data.curves.new('CherryStemCurve', type='CURVE')
    curve_data.dimensions = '3D'
    curve_data.bevel_depth = 0.0032
    curve_data.bevel_resolution = 3
    polyline = curve_data.splines.new('BEZIER')
    polyline.bezier_points.add(2)
    
    p0 = polyline.bezier_points[0]
    p0.co = Vector((pos[0], pos[1], pos[2] + 0.044))
    p0.handle_left = Vector((pos[0], pos[1], pos[2] + 0.03))
    p0.handle_right = Vector((pos[0] + 0.015, pos[1] + 0.02, pos[2] + 0.09))
    
    p1 = polyline.bezier_points[1]
    p1.co = Vector((pos[0] + 0.045, pos[1] + 0.055, pos[2] + 0.16))
    p1.handle_left = Vector((pos[0] + 0.03, pos[1] + 0.035, pos[2] + 0.12))
    p1.handle_right = Vector((pos[0] + 0.055, pos[1] + 0.075, pos[2] + 0.20))
    
    p2 = polyline.bezier_points[2]
    p2.co = Vector((pos[0] + 0.085, pos[1] + 0.085, pos[2] + 0.22))
    p2.handle_left = Vector((pos[0] + 0.065, pos[1] + 0.075, pos[2] + 0.21))
    p2.handle_right = Vector((pos[0] + 0.095, pos[1] + 0.095, pos[2] + 0.23))
    
    stem = bpy.data.objects.new("CherryStem", curve_data)
    collection.objects.link(stem)
    stem.data.materials.append(mat_stem)
    
    return [cherry, stem]

# -------------------------------------------------------------
# Base Components
# -------------------------------------------------------------
board_mesh = bpy.data.meshes.new("CakeBoardMesh")
bm_b = bmesh.new()
bmesh.ops.create_cone(bm_b, cap_ends=True, radius1=1.30, radius2=1.30, depth=0.026, segments=48)
bm_b.to_mesh(board_mesh)
bm_b.free()
board_obj = bpy.data.objects.new("CakeBoard", board_mesh)
collection.objects.link(board_obj)
board_obj.data.materials.append(mat_board)
board_obj.location = (0, 0, -0.013)
bev_b = board_obj.modifiers.new("Bevel", 'BEVEL')
bev_b.width = 0.005
bev_b.segments = 2
for poly in board_mesh.polygons:
    poly.use_smooth = True

collar_mesh = bpy.data.meshes.new("AcetateCollarMesh")
bm_c = bmesh.new()
bmesh.ops.create_cone(bm_c, cap_ends=False, radius1=CAKE_RADIUS + 0.008, radius2=CAKE_RADIUS + 0.008, depth=CAKE_HEIGHT + 0.06, segments=64)
bm_c.to_mesh(collar_mesh)
bm_c.free()
collar_obj = bpy.data.objects.new("AcetateCollar", collar_mesh)
collection.objects.link(collar_obj)
collar_obj.data.materials.append(mat_collar)
collar_obj.location = (0, 0, (CAKE_HEIGHT + 0.06) / 2.0)
sol_c = collar_obj.modifiers.new("Solidify", 'SOLIDIFY')
sol_c.thickness = 0.004

# -------------------------------------------------------------
# 6 Slices Assembly
# -------------------------------------------------------------
slice_configs = [
    {
        "name": "Slice_Matcha",
        "start": math.radians(0),
        "end": math.radians(60),
        "mat_top": mat_matcha_top,
        "mat_side": mat_matcha_side,
        "type": "matcha"
    },
    {
        "name": "Slice_DarkChocolate",
        "start": math.radians(60),
        "end": math.radians(120),
        "mat_top": mat_choc_top,
        "mat_side": mat_choc_side,
        "type": "chocolate"
    },
    {
        "name": "Slice_LotusBiscoff",
        "start": math.radians(120),
        "end": math.radians(180),
        "mat_top": mat_lotus_top,
        "mat_side": mat_lotus_side,
        "type": "lotus"
    },
    {
        "name": "Slice_CookiesCream",
        "start": math.radians(180),
        "end": math.radians(240),
        "mat_top": mat_oreo_top,
        "mat_side": mat_oreo_side,
        "type": "cookies_cream"
    },
    {
        "name": "Slice_UbeVelvet",
        "start": math.radians(240),
        "end": math.radians(300),
        "mat_top": mat_ube_top,
        "mat_side": mat_ube_side,
        "type": "ube"
    },
    {
        "name": "Slice_RedVelvet",
        "start": math.radians(300),
        "end": math.radians(360),
        "mat_top": mat_redvelvet_top,
        "mat_side": mat_redvelvet_side,
        "type": "red_velvet"
    }
]

created_objects = [board_obj, collar_obj]

for cfg in slice_configs:
    wedge = build_wedge_mesh(cfg["name"], cfg["start"], cfg["end"], cfg["mat_top"], cfg["mat_side"])
    created_objects.append(wedge)
    
    mid_angle = (cfg["start"] + cfg["end"]) / 2.0
    
    if cfg["type"] == "lotus":
        biscuit = build_lotus_biscuit(mid_angle)
        created_objects.append(biscuit)
    elif cfg["type"] == "chocolate":
        choc_items = build_chocolate_shard(mid_angle)
        created_objects.extend(choc_items)
    elif cfg["type"] == "matcha":
        crumbs = build_pistachio_crumbs(cfg["start"], cfg["end"])
        created_objects.extend(crumbs)
        chevs = build_matcha_chevrons(mid_angle)
        created_objects.extend(chevs)
    elif cfg["type"] == "cookies_cream":
        pos_rosette = Vector((0.60 * math.cos(mid_angle), 0.60 * math.sin(mid_angle), CAKE_HEIGHT))
        rosette = build_whipped_cream_rosette(pos_rosette)
        created_objects.append(rosette)
        pos_cherry = Vector((pos_rosette.x, pos_rosette.y, CAKE_HEIGHT + 0.17))
        cherry_items = build_cherry_and_stem(pos_cherry)
        created_objects.extend(cherry_items)

# -------------------------------------------------------------
# Studio Camera Framing: Perfectly Frame Full Cake & Toppings
# -------------------------------------------------------------
cam_data = bpy.data.cameras.new("StudioCamera")
cam_data.lens = 48
cam_obj = bpy.data.objects.new("StudioCamera", cam_data)
collection.objects.link(cam_obj)
scene.camera = cam_obj

# Camera placed at balanced 3/4 angle
cam_obj.location = (2.4, -2.8, 2.2)
# Look at target point (0, 0, 0.35)
target_co = Vector((0.0, 0.0, 0.35))
direction = target_co - cam_obj.location
rot_quat = direction.to_track_quat('-Z', 'Y')
cam_obj.rotation_euler = rot_quat.to_euler()

# Lights
key_light_data = bpy.data.lights.new("KeyLight", type='AREA')
key_light_data.energy = 280
key_light_data.size = 2.5
key_light = bpy.data.objects.new("KeyLight", key_light_data)
collection.objects.link(key_light)
key_light.location = (3.0, -2.2, 3.5)
key_light.rotation_euler = Euler((math.radians(48), math.radians(12), math.radians(38)), 'XYZ')

fill_light_data = bpy.data.lights.new("FillLight", type='AREA')
fill_light_data.energy = 140
fill_light_data.size = 3.5
fill_light = bpy.data.objects.new("FillLight", fill_light_data)
collection.objects.link(fill_light)
fill_light.location = (-3.2, -2.2, 2.8)
fill_light.rotation_euler = Euler((math.radians(52), math.radians(-28), math.radians(-52)), 'XYZ')

rim_light_data = bpy.data.lights.new("RimLight", type='AREA')
rim_light_data.energy = 240
rim_light_data.size = 3.0
rim_light = bpy.data.objects.new("RimLight", rim_light_data)
collection.objects.link(rim_light)
rim_light.location = (0.0, 3.2, 3.0)
rim_light.rotation_euler = Euler((math.radians(-50), 0, math.radians(180)), 'XYZ')

# -------------------------------------------------------------
# Save .blend Scene
# -------------------------------------------------------------
blend_path = os.path.abspath("d:/Projects/Marecakes/blender_assets/sampler_cake.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
print(f"Successfully saved master .blend to: {blend_path}")

# -------------------------------------------------------------
# Render Studio Preview
# -------------------------------------------------------------
preview_img_path = os.path.abspath("d:/Projects/Marecakes/blender_assets/preview_render.png")
scene.render.filepath = preview_img_path
bpy.ops.render.render(write_still=True)
print(f"Rendered studio preview to: {preview_img_path}")

# -------------------------------------------------------------
# Export Combined Web-Ready .GLB
# -------------------------------------------------------------
bpy.ops.object.select_all(action='DESELECT')
for obj in created_objects:
    if obj.type in ['MESH', 'CURVE']:
        obj.select_set(True)

glb_path = os.path.abspath("d:/Projects/Marecakes/public/models/sampler_cake.glb")
bpy.ops.export_scene.gltf(
    filepath=glb_path,
    use_selection=True,
    export_format='GLB',
    export_apply=True
)
print(f"Successfully exported web-ready GLB to: {glb_path}")
