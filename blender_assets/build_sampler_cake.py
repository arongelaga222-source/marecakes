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

# Ensure cycles / eevee settings
if hasattr(scene, "render"):
    scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 900
    scene.render.film_transparent = True

collection = bpy.context.collection

# -------------------------------------------------------------
# Helper: Create Principled PBR Material
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
        elif "Clearcoat" in bsdf.inputs:
            bsdf.inputs["Clearcoat"].default_value = coat
        if "Transmission Weight" in bsdf.inputs:
            bsdf.inputs["Transmission Weight"].default_value = transmission
        elif "Transmission" in bsdf.inputs:
            bsdf.inputs["Transmission"].default_value = transmission
        if "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
            
    if transmission > 0.0 or alpha < 1.0:
        mat.blend_method = 'BLEND'
    return mat

# Create Materials
mat_board = create_pbr_material("M_CakeBoard", color=(0.88, 0.88, 0.90, 1.0), roughness=0.22, metallic=0.92)
mat_collar = create_pbr_material("M_AcetateCollar", color=(0.95, 0.97, 1.0, 0.35), roughness=0.08, transmission=0.92, alpha=0.45)

mat_lotus_base = create_pbr_material("M_LotusBase", color=(0.82, 0.52, 0.28, 1.0), roughness=0.45, coat=0.3)
mat_lotus_biscuit = create_pbr_material("M_LotusBiscuit", color=(0.76, 0.44, 0.20, 1.0), roughness=0.68)

mat_choc_base = create_pbr_material("M_ChocBase", color=(0.11, 0.06, 0.04, 1.0), roughness=0.18, coat=0.85)
mat_gold = create_pbr_material("M_GoldLeaf", color=(1.0, 0.82, 0.25, 1.0), roughness=0.25, metallic=0.95)

mat_matcha_base = create_pbr_material("M_MatchaBase", color=(0.58, 0.68, 0.30, 1.0), roughness=0.35, coat=0.4)
mat_pistachio = create_pbr_material("M_PistachioCrumb", color=(0.50, 0.62, 0.24, 1.0), roughness=0.75)
mat_matcha_pipe = create_pbr_material("M_MatchaPiping", color=(0.14, 0.07, 0.04, 1.0), roughness=0.25)

mat_redvelvet = create_pbr_material("M_RedVelvet", color=(0.78, 0.09, 0.13, 1.0), roughness=0.82)
mat_cream_border = create_pbr_material("M_CreamFrosting", color=(0.96, 0.95, 0.92, 1.0), roughness=0.38)

mat_ube_base = create_pbr_material("M_UbeBase", color=(0.44, 0.16, 0.54, 1.0), roughness=0.14, coat=0.95)

mat_oreo_base = create_pbr_material("M_OreoBase", color=(0.22, 0.18, 0.16, 1.0), roughness=0.70)
mat_whipped_cream = create_pbr_material("M_WhippedCream", color=(0.98, 0.98, 0.97, 1.0), roughness=0.28, coat=0.2)
mat_cherry = create_pbr_material("M_Cherry", color=(0.88, 0.02, 0.06, 1.0), roughness=0.08, coat=1.0)
mat_stem = create_pbr_material("M_CherryStem", color=(0.28, 0.35, 0.12, 1.0), roughness=0.55)

# -------------------------------------------------------------
# 1. Geometry Builder: Cake Wedge
# -------------------------------------------------------------
CAKE_RADIUS = 1.0
CAKE_HEIGHT = 0.58
SECTORS = 6
ANGLE_PER_SECTOR = (2.0 * math.pi) / SECTORS  # 60 degrees

