"""Bake the two illustrative, eye-level 360 views for the 3D viewer.

blender -b -t 8 -P tools/render-bordplan.py -- 30 /tmp/bordplan-30.png 2560 36
blender -b -t 8 -P tools/render-bordplan.py -- 55 /tmp/bordplan-55.png 2560 36
Convert the resulting 2:1 panoramas to WebP for img/bordplan-{30,55}.webp.
"""
import math
import random
import sys

import bpy
from mathutils import Vector

guests, output, width, samples, *options = sys.argv[sys.argv.index("--") + 1:]
guests, width, samples = int(guests), int(width), int(samples)
assert guests in (30, 55)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def material(name, color, roughness=.5, metal=0, transmission=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Roughness"].default_value = roughness
    p.inputs["Metallic"].default_value = metal
    p.inputs["Transmission Weight"].default_value = transmission
    return m


def texture(m, low, high, grain=(10, 2, 18), detail=3):
    t = m.node_tree
    coords = t.nodes.new("ShaderNodeTexCoord")
    scale = t.nodes.new("ShaderNodeVectorMath")
    scale.operation = "MULTIPLY"
    scale.inputs[1].default_value = grain
    noise = t.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 4
    noise.inputs["Detail"].default_value = detail
    ramp = t.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = .22
    ramp.color_ramp.elements[0].color = (*low, 1)
    ramp.color_ramp.elements[1].position = .78
    ramp.color_ramp.elements[1].color = (*high, 1)
    bump = t.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = .075
    bump.inputs["Distance"].default_value = .018
    t.links.new(coords.outputs["Object"], scale.inputs[0])
    t.links.new(scale.outputs[0], noise.inputs["Vector"])
    t.links.new(noise.outputs["Fac"], ramp.inputs[0])
    t.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    p = t.nodes.get("Principled BSDF")
    t.links.new(ramp.outputs[0], p.inputs["Base Color"])
    t.links.new(bump.outputs["Normal"], p.inputs["Normal"])


oak = material("Eg", (.30, .16, .073), .43)
texture(oak, (.13, .056, .021), (.46, .289, .128), (22, 3, 17))
floor = material("Oliebehandlet plankegulv", (.35, .24, .14), .62)
texture(floor, (.21, .13, .065), (.47, .31, .18))
linen = material("Dug", (.83, .80, .74), .83)
linen.node_tree.nodes.get("Principled BSDF").inputs["Sheen Weight"].default_value = .22
napkin = material("Serviet", (.67, .64, .55), .82)
plaster = material("Kalk", (.63, .60, .54), .83)
cream = material("Kalk lys", (.81, .80, .74), .8)
ceiling = material("Loft", (.75, .72, .65), .75)
teal = material("Skænk og døre", (.049, .122, .130), .56)
window = material("Vindueskarme", (.048, .054, .051), .52)
porcelain = material("Porcelæn", (.88, .89, .83), .23)
blue = material("Glaseret stentøj", (.10, .18, .19), .31)
glass = material("Glas", (.91, .97, .98), .09, transmission=1)
brass = material("Messing", (.55, .32, .11), .3, .67)
cutlery = material("Børstet stål", (.49, .51, .52), .22, .83)
amber = material("Ravglas", (.71, .23, .035), .26, transmission=.32)
green = material("Blade", (.077, .15, .039), .64)
yellow = material("Gule blomster", (.91, .60, .032), .59)
white = material("Hvide blomster", (.81, .79, .64), .6)
ground = material("Terrasse", (.22, .21, .17), .87)
foliage = [material("Løv " + str(i), c, .9) for i,c in enumerate(
    [(.079,.143,.043), (.116,.198,.053), (.17,.23,.067), (.061,.107,.045)])]
light = material("Varmt lys", (.95, .7, .4), .36)
p = light.node_tree.nodes.get("Principled BSDF")
p.inputs["Emission Color"].default_value = (1, .63, .26, 1)
p.inputs["Emission Strength"].default_value = 3

# Shared meshes keep the many repeated chairs and place settings lightweight.
meshes = {}


def mesh_for(shape, size, m):
    key = (shape, size, m.name)
    if key not in meshes:
        if shape == "box":
            bpy.ops.mesh.primitive_cube_add(size=1)
        elif shape == "sphere":
            bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=1)
        elif shape == "cylinder":
            bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=1, depth=1)
        obj = bpy.context.object
        obj.scale = size
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        if shape != "box":
            for poly in obj.data.polygons:
                poly.use_smooth = len(poly.vertices) == 4
        else:
            mod = obj.modifiers.new("Bløde kanter", "BEVEL")
            mod.width = min(.029, min(size) * .18)
            mod.segments = 2
            bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.data.materials.append(m)
        meshes[key] = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
    return meshes[key]


