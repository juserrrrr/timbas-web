"""Gera o prédio completo de dois pavimentos do jogo Dedução."""

from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
MAP_PATH = ROOT / "assets" / "models" / "deducao" / "office-map.json"
BLEND_PATH = ROOT / "assets" / "models" / "deducao" / "timbas-office-building.blend"
GLB_PATH = ROOT / "public" / "models" / "games" / "deducao" / "timbas-office-building.glb"
PREVIEW_PATH = Path.home() / "AppData" / "Local" / "Temp" / "timbas-office-building-preview.png"
SERVER_PREVIEW_PATH = Path.home() / "AppData" / "Local" / "Temp" / "timbas-office-server-preview.png"
PANTRY_PREVIEW_PATH = Path.home() / "AppData" / "Local" / "Temp" / "timbas-office-pantry-preview.png"
LOUNGE_PREVIEW_PATH = Path.home() / "AppData" / "Local" / "Temp" / "timbas-office-lounge-preview.png"
STAIR_PREVIEW_PATH = Path.home() / "AppData" / "Local" / "Temp" / "timbas-office-stair-preview.png"
MEETING_PREVIEW_PATH = Path.home() / "AppData" / "Local" / "Temp" / "timbas-office-meeting-preview.png"
BATHROOM_PREVIEW_PATH = Path.home() / "AppData" / "Local" / "Temp" / "timbas-office-bathroom-preview.png"

PROP_MODELS = {
    "desk": "desk-blender.glb",
    "chair": "office-chair-blender.glb",
    "monitor": "computer-blender.glb",
    "plant": "plant-blender.glb",
    "sofa": "timbas-blue-sofa.glb",
    "counter": "reception-counter.glb",
    "meetingTable": "meeting-table-blender.glb",
    "cafeTable": "cafe-table.glb",
    "rack": "server-rack.glb",
    "locker": "locker.glb",
    "shelf": "office-shelf.glb",
    "coffee": "coffee-machine.glb",
    "crate": "wooden-crate.glb",
    "printer": "office-printer.glb",
    "whiteboard": "whiteboard.glb",
    "cone": "traffic-cone.glb",
    "vending": "vending-machine.glb",
    "bathroomVanity": "bathroom-vanity.glb",
    "toilet": "modern-toilet.glb",
    "kitchen": "office-kitchen.glb",
    "gameTable": "lounge-game-table.glb",
    "arcade": "arcade-cabinet.glb",
    "car": "toy-car.glb",
    "sportCar": "timbas-coupe-suv.glb",
    "ceilingLight": "ceiling-light.glb",
}
PROP_ROOT = ROOT / "public" / "models" / "games" / "deducao"

FLOOR_HEIGHT = 4.2
WALL_HEIGHT = 4.02
DOOR_HEIGHT = 2.62
LAYOUT_ORIGIN = 3.0
ORIGINAL_BOUNDS = (74.0, 58.0)


def layout_scales(game_map: dict) -> tuple[float, float]:
    bounds = game_map["bounds"]
    margin = LAYOUT_ORIGIN * 2
    return (
        (bounds["w"] - margin) / (ORIGINAL_BOUNDS[0] - margin),
        (bounds["d"] - margin) / (ORIGINAL_BOUNDS[1] - margin),
    )


def layout_point(game_map: dict, x: float, z: float) -> tuple[float, float]:
    scale_x, scale_z = layout_scales(game_map)
    return (
        LAYOUT_ORIGIN + (x - LAYOUT_ORIGIN) * scale_x,
        LAYOUT_ORIGIN + (z - LAYOUT_ORIGIN) * scale_z,
    )


def layout_world_point(game_map: dict, value: tuple[float, float, float]) -> tuple[float, float, float]:
    x, z = layout_point(game_map, value[0], -value[1])
    return (x, -z, value[2])


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for item in list(bpy.data.collections):
        if item.name != "Collection":
            bpy.data.collections.remove(item)


def set_input(shader, names: tuple[str, ...], value) -> None:
    for name in names:
        socket = shader.inputs.get(name)
        if socket is not None:
            socket.default_value = value
            return


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    metallic: float = 0,
    roughness: float = 0.55,
    coat: float = 0,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0,
    alpha: float = 1,
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
    set_input(shader, ("Alpha",), alpha)
    if emission is not None:
        set_input(shader, ("Emission Color", "Emission"), emission)
        set_input(shader, ("Emission Strength",), emission_strength)
    if alpha < 1:
        result.diffuse_color = (*color[:3], alpha)
        if hasattr(result, "surface_render_method"):
            result.surface_render_method = "DITHERED"
    return result


MAT: dict[str, bpy.types.Material] = {}