def build_wedge_mesh(name, start_angle, end_angle, radius=CAKE_RADIUS, height=CAKE_HEIGHT, segments=24):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()

    center_bottom = bm.verts.new(Vector((0, 0, 0)))
    center_top = bm.verts.new(Vector((0, 0, height)))

    bottom_arc = []
    top_arc = []

    for i in range(segments + 1):
        t = i / segments
        angle = start_angle + t * (end_angle - start_angle)
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        vb = bm.verts.new(Vector((x, y, 0)))
        vt = bm.verts.new(Vector((x, y, height)))
        bottom_arc.append(vb)
        top_arc.append(vt)

    bm.verts.ensure_lookup_table()

    # Bottom pie sector
    for i in range(segments):
        bm.faces.new([center_bottom, bottom_arc[i + 1], bottom_arc[i]])

    # Top pie sector
    for i in range(segments):
        bm.faces.new([center_top, top_arc[i], top_arc[i + 1]])

    # Curved outer wall
    for i in range(segments):
        bm.faces.new([bottom_arc[i], bottom_arc[i + 1], top_arc[i + 1], top_arc[i]])

    # Radial side 1 (start angle)
    bm.faces.new([center_bottom, center_top, top_arc[0], bottom_arc[0]])

    # Radial side 2 (end angle)
    bm.faces.new([center_bottom, bottom_arc[-1], top_arc[-1], center_top])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)

    # Bevel modifier for realistic soft food edges
    bev = obj.modifiers.new("Bevel", 'BEVEL')
    bev.width = 0.012
    bev.segments = 3
    bev.limit_method = 'ANGLE'
    bev.angle_limit = math.radians(40)

    # Smooth shading
    for poly in mesh.polygons:
        poly.use_smooth = True

    return obj

# -------------------------------------------------------------
# 2. Topping Generators
# -------------------------------------------------------------

def build_lotus_biscuit(slice_angle_mid):
    # Lotus biscuit: rectangular rounded bar with ribbed border
    length = 0.44
    width = 0.22
    thick = 0.04
    
    mesh = bpy.data.meshes.new("LotusBiscuitMesh")
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    
    # Scale cube to biscuit shape
    bmesh.ops.scale(bm, vec=Vector((length, width, thick)), verts=bm.verts)
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new("LotusBiscuit", mesh)
    collection.objects.link(obj)
    obj.data.materials.append(mat_lotus_biscuit)
    
    # Bevel
    bev = obj.modifiers.new("Bevel", 'BEVEL')
    bev.width = 0.01
    bev.segments = 3
    
    # Position on cake surface
    dist = 0.58
    pos_x = dist * math.cos(slice_angle_mid)
    pos_y = dist * math.sin(slice_angle_mid)
    obj.location = (pos_x, pos_y, CAKE_HEIGHT + thick*0.7)
    obj.rotation_euler = Euler((math.radians(6), math.radians(-10), slice_angle_mid + math.radians(20)), 'XYZ')
    return obj

def build_chocolate_shard(slice_angle_mid):
    # Elegant fan/curl shape with gold tip
    mesh = bpy.data.meshes.new("ChocShardMesh")
    bm = bmesh.new()
    
    v0 = bm.verts.new(Vector((0, 0, 0)))
    v1 = bm.verts.new(Vector((0.15, 0.08, 0.18)))
    v2 = bm.verts.new(Vector((-0.12, 0.12, 0.22)))
    v3 = bm.verts.new(Vector((0.02, 0.15, 0.32)))
    
    bm.faces.new([v0, v1, v3])
    bm.faces.new([v0, v3, v2])
    
    # Solidify
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new("ChocShard", mesh)
    collection.objects.link(obj)
    obj.data.materials.append(mat_choc_base)
    
    solid = obj.modifiers.new("Solidify", 'SOLIDIFY')
    solid.thickness = 0.015
    
    dist = 0.60
    pos_x = dist * math.cos(slice_angle_mid)
    pos_y = dist * math.sin(slice_angle_mid)
    obj.location = (pos_x, pos_y, CAKE_HEIGHT + 0.01)
    obj.rotation_euler = Euler((math.radians(25), math.radians(-15), slice_angle_mid - math.radians(45)), 'XYZ')
    
    # Gold leaf accent at the tip
    gold_mesh = bpy.data.meshes.new("GoldLeafMesh")
    bm_g = bmesh.new()
    bmesh.ops.create_icosphere(bm_g, subdivisions=1, radius=0.035)
    bmesh.ops.scale(bm_g, vec=Vector((1.0, 0.6, 0.2)), verts=bm_g.verts)
    bm_g.to_mesh(gold_mesh)
    bm_g.free()
    
    gold_obj = bpy.data.objects.new("GoldLeaf", gold_mesh)
    collection.objects.link(gold_obj)
    gold_obj.data.materials.append(mat_gold)
    gold_obj.location = (pos_x - 0.02, pos_y + 0.04, CAKE_HEIGHT + 0.26)
    return [obj, gold_obj]

