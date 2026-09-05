"""Gera a sala de lobby editável e o GLB leve, sem alterar o escritório da partida."""

from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/models/deducao"
OUTPUT = ROOT / "public/models/games/deducao"
BLEND_PATH = SOURCE / "timbas-online-lobby.blend"
GLB_PATH = OUTPUT / "timbas-online-lobby.glb"
LAYOUT_PATH = SOURCE / "online-lobby-layout.json"
PREVIEW_PATH = SOURCE / "online-lobby-preview.png"
LOUNGE_PREVIEW_PATH = SOURCE / "online-lobby-lounge-preview.png"

COLLIDERS = [
    {"id": "lobby-sofa-west", "x": -2, "z": 3.95, "w": 2.4, "d": 1.3, "height": 0.9},
    {"id": "lobby-sofa-east", "x": 2, "z": 3.95, "w": 2.4, "d": 1.3, "height": 0.9},
    {"id": "lobby-audio-counter", "x": -5.25, "z": 0, "w": 1.1, "d": 3, "height": 1.1},
    {"id": "lobby-east-cabinet", "x": 5.25, "z": 0, "w": 1.1, "d": 3, "height": 1.1},
] + [{"id": f"lobby-plant-{x}-{z}", "x": x, "z": z, "w": 0.8, "d": 0.8, "height": 1.65}
     for x in (-5.2, 5.2) for z in (-4.2, 4.2)]

LEDS = [
    {"id": "lobby-led-blue-audio", "mesh": "LobbyLED_Blue_Audio", "color": "#558bff",
     "from": [-5.835, 0.72, -2.65], "to": [-5.835, 2.96, -2.65], "range": 4.8, "strength": 0.8},
    {"id": "lobby-led-amber-lounge", "mesh": "LobbyLED_Amber_Lounge", "color": "#ffc46b",
     "from": [-3.75, 3.19, 4.835], "to": [3.75, 3.19, 4.835], "range": 5.8, "strength": 0.7},
    {"id": "lobby-led-green-screen", "mesh": "LobbyLED_Green_Screen", "color": "#68e8b1",
     "from": [-2.55, 3.19, -4.835], "to": [2.55, 3.19, -4.835], "range": 5.8, "strength": 0.7},
    {"id": "lobby-led-blue-entry", "mesh": "LobbyLED_Blue_Entry", "color": "#82b4ff",
     "from": [5.835, 0.72, -2.65], "to": [5.835, 2.96, -2.65], "range": 4.8, "strength": 0.7},
]
LAMPS = [{"id": f"lobby-ceiling-{side}", "mesh": "LobbyLamp_Diffusers", "color": "#ffe7ce",
          "position": [x, 3.35, 0], "range": 8, "strength": 1.1}
         for side, x in (("west", -2.4), ("east", 2.4))]
SPAWNS = [{"x": x, "z": z, "level": 0, "dir": math.pi}
          for z in (-1.8, 0, 1.8) for x in (-2.4, -0.8, 0.8, 2.4)]
MATERIALS = {}
BUILD = None


def world(point):
    return (point[0], -point[2], point[1])


def material(name, color, *, metallic=0, roughness=0.65, emission=0):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    result.use_backface_culling = True
    result.diffuse_color = (*color, 1)
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Emission Color"].default_value = (*color, 1)
    shader.inputs["Emission Strength"].default_value = emission
    return result


def color(hex_color):
    srgb = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4 for value in srgb)


def move_to(obj, target):
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    target.objects.link(obj)
    return obj