def create_materials() -> None:
    MAT.update(
        wall=make_material("Wall · warm architectural plaster", (0.68, 0.70, 0.72, 1), roughness=0.76),
        wall_soft=make_material("Wall · soft warm white", (0.82, 0.82, 0.79, 1), roughness=0.72),
        ceiling=make_material("Ceiling · seamless acoustic white", (0.72, 0.74, 0.74, 1), roughness=0.82),
        structure=make_material("Structure · graphite", (0.035, 0.055, 0.085, 1), metallic=0.52, roughness=0.32),
        concrete=make_material("Floor · industrial concrete", (0.24, 0.27, 0.3, 1), roughness=0.76),
        terrazzo=make_material("Floor · continuous terrazzo", (0.55, 0.57, 0.58, 1), roughness=0.42, coat=0.12),
        carpet=make_material("Floor · graphite blue carpet", (0.075, 0.12, 0.19, 1), roughness=0.96),
        carpet_accent=make_material("Floor · teal carpet inset", (0.035, 0.24, 0.29, 1), roughness=0.94),
        vinyl=make_material("Floor · seamless corridor vinyl", (0.20, 0.25, 0.31, 1), roughness=0.67),
        pantry=make_material("Floor · large porcelain", (0.25, 0.39, 0.34, 1), roughness=0.54, coat=0.08),
        grout=make_material("Floor · dark grout", (0.075, 0.09, 0.095, 1), roughness=0.86),
        oak=make_material("Floor · natural oak A", (0.42, 0.20, 0.075, 1), roughness=0.46, coat=0.12),
        oak_light=make_material("Floor · natural oak B", (0.56, 0.30, 0.12, 1), roughness=0.44, coat=0.12),
        walnut=make_material("Feature · walnut slats", (0.19, 0.065, 0.022, 1), roughness=0.38, coat=0.16),
        acoustic_blue=make_material("Feature · blue acoustic felt", (0.025, 0.18, 0.36, 1), roughness=0.9),
        acoustic_teal=make_material("Feature · teal acoustic felt", (0.015, 0.31, 0.32, 1), roughness=0.9),
        glass=make_material("Glass · solid smoked architectural", (0.035, 0.15, 0.21, 1), metallic=0.32, roughness=0.16, coat=0.62),
        bathroom=make_material("Floor · bathroom mineral porcelain", (0.35, 0.43, 0.49, 1), roughness=0.4, coat=0.12),
        brass=make_material("Detail · satin brass", (0.48, 0.26, 0.065, 1), metallic=0.8, roughness=0.25),
        cyan=make_material("Detail · cyan guidance", (0.015, 0.35, 0.62, 1), roughness=0.25, emission=(0.02, 0.72, 1, 1), emission_strength=2.2),
        amber=make_material("Detail · amber guidance", (0.62, 0.23, 0.025, 1), roughness=0.25, emission=(1, 0.3, 0.025, 1), emission_strength=1.8),
        sign=make_material("Sign · room lettering", (0.7, 0.82, 0.9, 1), metallic=0.34, roughness=0.28, emission=(0.18, 0.48, 0.76, 1), emission_strength=0.55),
        white=make_material("Detail · satin white", (0.76, 0.79, 0.8, 1), roughness=0.42),
        screen=make_material("Technology · active dashboard", (0.006, 0.035, 0.075, 1), roughness=0.18, emission=(0.02, 0.42, 0.92, 1), emission_strength=1.45),
        art_coral=make_material("Art · coral", (0.86, 0.11, 0.08, 1), roughness=0.5),
        art_gold=make_material("Art · ochre", (0.88, 0.48, 0.04, 1), roughness=0.5),
        art_violet=make_material("Art · violet", (0.34, 0.08, 0.55, 1), roughness=0.5),
        button_red=make_material(
            "Emergency button · illuminated red",
            (0.55, 0.012, 0.025, 1),
            roughness=0.2,
            coat=0.55,
            emission=(1, 0.015, 0.025, 1),
            emission_strength=1.3,
        ),
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


def world_location(x: float, z: float, height: float) -> tuple[float, float, float]:
    return x, -z, height


def box(
    target: bpy.types.Collection,
    name: str,
    size: tuple[float, float, float],
    location: tuple[float, float, float],
    finish: bpy.types.Material,
    *,
    bevel: float = 0,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = move_to(bpy.context.object, target)
    obj.name = name
    obj.scale = tuple(value / 2 for value in size)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("Architectural edge", "BEVEL")
        modifier.width = min(bevel, min(size) * 0.42)
        modifier.segments = 2
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
    vertices: int = 32,
    bevel: float = 0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = move_to(bpy.context.object, target)
    obj.name = name
    if bevel:
        modifier = obj.modifiers.new("Product edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    obj.data.materials.append(finish)
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
    spline = data.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coordinate in zip(spline.points, points):
        point.co = (*coordinate, 1)
    obj = bpy.data.objects.new(name, data)
    data.materials.append(finish)
    target.objects.link(obj)
    return obj


def mesh_boxes(
    target: bpy.types.Collection,
    name: str,
    boxes: list[tuple[float, float, float, float, float, float]],
    finish: bpy.types.Material,
) -> bpy.types.Object | None:
    if not boxes:
        return None
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    for cx, cy, cz, sx, sy, sz in boxes:
        start = len(vertices)
        x0, x1 = cx - sx / 2, cx + sx / 2
        y0, y1 = cy - sy / 2, cy + sy / 2
        z0, z1 = cz - sz / 2, cz + sz / 2
        vertices.extend(((x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
                         (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)))
        faces.extend(((start, start + 3, start + 2, start + 1), (start + 4, start + 5, start + 6, start + 7),
                      (start, start + 1, start + 5, start + 4), (start + 1, start + 2, start + 6, start + 5),
                      (start + 2, start + 3, start + 7, start + 6), (start + 3, start, start + 4, start + 7)))
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.materials.append(finish)
    obj = bpy.data.objects.new(name, data)
    target.objects.link(obj)
    return obj


def split_around_holes(rect: dict, holes: list[dict]) -> list[dict]:
    pieces = [dict(rect)]
    for hole in holes:
        following: list[dict] = []
        for piece in pieces:
            left = max(piece["x"], hole["x"])
            right = min(piece["x"] + piece["w"], hole["x"] + hole["w"])
            top = max(piece["z"], hole["z"])
            bottom = min(piece["z"] + piece["d"], hole["z"] + hole["d"])
            if left >= right or top >= bottom:
                following.append(piece)
                continue
            candidates = (
                {"x": piece["x"], "z": piece["z"], "w": piece["w"], "d": top - piece["z"]},
                {"x": piece["x"], "z": bottom, "w": piece["w"], "d": piece["z"] + piece["d"] - bottom},
                {"x": piece["x"], "z": top, "w": left - piece["x"], "d": bottom - top},
                {"x": right, "z": top, "w": piece["x"] + piece["w"] - right, "d": bottom - top},
            )
            following.extend(item for item in candidates if item["w"] > 0.04 and item["d"] > 0.04)
        pieces = following
    return pieces


def stair_holes(game_map: dict) -> list[dict]:
    result = []
    for stair in game_map["stairs"]:
        if stair["targetLevel"] <= stair["level"]:
            continue
        result.append({
            "x": min(stair["x"], stair["targetX"]) - 1.62,
            "z": min(stair["z"], stair["targetZ"]) - 0.24,
            "w": abs(stair["targetX"] - stair["x"]) + 3.24,
            "d": abs(stair["targetZ"] - stair["z"]) + 0.48,
        })
    return result


def ceiling_fixture_placements(game_map: dict) -> list[dict]:
    holes = stair_holes(game_map)
    placements: list[dict] = []
    for room in game_map["rooms"]:
        if room["kind"] == "terraco":
            continue
        rect = room["rect"]
        columns = max(1, min(3, math.floor((rect["w"] - 2) / 6)))
        rows = max(1, min(3, math.floor((rect["d"] - 2) / 7)))
        level = room.get("level", 0)
        for index in range(columns * rows):
            column = index % columns
            row = index // columns
            x = rect["x"] + (column + 1) * rect["w"] / (columns + 1)
            z = rect["z"] + (row + 1) * rect["d"] / (rows + 1)
            inside_opening = level == 0 and any(
                hole["x"] <= x <= hole["x"] + hole["w"]
                and hole["z"] <= z <= hole["z"] + hole["d"]
                for hole in holes
            )
            if inside_opening:
                continue
            placements.append({
                "x": x,
                "y": WALL_HEIGHT - 0.08,
                "z": z,
                "rot": math.pi / 2,
                "level": level,
            })
    return placements


def add_floor(target: bpy.types.Collection, room: dict, piece: dict, base: float) -> None:
    finish = room["finish"]
    x = piece["x"] + piece["w"] / 2
    z = piece["z"] + piece["d"] / 2
    box(target, f"Floor slab · {room['id']}", (piece["w"], piece["d"], 0.18), world_location(x, z, base - 0.09), MAT["structure"])
    top = base + 0.012

    if finish in ("wood", "parquet"):
        box(target, f"Oak underlay · {room['id']}", (piece["w"], piece["d"], 0.025), world_location(x, z, top), MAT["walnut"])
        light: list[tuple[float, float, float, float, float, float]] = []
        dark: list[tuple[float, float, float, float, float, float]] = []
        plank_w, plank_l, gap = 0.28, 1.55, 0.018
        row = 0
        current_z = piece["z"] + plank_w / 2
        while current_z < piece["z"] + piece["d"]:
            offset = (row % 2) * plank_l / 2
            current_x = piece["x"] - offset + plank_l / 2
            column = 0
            while current_x < piece["x"] + piece["w"]:
                left = max(piece["x"], current_x - plank_l / 2)
                right = min(piece["x"] + piece["w"], current_x + plank_l / 2)
                if right - left > 0.05:
                    item = ((left + right) / 2, -current_z, top + 0.018, right - left - gap, plank_w - gap, 0.022)
                    (light if (row + column) % 3 else dark).append(item)
                current_x += plank_l
                column += 1
            current_z += plank_w
            row += 1
        mesh_boxes(target, f"Oak planks A · {room['id']}", light, MAT["oak_light"])
        mesh_boxes(target, f"Oak planks B · {room['id']}", dark, MAT["oak"])
        return

    material_key = {
        "server": "concrete",
        "carpet": "carpet",
        "patternedCarpet": "carpet",
        "terrazzo": "terrazzo",
        "vinyl": "vinyl",
        "pantry": "pantry",
        "bathroom": "bathroom",
        "concrete": "concrete",
    }.get(finish, "concrete")
    box(target, f"Floor finish · {room['id']}", (piece["w"], piece["d"], 0.035), world_location(x, z, top), MAT[material_key])

    if finish in ("pantry", "bathroom"):
        lines: list[tuple[float, float, float, float, float, float]] = []
        step = 1.2
        value = piece["x"]
        while value <= piece["x"] + piece["w"]:
            lines.append((value, -z, top + 0.025, 0.018, piece["d"], 0.012))
            value += step
        value = piece["z"]
        while value <= piece["z"] + piece["d"]:
            lines.append((x, -value, top + 0.025, piece["w"], 0.018, 0.012))
            value += step
        mesh_boxes(target, f"Porcelain joints · {room['id']}", lines, MAT["grout"])

    if finish in ("carpet", "patternedCarpet") and room["kind"] == "sala":
        inset_w, inset_d = max(1, piece["w"] - 3.0), max(1, piece["d"] - 3.0)
        box(target, f"Carpet inset · {room['id']}", (inset_w, inset_d, 0.018), world_location(x, z, top + 0.028), MAT["carpet_accent"], bevel=0.12)

    if finish == "vinyl":
        if piece["w"] < piece["d"]:
            box(target, f"Corridor runner · {room['id']}", (piece["w"] - 2.0, piece["d"] - 0.5, 0.018), world_location(x, z, top + 0.025), MAT["carpet"])
            for edge in (-piece["w"] / 2 + 1.0, piece["w"] / 2 - 1.0):
                box(target, f"Corridor brass line · {room['id']}", (0.025, piece["d"] - 0.5, 0.016), world_location(x + edge, z, top + 0.04), MAT["brass"])


def add_room_floors(target: bpy.types.Collection, game_map: dict) -> None:
    holes = stair_holes(game_map)
    for room in game_map["rooms"]:
        level = room.get("level", 0)
        room_holes = holes if level == 1 else []
        for piece in split_around_holes(room["rect"], room_holes):
            add_floor(target, room, piece, level * FLOOR_HEIGHT)


def add_walls(target: bpy.types.Collection, game_map: dict) -> None:
    bases: list[tuple[float, float, float, float, float, float]] = []
    trims: list[tuple[float, float, float, float, float, float]] = []
    caps: list[tuple[float, float, float, float, float, float]] = []
    for wall in game_map["walls"]:
        level = wall.get("level", 0)
        base = level * FLOOR_HEIGHT
        width = wall["maxX"] - wall["minX"]
        depth = wall["maxZ"] - wall["minZ"]
        x = (wall["minX"] + wall["maxX"]) / 2
        z = (wall["minZ"] + wall["maxZ"]) / 2
        height = 1.05 if wall.get("style") == "guarda-corpo" else WALL_HEIGHT
        bases.append((x, -z, base + height / 2, width, depth, height))
        trims.append((x, -z, base + 0.12, width + 0.04, depth + 0.04, 0.24))
        caps.append((x, -z, base + height - 0.065, width + 0.06, depth + 0.06, 0.13))
    mesh_boxes(target, "Continuous architectural walls", bases, MAT["wall"])
    mesh_boxes(target, "Continuous graphite baseboards", trims, MAT["structure"])
    mesh_boxes(target, "Continuous wall shadow gap", caps, MAT["structure"])


def unique_doors(game_map: dict) -> list[dict]:
    seen: set[str] = set()
    result = []
    for room in game_map["rooms"]:
        for door in room.get("doors", []):
            horizontal = door["side"] in ("north", "south")
            cx = room["rect"]["x"] + door["at"] + door["width"] / 2 if horizontal else room["rect"]["x"] + (0 if door["side"] == "west" else room["rect"]["w"])
            cz = room["rect"]["z"] + (0 if door["side"] == "north" else room["rect"]["d"]) if horizontal else room["rect"]["z"] + door["at"] + door["width"] / 2
            key = f"{room.get('level', 0)}:{'h' if horizontal else 'v'}:{cx:.3f}:{cz:.3f}"
            if key in seen:
                continue
            seen.add(key)
            result.append({"room": room, "door": door, "horizontal": horizontal, "x": cx, "z": cz})
    return result


def add_doors(target: bpy.types.Collection, game_map: dict) -> None:
    for index, entry in enumerate(unique_doors(game_map)):
        room, door = entry["room"], entry["door"]
        base = room.get("level", 0) * FLOOR_HEIGHT
        cx, cz, width = entry["x"], entry["z"], door["width"]
        frame = 0.11
        if entry["horizontal"]:
            for x in (cx - width / 2 + frame / 2, cx + width / 2 - frame / 2):
                box(target, f"Portal post {index}", (frame, 0.47, DOOR_HEIGHT), world_location(x, cz, base + DOOR_HEIGHT / 2), MAT["structure"], bevel=0.025)
            box(target, f"Portal header {index}", (width, 0.47, frame), world_location(cx, cz, base + DOOR_HEIGHT - frame / 2), MAT["structure"], bevel=0.025)
            for sign in (-1, 1):
                edge_x = cx + sign * (width / 2 - 0.11)
                box(target, f"Glass portal sidelight {index}", (0.17, 0.07, 2.3), world_location(edge_x, cz + 0.24, base + 1.15), MAT["glass"], bevel=0.025)
            box(target, f"Door presence sensor {index}", (0.42, 0.08, 0.075), world_location(cx, cz + 0.255, base + DOOR_HEIGHT - 0.2), MAT["cyan"], bevel=0.028)
        else:
            for z in (cz - width / 2 + frame / 2, cz + width / 2 - frame / 2):
                box(target, f"Portal post {index}", (0.47, frame, DOOR_HEIGHT), world_location(cx, z, base + DOOR_HEIGHT / 2), MAT["structure"], bevel=0.025)
            box(target, f"Portal header {index}", (0.47, width, frame), world_location(cx, cz, base + DOOR_HEIGHT - frame / 2), MAT["structure"], bevel=0.025)
            for sign in (-1, 1):
                edge_z = cz + sign * (width / 2 - 0.11)
                box(target, f"Glass portal sidelight {index}", (0.07, 0.17, 2.3), world_location(cx + 0.24, edge_z, base + 1.15), MAT["glass"], bevel=0.025)
            box(target, f"Door presence sensor {index}", (0.08, 0.42, 0.075), world_location(cx + 0.255, cz, base + DOOR_HEIGHT - 0.2), MAT["cyan"], bevel=0.028)


def add_ceilings(target: bpy.types.Collection, game_map: dict) -> None:
    holes = stair_holes(game_map)
    for room in game_map["rooms"]:
        if room["kind"] == "terraco":
            continue
        level = room.get("level", 0)
        for piece in split_around_holes(room["rect"], holes if level == 0 else []):
            x = piece["x"] + piece["w"] / 2
            z = piece["z"] + piece["d"] / 2
            height = level * FLOOR_HEIGHT + WALL_HEIGHT + 0.07
            box(target, f"Seamless ceiling · {room['id']}", (piece["w"], piece["d"], 0.14), world_location(x, z, height), MAT["ceiling"])
            if room["kind"] == "sala" and piece["w"] > 9 and piece["d"] > 9:
                raft_w = min(5.4, piece["w"] - 3)
                raft_d = min(3.0, piece["d"] - 3)
                box(target, f"Suspended acoustic raft · {room['id']}", (raft_w, raft_d, 0.07), world_location(x, z, height - 0.13), MAT["wall_soft"], bevel=0.08)


def add_feature_walls(target: bpy.types.Collection, game_map: dict) -> None:
    by_id = {room["id"]: room for room in game_map["rooms"]}
    wood_rooms = ("recepcao", "reuniao", "chefe", "conselho")
    blue_rooms = ("servidores", "openspace", "operacoes", "lounge")
    for room_id in wood_rooms + blue_rooms:
        room = by_id[room_id]
        base = room.get("level", 0) * FLOOR_HEIGHT
        rect = room["rect"]
        width = min(rect["w"] - 3.0, 11.0)
        center_x = rect["x"] + rect["w"] / 2
        wall_z = rect["z"] + 0.215
        if room_id in wood_rooms:
            box(target, f"Walnut feature backing · {room_id}", (width, 0.055, 2.6), world_location(center_x, wall_z, base + 1.72), MAT["walnut"], bevel=0.035)
            slats: list[tuple[float, float, float, float, float, float]] = []
            count = max(4, int(width / 0.18))
            for index in range(count):
                x = center_x - width / 2 + (index + 0.5) * width / count
                slats.append((x, -wall_z - 0.045, base + 1.72, 0.055, 0.045, 2.45))
            mesh_boxes(target, f"Walnut vertical slats · {room_id}", slats, MAT["brass"])
        else:
            panels: list[tuple[float, float, float, float, float, float]] = []
            panel_w = width / 5 - 0.08
            for index in range(5):
                x = center_x - width / 2 + panel_w / 2 + index * (panel_w + 0.08)
                panels.append((x, -wall_z - 0.035, base + 1.7 + (0.08 if index % 2 else 0), panel_w, 0.06, 2.2))
            mesh_boxes(target, f"Acoustic wall panels · {room_id}", panels, MAT["acoustic_teal" if room_id == "lounge" else "acoustic_blue"])


def add_stairs(target: bpy.types.Collection, game_map: dict) -> None:
    for stair in game_map["stairs"]:
        if stair["targetLevel"] <= stair["level"]:
            continue
        start = Vector((stair["x"], -stair["z"], stair["level"] * FLOOR_HEIGHT))
        end = Vector((stair["targetX"], -stair["targetZ"], stair["targetLevel"] * FLOOR_HEIGHT))
        direction = end - start
        horizontal = Vector((direction.x, direction.y, 0))
        length = horizontal.length
        horizontal.normalize()
        side = Vector((-horizontal.y, horizontal.x, 0))
        steps: list[tuple[float, float, float, float, float, float]] = []
        nosings: list[tuple[float, float, float, float, float, float]] = []
        count = 18
        run = length / count
        for index in range(count):
            progress = (index + 0.5) / count
            center = start + direction * progress
            top = (index + 1) / count * FLOOR_HEIGHT
            center.z = start.z + top / 2
            steps.append((center.x, center.y, center.z, 2.82 if abs(horizontal.y) > 0.5 else run, run if abs(horizontal.y) > 0.5 else 2.82, top))
            nose = start + direction * ((index + 1) / count)
            nosings.append((nose.x, nose.y, start.z + top + 0.012, 2.72 if abs(horizontal.y) > 0.5 else 0.025, 0.025 if abs(horizontal.y) > 0.5 else 2.72, 0.018))
        mesh_boxes(target, f"Integrated stair {stair['id']}", steps, MAT["terrazzo"])
        mesh_boxes(target, f"Stair LED nosing {stair['id']}", nosings, MAT["cyan"])

        for sign in (-1, 1):
            lower = start + side * (1.5 * sign)
            upper = end + side * (1.5 * sign)
            lower.z = start.z + 0.88
            upper.z = end.z + 0.88
            tube(target, f"Stair handrail {stair['id']}", [tuple(lower), tuple(upper)], 0.045, MAT["structure"])
            panel_center = (start + end) / 2 + side * (1.48 * sign)
            panel_rotation = math.atan2(horizontal.y, horizontal.x)
            panel_length = length
            box(target, f"Stair glass guard {stair['id']}", (panel_length, 0.045, 0.72), tuple(panel_center + Vector((0, 0, 0.62))), MAT["glass"], rotation=(0, 0, panel_rotation))

        min_x, max_x = min(stair["x"], stair["targetX"]) - 1.62, max(stair["x"], stair["targetX"]) + 1.62
        min_z, max_z = min(stair["z"], stair["targetZ"]) - 0.24, max(stair["z"], stair["targetZ"]) + 0.24
        top_height = stair["targetLevel"] * FLOOR_HEIGHT + 0.56
        if abs(stair["targetZ"] - stair["z"]) >= abs(stair["targetX"] - stair["x"]):
            for x in (min_x, max_x):
                box(target, f"Upper glass balustrade {stair['id']}", (0.055, max_z - min_z, 1.12), world_location(x, (min_z + max_z) / 2, top_height), MAT["glass"], bevel=0.02)
                tube(target, f"Upper rail {stair['id']}", [(x, -min_z, top_height + 0.58), (x, -max_z, top_height + 0.58)], 0.04, MAT["structure"])


def add_room_details(target: bpy.types.Collection, game_map: dict) -> None:
    by_id = {room["id"]: room for room in game_map["rooms"]}
    garage = by_id["garagem"]["rect"]
    base = 0.055
    cars = [prop for prop in game_map["props"] if prop["kind"] in ("car", "sportCar")]
    for car in cars:
        box(target, "Garage parking side", (0.055, 6.0, 0.018), world_location(car["x"] - 1.35, car["z"], base), MAT["white"])
        box(target, "Garage parking side", (0.055, 6.0, 0.018), world_location(car["x"] + 1.35, car["z"], base), MAT["white"])
        box(target, "Garage parking stop", (2.75, 0.055, 0.018), world_location(car["x"], garage["z"] + 1.2, base), MAT["white"])
    _, scale_z = layout_scales(game_map)
    for x in (5.5, 10.5, 15.5):
        mapped_x, mapped_z = layout_point(game_map, x, 10)
        box(target, "Server raised floor guide", (0.035, 10.5 * scale_z, 0.014), world_location(mapped_x, mapped_z, 0.06), MAT["cyan"])
    for x in (28, 34.2, 40.4, 46.6):
        mapped_x, mapped_z = layout_point(game_map, x, 10)
        box(target, "Operations cable guide", (0.035, 10.2 * scale_z, 0.014), world_location(mapped_x, mapped_z, FLOOR_HEIGHT + 0.06), MAT["cyan"])

    # Banheiro completo: duas cabines, portas elevadas, divisórias e acessórios.
    # As louças e a bancada são móveis Blender independentes; aqui fica a
    # arquitetura que pertence ao cômodo.
    for x in (56.75, 60.35, 64.0):
        mapped_x, mapped_z = layout_point(game_map, x, 42.55)
        box(target, "Bathroom privacy partition", (0.075, 3.25, 1.86), world_location(mapped_x, mapped_z, 0.99), MAT["structure"], bevel=0.035)
    for x in (58.55, 62.18):
        door_x, door_z = layout_point(game_map, x, 40.96)
        light_x, light_z = layout_point(game_map, x, 40.90)
        box(target, "Bathroom floating stall door", (1.18, 0.075, 1.54), world_location(door_x, door_z, 1.05), MAT["glass"], bevel=0.055)
        cylinder(target, "Bathroom occupancy light", 0.035, 0.03, world_location(light_x, light_z, 1.5), MAT["cyan"], vertices=18, bevel=0.006)
    for index, x in enumerate((66.5, 67.05, 67.6)):
        mapped_x, mapped_z = layout_point(game_map, x, 44.74)
        box(target, "Folded hand towel", (0.38, 0.055, 0.58), world_location(mapped_x, mapped_z, 1.55), MAT[("white", "acoustic_teal", "white")[index]], bevel=0.035)
    dryer_x, dryer_z = layout_point(game_map, 65.5, 44.67)
    box(target, "Touchless hand dryer", (0.5, 0.22, 0.62), world_location(dryer_x, dryer_z, 1.5), MAT["white"], bevel=0.12)

    emergency = game_map["emergency"]
    button_base = emergency.get("level", 0) * FLOOR_HEIGHT + emergency.get("y", 0)
    button_location = world_location(emergency["x"], emergency["z"], button_base)
    cylinder(target, "Emergency button graphite base", 0.33, 0.1, button_location, MAT["structure"], bevel=0.025)
    cylinder(
        target,
        "Emergency button brass guard",
        0.285,
        0.055,
        (button_location[0], button_location[1], button_location[2] + 0.075),
        MAT["brass"],
        bevel=0.018,
    )
    cylinder(
        target,
        "Emergency button illuminated cap",
        0.235,
        0.105,
        (button_location[0], button_location[1], button_location[2] + 0.145),
        MAT["button_red"],
        bevel=0.035,
    )

    for room_id, text in (("recepcao", "TIMBAS"), ("operacoes", "OPERAÇÕES"), ("servidores", "DATA CORE"), ("chefe", "DIRETORIA"), ("banheiro", "BANHEIRO")):
        room = by_id[room_id]
        base_y = room.get("level", 0) * FLOOR_HEIGHT
        rect = room["rect"]
        bpy.ops.object.text_add(location=world_location(rect["x"] + rect["w"] / 2, rect["z"] + 0.165, base_y + 2.0), rotation=(math.pi / 2, 0, 0))
        label = move_to(bpy.context.object, target)
        label.name = f"Architectural sign · {room_id}"
        label.data.body = text
        label.data.align_x = "CENTER"
        label.data.align_y = "CENTER"
        label.data.size = 0.38
        label.data.extrude = 0.018
        label.data.bevel_depth = 0.006
        label.data.materials.append(MAT["sign"])


def wall_art(
    target: bpy.types.Collection,
    name: str,
    x: float,
    z: float,
    base: float,
    *,
    vertical_wall: bool,
    inward_sign: int,
) -> None:
    width, height = 2.8, 1.45
    if vertical_wall:
        frame_size = (0.075, width + 0.18, height + 0.18)
        canvas_size = (0.045, width, height)
        front_x = x + 0.065 * inward_sign
        box(target, f"Artwork frame · {name}", frame_size, world_location(x, z, base + 2.05), MAT["structure"], bevel=0.035)
        box(target, f"Artwork canvas · {name}", canvas_size, world_location(front_x, z, base + 2.05), MAT["wall_soft"], bevel=0.025)
        for index, finish in enumerate((MAT["art_coral"], MAT["art_gold"], MAT["art_violet"], MAT["acoustic_teal"])):
            offset = -0.86 + index * 0.57
            height_piece = 0.76 + (index % 2) * 0.32
            box(target, f"Artwork composition · {name}", (0.035, 0.38, height_piece), world_location(front_x + 0.03 * inward_sign, z + offset, base + 2.02 + (index % 2) * 0.08), finish, bevel=0.08, rotation=(0, math.radians(8 - index * 5), 0))
    else:
        frame_size = (width + 0.18, 0.075, height + 0.18)
        canvas_size = (width, 0.045, height)
        front_z = z + 0.065 * inward_sign
        box(target, f"Artwork frame · {name}", frame_size, world_location(x, z, base + 2.05), MAT["structure"], bevel=0.035)
        box(target, f"Artwork canvas · {name}", canvas_size, world_location(x, front_z, base + 2.05), MAT["wall_soft"], bevel=0.025)
        for index, finish in enumerate((MAT["art_coral"], MAT["art_gold"], MAT["art_violet"], MAT["acoustic_teal"])):
            offset = -0.86 + index * 0.57
            height_piece = 0.76 + (index % 2) * 0.32
            box(target, f"Artwork composition · {name}", (0.38, 0.035, height_piece), world_location(x + offset, front_z + 0.03 * inward_sign, base + 2.02 + (index % 2) * 0.08), finish, bevel=0.08, rotation=(0, 0, math.radians(8 - index * 5)))


def add_modern_decor(target: bpy.types.Collection, game_map: dict) -> None:
    def mapped_art(name: str, x: float, z: float, base: float, *, vertical_wall: bool, inward_sign: int) -> None:
        mapped_x, mapped_z = layout_point(game_map, x, z)
        wall_art(target, name, mapped_x, mapped_z, base, vertical_wall=vertical_wall, inward_sign=inward_sign)

    mapped_art("Reception gallery", 3.23, 26, 0, vertical_wall=True, inward_sign=1)
    mapped_art("Meeting room gallery", 70.77, 10.5, 0, vertical_wall=True, inward_sign=-1)
    mapped_art("Lounge gallery", 3.23, 27.5, FLOOR_HEIGHT, vertical_wall=True, inward_sign=1)
    mapped_art("Executive gallery", 70.77, 11.5, FLOOR_HEIGHT, vertical_wall=True, inward_sign=-1)
    mapped_art("Council gallery", 18.77, 45, FLOOR_HEIGHT, vertical_wall=True, inward_sign=-1)
    mapped_art("Atrium gallery west", 31.5, 17.23, 0, vertical_wall=False, inward_sign=1)
    mapped_art("Atrium gallery east", 42.5, 17.23, 0, vertical_wall=False, inward_sign=1)
    mapped_art("Mezzanine gallery west", 31.5, 17.23, FLOOR_HEIGHT, vertical_wall=False, inward_sign=1)
    mapped_art("Mezzanine gallery east", 42.5, 17.23, FLOOR_HEIGHT, vertical_wall=False, inward_sign=1)

    for room_name, x, z, level in (
        ("Data core telemetry", 13, 16.77, 0),
        ("Operations command wall", 37, 16.77, 1),
    ):
        x, z = layout_point(game_map, x, z)
        base = level * FLOOR_HEIGHT
        box(target, room_name, (7.6, 0.07, 1.65), world_location(x, z, base + 2.05), MAT["structure"], bevel=0.06)
        for index in range(4):
            screen_x = x - 2.85 + index * 1.9
            box(target, f"Dashboard screen · {room_name}", (1.72, 0.035, 1.35), world_location(screen_x, z - 0.055, base + 2.05), MAT["screen"], bevel=0.045)
            for row in range(3):
                box(target, f"Dashboard data line · {room_name}", (1.25 - row * 0.16, 0.018, 0.025), world_location(screen_x, z - 0.082, base + 1.78 + row * 0.18), MAT["cyan"], bevel=0.01)

    for level in (0, 1):
        base = level * FLOOR_HEIGHT
        for z in (20.5, 37.5):
            west_x, mapped_z = layout_point(game_map, 28.0, z)
            east_x, _ = layout_point(game_map, 46.0, z)
            box(target, "Atrium vertical LED", (0.055, 0.055, 2.2), world_location(west_x, mapped_z, base + 1.75), MAT["cyan"], bevel=0.02)
            box(target, "Atrium vertical LED", (0.055, 0.055, 2.2), world_location(east_x, mapped_z, base + 1.75), MAT["amber"], bevel=0.02)

    _, scale_z = layout_scales(game_map)
    for x in (5.5, 9.5, 13.5, 17.5, 21.0):
        mapped_x, mapped_z = layout_point(game_map, x, 10)
        box(target, "Data core overhead cable tray", (0.12, 10.4 * scale_z, 0.1), world_location(mapped_x, mapped_z, 3.26), MAT["structure"], bevel=0.025)
        box(target, "Data core ceiling status LED", (0.025, 9.8 * scale_z, 0.025), world_location(mapped_x, mapped_z, 3.19), MAT["cyan"], bevel=0.01)

    # Terraço de trabalho: pergolado, jardineiras e luz integrada, para o lado
    # de fora parecer continuação do escritório em vez de uma laje vazia.
    terrace_base = FLOOR_HEIGHT
    scale_x, _ = layout_scales(game_map)
    for x in (57.25, 68.75):
        for z in (32.0, 42.0):
            mapped_x, mapped_z = layout_point(game_map, x, z)
            box(target, "Terrace pergola column", (0.18, 0.18, 2.72), world_location(mapped_x, mapped_z, terrace_base + 1.36), MAT["structure"], bevel=0.035)
    for z in (32.0, 42.0):
        mapped_x, mapped_z = layout_point(game_map, 63, z)
        box(target, "Terrace pergola beam", (11.7 * scale_x, 0.18, 0.2), world_location(mapped_x, mapped_z, terrace_base + 2.72), MAT["structure"], bevel=0.04)
    for index in range(10):
        z = 32.25 + index * 1.05
        mapped_x, mapped_z = layout_point(game_map, 63, z)
        box(target, "Terrace solar louver", (11.35 * scale_x, 0.11, 0.11), world_location(mapped_x, mapped_z, terrace_base + 2.83), MAT["walnut"], bevel=0.025)
        if index in (1, 4, 7):
            box(target, "Terrace integrated LED", (10.8 * scale_x, 0.028, 0.028), world_location(mapped_x, mapped_z, terrace_base + 2.75), MAT["amber"], bevel=0.01)
    for x, z, sx, sz in ((57.2, 20.5, 1.1, 4.2), (68.8, 29.5, 1.1, 5.2), (57.2, 51.5, 1.1, 4.2)):
        mapped_x, mapped_z = layout_point(game_map, x, z)
        box(target, "Terrace mineral planter", (sx, sz, 0.48), world_location(mapped_x, mapped_z, terrace_base + 0.24), MAT["terrazzo"], bevel=0.12)
        box(target, "Terrace planter shadow gap", (sx + 0.04, sz + 0.04, 0.055), world_location(mapped_x, mapped_z, terrace_base + 0.05), MAT["structure"], bevel=0.025)

    # Um skyline geométrico muito leve fecha a vista externa sem fotografia ou
    # textura grande. Tudo se une por material na exportação.
    legacy_towers = (
        (80.0, 13.0, 6.5, 9.0, 12.0),
        (87.5, 27.0, 7.0, 8.0, 17.0),
        (79.0, 43.0, 5.5, 7.5, 11.0),
        (91.0, 53.0, 8.5, 9.0, 20.0),
    )
    towers = tuple(
        (*layout_point(game_map, x, z), width, depth, height)
        for x, z, width, depth, height in legacy_towers
    )
    tower_boxes = [(x, -z, height / 2, width, depth, height) for x, z, width, depth, height in towers]
    mesh_boxes(target, "Exterior skyline masses", tower_boxes, MAT["structure"])
    windows: list[tuple[float, float, float, float, float, float]] = []
    for tower_index, (x, z, width, _depth, height) in enumerate(towers):
        for floor in range(2, int(height), 2):
            for column in (-0.28, 0, 0.28):
                windows.append((x - width / 2 - 0.025, -z + column * width, floor, 0.035, 0.42, 0.22))
    mesh_boxes(target, "Exterior skyline windows", windows, MAT["cyan"])


def add_vent_grilles(target: bpy.types.Collection, game_map: dict) -> None:
    for vent in game_map["vents"]:
        base = vent.get("level", 0) * FLOOR_HEIGHT
        box(target, f"Vent frame · {vent['id']}", (1.35, 1.35, 0.055), world_location(vent["x"], vent["z"], base + 0.045), MAT["structure"], bevel=0.08)
        for offset in (-0.4, -0.2, 0, 0.2, 0.4):
            box(target, f"Vent grille · {vent['id']}", (0.055, 1.05, 0.025), world_location(vent["x"] + offset, vent["z"], base + 0.082), MAT["metal_light"] if "metal_light" in MAT else MAT["white"], bevel=0.012)


def normalize_imported_materials(objects: list[bpy.types.Object]) -> None:
    canonical: dict[str, bpy.types.Material] = {}
    for material in bpy.data.materials:
        base = material.name.rsplit(".", 1)[0] if material.name.rsplit(".", 1)[-1].isdigit() else material.name
        canonical.setdefault(base, material)
    for obj in objects:
        if obj.type != "MESH":
            continue
        for slot in obj.material_slots:
            if slot.material is None:
                continue
            name = slot.material.name
            base = name.rsplit(".", 1)[0] if name.rsplit(".", 1)[-1].isdigit() else name
            slot.material = canonical[base]


def add_furniture(target: bpy.types.Collection, game_map: dict) -> None:
    by_kind: dict[str, list[dict]] = {}
    for prop in game_map["props"]:
        if prop["kind"] in PROP_MODELS:
            by_kind.setdefault(prop["kind"], []).append(prop)
    by_kind["ceilingLight"] = ceiling_fixture_placements(game_map)

    for kind, placements in by_kind.items():
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(PROP_ROOT / PROP_MODELS[kind]))
        imported = [obj for obj in bpy.data.objects if obj not in before]
        normalize_imported_materials(imported)
        sources = [(obj, obj.matrix_world.copy()) for obj in imported if obj.type == "MESH"]
        for placement in placements:
            level = placement.get("level", 0)
            transform = Matrix.Translation((placement["x"], -placement["z"], level * FLOOR_HEIGHT + placement.get("y", 0))) @ Matrix.Rotation(placement.get("rot", 0), 4, "Z")
            for source, source_matrix in sources:
                duplicate = source.copy()
                duplicate.data = source.data
                duplicate.name = f"{kind} · {source.name}"
                duplicate.matrix_world = transform @ source_matrix
                duplicate["timbas_static_instance"] = True
                target.objects.link(duplicate)
        for obj in imported:
            bpy.data.objects.remove(obj, do_unlink=True)


def optimize_and_export(source: bpy.types.Collection) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in list(source.objects):
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        if obj.get("timbas_static_instance"):
            continue
        if obj.type in ("CURVE", "FONT"):
            bpy.ops.object.convert(target="MESH")
        if obj.type == "MESH":
            for modifier in list(obj.modifiers):
                bpy.context.view_layer.objects.active = obj
                bpy.ops.object.modifier_apply(modifier=modifier.name)

    groups: dict[str, list[bpy.types.Object]] = {}
    for obj in list(source.objects):
        if obj.type == "MESH" and obj.data.materials:
            groups.setdefault(obj.data.materials[0].name, []).append(obj)
    for material_name, objects in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        objects[0].name = material_name
        objects[0].data.name = material_name

    bpy.ops.object.select_all(action="DESELECT")
    for obj in source.objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_attributes=False,
        export_skins=False,
        export_morph=False,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_yup=True,
    )


def add_preview(scene: bpy.types.Scene, game_map: dict) -> None:
    for obj in scene.objects:
        if obj.get("timbas_static_instance"):
            obj.visible_shadow = False
    bpy.ops.object.light_add(type="SUN", location=layout_world_point(game_map, (20, -20, 18)))
    sun = bpy.context.object
    sun.data.energy = 1.7
    sun.data.angle = math.radians(18)
    sun.rotation_euler = (math.radians(24), math.radians(-22), math.radians(-28))
    bpy.ops.object.light_add(type="AREA", location=layout_world_point(game_map, (37, -25, 18)))
    area = bpy.context.object
    area.data.energy = 2600
    area.data.shape = "DISK"
    area.data.size = 18
    for x, y, color in ((32, -29, (0.55, 0.72, 1.0)), (42, -29, (1.0, 0.7, 0.42)), (37, -21, (0.6, 0.9, 1.0))):
        bpy.ops.object.light_add(type="POINT", location=layout_world_point(game_map, (x, y, 3.15)))
        point = bpy.context.object
        point.data.energy = 620
        point.data.color = color
        point.data.shadow_soft_size = 2.4
        point.data.use_shadow = False
    bpy.ops.object.camera_add(location=layout_world_point(game_map, (37, -35.5, 1.72)))
    camera = bpy.context.object
    camera_target = layout_world_point(game_map, (37, -20.5, 1.58))
    camera.rotation_euler = (Vector(camera_target) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 31
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW_PATH)
    scene.world.color = (0.018, 0.024, 0.038)


def render_review_views(scene: bpy.types.Scene, game_map: dict) -> None:
    views = (
        (SERVER_PREVIEW_PATH, (13, -5.2, 1.72), (13, -15.2, 1.3), (13, -10.5, 3.0)),
        (PANTRY_PREVIEW_PATH, (57.2, -32.0, 1.7), (69.2, -21.0, 1.2), (65.0, -24.5, 3.0)),
        (LOUNGE_PREVIEW_PATH, (5.0, -32.5, FLOOR_HEIGHT + 1.72), (15.8, -21.0, FLOOR_HEIGHT + 1.15), (12.0, -26.0, FLOOR_HEIGHT + 3.0)),
        (STAIR_PREVIEW_PATH, (22.8, -32.5, 1.72), (22.8, -23.5, 2.5), (23.0, -27.0, 4.9)),
        (MEETING_PREVIEW_PATH, (61.0, -15.4, 1.72), (61.0, -9.5, 0.9), (61.0, -11.0, 3.0)),
        (BATHROOM_PREVIEW_PATH, (56.0, -36.2, 1.68), (64.0, -42.0, 1.1), (64.0, -39.0, 3.0)),
    )
    bpy.ops.object.light_add(type="POINT", location=(0, 0, 3))
    review_light = bpy.context.object
    review_light.name = "Review camera fill"
    review_light.data.energy = 760
    review_light.data.shadow_soft_size = 2.1
    review_light.data.color = (0.72, 0.84, 1.0)
    review_light.data.use_shadow = False
    for path, location, target, light_location in views:
        scene.camera.location = layout_world_point(game_map, location)
        mapped_target = layout_world_point(game_map, target)
        scene.camera.rotation_euler = (Vector(mapped_target) - scene.camera.location).to_track_quat("-Z", "Y").to_euler()
        review_light.location = layout_world_point(game_map, light_location)
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)


def main() -> None:
    clear_scene()
    create_materials()
    game_map = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    building = collection("Timbas Office Building · two floors")
    add_room_floors(building, game_map)
    add_walls(building, game_map)
    add_doors(building, game_map)
    add_ceilings(building, game_map)
    add_feature_walls(building, game_map)
    add_stairs(building, game_map)
    add_room_details(building, game_map)
    add_modern_decor(building, game_map)
    add_vent_grilles(building, game_map)
    add_furniture(building, game_map)
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    optimize_and_export(building)
    add_preview(bpy.context.scene, game_map)
    bpy.ops.render.render(write_still=True)
    render_review_views(bpy.context.scene, game_map)
    print(f"BLEND: {BLEND_PATH}")
    print(f"GLB: {GLB_PATH}")
    print(f"PREVIEW: {PREVIEW_PATH}")


if __name__ == "__main__":
    main()