def build_pistachio_crumbs(start_angle, end_angle):
    # Arc of crushed pistachios along outer edge
    crumbs = []
    num_crumbs = 18
    for i in range(num_crumbs):
        t = (i + 0.5) / num_crumbs
        angle = start_angle + t * (end_angle - start_angle)
        r = CAKE_RADIUS - 0.06 + (math.sin(i * 3.7) * 0.03)
        px = r * math.cos(angle)
        py = r * math.sin(angle)
        pz = CAKE_HEIGHT + 0.008
        
        mesh = bpy.data.meshes.new(f"PistachioCrumb_{i}")
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.018 + (math.cos(i)*0.005))
        bmesh.ops.scale(bm, vec=Vector((1.2, 0.8, 0.6)), verts=bm.verts)
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
    # Piped dark chocolate lines on matcha slice
    chevrons = []
    for step in range(1, 4):
        dist = 0.28 + step * 0.18
        mesh = bpy.data.meshes.new(f"MatchaChevron_{step}")
        bm = bmesh.new()
        
        # V-shape
        ang_left = slice_angle_mid - math.radians(16)
        ang_right = slice_angle_mid + math.radians(16)
        
        p_center = Vector((dist * math.cos(slice_angle_mid), dist * math.sin(slice_angle_mid), CAKE_HEIGHT + 0.004))
        p_left = Vector(((dist - 0.08) * math.cos(ang_left), (dist - 0.08) * math.sin(ang_left), CAKE_HEIGHT + 0.004))
        p_right = Vector(((dist - 0.08) * math.cos(ang_right), (dist - 0.08) * math.sin(ang_right), CAKE_HEIGHT + 0.004))
        
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
        
        # Skin / wire thickness
        skin = obj.modifiers.new("Skin", 'SKIN')
        subd = obj.modifiers.new("Subdiv", 'SUBSURF')
        subd.levels = 1
        
        for v in obj.data.skin_vertices[0].data:
            v.radius = (0.006, 0.006)
            
        chevrons.append(obj)
    return chevrons