def solid(shape, name, pos, size, m):
    o = bpy.data.objects.new(name, mesh_for(shape, size, m))
    scene.collection.objects.link(o)
    o.location = pos
    return o


def box(name, xyz, size, mat):
    return solid("box", name, xyz, size, mat)


def cyl(name, xyz, radius, height, mat):
    return solid("cylinder", name, xyz, (radius, radius, height), mat)


def oval(name, xyz, size, mat):
    return solid("sphere", name, xyz, size, mat)


def rail(name, a, b, thickness, mat):
    d = Vector(b) - Vector(a)
    o = box(name, (Vector(a) + Vector(b)) / 2, (*thickness, d.length), mat)
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    return o


def lathe(name, profile, mat):
    n = 20
    verts = [(r * math.cos(i * math.tau/n), r * math.sin(i * math.tau/n), z)
             for r,z in profile for i in range(n)]
    faces = [(j*n+i, j*n+(i+1)%n, (j+1)*n+(i+1)%n, (j+1)*n+i)
             for j in range(len(profile)-1) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    for face in mesh.polygons:
        face.use_smooth = True
    return mesh


def clone(name, mesh, pos):
    o = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(o)
    o.location = pos
    return o


# Imagined interpretation of the real venue photographs. The proportions are not surveyed.
for i in range(34):
    x = -6.8 + i*.41
    split = -1.8 + (i*13 % 10)*.39
    for a,b in [(-4.75,split), (split,4.75)]:
        box("Planke", (x,(a+b)/2,-.07), (.405,b-a-.004,.14), floor)
box("Loft", (0,0,3.48), (14.1,9.62,.15), ceiling)
box("Væg ved buffet", (0,4.75,1.72), (14,.15,3.44), plaster)
box("Modstående væg", (7,0,1.72), (.16,9.5,3.44), cream)
box("Indgangsvæg", (0,-4.75,1.72), (14,.16,3.44), plaster)
box("Indgangsdør", (3.2,-4.644,1.23), (1.66,.09,2.44), teal)
box("Dørgreb", (2.7,-4.556,1.02), (.12,.1,.035), brass)
for side in [-1,1]:
    box("Panel", (6.89,0,.11 + (side+1)*.02), (.06,9.5,.16), oak)
for x in [-4.55, 0, 4.55]:
    box("Loftsbjælke", (x,0,3.31), (.22,9.5,.26), oak)
box("Vinduer, brystning", (-7,0,.34), (.18,9.5,.68), plaster)
box("Vinduer, overligger", (-7,0,3.07), (.18,9.5,.78), plaster)
for y in [-4.72,-3.14,-1.57,0,1.57,3.14,4.72]:
    box("Sprosse", (-7,y,1.69), (.17,.068,2.04), window)
for z in [.68,2.67]:
    box("Karm", (-7,0,z), (.23,9.55,.075), oak)
curtain = material("Gardinstof", (.21,.19,.16), .94)
for y in [-4.57, 4.57]:
    rail("Gardinliste", (-6.76,y-.25,2.70), (-6.76,y+.25,2.70), (.023,.023), oak)
    for i in range(10):
        dy = (i-4.5)*.043
        oval("Gardinfold", (-6.82+(i%2)*.058,y+dy,1.51), (.051,.035,1.18), curtain)
for y in [-2.9,0,2.9]:
    box("Træramme", (6.887,y,1.95), (.05,.54,.70), oak)
    box("Passepartout", (6.849,y,1.95), (.023,.475,.635), cream)
    box("Motiv", (6.832,y,1.95), (.012,.28,.42), teal)
box("Terrasse", (-10.5,0,-.17), (7,14,.24), ground)
for i in range(24):
    y = -7 + .60*i
    box("Terrasseværn", (-12.3,y,.42), (.055,.058,1.13), cream)
box("Håndliste", (-12.3,0,.99), (.12,14,.09), oak)
box("Have", (-22,0,-.3), (28,45,.1), foliage[1])
# Broadleaf trees beyond the terrace. Build irregular branches and overlapping leaf
# clusters as two meshes, so the distant canopy does not need hundreds of objects.
bark = material("Bark", (.114, .067, .039), .92)
rng = random.Random(4139)
leaf_points, leaf_faces, leaf_materials = [], [], []
branch_points, branch_faces = [], []


def branch(a, b, start_radius, end_radius):
    a, b = Vector(a), Vector(b)
    axis = (b - a).normalized()
    u = axis.cross(Vector((0, 1, 0))).normalized()
    v = axis.cross(u)
    index = len(branch_points)
    for center, radius in [(a, start_radius), (b, end_radius)]:
        for i in range(6):
            angle = i * math.tau / 6
            branch_points.append(tuple(center + radius * (u * math.cos(angle) + v * math.sin(angle))))
    for i in range(6):
        j = (i + 1) % 6
        branch_faces.append((index+i, index+j, index+j+6, index+i+6))


def leaves(center, spread):
    for _ in range(42):
        theta = rng.uniform(0, math.tau)
        radius = spread * math.sqrt(rng.random())
        x = center[0] + radius * math.cos(theta)
        y = center[1] + radius * math.sin(theta)
        z = center[2] + rng.uniform(-.65, .65) * spread
        angle = rng.uniform(0, math.tau)
        length = rng.uniform(.11, .34)
        width = length * rng.uniform(.42, .73)
        u = Vector((math.cos(angle), math.sin(angle), rng.uniform(-.65, .3))) * length
        v = Vector((-math.sin(angle), math.cos(angle), rng.uniform(-.4, .4))) * width
        origin = Vector((x, y, z))
        i = len(leaf_points)
        leaf_points.extend(tuple(origin + offset) for offset in (-u, -v, u, v, Vector((0, 0, .045))))
        leaf_faces.extend(((i,i+1,i+4), (i+1,i+2,i+4), (i+2,i+3,i+4), (i+3,i,i+4)))
        shade = rng.choices(range(4), weights=(2, 5, 2, 3))[0]
        leaf_materials.extend([shade] * 4)


for i in range(22):
    foot = Vector((-16 - (i * 11 % 9) * .90, -19 + i * 1.85 + rng.uniform(-.34,.34), -.25))
    height = rng.uniform(3.2, 5.6)
    lean = Vector((rng.uniform(-.37,.37), rng.uniform(-.37,.37), 0))
    midstem = foot + lean * .45 + Vector((0,0,height * .50))
    crown = foot + lean + Vector((0,0,height))
    branch(foot, midstem, height*.037, height*.023)
    branch(midstem, crown, height*.023, .018)
    for tier, fraction in enumerate((.48, .64, .78, .88)):
        spread = (.39 - tier * .055) * height
        for j in range(5):
            angle = j * math.tau / 5 + i*.72 + tier*.91 + rng.uniform(-.32,.32)
            start = foot + lean*fraction + Vector((0,0,height*fraction))
            direction = Vector((math.cos(angle), math.sin(angle), rng.uniform(.25,.64)))
            elbow = start + direction * spread*.61
            tip = start + direction * spread * rng.uniform(.85,1.17)
            branch(start, elbow, .052, .032)
            branch(elbow, tip, .032, .009)
            leaves(tip, rng.uniform(.72,1.08))
            leaves(elbow + Vector((0,0,.24)), rng.uniform(.54,.78))
    leaves(crown, .67)

for name, points, faces, palette, shades in (
    ("Stammer og grene", branch_points, branch_faces, [bark], None),
    ("Løvkroner", leaf_points, leaf_faces, foliage, leaf_materials),
):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(points, [], faces)
    for m in palette:
        mesh.materials.append(m)
    for poly in mesh.polygons:
        if shades:
            poly.material_index = shades[poly.index]
        else:
            poly.use_smooth = True
    tree = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(tree)

# Oak shelving and blue drawers from the venue's own imagery.
for z in [1.58,2.10,2.63]:
    box("Reolhylde", (0,4.50,z), (6.60,.37,.036), oak)
for x in [-3.3,-2.2,-1.1,0,1.1,2.2,3.3]:
    box("Reoldeling", (x,4.50,2.1), (.036,.37,1.06), oak)
box("Buffetskænk", (0,4.27,.49), (6.55,.78,.94), oak)
for x in [-2.62,-1.31,0,1.31,2.62]:
    box("Blå skuffe", (x,3.86,.58), (1.21,.03,.26), teal)
for x in [-2,-1,0,1,2]:
    cyl("Buffetskål", (x,4.16,1.0), .225,.08, porcelain)
    cyl("Serveringsfad", (x,4.09,1.045), .184,.023, foliage[2])

goblet = lathe("Vinglas", [(0,0),(.035,0),(.035,.006),(.005,.009),(.005,.102),
    (.029,.11),(.049,.15),(.049,.18),(.039,.216),(.037,.216),(.046,.179),(.047,.151),(.028,.111),(0,.106)], glass)
water = lathe("Vandglas", [(.022,0),(.032,.004),(.036,.086),(.034,.086),(.029,.008),(0,.008)], glass)
plate = lathe("Tallerken", [(0,0),(.087,0),(.139,.009),(.151,.02),(.149,.023),(.113,.011),(0,.009)], porcelain)
vase = lathe("Blomstervase", [(0,0),(.044,0),(.047,.058),(.027,.118),(.033,.136),(.03,.136),(.023,.117),(.042,.057),(0,.005)], glass)
for i in range(35):
    clone("Glas i reol", goblet, (-3.1+i%17*.37,4.44,1.60 + (i%2)*.52))

# Same 3/5-table and 30/55-seat arrangement as the interactive overview.
for j in (range(1,4) if guests == 30 else range(5)):
    x = (j-2)*2.6
    y = -.12
    # Model the cloth as one continuous top with folded sides and a narrow hem.
    verts = []
    faces = []
    ring = 80
    for level,(height,extra) in enumerate([(.755,0),(.725,.027),(.49,.017),(.11,.015)]):
        for i in range(ring):
            t = ((i/ring)*4)
            a = t % 1
            u,v = [(-.55+a*1.1,-2.15),(.55,-2.15+a*4.3),(.55-a*1.1,2.15),(-.55,2.15-a*4.3)][int(t)]
            fold = math.sin(i*1.55 + j*.6)*.029 * level/3
            verts.append((x+u*(1+extra+fold), y+v*(1+extra*.31+fold*.27), height + (fold*.26 if level else 0)))
    faces.append(tuple(reversed(range(ring))))
    for level in range(3):
        for i in range(ring):
            a = level*ring+i
            b = level*ring+(i+1)%ring
            faces.append((a,b,b+ring,a+ring))
    mesh = bpy.data.meshes.new("Dug med fald")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(linen)
    for poly in mesh.polygons:
        poly.use_smooth = len(poly.vertices)==4
    clone("Dug med fald",mesh,(0,0,0))
    for sy in [-1.40,0,1.40]:
        clone("Vase", vase, (x,y+sy,.755))
        for k in range(5):
            angle = k*2.4 + j
            dx,dy = .068*math.cos(angle),.075*math.sin(angle)
            z = .95 + .022*(k%3)
            rail("Stilk",(x,y+sy,.77),(x+dx,y+sy+dy,z),(.008,.008),green)
            o = oval("Blad",(x+dx*.65+.025,y+sy+dy*.55,z-.048),(.045,.018,.008),green)
            o.rotation_euler.z = angle
            for q in range(5):
                theta = q*math.tau/5
                oval("Blomsterblad",(x+dx+.017*math.cos(theta),y+sy+dy+.017*math.sin(theta),z),(.018,.014,.009),yellow if k%2==0 else white)
    for sy in [-.75,.75]:
        cyl("Ravfarvet fyrfadsstage",(x,y+sy,.794),.039,.082,amber)
        oval("Flamme",(x,y+sy,.857),(.009,.008,.018),light)
    for side in [-1,1]:
        n = 6 if guests == 55 and side == -1 else 5
        for k in range(n):
            sy = y - 1.7 + k*.69
            sx = x + side*.81
            box("Stolesæde",(sx,sy,.45),(.43,.43,.055),oak)
            for bx in [-.17,.17]:
                for by in [-.17,.17]:
                    rail("Stoleben",(sx+bx*1.25,sy+by*1.27,.016),(sx+bx,sy+by,.445),(.04,.04),oak)
            back = sx+side*.187
            for b in [-.17,.17]:
                rail("Rygstolpe",(back,sy+b,.45),(back+side*.093,sy+b,.94),(.041,.042),oak)
            for sign in [-1,1]:
                rail("Krydsryg",(back,sy+sign*.155,.52),(back+side*.074,sy-sign*.157,.86),(.027,.021),oak)
            rail("Topstykke",(back+side*.093,sy-.193,.94),(back+side*.093,sy+.193,.94),(.046,.047),oak)
            place = x + side*.255
            cyl("Undertallerken",(place,sy,.764),.176,.014,blue)
            clone("Porcelæn",plate,(place,sy,.773))
            o=box("Serviet",(place,sy,.802),(.109,.192,.01),napkin)
            o.rotation_euler.z = .17*side
            for delta in [-.18,.18]:
                rail("Bestik",(place-.081,sy+delta,.767),(place+.082,sy+delta,.769),(.012,.012),cutlery)
            clone("Vinglas",goblet,(x+side*.092,sy+.225,.756))
            clone("Vandglas",water,(x+side*.105,sy+.126,.756))

for x in [-3.6,0,3.6]:
    rail("Pendelledning",(x,-.1,3.42),(x,-.1,2.94),(.016,.016),window)
    cyl("Pendelskærm",(x,-.1,2.91),.239,.075,brass)
    cyl("Varm lampeflade",(x,-.1,2.867),.224,.02,light)


def area(name, loc, target, watts, size, color, depth=None):
    d = bpy.data.lights.new(name, "AREA")
    d.energy, d.color, d.size = watts, color, size
    if depth:
        d.shape, d.size_y = "RECTANGLE", depth
    o = bpy.data.objects.new(name,d)
    scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - o.location).to_track_quat("-Z","Y").to_euler()