def box(name, center, size, finish, *, bevel=0, collider=None, export_group=None):
    bpy.ops.mesh.primitive_cube_add(location=world(center))
    obj = move_to(bpy.context.object, BUILD)
    obj.name = name
    obj.scale = (size[0] / 2, size[2] / 2, size[1] / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(MATERIALS[finish])
    if bevel:
        modifier = obj.modifiers.new("Editable soft edge", "BEVEL")
        modifier.width = min(bevel, min(size) * 0.4)
        modifier.segments = 2
    if collider:
        obj["lobby_collider"] = collider
    if export_group:
        obj["lobby_export_group"] = export_group
    return obj


def sphere(name, center, radius, finish, collider=None):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=world(center))
    obj = move_to(bpy.context.object, BUILD)
    obj.name = name
    obj.scale = (radius[0], radius[2], radius[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(MATERIALS[finish])
    if collider:
        obj["lobby_collider"] = collider
    return obj


def architecture():
    box("Lobby floor, top at y0", (0, -0.12, 0), (12.48, 0.24, 10.48), "floor", export_group="LobbyFloor")
    box("Lobby ceiling, underside at y3.6", (0, 3.72, 0), (12.48, 0.24, 10.48), "gypsum", export_group="LobbyCeiling")
    for side in (-1, 1):
        box(f"Side wall {side}", (side * 6.12, 1.8, 0), (0.24, 3.6, 10.48), "plaster")
        box(f"End wall {side}", (0, 1.8, side * 5.12), (12, 3.6, 0.24), "plaster")
        box(f"Side skirting {side}", (side * 5.97, 0.12, 0), (0.06, 0.24, 10), "graphite")
        box(f"End skirting {side}", (0, 0.12, side * 4.97), (11.94, 0.24, 0.06), "graphite")
        box(f"Side ceiling gypsum frame {side}", (side * 5.65, 3.49, 0), (0.7, 0.22, 10), "gypsum")
        box(f"End ceiling gypsum frame {side}", (0, 3.49, side * 4.65), (10.6, 0.22, 0.7), "gypsum")
        box(f"Cove shadow line {side}", (0, 3.34, side * 4.76), (10.6, 0.045, 0.13), "graphite")
    box("Large woven rug, clear walkable center", (0, 0.006, 0.2), (8.1, 0.012, 6.05), "rug", bevel=0.03)
    for x in (-4.2, 4.2):
        box("Floor subtle boundary inlay", (x, 0.003, 0), (0.025, 0.006, 8.1), "walnut")
    box("North acoustic feature backing", (0, 1.7, -4.935), (6.1, 2.85, 0.13), "graphite")
    for index in range(39):
        x = -2.96 + index * 0.156
        box(f"North walnut slat {index:02}", (x, 1.7, -4.85), (0.072, 2.78, 0.065), "walnut", bevel=0.01)
    box("South sage wainscot", (0, 1.25, 4.92), (8.7, 2.3, 0.16), "sage")
    for x in (-3.45, -1.15, 1.15, 3.45):
        box("South acoustic seam", (x, 1.7, 4.828), (0.025, 1.45, 0.025), "graphite")


def sofa(collider):
    x, z = collider["x"], collider["z"]
    key = collider["id"]
    fabric = "fabric" if x < 0 else "sage"
    def part(name, offset, size, finish, bevel=0.04):
        return box(f"{key} {name}", (x + offset[0], offset[1], z + offset[2]), size, finish, bevel=bevel, collider=key)
    for dx in (-0.95, 0.95):
        for dz in (-0.44, 0.44):
            part("foot", (dx, 0.1, dz), (0.09, 0.2, 0.09), "graphite", 0.008)
    part("walnut plinth", (0, 0.24, 0), (2.24, 0.15, 1.19), "walnut", 0.025)
    part("upholstered seat base", (0, 0.36, -0.03), (2.3, 0.22, 1.15), fabric)
    for dx in (-1.1, 1.1):
        part("armrest", (dx, 0.52, 0), (0.2, 0.53, 1.3), fabric, 0.06)
    part("north-facing backrest", (0, 0.685, 0.48), (2.04, 0.43, 0.32), fabric, 0.065)
    for dx in (-0.51, 0.51):
        part("seat cushion", (dx, 0.49, -0.14), (0.98, 0.18, 0.94), fabric, 0.065)
        part("back cushion", (dx, 0.69, 0.32), (0.97, 0.36, 0.16), fabric, 0.045)


def counter(collider):
    x, z, key = collider["x"], collider["z"], collider["id"]
    side = -1 if x < 0 else 1
    box(f"{key} body", (x, 0.54, z), (1.02, 0.96, 2.94), "graphite", bevel=0.035, collider=key)
    box(f"{key} stone surface", (x, 1.04, z), (1.1, 0.12, 3), "gypsum", bevel=0.025, collider=key)
    for dz in (-0.99, 0, 0.99):
        box(f"{key} front", (x - side * 0.519, 0.59, dz), (0.035, 0.78, 0.92), "walnut", bevel=0.008, collider=key)
        box(f"{key} recessed handle", (x - side * 0.54, 0.78, dz), (0.015, 0.032, 0.27), "graphite", collider=key)
    if x < 0:
        box("Audio console wall mount", (-5.88, 1.85, 0), (0.24, 1.14, 2.6), "graphite", bevel=0.035)
        for dz in (-0.87, 0, 0.87):
            box("Audio test screen", (-5.746, 1.85, dz), (0.022, 0.76, 0.67), "screen", bevel=0.01)
            for index in range(5):
                box("Audio meter graphic", (-5.73, 1.84, dz + (index - 2) * 0.09), (0.018, 0.13 + 0.2 * (1 - abs(index - 2) / 3), 0.035), "screen_glyph")
    else:
        for dz, width, height in ((-0.88, 0.66, 0.88), (0, 0.58, 1.1), (0.88, 0.66, 0.74)):
            box("East gallery frame", (5.92, 2.0, dz), (0.12, height, width), "graphite", bevel=0.012)
            box("East gallery canvas", (5.851, 2.0, dz), (0.018, height - 0.1, width - 0.1), "gypsum")
            box("East gallery abstract stripe", (5.833, 2.0, dz - 0.08), (0.018, height * 0.62, width * 0.34), "sage")
            box("East gallery abstract accent", (5.82, 1.81, dz + 0.12), (0.02, height * 0.22, width * 0.3), "walnut")


def plant(collider):
    x, z, key = collider["x"], collider["z"], collider["id"]
    box(f"{key} planter", (x, 0.29, z), (0.62, 0.58, 0.62), "gypsum", bevel=0.085, collider=key)
    box(f"{key} soil", (x, 0.585, z), (0.48, 0.01, 0.48), "graphite", collider=key)
    for index in range(8):
        angle = index * math.tau / 8
        dx, dz = math.cos(angle) * 0.17, math.sin(angle) * 0.17
        sphere(f"{key} leaf {index}", (x + dx, 1.09 + (index % 3) * 0.12, z + dz), (0.15, 0.31, 0.15), "leaves", collider=key)
    sphere(f"{key} central leaf", (x, 1.28, z), (0.14, 0.37, 0.14), "leaves", collider=key)


def screen():
    box("North TV wall bracket", (0, 2.05, -4.75), (1.5, 0.6, 0.17), "graphite")
    box("North TV bezel", (0, 2.05, -4.635), (3.72, 1.64, 0.12), "graphite", bevel=0.04)
    box("North TV active surface", (0, 2.05, -4.567), (3.56, 1.48, 0.025), "screen", bevel=0.025)
    for index in range(9):
        height = 0.18 + (1 - abs(index - 4) / 5) * 0.53
        box("North TV voice waveform", ((index - 4) * 0.205, 2.07, -4.548), (0.075, height, 0.015), "screen_glyph", bevel=0.015)
    for x in (-1.4, 1.4):
        box("North TV ready indicator", (x, 1.59, -4.546), (0.18, 0.06, 0.015), "screen_glyph", bevel=0.01)
    box("North soundbar", (0, 1.12, -4.63), (1.4, 0.12, 0.12), "graphite", bevel=0.04)
    box("Closed east entry portal", (5.93, 1.27, -3.56), (0.14, 2.54, 1.3), "graphite", bevel=0.015)
    box("Closed east entry panel", (5.85, 1.25, -3.56), (0.018, 2.34, 1.12), "sage", bevel=0.005)
    box("Closed east entry handle", (5.79, 1.07, -3.93), (0.09, 0.28, 0.035), "walnut", bevel=0.008)


def fixtures():
    for light in LEDS:
        a, b = light["from"], light["to"]
        center = [(a[i] + b[i]) / 2 for i in range(3)]
        light["position"] = center
        finish = light["mesh"]
        MATERIALS[finish] = material(finish, color(light["color"]), roughness=0.4, emission=2.2)
        if a[0] == b[0]:
            side = -1 if a[0] < 0 else 1
            box(f"{finish} metal channel", (side * 5.9, center[1], center[2]), (0.14, b[1] - a[1] + 0.12, 0.12), "graphite", bevel=0.012)
            box(finish, center, (0.022, b[1] - a[1], 0.045), finish, export_group=finish)
        else:
            side = -1 if a[2] < 0 else 1
            box(f"{finish} metal channel", (center[0], center[1], side * 4.9), (b[0] - a[0] + 0.12, 0.12, 0.14), "graphite", bevel=0.012)
            box(finish, center, (b[0] - a[0], 0.045, 0.022), finish, export_group=finish)
    for lamp in LAMPS:
        x = lamp["position"][0]
        box(f"{lamp['id']} ceiling mount", (x, 3.525, 0), (0.46, 0.15, 1.92), "graphite", bevel=0.028)
        box(f"{lamp['id']} diffuser", (x, 3.442, 0), (0.32, 0.026, 1.76), "lamp", export_group="LobbyLamp_Diffusers")


def validate_source():
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for collider in COLLIDERS:
        objects = [obj for obj in BUILD.objects if obj.get("lobby_collider") == collider["id"]]
        assert objects, f"Collider sem modelo: {collider['id']}"
        for obj in objects:
            evaluated = obj.evaluated_get(depsgraph)
            for corner in evaluated.bound_box:
                point = evaluated.matrix_world @ Vector(corner)
                x, y, z = point.x, point.z, -point.y
                assert abs(x - collider["x"]) <= collider["w"] / 2 + 0.002, (obj.name, x)
                assert abs(z - collider["z"]) <= collider["d"] / 2 + 0.002, (obj.name, z)
                assert -0.002 <= y <= collider["height"] + 0.002, (obj.name, y)
    for spawn in SPAWNS:
        for collider in COLLIDERS:
            assert not (abs(spawn["x"] - collider["x"]) <= collider["w"] / 2 + 0.35
                        and abs(spawn["z"] - collider["z"]) <= collider["d"] / 2 + 0.35), (spawn, collider)


def export_optimized():
    temporary = bpy.data.collections.new("Export only, joined by material")
    bpy.context.scene.collection.children.link(temporary)
    original_names = {obj: obj.name for obj in BUILD.objects}
    for original, name in original_names.items():
        original.name = f"Editable {name}"
    for original in list(BUILD.objects):
        duplicate = original.copy()
        duplicate.data = original.data.copy()
        temporary.objects.link(duplicate)
        bpy.context.view_layer.objects.active = duplicate
        for modifier in list(duplicate.modifiers):
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    groups = {}
    for obj in list(temporary.objects):
        key = obj.get("lobby_export_group") or obj.data.materials[0].name
        groups.setdefault(key, []).append(obj)
    for name, objects in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        objects[0].name = name
        assert objects[0].name == name, (name, objects[0].name)
    triangles = 0
    for obj in temporary.objects:
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
    assert len(temporary.objects) <= 25, len(temporary.objects)
    assert triangles < 25000, triangles
    bpy.ops.object.select_all(action="DESELECT")
    for obj in temporary.objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(GLB_PATH), export_format="GLB", use_selection=True,
        export_apply=True, export_yup=True, export_cameras=False, export_lights=False,
        export_animations=False, export_attributes=False, export_skins=False, export_morph=False,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
    budget = {"drawCalls": len(temporary.objects), "triangles": triangles}
    for obj in list(temporary.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(temporary)
    for original, name in original_names.items():
        original.name = name
    return budget


def preview_lighting():
    scene = bpy.context.scene
    preview = bpy.data.collections.new("Preview cameras and physical lights, not exported")
    scene.collection.children.link(preview)
    for lamp in LAMPS:
        bpy.ops.object.light_add(type="AREA", location=world(lamp["position"]))
        obj = move_to(bpy.context.object, preview)
        obj.name = f"Preview {lamp['id']}"
        obj.data.energy = 480
        obj.data.shape = "RECTANGLE"
        obj.data.size = 0.45
        obj.data.size_y = 1.75
        obj.data.color = color(lamp["color"])
    for light in LEDS:
        center = light["position"]
        inward = [-math.copysign(0.17, center[0]) if abs(center[0]) > 5 else 0, 0,
                  -math.copysign(0.17, center[2]) if abs(center[2]) > 4 else 0]
        location = [center[i] + inward[i] for i in range(3)]
        bpy.ops.object.light_add(type="AREA", location=world(location))
        obj = move_to(bpy.context.object, preview)
        obj.name = f"Preview {light['mesh']}"
        obj.data.energy = 130 if abs(center[0]) > 5 else 210
        obj.data.color = color(light["color"])
        obj.data.shape = "RECTANGLE"
        obj.data.size = 0.08
        obj.data.size_y = math.dist(light["from"], light["to"])
        target = Vector(world((0, 1.3, 0)))
        obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.09, 0.12, 0.17, 1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.2
    bpy.ops.object.camera_add(location=world((4.05, 1.68, 2.8)))
    camera = move_to(bpy.context.object, preview)
    camera.name = "Lobby main review camera"
    camera.rotation_euler = (Vector(world((-1.0, 1.55, -3.7))) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 23
    camera.data.clip_start = 0.08
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW_PATH)
    return camera


def main():
    global BUILD
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    BUILD = bpy.data.collections.new("Online lobby, editable mesh parts")
    bpy.context.scene.collection.children.link(BUILD)
    MATERIALS.update(
        plaster=material("LobbySurface_Plaster", (0.66, 0.65, 0.59), roughness=0.9),
        gypsum=material("LobbySurface_Gypsum", (0.73, 0.71, 0.66), roughness=0.8),
        floor=material("LobbySurface_Stone", (0.24, 0.27, 0.3), roughness=0.73),
        graphite=material("LobbySurface_Graphite", (0.025, 0.035, 0.05), metallic=0.18, roughness=0.42),
        walnut=material("LobbySurface_Walnut", (0.28, 0.13, 0.055), roughness=0.58),
        rug=material("LobbySurface_Rug", (0.09, 0.15, 0.17), roughness=1),
        fabric=material("LobbySurface_Fabric", (0.055, 0.17, 0.23), roughness=0.97),
        sage=material("LobbySurface_Sage", (0.22, 0.32, 0.27), roughness=0.91),
        leaves=material("LobbySurface_Leaves", (0.075, 0.24, 0.12), roughness=0.8),
        screen=material("LobbyScreen_Surface", (0.01, 0.025, 0.045), roughness=0.3, emission=0.35),
        screen_glyph=material("LobbyScreen_Glyph", (0.26, 0.72, 0.83), roughness=0.5, emission=0.8),
        lamp=material("LobbyLamp_Emission", (1, 0.82, 0.62), roughness=0.4, emission=2.2),
    )
    architecture()
    for collider in COLLIDERS:
        if "sofa" in collider["id"]:
            sofa(collider)
        elif "plant" in collider["id"]:
            plant(collider)
        else:
            counter(collider)
    screen()
    fixtures()
    validate_source()
    SOURCE.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    camera = preview_lighting()
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    budget = export_optimized()
    LAYOUT_PATH.write_text(json.dumps({"model": "/models/games/deducao/timbas-online-lobby.glb",
        "coordinates": "Three.js, Y up, meters", "bounds": {"minX": -6, "maxX": 6, "minZ": -5, "maxZ": 5},
        "floorY": 0, "ceilingY": 3.6, "wallThickness": 0.24, "colliders": COLLIDERS,
        "spawns": SPAWNS, "leds": LEDS, "lamps": LAMPS, "budget": budget}, indent=2) + "\n", encoding="utf8")
    bpy.ops.render.render(write_still=True)
    camera.location = world((-3.95, 1.68, -2.75))
    camera.rotation_euler = (Vector(world((0.7, 1.4, 3.8))) - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.render.filepath = str(LOUNGE_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)
    print(f"ONLINE_LOBBY {json.dumps(budget)}")
    print(f"BLEND {BLEND_PATH}\nGLB {GLB_PATH}\nLAYOUT {LAYOUT_PATH}")


if __name__ == "__main__":
    main()