def build_whipped_cream_rosette(pos):
    # Spiraled star-piped rosette
    mesh = bpy.data.meshes.new("CreamRosetteMesh")
    bm = bmesh.new()
    
    rings = 8
    points_per_ring = 16
    for r in range(rings):
        h = (r / (rings - 1)) * 0.16
        rad = 0.12 * (1.0 - (r / rings)**0.8)
        rot = (r / rings) * math.pi * 0.8
        for p in range(points_per_ring):
            ang = rot + (p / points_per_ring) * 2.0 * math.pi
            # Fluted star ripples
            star_factor = 1.0 + 0.28 * math.sin(ang * 6.0)
            x = rad * star_factor * math.cos(ang)
            y = rad * star_factor * math.sin(ang)
            bm.verts.new(Vector((x, y, h)))
            
    bm.verts.ensure_lookup_table()
    for r in range(rings - 1):
        for p in range(points_per_ring):
            p_next = (p + 1) % points_per_ring
            v0 = r * points_per_ring + p
            v1 = r * points_per_ring + p_next
            v2 = (r + 1) * points_per_ring + p_next
            v3 = (r + 1) * points_per_ring + p
            bm.faces.new([bm.verts[v0], bm.verts[v1], bm.verts[v2], bm.verts[v3]])
            
    top_center = bm.verts.new(Vector((0, 0, 0.17)))
    bm.verts.ensure_lookup_table()
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
    # Maraschino Cherry
    c_mesh = bpy.data.meshes.new("CherryMesh")
    bm_c = bmesh.new()
    bmesh.ops.create_uvsphere(bm_c, u_segments=24, v_segments=16, radius=0.055)
    # Dimple top slightly
    for v in bm_c.verts:
        if v.co.z > 0.04:
            v.co.z -= 0.012
    bmesh.ops.scale(bm_c, vec=Vector((1.0, 1.0, 0.95)), verts=bm_c.verts)
    bm_c.to_mesh(c_mesh)
    bm_c.free()
    
    cherry = bpy.data.objects.new("Cherry", c_mesh)
    collection.objects.link(cherry)
    cherry.data.materials.append(mat_cherry)
    cherry.location = pos
    for poly in c_mesh.polygons:
        poly.use_smooth = True
        
    # Cherry Stem
    curve_data = bpy.data.curves.new('CherryStemCurve', type='CURVE')
    curve_data.dimensions = '3D'
    curve_data.bevel_depth = 0.003
    curve_data.bevel_resolution = 3
    polyline = curve_data.splines.new('BEZIER')
    polyline.bezier_points.add(2)
    
    p0 = polyline.bezier_points[0]
    p0.co = Vector((pos[0], pos[1], pos[2] + 0.042))
    p0.handle_left = Vector((pos[0], pos[1], pos[2] + 0.03))
    p0.handle_right = Vector((pos[0] + 0.01, pos[1] + 0.02, pos[2] + 0.09))
    
    p1 = polyline.bezier_points[1]
    p1.co = Vector((pos[0] + 0.04, pos[1] + 0.05, pos[2] + 0.16))
    p1.handle_left = Vector((pos[0] + 0.03, pos[1] + 0.03, pos[2] + 0.12))
    p1.handle_right = Vector((pos[0] + 0.05, pos[1] + 0.07, pos[2] + 0.20))
    
    p2 = polyline.bezier_points[2]
    p2.co = Vector((pos[0] + 0.08, pos[1] + 0.08, pos[2] + 0.22))
    p2.handle_left = Vector((pos[0] + 0.06, pos[1] + 0.07, pos[2] + 0.21))
    p2.handle_right = Vector((pos[0] + 0.09, pos[1] + 0.09, pos[2] + 0.23))
    
    stem = bpy.data.objects.new("CherryStem", curve_data)
    collection.objects.link(stem)
    stem.data.materials.append(mat_stem)
    
    return [cherry, stem]

# -------------------------------------------------------------
# 3. Assemble Cake Board & Acetate Collar
# -------------------------------------------------------------
# Cake Board
board_mesh = bpy.data.meshes.new("CakeBoardMesh")
bm_b = bmesh.new()
bmesh.ops.create_cone(bm_b, cap_ends=True, radius1=1.28, radius2=1.28, depth=0.025, segments=48)
bm_b.to_mesh(board_mesh)
bm_b.free()
board_obj = bpy.data.objects.new("CakeBoard", board_mesh)
collection.objects.link(board_obj)
board_obj.data.materials.append(mat_board)
board_obj.location = (0, 0, -0.0125)
bev_b = board_obj.modifiers.new("Bevel", 'BEVEL')
bev_b.width = 0.005
bev_b.segments = 2
for poly in board_mesh.polygons:
    poly.use_smooth = True

# Acetate Clear Wrap Collar
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
# 4. Generate the 6 Cake Slices & Specific Flavors
# -------------------------------------------------------------
# Angle 0 is East (+X), CCW
# Slices in clockwise or standard arrangement:
# Slice 0: Lotus Biscoff (~150 deg to 210 deg, West)
# Let's organize the 6 slices to match the reference layout:
# Top-left: Chocolate (60 to 120)
# Top-right: Matcha (0 to 60)
# Bottom-right: Red Velvet (300 to 360)
# Bottom: Ube (240 to 300)
# Bottom-left: Cookies & Cream (180 to 240)
# West / Mid-left: Lotus Biscoff (120 to 180)