for y in [-2.9,0,2.9]:
    area("Vindueslys",(-6.94,y,1.83),(1,y,.3),530,2.69,(.86,.93,1),1.98)
for x in [-3.6,0,3.6]:
    area("Pendellys",(x,-.1,2.85),(x,0,.5),55,.36,(1,.73,.42))
world = bpy.data.worlds.new("Blød himmel")
world.use_nodes = True
world.node_tree.nodes.get("Background").inputs[0].default_value = (.56,.68,.83,1)
world.node_tree.nodes.get("Background").inputs[1].default_value = .56
scene.world = world

cam = bpy.data.objects.new("360 i øjenhøjde", bpy.data.cameras.new("360"))
scene.collection.objects.link(cam)
cam.location = (-1.35,-2.73,1.53)
cam.rotation_euler = Vector((.055,1,-.095)).to_track_quat("-Z","Y").to_euler()
cam.data.type = "PANO"
cam.data.panorama_type = "EQUIRECTANGULAR"
scene.camera = cam
scene.render.engine = "CYCLES"
scene.cycles.samples = samples
scene.cycles.use_denoising = False
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = .075
scene.cycles.adaptive_min_samples = 10
scene.cycles.sample_clamp_indirect = 2.1
scene.cycles.max_bounces = 6
scene.cycles.transmission_bounces = 5
scene.render.resolution_x, scene.render.resolution_y = width, width//2
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = output
scene.view_settings.view_transform = "AgX"
scene.view_settings.exposure = .32

