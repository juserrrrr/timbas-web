"""Gera o kit modular original do escritório Dedução no Blender.

Cada coleção vira um GLB independente, unido por material para reduzir draw calls.
O arquivo .blend preserva as peças editáveis antes da otimização de exportação.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "models" / "games" / "deducao"
BLEND_PATH = ROOT / "assets" / "models" / "deducao" / "timbas-office-kit.blend"
PREVIEW_PATH = Path.home() / "AppData" / "Local" / "Temp" / "timbas-office-kit-preview.png"

ASSET_FILES: dict[str, str] = {
    "desk": "desk-blender",
    "chair": "office-chair-blender",
    "monitor": "computer-blender",
    "plant": "plant-blender",
    "sofa": "timbas-blue-sofa",
    "counter": "reception-counter",
    "meetingTable": "meeting-table-blender",
    "cafeTable": "cafe-table",
    "rack": "server-rack",
    "locker": "locker",
    "shelf": "office-shelf",
    "coffee": "coffee-machine",
    "crate": "wooden-crate",
    "printer": "office-printer",
    "whiteboard": "whiteboard",
    "cone": "traffic-cone",
    "sink": "utility-sink",
    "vending": "vending-machine",
    "kitchen": "office-kitchen",
    "tree": "courtyard-tree",
    "streetLamp": "street-lamp",
    "bench": "courtyard-bench",
    "ceilingLight": "ceiling-light",
    "emergencyLight": "emergency-light",
}


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)


def set_input(shader, names: tuple[str, ...], value) -> None:
    for name in names:
        socket = shader.inputs.get(name)
        if socket is not None:
            socket.default_value = value
            return


def material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    metallic: float = 0.0,
    roughness: float = 0.45,
    coat: float = 0.0,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    result.use_backface_culling = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    set_input(shader, ("Base Color",), color)
    set_input(shader, ("Metallic",), metallic)
    set_input(shader, ("Roughness",), roughness)
    set_input(shader, ("Coat Weight", "Clearcoat"), coat)
    set_input(shader, ("Coat Roughness", "Clearcoat Roughness"), 0.16)
    if emission is not None:
        set_input(shader, ("Emission Color", "Emission"), emission)
        set_input(shader, ("Emission Strength",), emission_strength)
    return result


MAT: dict[str, bpy.types.Material] = {}


def create_materials() -> None:
    MAT.update(
        wood=material("Warm oak", (0.38, 0.17, 0.07, 1), roughness=0.34, coat=0.16),
        wood_light=material("Natural oak", (0.68, 0.39, 0.17, 1), roughness=0.4, coat=0.12),
        wood_dark=material("Walnut", (0.16, 0.055, 0.022, 1), roughness=0.33, coat=0.2),
        metal=material("Graphite metal", (0.045, 0.055, 0.07, 1), metallic=0.78, roughness=0.27),
        metal_light=material("Brushed aluminum", (0.48, 0.55, 0.62, 1), metallic=0.88, roughness=0.22),
        brass=material("Satin brass", (0.45, 0.23, 0.06, 1), metallic=0.82, roughness=0.25),
        black=material("Soft black", (0.012, 0.017, 0.024, 1), roughness=0.3),
        white=material("Warm white", (0.78, 0.82, 0.86, 1), roughness=0.37, coat=0.08),
        stone=material("Quartz stone", (0.62, 0.66, 0.7, 1), roughness=0.28, coat=0.18),
        fabric=material("Deep blue fabric", (0.018, 0.105, 0.25, 1), roughness=0.86),
        fabric_light=material("Blue accent fabric", (0.03, 0.24, 0.52, 1), roughness=0.8),
        leather=material("Midnight leather", (0.018, 0.028, 0.05, 1), roughness=0.42, coat=0.18),
        glass=material("Smoked glass", (0.025, 0.12, 0.17, 1), metallic=0.18, roughness=0.13, coat=0.45),
        screen=material("Active display", (0.008, 0.04, 0.08, 1), roughness=0.2, emission=(0.03, 0.46, 1, 1), emission_strength=1.6),
        green=material("Leaf green", (0.035, 0.31, 0.105, 1), roughness=0.72),
        green_light=material("Fresh leaf", (0.09, 0.48, 0.13, 1), roughness=0.7),
        terracotta=material("Terracotta", (0.42, 0.12, 0.045, 1), roughness=0.72),
        paper=material("Paper", (0.88, 0.89, 0.84, 1), roughness=0.9),
        red=material("Emergency red", (0.48, 0.012, 0.022, 1), roughness=0.3, coat=0.25),
        orange=material("Safety orange", (0.95, 0.16, 0.018, 1), roughness=0.46),
        cyan=material("Status cyan", (0.01, 0.42, 0.68, 1), roughness=0.25, emission=(0.02, 0.72, 1, 1), emission_strength=2.0),
        green_led=material("Status green", (0.01, 0.35, 0.08, 1), roughness=0.25, emission=(0.02, 1, 0.18, 1), emission_strength=2.4),
        warm_light=material("Warm diffuser", (0.84, 0.72, 0.48, 1), roughness=0.32, emission=(1, 0.73, 0.38, 1), emission_strength=3.0),
        red_light=material("Red diffuser", (0.8, 0.015, 0.025, 1), roughness=0.28, emission=(1, 0.01, 0.02, 1), emission_strength=4.0),
    )


def collection(name: str) -> bpy.types.Collection:
    result = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(result)
    return result


def move_to(obj: bpy.types.Object, target: bpy.types.Collection) -> bpy.types.Object:
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    target.objects.link(obj)
    return obj


def box(
    target: bpy.types.Collection,
    name: str,
    size: tuple[float, float, float],
    location: tuple[float, float, float],
    finish: bpy.types.Material,
    *,
    bevel: float = 0.025,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = move_to(bpy.context.object, target)
    obj.name = name
    obj.scale = tuple(value / 2 for value in size)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new("Soft edge", "BEVEL")
        mod.width = min(bevel, min(size) * 0.42)
        mod.segments = 2
    obj.data.materials.append(finish)
    return obj


def cylinder(
    target: bpy.types.Collection,
    name: str,
    radius: float,
    depth: float,
    location: tuple[float, float, float],
    finish: bpy.types.Material,
    *,
    vertices: int = 20,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = move_to(bpy.context.object, target)
    obj.name = name
    obj.data.materials.append(finish)
    for face in obj.data.polygons:
        face.use_smooth = True
    bevel = obj.modifiers.new("Edge highlight", "BEVEL")
    bevel.width = min(0.018, radius * 0.12, depth * 0.18)
    bevel.segments = 2
    return obj


def sphere(
    target: bpy.types.Collection,
    name: str,
    scale: tuple[float, float, float],
    location: tuple[float, float, float],
    finish: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=location)
    obj = move_to(bpy.context.object, target)
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(finish)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def torus(
    target: bpy.types.Collection,
    name: str,
    major: float,
    minor: float,
    location: tuple[float, float, float],
    finish: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=24,
        minor_segments=8,
        location=location,
        rotation=rotation,
    )
    obj = move_to(bpy.context.object, target)
    obj.name = name
    obj.data.materials.append(finish)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def tube(
    target: bpy.types.Collection,
    name: str,
    points: list[tuple[float, float, float]],
    radius: float,
    finish: bpy.types.Material,
) -> bpy.types.Object:
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 2
    data.bevel_depth = radius
    data.bevel_resolution = 2
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for control, coordinate in zip(spline.bezier_points, points):
        control.co = coordinate
        control.handle_left_type = "AUTO"
        control.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, data)
    data.materials.append(finish)
    target.objects.link(obj)
    return obj


def cone(
    target: bpy.types.Collection,
    name: str,
    r1: float,
    r2: float,
    depth: float,
    location: tuple[float, float, float],
    finish: bpy.types.Material,
    *,
    vertices: int = 24,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r1, radius2=r2, depth=depth, location=location)
    obj = move_to(bpy.context.object, target)
    obj.name = name
    obj.data.materials.append(finish)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def build_desk() -> bpy.types.Collection:
    c = collection("desk")
    box(c, "Oak desktop", (1.78, 0.88, 0.075), (0, 0, 0.78), MAT["wood_light"], bevel=0.045)
    box(c, "Black inset", (1.35, 0.48, 0.018), (0, -0.04, 0.824), MAT["black"], bevel=0.02)
    for x in (-0.76, 0.76):
        box(c, "Leg", (0.075, 0.66, 0.72), (x, 0, 0.38), MAT["metal"], bevel=0.022)
        box(c, "Foot", (0.18, 0.8, 0.055), (x, 0, 0.04), MAT["metal"], bevel=0.02)
    box(c, "Cross brace", (1.45, 0.07, 0.08), (0, -0.31, 0.25), MAT["metal"])
    cylinder(c, "Cable port", 0.065, 0.02, (0.58, 0.24, 0.83), MAT["black"], vertices=24)
    return c


def build_chair() -> bpy.types.Collection:
    c = collection("chair")
    cylinder(c, "Gas lift", 0.055, 0.43, (0, 0, 0.28), MAT["metal_light"], vertices=20)
    cylinder(c, "Hub", 0.11, 0.09, (0, 0, 0.12), MAT["black"], vertices=20)
    for index in range(5):
        angle = index * math.tau / 5
        box(c, "Star base", (0.48, 0.055, 0.055), (math.cos(angle) * 0.2, math.sin(angle) * 0.2, 0.1), MAT["metal"], bevel=0.025, rotation=(0, 0, angle))
        cylinder(c, "Caster", 0.048, 0.045, (math.cos(angle) * 0.43, math.sin(angle) * 0.43, 0.055), MAT["black"], rotation=(math.pi / 2, 0, angle))
    box(c, "Seat shell", (0.62, 0.59, 0.13), (0, 0.02, 0.52), MAT["black"], bevel=0.085)
    box(c, "Seat cushion", (0.54, 0.51, 0.11), (0, 0.035, 0.61), MAT["fabric"], bevel=0.075)
    box(c, "Back shell", (0.56, 0.11, 0.68), (0, -0.25, 0.91), MAT["black"], bevel=0.07, rotation=(-0.1, 0, 0))
    box(c, "Back cushion", (0.48, 0.07, 0.57), (0, -0.185, 0.92), MAT["fabric_light"], bevel=0.07, rotation=(-0.1, 0, 0))
    for x in (-0.34, 0.34):
        box(c, "Arm upright", (0.045, 0.055, 0.27), (x, 0, 0.72), MAT["metal"], bevel=0.018)
        box(c, "Arm pad", (0.08, 0.35, 0.055), (x, 0, 0.86), MAT["black"], bevel=0.028)
    return c


def build_monitor() -> bpy.types.Collection:
    c = collection("monitor")
    box(c, "Display housing", (0.72, 0.065, 0.43), (0, 0, 1.07), MAT["black"], bevel=0.035)
    box(c, "Display glass", (0.655, 0.018, 0.36), (0, 0.041, 1.075), MAT["screen"], bevel=0.016)
    box(c, "Stand", (0.075, 0.075, 0.25), (0, -0.015, 0.79), MAT["metal_light"], bevel=0.018)
    box(c, "Base", (0.37, 0.25, 0.035), (0, 0, 0.67), MAT["metal_light"], bevel=0.03)
    cylinder(c, "Webcam", 0.025, 0.12, (0, 0.055, 1.305), MAT["black"], vertices=16, rotation=(0, math.pi / 2, 0))
    return c


def add_plant(c: bpy.types.Collection, *, large: bool = False) -> None:
    scale = 1.75 if large else 1.0
    cone(c, "Pot", 0.24 * scale, 0.19 * scale, 0.34 * scale, (0, 0, 0.17 * scale), MAT["terracotta"])
    cylinder(c, "Soil", 0.19 * scale, 0.025, (0, 0, 0.35 * scale), MAT["wood_dark"], vertices=20)
    for index in range(9 if large else 7):
        angle = index * 2.4
        height = (0.56 + (index % 3) * 0.1) * scale
        dx, dy = math.cos(angle) * 0.12 * scale, math.sin(angle) * 0.12 * scale
        tube(c, "Stem", [(0, 0, 0.34 * scale), (dx * 0.45, dy * 0.45, height * 0.72), (dx, dy, height)], 0.012 * scale, MAT["green"])
        leaf = sphere(c, "Leaf", (0.1 * scale, 0.035 * scale, 0.21 * scale), (dx * 1.2, dy * 1.2, height), MAT["green_light" if index % 2 else "green"])
        leaf.rotation_euler[2] = angle


def build_plant() -> bpy.types.Collection:
    c = collection("plant")
    add_plant(c)
    return c


def build_sofa() -> bpy.types.Collection:
    c = collection("sofa")
    box(c, "Lower plinth", (1.92, 0.78, 0.15), (0, 0.02, 0.17), MAT["brass"], bevel=0.055)
    box(c, "Seat body", (2.08, 0.9, 0.33), (0, 0.02, 0.37), MAT["fabric"], bevel=0.13)
    box(c, "Back body", (2.08, 0.24, 0.66), (0, -0.37, 0.68), MAT["fabric"], bevel=0.12, rotation=(-0.08, 0, 0))
    for x in (-0.96, 0.96):
        box(c, "Rounded arm", (0.24, 0.94, 0.58), (x, 0.01, 0.51), MAT["fabric_light"], bevel=0.115)
    for x in (-0.48, 0.48):
        box(c, "Seat cushion", (0.89, 0.69, 0.16), (x, 0.11, 0.61), MAT["fabric_light"], bevel=0.09)
        box(c, "Back cushion", (0.87, 0.16, 0.48), (x, -0.255, 0.86), MAT["fabric_light"], bevel=0.095, rotation=(-0.06, 0, 0))
    for x in (-0.78, 0.78):
        cylinder(c, "Metal foot", 0.045, 0.13, (x, 0.25, 0.075), MAT["brass"], vertices=16)
        cylinder(c, "Metal foot", 0.045, 0.13, (x, -0.25, 0.075), MAT["brass"], vertices=16)
    return c


def build_counter() -> bpy.types.Collection:
    c = collection("counter")
    box(c, "Counter body", (4.25, 0.88, 0.98), (0, 0, 0.51), MAT["wood_dark"], bevel=0.08)
    box(c, "Stone top", (4.5, 1.08, 0.095), (0, 0.03, 1.055), MAT["stone"], bevel=0.045)
    for x in (-1.68, -1.12, -0.56, 0, 0.56, 1.12, 1.68):
        box(c, "Front flute", (0.065, 0.035, 0.78), (x, 0.455, 0.54), MAT["brass"], bevel=0.018)
    box(c, "Toe kick", (4.0, 0.04, 0.08), (0, 0.455, 0.08), MAT["brass"], bevel=0.02)
    return c


def build_meeting_table() -> bpy.types.Collection:
    c = collection("meetingTable")
    box(c, "Sculpted tabletop", (6.65, 2.5, 0.16), (0, 0, 0.78), MAT["wood"], bevel=0.18)
    box(c, "Dark inset", (5.25, 1.02, 0.025), (0, 0, 0.875), MAT["leather"], bevel=0.09)
    for x in (-2.38, 2.38):
        box(c, "Pedestal", (0.28, 1.7, 0.68), (x, 0, 0.38), MAT["metal"], bevel=0.05)
        box(c, "Pedestal foot", (0.72, 2.0, 0.07), (x, 0, 0.055), MAT["metal"], bevel=0.03)
    for x in (-1.65, 0, 1.65):
        cylinder(c, "Cable hub", 0.115, 0.03, (x, 0, 0.885), MAT["metal_light"], vertices=24)
        box(c, "Power cover", (0.38, 0.16, 0.025), (x, -0.36, 0.89), MAT["black"], bevel=0.025)
    return c


def build_cafe_table() -> bpy.types.Collection:
    c = collection("cafeTable")
    cylinder(c, "Round top", 0.675, 0.09, (0, 0, 0.77), MAT["wood_light"], vertices=32)
    cylinder(c, "Stem", 0.075, 0.66, (0, 0, 0.4), MAT["metal"], vertices=20)
    cylinder(c, "Disc base", 0.4, 0.055, (0, 0, 0.04), MAT["metal"], vertices=28)
    return c


def build_rack() -> bpy.types.Collection:
    c = collection("rack")
    box(c, "Rack cabinet", (0.8, 1.0, 2.0), (0, 0, 1), MAT["metal"], bevel=0.045)
    box(c, "Front recess", (0.67, 0.035, 1.78), (0, 0.505, 1.04), MAT["black"], bevel=0.025)
    for row in range(9):
        z = 0.28 + row * 0.17
        box(c, "Server blade", (0.61, 0.035, 0.115), (0, 0.53, z), MAT["metal_light" if row % 3 == 0 else "metal"], bevel=0.012)
        for x in (-0.22, -0.16):
            sphere(c, "Rack LED", (0.012, 0.009, 0.012), (x, 0.554, z), MAT["green_led"])
    for x in (-0.31, 0.31):
        box(c, "Rack rail", (0.035, 0.035, 1.83), (x, 0.54, 1.02), MAT["metal_light"], bevel=0.01)
    return c


def build_locker() -> bpy.types.Collection:
    c = collection("locker")
    box(c, "Locker carcass", (1.1, 0.55, 2.0), (0, 0, 1), MAT["metal_light"], bevel=0.04)
    for x in (-0.275, 0.275):
        box(c, "Locker door", (0.51, 0.035, 1.86), (x, 0.292, 1.01), MAT["white"], bevel=0.025)
        box(c, "Locker handle", (0.035, 0.035, 0.24), (x + (-0.18 if x > 0 else 0.18), 0.325, 1.04), MAT["metal"], bevel=0.012)
        for z in (0.35, 1.67):
            for offset in (-0.09, 0, 0.09):
                box(c, "Locker vent", (0.22, 0.018, 0.018), (x, 0.324, z + offset), MAT["black"], bevel=0.006)
    return c


def build_shelf() -> bpy.types.Collection:
    c = collection("shelf")
    for x in (-1.25, 1.25):
        box(c, "Shelf post", (0.09, 0.55, 1.9), (x, 0, 0.95), MAT["metal"], bevel=0.025)
    for z in (0.12, 0.62, 1.12, 1.72):
        box(c, "Oak shelf", (2.6, 0.6, 0.08), (0, 0, z), MAT["wood_light"], bevel=0.025)
    colors = ("fabric", "terracotta", "white", "wood_dark")
    for index, x in enumerate((-0.9, -0.48, 0.12, 0.65, 0.98)):
        box(c, "Archive box", (0.3, 0.42, 0.36), (x, 0, 0.34), MAT[colors[index % len(colors)]], bevel=0.025)
    for index, x in enumerate((-0.85, -0.55, -0.22, 0.18, 0.5, 0.82)):
        box(c, "Book", (0.16, 0.38, 0.39 + 0.04 * (index % 2)), (x, 0, 0.85), MAT[colors[(index + 1) % len(colors)]], bevel=0.012)
    return c


def build_coffee() -> bpy.types.Collection:
    c = collection("coffee")
    box(c, "Machine body", (0.7, 0.6, 1.0), (0, 0, 0.5), MAT["black"], bevel=0.07)
    box(c, "Control fascia", (0.56, 0.035, 0.28), (0, 0.315, 0.79), MAT["metal_light"], bevel=0.025)
    box(c, "Coffee screen", (0.25, 0.018, 0.11), (0, 0.337, 0.85), MAT["screen"], bevel=0.015)
    box(c, "Cup recess", (0.42, 0.035, 0.34), (0, 0.318, 0.39), MAT["metal"], bevel=0.035)
    for x in (-0.1, 0.1):
        cylinder(c, "Nozzle", 0.018, 0.13, (x, 0.34, 0.58), MAT["metal_light"], vertices=14)
    cylinder(c, "Cup", 0.075, 0.16, (0, 0.35, 0.21), MAT["white"], vertices=20)
    box(c, "Drip tray", (0.45, 0.32, 0.035), (0, 0.17, 0.09), MAT["metal_light"], bevel=0.02)
    return c


def build_crate() -> bpy.types.Collection:
    c = collection("crate")
    for z in (0.07, 0.87):
        box(c, "Crate rim", (1.0, 1.0, 0.11), (0, 0, z), MAT["wood_dark"], bevel=0.025)
    for x in (-0.43, 0.43):
        for y in (-0.43, 0.43):
            box(c, "Corner post", (0.11, 0.11, 0.82), (x, y, 0.47), MAT["wood_dark"], bevel=0.018)
    for x in (-0.3, 0, 0.3):
        box(c, "Front slat", (0.23, 0.075, 0.68), (x, 0.46, 0.47), MAT["wood_light"], bevel=0.018)
        box(c, "Back slat", (0.23, 0.075, 0.68), (x, -0.46, 0.47), MAT["wood_light"], bevel=0.018)
    for y in (-0.3, 0, 0.3):
        box(c, "Side slat", (0.075, 0.23, 0.68), (0.46, y, 0.47), MAT["wood_light"], bevel=0.018)
        box(c, "Side slat", (0.075, 0.23, 0.68), (-0.46, y, 0.47), MAT["wood_light"], bevel=0.018)
    return c


def build_printer() -> bpy.types.Collection:
    c = collection("printer")
    box(c, "Printer base", (0.9, 0.7, 0.56), (0, 0, 0.29), MAT["white"], bevel=0.065)
    box(c, "Scanner lid", (0.82, 0.58, 0.1), (0, -0.02, 0.72), MAT["black"], bevel=0.045, rotation=(0.06, 0, 0))
    box(c, "Paper output", (0.56, 0.035, 0.16), (0, 0.365, 0.28), MAT["black"], bevel=0.02)
    box(c, "Control panel", (0.25, 0.06, 0.1), (0.26, 0.36, 0.55), MAT["screen"], bevel=0.018, rotation=(0.22, 0, 0))
    box(c, "Printed sheet", (0.52, 0.34, 0.012), (0, 0.28, 0.16), MAT["paper"], bevel=0.012, rotation=(0.08, 0, 0))
    return c


def build_whiteboard() -> bpy.types.Collection:
    c = collection("whiteboard")
    box(c, "Board", (2.55, 0.055, 1.25), (0, 0, 1.38), MAT["white"], bevel=0.025)
    for x in (-1.3, 1.3):
        box(c, "Vertical frame", (0.055, 0.09, 1.34), (x, 0, 1.38), MAT["metal_light"], bevel=0.015)
    for z in (0.73, 2.03):
        box(c, "Horizontal frame", (2.65, 0.09, 0.055), (0, 0, z), MAT["metal_light"], bevel=0.015)
    box(c, "Marker tray", (1.3, 0.18, 0.055), (0, 0.08, 0.68), MAT["metal_light"], bevel=0.018)
    for index, color in enumerate(("red", "fabric_light", "black")):
        cylinder(c, "Marker", 0.018, 0.24, (-0.24 + index * 0.24, 0.16, 0.72), MAT[color], vertices=12, rotation=(0, math.pi / 2, 0))
    return c


def build_cone() -> bpy.types.Collection:
    c = collection("cone")
    box(c, "Rubber base", (0.44, 0.44, 0.055), (0, 0, 0.028), MAT["black"], bevel=0.025)
    cone(c, "Safety cone", 0.17, 0.045, 0.62, (0, 0, 0.36), MAT["orange"])
    cone(c, "Reflective collar", 0.125, 0.095, 0.13, (0, 0, 0.42), MAT["white"])
    return c


def build_sink() -> bpy.types.Collection:
    c = collection("sink")
    box(c, "Sink cabinet", (1.7, 0.56, 0.78), (0, 0, 0.39), MAT["white"], bevel=0.045)
    box(c, "Countertop", (1.7, 0.62, 0.09), (0, 0, 0.86), MAT["stone"], bevel=0.04)
    box(c, "Basin", (0.78, 0.4, 0.055), (0.1, 0.02, 0.91), MAT["metal_light"], bevel=0.12)
    box(c, "Basin inset", (0.62, 0.31, 0.025), (0.1, 0.02, 0.94), MAT["black"], bevel=0.1)
    tube(c, "Faucet", [(-0.42, -0.12, 0.91), (-0.42, -0.12, 1.25), (-0.15, -0.05, 1.25), (-0.08, 0.02, 1.08)], 0.026, MAT["metal_light"])
    for x in (-0.42, 0.42):
        box(c, "Door handle", (0.28, 0.03, 0.03), (x, 0.3, 0.55), MAT["metal"], bevel=0.012)
    return c


def build_vending() -> bpy.types.Collection:
    c = collection("vending")
    box(c, "Vending cabinet", (1.1, 0.75, 2.0), (0, 0, 1), MAT["black"], bevel=0.075)
    box(c, "Glass window", (0.7, 0.035, 1.35), (-0.12, 0.395, 1.2), MAT["glass"], bevel=0.035)
    for row in range(4):
        box(c, "Product shelf", (0.65, 0.035, 0.025), (-0.12, 0.42, 0.73 + row * 0.32), MAT["metal_light"], bevel=0.008)
        for col in range(4):
            finish = ("red", "fabric_light", "green", "orange")[(row + col) % 4]
            cylinder(c, "Drink can", 0.055, 0.19, (-0.36 + col * 0.16, 0.44, 0.85 + row * 0.32), MAT[finish], vertices=14)
    box(c, "Payment screen", (0.18, 0.03, 0.26), (0.39, 0.405, 1.35), MAT["screen"], bevel=0.02)
    box(c, "Dispenser", (0.52, 0.045, 0.18), (-0.08, 0.41, 0.28), MAT["metal"], bevel=0.035)
    return c


def build_kitchen() -> bpy.types.Collection:
    c = collection("kitchen")
    box(c, "Lower cabinets", (4.2, 0.66, 0.78), (0, 0, 0.39), MAT["white"], bevel=0.045)
    box(c, "Kitchen counter", (4.32, 0.76, 0.085), (0, 0.02, 0.84), MAT["stone"], bevel=0.04)
    for x in (-1.52, -0.76, 0, 0.76, 1.52):
        box(c, "Cabinet seam", (0.025, 0.025, 0.66), (x, 0.345, 0.42), MAT["metal_light"], bevel=0.007)
        box(c, "Lower handle", (0.34, 0.025, 0.025), (x + 0.2, 0.37, 0.67), MAT["metal"], bevel=0.009)
    for x in (-1.3, 0, 1.3):
        box(c, "Upper cabinet", (1.08, 0.38, 0.7), (x, -0.13, 1.77), MAT["white"], bevel=0.04)
        box(c, "Upper handle", (0.36, 0.025, 0.025), (x, 0.075, 1.5), MAT["metal"], bevel=0.009)
    box(c, "Cooktop", (0.75, 0.5, 0.025), (1.28, 0.05, 0.9), MAT["black"], bevel=0.03)
    for x in (1.05, 1.48):
        for y in (-0.1, 0.16):
            torus(c, "Cooktop ring", 0.1, 0.012, (x, y, 0.92), MAT["cyan"])
    box(c, "Kitchen basin", (0.72, 0.42, 0.03), (-1.12, 0.05, 0.9), MAT["metal_light"], bevel=0.11)
    tube(c, "Kitchen faucet", [(-1.48, -0.1, 0.89), (-1.48, -0.1, 1.26), (-1.18, -0.03, 1.25), (-1.05, 0.03, 1.08)], 0.025, MAT["metal_light"])
    return c


def build_tree() -> bpy.types.Collection:
    c = collection("tree")
    cone(c, "Tree trunk", 0.23, 0.14, 2.55, (0, 0, 1.275), MAT["wood_dark"], vertices=18)
    for index, (x, y, z, scale) in enumerate((
        (-0.42, 0.0, 2.75, 0.72), (0.4, 0.08, 2.8, 0.78), (0.0, -0.35, 3.12, 0.82),
        (0.0, 0.35, 3.28, 0.7), (-0.42, -0.25, 3.45, 0.62), (0.42, 0.25, 3.55, 0.65), (0, 0, 3.75, 0.58),
    )):
        sphere(c, "Tree crown", (0.72 * scale, 0.68 * scale, 0.8 * scale), (x, y, z), MAT["green_light" if index % 2 else "green"])
    return c


def build_street_lamp() -> bpy.types.Collection:
    c = collection("streetLamp")
    cylinder(c, "Lamp base", 0.19, 0.12, (0, 0, 0.06), MAT["metal"], vertices=24)
    cylinder(c, "Lamp pole", 0.055, 3.55, (0, 0, 1.82), MAT["metal"], vertices=16)
    tube(c, "Lamp arm", [(0, 0, 3.55), (0, 0, 3.86), (0.32, 0, 4.0), (0.55, 0, 3.92)], 0.045, MAT["metal"])
    cylinder(c, "Lamp shade", 0.24, 0.12, (0.55, 0, 3.83), MAT["metal"], vertices=24)
    cylinder(c, "Lamp diffuser", 0.17, 0.08, (0.55, 0, 3.74), MAT["warm_light"], vertices=24)
    return c


def build_bench() -> bpy.types.Collection:
    c = collection("bench")
    for y in (-0.22, 0, 0.22):
        box(c, "Seat slat", (1.9, 0.17, 0.1), (0, y, 0.5), MAT["wood_light"], bevel=0.035)
    for z, y in ((0.72, -0.31), (0.92, -0.35)):
        box(c, "Back slat", (1.9, 0.11, 0.16), (0, y, z), MAT["wood_light"], bevel=0.035, rotation=(-0.1, 0, 0))
    for x in (-0.68, 0.68):
        box(c, "Bench leg", (0.1, 0.52, 0.5), (x, 0, 0.25), MAT["metal"], bevel=0.035)
        tube(c, "Back support", [(x, -0.22, 0.42), (x, -0.37, 0.76), (x, -0.39, 1.02)], 0.035, MAT["metal"])
    return c


def build_ceiling_light() -> bpy.types.Collection:
    c = collection("ceilingLight")
    box(c, "Luminaire housing", (1.58, 0.58, 0.075), (0, 0, 0.038), MAT["metal_light"], bevel=0.07)
    box(c, "Warm diffuser", (1.42, 0.44, 0.035), (0, 0, -0.018), MAT["warm_light"], bevel=0.055)
    for x in (-0.6, 0.6):
        box(c, "Fixture rib", (0.035, 0.48, 0.025), (x, 0, -0.04), MAT["white"], bevel=0.01)
    return c


def build_emergency_light() -> bpy.types.Collection:
    c = collection("emergencyLight")
    box(c, "Emergency housing", (1.2, 0.32, 0.075), (0, 0, 0.038), MAT["red"], bevel=0.055)
    box(c, "Red diffuser", (1.06, 0.21, 0.035), (0, 0, -0.018), MAT["red_light"], bevel=0.045)
    for x in (-0.43, 0.43):
        sphere(c, "Emergency LED", (0.035, 0.035, 0.018), (x, 0, -0.045), MAT["red_light"])
    return c


BUILDERS = {
    "desk": build_desk,
    "chair": build_chair,
    "monitor": build_monitor,
    "plant": build_plant,
    "sofa": build_sofa,
    "counter": build_counter,
    "meetingTable": build_meeting_table,
    "cafeTable": build_cafe_table,
    "rack": build_rack,
    "locker": build_locker,
    "shelf": build_shelf,
    "coffee": build_coffee,
    "crate": build_crate,
    "printer": build_printer,
    "whiteboard": build_whiteboard,
    "cone": build_cone,
    "sink": build_sink,
    "vending": build_vending,
    "kitchen": build_kitchen,
    "tree": build_tree,
    "streetLamp": build_street_lamp,
    "bench": build_bench,
    "ceilingLight": build_ceiling_light,
    "emergencyLight": build_emergency_light,
}


def make_export_copy(source: bpy.types.Collection) -> bpy.types.Collection:
    temp = collection(f"EXPORT_{source.name}")
    duplicates: list[bpy.types.Object] = []
    for original in source.objects:
        duplicate = original.copy()
        duplicate.data = original.data.copy()
        temp.objects.link(duplicate)
        duplicate.matrix_world = Matrix.Rotation(math.pi, 4, "Z") @ original.matrix_world
        duplicates.append(duplicate)

    for obj in duplicates:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        if obj.type == "CURVE":
            bpy.ops.object.convert(target="MESH")
        if obj.type == "MESH":
            for modifier in list(obj.modifiers):
                bpy.context.view_layer.objects.active = obj
                bpy.ops.object.modifier_apply(modifier=modifier.name)

    groups: dict[str, list[bpy.types.Object]] = {}
    for obj in list(temp.objects):
        if obj.type != "MESH" or not obj.data.materials:
            continue
        groups.setdefault(obj.data.materials[0].name, []).append(obj)

    for material_name, objects in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        objects[0].name = f"{source.name} · {material_name}"
        objects[0].data.name = objects[0].name
    return temp


def export_collection(source: bpy.types.Collection, filename: str) -> None:
    temp = make_export_copy(source)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in temp.objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT / f"{filename}.glb"),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_attributes=False,
        export_skins=False,
        export_morph=False,
        export_yup=True,
    )
    for obj in list(temp.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(temp)


def add_studio(scene: bpy.types.Scene, assets: dict[str, bpy.types.Collection]) -> None:
    studio = collection("Preview studio")
    box(studio, "Floor", (17, 11, 0.08), (0, 0, -0.06), MAT["stone"], bevel=0.02)
    placements = (
        ("sofa", (-5.0, 2.9, 0), 0), ("desk", (-1.8, 3.1, 0), 0), ("chair", (-1.8, 1.9, 0), math.pi),
        ("meetingTable", (3.2, 2.8, 0), 0), ("counter", (-4.3, -0.7, 0), 0), ("rack", (-0.8, -1.2, 0), 0),
        ("locker", (0.7, -1.2, 0), 0), ("shelf", (2.8, -1.2, 0), 0), ("vending", (5.1, -1.2, 0), 0),
        ("coffee", (-5.8, -2.7, 0), 0), ("printer", (-4.5, -2.7, 0), 0), ("plant", (-3.25, -2.75, 0), 0),
        ("bench", (-0.9, -3.15, 0), 0), ("streetLamp", (1.2, -3.5, 0), 0), ("tree", (3.7, -3.25, 0), 0),
    )
    for name, position, rotation in placements:
        instance = bpy.data.objects.new(f"Preview {name}", None)
        instance.instance_type = "COLLECTION"
        instance.instance_collection = assets[name]
        instance.location = position
        instance.rotation_euler[2] = rotation
        studio.objects.link(instance)

    bpy.ops.object.light_add(type="AREA", location=(-4.5, 1.5, 8.5))
    key = bpy.context.object
    key.name = "Studio key"
    key.data.energy = 1900
    key.data.shape = "DISK"
    key.data.size = 6
    key.data.color = (1.0, 0.72, 0.53)
    bpy.ops.object.light_add(type="AREA", location=(5, 3, 6))
    fill = bpy.context.object
    fill.name = "Studio fill"
    fill.data.energy = 1500
    fill.data.size = 5
    fill.data.color = (0.42, 0.65, 1.0)
    bpy.ops.object.light_add(type="AREA", location=(0, -6, 5))
    rim = bpy.context.object
    rim.name = "Studio rim"
    rim.data.energy = 1200
    rim.data.size = 4
    rim.rotation_euler = (math.radians(35), 0, 0)

    bpy.ops.object.camera_add(location=(14.5, -17.5, 13.0), rotation=(math.radians(65), 0, math.radians(39)))
    camera = bpy.context.object
    direction = Vector((0, 0, 1.1)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW_PATH)
    scene.render.film_transparent = False
    scene.world.color = (0.012, 0.016, 0.025)
    scene.render.image_settings.color_mode = "RGBA"


def main() -> None:
    clear_scene()
    create_materials()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    assets = {name: builder() for name, builder in BUILDERS.items()}
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    for name, source in assets.items():
        export_collection(source, ASSET_FILES[name])
    for source in assets.values():
        bpy.context.scene.collection.children.unlink(source)
    add_studio(bpy.context.scene, assets)
    bpy.ops.render.render(write_still=True)
    print(f"BLEND: {BLEND_PATH}")
    print(f"PREVIEW: {PREVIEW_PATH}")
    print(f"EXPORTED: {len(assets)} modular office assets")


if __name__ == "__main__":
    main()