slice_configs = [
    {
        "name": "Slice_Matcha",
        "start": math.radians(0),
        "end": math.radians(60),
        "mat": mat_matcha_base,
        "type": "matcha"
    },
    {
        "name": "Slice_DarkChocolate",
        "start": math.radians(60),
        "end": math.radians(120),
        "mat": mat_choc_base,
        "type": "chocolate"
    },
    {
        "name": "Slice_LotusBiscoff",
        "start": math.radians(120),
        "end": math.radians(180),
        "mat": mat_lotus_base,
        "type": "lotus"
    },
    {
        "name": "Slice_CookiesCream",
        "start": math.radians(180),
        "end": math.radians(240),
        "mat": mat_oreo_base,
        "type": "cookies_cream"
    },
    {
        "name": "Slice_UbeVelvet",
        "start": math.radians(240),
        "end": math.radians(300),
        "mat": mat_ube_base,
        "type": "ube"
    },
    {
        "name": "Slice_RedVelvet",
        "start": math.radians(300),
        "end": math.radians(360),
        "mat": mat_redvelvet,
        "type": "red_velvet"
    }
]

created_objects = [board_obj, collar_obj]

for cfg in slice_configs:
    wedge = build_wedge_mesh(cfg["name"], cfg["start"], cfg["end"])
    wedge.data.materials.append(cfg["mat"])
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
        pos_rosette = Vector((0.62 * math.cos(mid_angle), 0.62 * math.sin(mid_angle), CAKE_HEIGHT))
        rosette = build_whipped_cream_rosette(pos_rosette)
        created_objects.append(rosette)
        pos_cherry = Vector((pos_rosette.x, pos_rosette.y, CAKE_HEIGHT + 0.17))
        cherry_items = build_cherry_and_stem(pos_cherry)
        created_objects.extend(cherry_items)
    elif cfg["type"] == "red_velvet":
        # Add subtle top crumb layer
        pass

# -------------------------------------------------------------
# 5. Lighting & Studio Camera Setup for Rendering
# -------------------------------------------------------------
cam_data = bpy.data.cameras.new("StudioCamera")
cam_data.lens = 55
cam_obj = bpy.data.objects.new("StudioCamera", cam_data)
collection.objects.link(cam_obj)
scene.camera = cam_obj

# 3/4 perspective matching the reference top-right / front view
cam_obj.location = (2.2, -2.4, 1.8)
cam_obj.rotation_euler = Euler((math.radians(58), 0, math.radians(42)), 'XYZ')

# Key Light
key_light_data = bpy.data.lights.new("KeyLight", type='AREA')
key_light_data.energy = 220
key_light_data.size = 2.0
key_light = bpy.data.objects.new("KeyLight", key_light_data)
collection.objects.link(key_light)
key_light.location = (2.5, -2.0, 3.2)
key_light.rotation_euler = Euler((math.radians(45), math.radians(15), math.radians(35)), 'XYZ')

# Fill Light
fill_light_data = bpy.data.lights.new("FillLight", type='AREA')
fill_light_data.energy = 90
fill_light_data.size = 3.0
fill_light = bpy.data.objects.new("FillLight", fill_light_data)
collection.objects.link(fill_light)
fill_light.location = (-2.8, -1.8, 2.2)
fill_light.rotation_euler = Euler((math.radians(55), math.radians(-30), math.radians(-50)), 'XYZ')

# Rim / Back Light
rim_light_data = bpy.data.lights.new("RimLight", type='AREA')
rim_light_data.energy = 160
rim_light_data.size = 2.5
rim_light = bpy.data.objects.new("RimLight", rim_light_data)
collection.objects.link(rim_light)
rim_light.location = (0.2, 2.8, 2.5)
rim_light.rotation_euler = Euler((math.radians(-55), 0, math.radians(175)), 'XYZ')

# -------------------------------------------------------------
# 6. Save .blend Scene
# -------------------------------------------------------------
blend_path = os.path.abspath("d:/Projects/Marecakes/blender_assets/sampler_cake.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
print(f"Successfully saved master .blend to: {blend_path}")

# -------------------------------------------------------------
# 7. Render Preview Image
# -------------------------------------------------------------
preview_img_path = os.path.abspath("d:/Projects/Marecakes/blender_assets/preview_render.png")
scene.render.filepath = preview_img_path
bpy.ops.render.render(write_still=True)
print(f"Rendered studio preview to: {preview_img_path}")

# -------------------------------------------------------------
# 8. Export Combined Web-Ready .GLB
# -------------------------------------------------------------
# Select all cake mesh objects for export
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