if options == ["window-mask"]:
    # Keep exterior changes behind the window frames and any furniture in front.
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        surface = m.node_tree.nodes.get("Material Output")
        if surface:
            dark = m.node_tree.nodes.new("ShaderNodeEmission")
            dark.inputs["Color"].default_value = (0, 0, 0, 1)
            m.node_tree.links.new(dark.outputs[0], surface.inputs["Surface"])
    white_mask = material("Vinduesmaske", (1, 1, 1))
    emit = white_mask.node_tree.nodes.new("ShaderNodeEmission")
    white_mask.node_tree.links.new(emit.outputs[0], white_mask.node_tree.nodes.get("Material Output").inputs["Surface"])
    box("Vinduesåbning", (-7.125,0,1.65), (.01,9.47,2.04), white_mask)
    world.node_tree.nodes.get("Background").inputs[1].default_value = 0
    scene.cycles.max_bounces = 0
    scene.cycles.use_adaptive_sampling = False
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.exposure = 0
elif options[:1] == ["region"]:
    x_min, y_min, x_max, y_max = map(float, options[1:])
    scene.render.use_border = True
    scene.render.use_crop_to_border = False
    scene.render.border_min_x = x_min
    scene.render.border_min_y = y_min
    scene.render.border_max_x = x_max
    scene.render.border_max_y = y_max

bpy.ops.render.render(write_still=True)
