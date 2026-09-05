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
PORTAL_PREVIEW_PATH = PREVIEW_PATH.with_name("timbas-office-portal-preview.png")
TERRACE_PREVIEW_PATH = PREVIEW_PATH.with_name("timbas-office-terrace-preview.png")
WINDOW_PREVIEW_PATH = PREVIEW_PATH.with_name("timbas-office-window-preview.png")
SUPPORT_PREVIEW_PATH = PREVIEW_PATH.with_name("timbas-office-support-preview.png")
MEZZANINE_PREVIEW_PATH = PREVIEW_PATH.with_name("timbas-office-mezzanine-preview.png")
LOUNGE_MEDIA_PREVIEW_PATH = PREVIEW_PATH.with_name("timbas-office-lounge-media-preview.png")

PROP_MODELS = {
    "desk": "desk-blender.glb",
    "chair": "office-chair-blender.glb",
    "monitor": "computer-blender.glb",
    "plant": "plant-blender.glb",
    "sofa": "timbas-blue-sofa.glb",
    "counter": "reception-counter.glb",
    "meetingTable": "meeting-table-blender.glb",
    "cafeTable": "cafe-table.glb",
    "diningTable": "dining-table.glb",
    "diningChair": "dining-chair.glb",
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
STAIR_WIDTH = 2.42
STAIR_LANDING_SIZE = 2.42
STAIR_RAIL_OFFSET = STAIR_WIDTH / 2 - 0.08
STAIR_OPENING_HALF_WIDTH = STAIR_WIDTH / 2 + 0.14
STAIR_OPENING_END_PADDING = 0.12
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


def wall_mounted_point(game_map: dict, x: float, z: float, level: int, *, vertical_wall: bool, inward_sign: int, surface_offset: float = -0.007) -> tuple[float, float]:
    mapped_x, mapped_z = layout_point(game_map, x, z)
    across, along = (mapped_x, mapped_z) if vertical_wall else (mapped_z, mapped_x)
    candidates = []
    for wall in game_map["walls"]:
        if wall.get("level", 0) != level or wall.get("style") == "guarda-corpo":
            continue
        horizontal = wall["maxX"] - wall["minX"] > wall["maxZ"] - wall["minZ"]
        if horizontal == vertical_wall:
            continue
        low, high = (wall["minX"], wall["maxX"]) if vertical_wall else (wall["minZ"], wall["maxZ"])
        start, end = (wall["minZ"], wall["maxZ"]) if vertical_wall else (wall["minX"], wall["maxX"])
        center = (low + high) / 2
        if start <= along <= end and abs(center - across) <= 0.5:
            candidates.append((abs(center - across), center, (high - low) / 2))
    if not candidates:
        raise ValueError(f"No supporting wall for mounted decoration at {(x, z, level)}")
    _, center, half_depth = min(candidates)
    # A planta muda de escala, mas o encaixe do objeto na face da parede não.
    mounted = center + inward_sign * (half_depth + surface_offset)
    return (mounted, mapped_z) if vertical_wall else (mapped_x, mounted)


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
        wall=make_material("Wall · warm architectural plaster", (0.68, 0.67, 0.63, 1), roughness=0.76),
        wall_soft=make_material("Wall · soft warm white", (0.82, 0.82, 0.79, 1), roughness=0.72),
        ceiling=make_material("Ceiling · warm mineral plaster", (0.62, 0.61, 0.57, 1), roughness=0.88),
        gypsum=make_material("Ceiling · sculpted warm gypsum", (0.78, 0.74, 0.66, 1), roughness=0.84),
        plaster_sage=make_material("Wall · sage mineral paint", (0.24, 0.36, 0.30, 1), roughness=0.86),
        plaster_clay=make_material("Wall · muted terracotta paint", (0.44, 0.24, 0.17, 1), roughness=0.86),
        plaster_ink=make_material("Wall · ink blue wainscot", (0.085, 0.13, 0.20, 1), roughness=0.8),
        fabric_sage=make_material("Seating · deep sage fabric", (0.12, 0.23, 0.17, 1), roughness=0.94),
        fabric_clay=make_material("Seating · warm clay fabric", (0.26, 0.09, 0.06, 1), roughness=0.94),
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
        tv_screen=make_material("Technology · television standby display", (0.006, 0.012, 0.02, 1), roughness=0.22, emission=(0.015, 0.04, 0.065, 1), emission_strength=0.22),
        art_coral=make_material("Art · coral", (0.86, 0.11, 0.08, 1), roughness=0.5),
        art_gold=make_material("Art · ochre", (0.88, 0.48, 0.04, 1), roughness=0.5),
        art_violet=make_material("Art · violet", (0.34, 0.08, 0.55, 1), roughness=0.5),
        window_clear=make_material("Glass · clear fixed exterior windows", (0.24, 0.38, 0.43, 1), metallic=0.06, roughness=0.18, coat=0.25, alpha=0.075),
        landscape=make_material("Exterior · muted park planting", (0.045, 0.095, 0.073, 1), roughness=0.98),
        distant_facade=make_material("Exterior · distant residential plaster", (0.24, 0.26, 0.28, 1), roughness=0.88),
        distant_window=make_material("Exterior · warm residential windows", (0.31, 0.22, 0.11, 1), roughness=0.7, emission=(0.45, 0.25, 0.10, 1), emission_strength=0.3),
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


def stair_points(stair: dict) -> list[tuple[float, float]]:
    points = [(stair["x"], stair["z"])]
    if stair.get("turnX") is not None and stair.get("turnZ") is not None:
        points.append((stair["turnX"], stair["turnZ"]))
    points.append((stair["targetX"], stair["targetZ"]))
    return points


def stair_holes(game_map: dict) -> list[dict]:
    result = []
    for stair in game_map["stairs"]:
        if stair["targetLevel"] <= stair["level"]:
            continue
        points = stair_points(stair)
        for turn in points[1:-1]:
            result.append({
                "x": turn[0] - STAIR_OPENING_HALF_WIDTH,
                "z": turn[1] - STAIR_OPENING_HALF_WIDTH,
                "w": STAIR_OPENING_HALF_WIDTH * 2,
                "d": STAIR_OPENING_HALF_WIDTH * 2,
            })
        for start, end in zip(points, points[1:]):
            dx = end[0] - start[0]
            dz = end[1] - start[1]
            if abs(dz) >= abs(dx):
                result.append({
                    "x": start[0] - STAIR_OPENING_HALF_WIDTH,
                    "z": min(start[1], end[1]) - STAIR_OPENING_END_PADDING,
                    "w": STAIR_OPENING_HALF_WIDTH * 2,
                    "d": abs(dz) + STAIR_OPENING_END_PADDING * 2,
                })
            else:
                result.append({
                    "x": min(start[0], end[0]) - STAIR_OPENING_END_PADDING,
                    "z": start[1] - STAIR_OPENING_HALF_WIDTH,
                    "w": abs(dx) + STAIR_OPENING_END_PADDING * 2,
                    "d": STAIR_OPENING_HALF_WIDTH * 2,
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
                "y": WALL_HEIGHT - 0.0625,
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
        inset_w, inset_d = piece["w"] - 3.0, piece["d"] - 3.0
        if inset_w >= 0.5 and inset_d >= 0.5:
            box(target, f"Carpet inset · {room['id']}", (inset_w, inset_d, 0.018), world_location(x, z, top + 0.028), MAT["carpet_accent"], bevel=0.12)

    if finish == "vinyl" and room["kind"] == "corredor":
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


def exterior_window_openings(game_map: dict, wall: dict) -> list[tuple[float, float, float, float]]:
    if wall.get("style") == "guarda-corpo":
        return []
    horizontal = wall["maxX"] - wall["minX"] > wall["maxZ"] - wall["minZ"]
    start = wall["minX"] if horizontal else wall["minZ"]
    end = wall["maxX"] if horizontal else wall["maxZ"]
    across = (wall["minZ"] + wall["maxZ"]) / 2 if horizontal else (wall["minX"] + wall["maxX"]) / 2
    level = wall.get("level", 0)
    rooms = [room for room in game_map["rooms"] if room.get("level", 0) == level and room["kind"] != "terraco"]
    boundaries = {start, end}
    for room in rooms:
        rect = room["rect"]
        near_wall = rect["z"] - 0.45 <= across <= rect["z"] + rect["d"] + 0.45 if horizontal else rect["x"] - 0.45 <= across <= rect["x"] + rect["w"] + 0.45
        if not near_wall:
            continue
        for value in (rect["x"], rect["x"] + rect["w"]) if horizontal else (rect["z"], rect["z"] + rect["d"]):
            if start < value < end:
                boundaries.add(value)

    galleries = (
        (0, 3.23, 26), (0, 70.77, 10.5), (1, 3.23, 27.5),
        (1, 70.77, 11.5), (1, 18.77, 45), (0, 47.23, 46.0),
    )
    stair_clearances = []
    for stair in game_map["stairs"]:
        if not stair["level"] <= level <= stair["targetLevel"]:
            continue
        for hole in stair_holes({"stairs": [stair]}):
            if horizontal:
                near_stair = wall["minZ"] <= hole["z"] + hole["d"] + 0.2 and wall["maxZ"] >= hole["z"] - 0.2
                clearance = (hole["x"] - 0.2, hole["x"] + hole["w"] + 0.2)
            else:
                near_stair = wall["minX"] <= hole["x"] + hole["w"] + 0.2 and wall["maxX"] >= hole["x"] - 0.2
                clearance = (hole["z"] - 0.2, hole["z"] + hole["d"] + 0.2)
            if near_stair:
                stair_clearances.append(clearance)
    result = []
    limits = sorted(boundaries)
    for left, right in zip(limits, limits[1:]):
        midpoint = (left + right) / 2
        neighbors = []
        for sign in (-1, 1):
            x, z = (midpoint, across + sign * 0.45) if horizontal else (across + sign * 0.45, midpoint)
            neighbors.append(next((room for room in rooms if room["rect"]["x"] < x < room["rect"]["x"] + room["rect"]["w"] and room["rect"]["z"] < z < room["rect"]["z"] + room["rect"]["d"]), None))
        if (neighbors[0] is None) == (neighbors[1] is None):
            continue
        room = neighbors[0] or neighbors[1]
        rect = room["rect"]
        blocked = list(stair_clearances)
        if horizontal and abs(across - rect["z"]) < 0.3 and room["id"] in ("recepcao", "reuniao", "chefe", "conselho", "servidores", "openspace", "operacoes", "lounge"):
            feature_half = min(rect["w"] - 3.0, 11.0) / 2 + 0.25
            center = rect["x"] + rect["w"] / 2
            blocked.append((center - feature_half, center + feature_half))
        if not horizontal:
            for art_level, legacy_x, legacy_z in galleries:
                art_x, art_z = layout_point(game_map, legacy_x, legacy_z)
                if art_level == level and abs(art_x - across) < 0.35:
                    blocked.append((art_z - 1.72, art_z + 1.72))
        for prop in game_map["props"]:
            if prop.get("level", 0) != level or prop["kind"] not in ("whiteboard", "shelf", "locker", "kitchen", "vending", "coffee"):
                continue
            prop_across, prop_along = (prop["z"], prop["x"]) if horizontal else (prop["x"], prop["z"])
            if abs(prop_across - across) < 1.25:
                clearance = 2.0 if prop["kind"] in ("whiteboard", "kitchen") else 1.1
                blocked.append((prop_along - clearance, prop_along + clearance))
        spans = [(left + 0.85, right - 0.85)]
        for blocked_left, blocked_right in blocked:
            spans = [part for span_left, span_right in spans for part in ((span_left, min(span_right, blocked_left)), (max(span_left, blocked_right), span_right)) if part[1] - part[0] >= 1.5]
        sill = 2.50 if room["id"] == "banheiro" else 2.22 if room["id"] in ("servidores", "arquivo", "deposito") else 1.15
        for span_left, span_right in spans:
            available = span_right - span_left
            if available < 1.5:
                continue
            count = max(1, math.ceil(available / 6.2))
            pitch = available / count
            width = min(4.4, pitch - (0.65 if count > 1 else 0))
            for index in range(count):
                center = span_left + pitch * (index + 0.5)
                result.append((center - width / 2, center + width / 2, sill, 3.2))
    return result


def add_walls(target: bpy.types.Collection, game_map: dict) -> None:
    bases: list[tuple[float, float, float, float, float, float]] = []
    trims: list[tuple[float, float, float, float, float, float]] = []
    caps: list[tuple[float, float, float, float, float, float]] = []
    frames: list[tuple[float, float, float, float, float, float]] = []
    sills: list[tuple[float, float, float, float, float, float]] = []
    glass_vertices: list[tuple[float, float, float]] = []
    glass_faces: list[tuple[int, int, int, int]] = []
    for wall in game_map["walls"]:
        level = wall.get("level", 0)
        base = level * FLOOR_HEIGHT
        width = wall["maxX"] - wall["minX"]
        depth = wall["maxZ"] - wall["minZ"]
        x = (wall["minX"] + wall["maxX"]) / 2
        z = (wall["minZ"] + wall["maxZ"]) / 2
        height = 1.05 if wall.get("style") == "guarda-corpo" else WALL_HEIGHT
        openings = exterior_window_openings(game_map, wall)
        horizontal = width > depth
        along_start = wall["minX"] if horizontal else wall["minZ"]
        along_end = wall["maxX"] if horizontal else wall["maxZ"]

        def wall_piece(left: float, right: float, bottom: float, top: float) -> tuple[float, float, float, float, float, float]:
            center = (left + right) / 2
            return (center if horizontal else x, -z if horizontal else -center, base + (bottom + top) / 2, right - left if horizontal else width, depth if horizontal else right - left, top - bottom)

        def window_frame_piece(left: float, right: float, bottom: float, top: float) -> tuple[float, float, float, float, float, float]:
            piece = list(wall_piece(left, right, bottom, top))
            piece[4 if horizontal else 3] += 0.04
            return tuple(piece)

        cursor = along_start
        for left, right, sill, head in openings:
            if left > cursor:
                bases.append(wall_piece(cursor, left, 0, height))
            bases.append(wall_piece(left, right, 0, sill))
            bases.append(wall_piece(left, right, head, height))
            for edge in (left, right):
                frames.append(window_frame_piece(edge - 0.035, edge + 0.035, sill, head))
            for edge in (sill, head):
                frames.append(window_frame_piece(left, right, edge - 0.035, edge + 0.035))
            frames.append(window_frame_piece((left + right) / 2 - 0.022, (left + right) / 2 + 0.022, sill, head))
            sill_piece = list(wall_piece(left - 0.08, right + 0.08, sill - 0.045, sill + 0.025))
            sill_piece[4 if horizontal else 3] += 0.18
            sills.append(tuple(sill_piece))
            offset = len(glass_vertices)
            glass_vertices.extend([world_location(a if horizontal else x, z if horizontal else a, base + h) for a, h in ((left, sill), (right, sill), (right, head), (left, head))])
            glass_faces.append((offset, offset + 1, offset + 2, offset + 3))
            cursor = right
        if cursor < along_end:
            bases.append(wall_piece(cursor, along_end, 0, height))
        trims.append((x, -z, base + 0.12, width + 0.04, depth + 0.04, 0.24))
        caps.append((x, -z, base + height - 0.065, width + 0.06, depth + 0.06, 0.13))
    mesh_boxes(target, "Continuous architectural walls", bases, MAT["wall"])
    mesh_boxes(target, "Continuous graphite baseboards", trims, MAT["structure"])
    mesh_boxes(target, "Continuous wall shadow gap", caps, MAT["structure"])
    mesh_boxes(target, "Exterior window frames and mullions", frames, MAT["structure"])
    mesh_boxes(target, "Exterior window mineral sills", sills, MAT["terrazzo"])
    if glass_faces:
        mesh = bpy.data.meshes.new("Clear fixed exterior glazing")
        mesh.from_pydata(glass_vertices, [], glass_faces)
        mesh.update()
        glazing = bpy.data.objects.new("Clear fixed exterior glazing", mesh)
        MAT["window_clear"].use_backface_culling = False
        mesh.materials.append(MAT["window_clear"])
        target.objects.link(glazing)


def validate_exterior_windows(game_map: dict) -> None:
    bpy.context.view_layer.update()
    graph = bpy.context.evaluated_depsgraph_get()
    count = 0
    for wall in game_map["walls"]:
        horizontal = wall["maxX"] - wall["minX"] > wall["maxZ"] - wall["minZ"]
        across = (wall["minZ"] + wall["maxZ"]) / 2 if horizontal else (wall["minX"] + wall["maxX"]) / 2
        base = wall.get("level", 0) * FLOOR_HEIGHT
        for left, right, sill, head in exterior_window_openings(game_map, wall):
            if sill < 1.1 or head >= WALL_HEIGHT - 0.2:
                raise ValueError("Exterior window must preserve the sill and ceiling structure")
            for fraction in (0.25, 0.75):
                along = left + (right - left) * fraction
                for height in (sill + 0.18, head - 0.18):
                    for sign in (-1, 1):
                        x, z = (along, across + sign * 0.5) if horizontal else (across + sign * 0.5, along)
                        direction = Vector((0, sign, 0) if horizontal else (-sign, 0, 0))
                        origin = Vector(world_location(x, z, base + height))
                        hit = bpy.context.scene.ray_cast(graph, origin, direction, distance=0.8)
                        if not hit[0] or hit[4].name != "Clear fixed exterior glazing":
                            name = hit[4].name if hit[0] else "no glazing"
                            raise ValueError(f"Exterior window {count} is obstructed: {name}")
            count += 1
    print(f"Validated {count} real exterior window openings with clear glazing")


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
        frame = 0.085
        frame_depth = 0.42
        upper_height = WALL_HEIGHT - DOOR_HEIGHT
        if entry["horizontal"]:
            box(target, f"Wall above portal {index}", (width, 0.4, upper_height), world_location(cx, cz, base + DOOR_HEIGHT + upper_height / 2), MAT["wall"])
            box(target, f"Continuous portal ceiling trim {index}", (width + 0.06, 0.46, 0.13), world_location(cx, cz, base + WALL_HEIGHT - 0.065), MAT["structure"])
            for x in (cx - width / 2 + frame / 2, cx + width / 2 - frame / 2):
                box(target, f"Portal post {index}", (frame, frame_depth, DOOR_HEIGHT), world_location(x, cz, base + DOOR_HEIGHT / 2), MAT["structure"], bevel=0.014)
            box(target, f"Portal header {index}", (width, frame_depth, frame), world_location(cx, cz, base + DOOR_HEIGHT - frame / 2), MAT["structure"], bevel=0.014)
        else:
            box(target, f"Wall above portal {index}", (0.4, width, upper_height), world_location(cx, cz, base + DOOR_HEIGHT + upper_height / 2), MAT["wall"])
            box(target, f"Continuous portal ceiling trim {index}", (0.46, width + 0.06, 0.13), world_location(cx, cz, base + WALL_HEIGHT - 0.065), MAT["structure"])
            for z in (cz - width / 2 + frame / 2, cz + width / 2 - frame / 2):
                box(target, f"Portal post {index}", (frame_depth, frame, DOOR_HEIGHT), world_location(cx, z, base + DOOR_HEIGHT / 2), MAT["structure"], bevel=0.014)
            box(target, f"Portal header {index}", (frame_depth, width, frame), world_location(cx, cz, base + DOOR_HEIGHT - frame / 2), MAT["structure"], bevel=0.014)


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

        if room["id"] in ("servidores", "operacoes"):
            continue
        rect = room["rect"]
        cuts = [{"x": hole["x"] - 0.12, "z": hole["z"] - 0.12, "w": hole["w"] + 0.24, "d": hole["d"] + 0.24} for hole in holes] if level == 0 else []
        for fixture in ceiling_fixture_placements(game_map):
            if fixture["level"] == level:
                cuts.append({"x": fixture["x"] - 0.4, "z": fixture["z"] - 1.05, "w": 0.8, "d": 2.1})
        for inset, width, drop in ((0.48, 0.42, 0.18), (0.90, 0.10, 0.095)):
            left, front = rect["x"] + inset, rect["z"] + inset
            frame_w, frame_d = rect["w"] - inset * 2, rect["d"] - inset * 2
            bands = (
                {"x": left, "z": front, "w": frame_w, "d": width},
                {"x": left, "z": front + frame_d - width, "w": frame_w, "d": width},
                {"x": left, "z": front + width, "w": width, "d": frame_d - width * 2},
                {"x": left + frame_w - width, "z": front + width, "w": width, "d": frame_d - width * 2},
            )
            for band in bands:
                for piece in split_around_holes(band, cuts):
                    box(target, f"Gypsum stepped cornice · {room['id']}",
                        (piece["w"], piece["d"], drop + 0.02),
                        world_location(piece["x"] + piece["w"] / 2, piece["z"] + piece["d"] / 2, level * FLOOR_HEIGHT + WALL_HEIGHT - drop / 2 + 0.01),
                        MAT["gypsum"], bevel=0.018)


def add_wall_finishes(target: bpy.types.Collection, game_map: dict) -> None:
    for room in game_map["rooms"]:
        if room["kind"] == "terraco":
            continue
        rect = room["rect"]
        level = room.get("level", 0)
        base = level * FLOOR_HEIGHT
        finish = "plaster_sage" if room["id"] in ("lounge", "copa", "hall-superior", "apoio") else "plaster_clay" if room["id"] in ("recepcao", "hall-central", "reuniao", "chefe", "conselho") else "plaster_ink"
        sides = ((True, rect["z"], 1), (True, rect["z"] + rect["d"], -1), (False, rect["x"], 1), (False, rect["x"] + rect["w"], -1))
        for horizontal, across, inward in sides:
            start = (rect["x"] if horizontal else rect["z"]) + 0.22
            end = (rect["x"] + rect["w"] if horizontal else rect["z"] + rect["d"]) - 0.22
            for wall in game_map["walls"]:
                if wall.get("level", 0) != level or wall.get("style") == "guarda-corpo":
                    continue
                wall_horizontal = wall["maxX"] - wall["minX"] > wall["maxZ"] - wall["minZ"]
                wall_across = (wall["minZ"] + wall["maxZ"]) / 2 if horizontal else (wall["minX"] + wall["maxX"]) / 2
                if wall_horizontal != horizontal or abs(wall_across - across) > 0.08:
                    continue
                left = max(start, wall["minX"] if horizontal else wall["minZ"])
                right = min(end, wall["maxX"] if horizontal else wall["maxZ"])
                if right - left < 0.2:
                    continue
                center = (left + right) / 2
                x, z = (center, across + inward * 0.21) if horizontal else (across + inward * 0.21, center)
                panel_size = (right - left, 0.05, 0.77) if horizontal else (0.05, right - left, 0.77)
                cap_size = (right - left, 0.065, 0.025) if horizontal else (0.065, right - left, 0.025)
                box(target, f"Interior wall wainscot · {room['id']}", panel_size, world_location(x, z, base + 0.635), MAT[finish], bevel=0.008)
                box(target, f"Interior wall oak cap · {room['id']}", cap_size, world_location(x, z, base + 1.0325), MAT["oak_light"], bevel=0.008)

    for level, room_id, finish in ((0, "hall-central", "plaster_clay"), (1, "hall-superior", "plaster_sage")):
        for legacy_x in (31.2, 42.5):
            x, z = layout_point(game_map, legacy_x, 17)
            box(target, f"Interior wall gallery backing · {room_id}", (4.15, 0.025, 2.7), world_location(x, z + 0.19, level * FLOOR_HEIGHT + 1.88), MAT[finish], bevel=0.012)
            for side in (-1, 1):
                for index in range(3):
                    slat_x = x + side * (1.88 + index * 0.075)
                    box(target, f"Interior wall gallery slat · {room_id}", (0.045, 0.055, 2.7), world_location(slat_x, z + 0.215, level * FLOOR_HEIGHT + 1.88), MAT["oak_light"], bevel=0.01)


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
            mesh_boxes(target, f"Walnut vertical slats · {room_id}", slats, MAT["oak_light"])
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
        base = stair["level"] * FLOOR_HEIGHT
        rise = (stair["targetLevel"] - stair["level"]) * FLOOR_HEIGHT
        points = [Vector((x, -z, base)) for x, z in stair_points(stair)]
        directions = []
        lengths = []
        for start, end in zip(points, points[1:]):
            direction = end - start
            direction.z = 0
            length = direction.length
            direction.normalize()
            directions.append(direction)
            lengths.append(length)
        landing_half = STAIR_LANDING_SIZE / 2 if len(lengths) > 1 else 0
        flight_lengths = [
            length
            - (landing_half if index > 0 else 0)
            - (landing_half if index < len(lengths) - 1 else 0)
            for index, length in enumerate(lengths)
        ]
        climb_length = sum(flight_lengths)

        total_steps = 18
        if len(flight_lengths) == 1:
            counts = [total_steps]
        else:
            first_count = max(4, min(total_steps - 4, round(total_steps * flight_lengths[0] / climb_length)))
            counts = [first_count, total_steps - first_count]

        steps: list[tuple[float, float, float, float, float, float]] = []
        nosings: list[tuple[float, float, float, float, float, float]] = []
        climbed = 0.0
        for segment_index, (start, direction, length, count) in enumerate(zip(points, directions, flight_lengths, counts)):
            start_trim = landing_half if segment_index > 0 else 0
            flight_start = start + direction * start_trim
            run = length / count
            for index in range(count):
                center = flight_start + direction * ((index + 0.5) * run)
                top = rise * (climbed + (index + 1) * run) / climb_length
                tread_thickness = min(0.16, top)
                center.z = base + top - tread_thickness / 2
                along_x = abs(direction.x) > abs(direction.y)
                steps.append((center.x, center.y, center.z, run if along_x else STAIR_WIDTH, STAIR_WIDTH if along_x else run, tread_thickness))
                nose = flight_start + direction * ((index + 1) * run)
                nosings.append((nose.x, nose.y, base + top + 0.012, 0.025 if along_x else STAIR_WIDTH - 0.1, STAIR_WIDTH - 0.1 if along_x else 0.025, 0.018))
            climbed += length

            if segment_index < len(lengths) - 1:
                landing_top = rise * climbed / climb_length
                turn = points[segment_index + 1]
                box(target, f"Stair landing {stair['id']}", (STAIR_LANDING_SIZE, STAIR_LANDING_SIZE, 0.16), (turn.x, turn.y, base + landing_top - 0.08), MAT["terrazzo"])

        mesh_boxes(target, f"Integrated stair {stair['id']}", steps, MAT["terrazzo"])
        mesh_boxes(target, f"Stair LED nosing {stair['id']}", nosings, MAT["cyan"])

        sides = [Vector((-direction.y, direction.x, 0)) for direction in directions]
        climbed = 0.0
        for segment_index, (start, direction, side, length) in enumerate(zip(points, directions, sides, flight_lengths)):
            start_trim = landing_half if segment_index > 0 else 0
            flight_start = start + direction * start_trim
            flight_end = flight_start + direction * length
            for sign in (-1, 1):
                lower = flight_start + side * ((STAIR_RAIL_OFFSET - 0.14) * sign)
                upper = flight_end + side * ((STAIR_RAIL_OFFSET - 0.14) * sign)
                lower.z = base + max(0.08, rise * climbed / climb_length - 0.18)
                upper.z = base + rise * (climbed + length) / climb_length - 0.18
                tube(target, f"Stair stringer {stair['id']} {segment_index} {sign}", [tuple(lower), tuple(upper)], 0.075, MAT["structure"])
            climbed += length

        inside_sign = 0
        if len(directions) > 1:
            cross = directions[0].x * directions[1].y - directions[0].y * directions[1].x
            inside_sign = 1 if cross > 0 else -1

        stair_posts: list[tuple[float, float, float, float, float, float]] = []
        climbed = 0.0
        for segment_index, (start, direction, side, length) in enumerate(zip(points, directions, sides, flight_lengths)):
            start_trim = landing_half if segment_index > 0 else 0
            flight_start = start + direction * start_trim
            for sign in (-1, 1):
                rail_start = 0.04 if segment_index == 0 else 0
                rail_end = length - (0.04 if segment_index == len(flight_lengths) - 1 else 0)
                span = rail_end - rail_start
                if span <= 0.2:
                    continue
                rail_points = []
                for distance in (rail_start, rail_end):
                    point = flight_start + direction * distance + side * (STAIR_RAIL_OFFSET * sign)
                    point.z = base + rise * (climbed + distance) / climb_length + 0.9
                    rail_points.append(tuple(point))
                tube(target, f"Stair handrail {stair['id']} {segment_index} {sign}", rail_points, 0.045, MAT["structure"])

                post_count = max(2, math.ceil(span / 1.05) + 1)
                for post_index in range(post_count):
                    distance = rail_start + span * post_index / (post_count - 1)
                    point = flight_start + direction * distance + side * (STAIR_RAIL_OFFSET * sign)
                    surface = base + rise * (climbed + distance) / climb_length
                    run = length / counts[segment_index]
                    tread_index = min(counts[segment_index] - 1, math.floor(distance / run))
                    bottom = base + rise * (climbed + (tread_index + 1) * run) / climb_length - 0.01
                    top = surface + 0.9
                    stair_posts.append((point.x, point.y, (bottom + top) / 2, 0.045, 0.045, top - bottom))
            climbed += length

        if len(points) == 3:
            outer_sign = -inside_sign
            turn = points[1]
            landing_surface = base + rise * flight_lengths[0] / climb_length
            turn_height = landing_surface + 0.9
            first_outer = turn - directions[0] * landing_half + sides[0] * (STAIR_RAIL_OFFSET * outer_sign)
            corner = turn + (sides[0] + sides[1]) * (STAIR_RAIL_OFFSET * outer_sign)
            second_outer = turn + directions[1] * landing_half + sides[1] * (STAIR_RAIL_OFFSET * outer_sign)
            for point in (first_outer, corner, second_outer):
                point.z = turn_height
            tube(target, f"Stair outer landing rail {stair['id']}", [tuple(first_outer), tuple(corner), tuple(second_outer)], 0.045, MAT["structure"])
            stair_posts.append((corner.x, corner.y, landing_surface + 0.445, 0.045, 0.045, 0.91))

            first_inner = turn - directions[0] * landing_half + sides[0] * (STAIR_RAIL_OFFSET * inside_sign)
            inner_join = turn + (sides[0] + sides[1]) * (STAIR_RAIL_OFFSET * inside_sign)
            second_inner = turn + directions[1] * landing_half + sides[1] * (STAIR_RAIL_OFFSET * inside_sign)
            for point in (first_inner, inner_join, second_inner):
                point.z = turn_height
            tube(target, f"Stair inner landing rail {stair['id']}", [tuple(first_inner), tuple(inner_join), tuple(second_inner)], 0.045, MAT["structure"])

            upper_base = stair["targetLevel"] * FLOOR_HEIGHT
            opening_start = points[0] - directions[0] * STAIR_OPENING_END_PADDING
            first_guard_start = opening_start + sides[0] * (STAIR_OPENING_HALF_WIDTH * inside_sign)
            inner_corner = points[1] - directions[0] * STAIR_OPENING_HALF_WIDTH + sides[0] * (STAIR_OPENING_HALF_WIDTH * inside_sign)
            second_guard_end = points[2] + sides[1] * (STAIR_OPENING_HALF_WIDTH * inside_sign)
            guard_height = upper_base + 1.02
            for point in (first_guard_start, inner_corner, second_guard_end):
                point.z = guard_height
            tube(target, f"Upper L balustrade {stair['id']}", [tuple(first_guard_start), tuple(inner_corner), tuple(second_guard_end)], 0.045, MAT["structure"])

            upper_posts: list[tuple[float, float, float, float, float, float]] = []
            guard_segments = ((first_guard_start, inner_corner), (inner_corner, second_guard_end))
            for guard_start, guard_end in guard_segments:
                horizontal = guard_end - guard_start
                horizontal.z = 0
                guard_length = horizontal.length
                horizontal.normalize()
                post_count = max(2, math.ceil(guard_length / 1.05) + 1)
                for post_index in range(post_count):
                    point = guard_start + horizontal * (guard_length * post_index / (post_count - 1))
                    upper_posts.append((point.x, point.y, upper_base + 0.505, 0.045, 0.045, 1.03))

            start_left = opening_start + sides[0] * STAIR_OPENING_HALF_WIDTH
            start_right = opening_start - sides[0] * STAIR_OPENING_HALF_WIDTH
            start_left.z = guard_height
            start_right.z = guard_height
            tube(target, f"Upper stair end guard {stair['id']}", [tuple(start_left), tuple(start_right)], 0.045, MAT["structure"])
            for sign in (-1, 0, 1):
                point = opening_start + sides[0] * (STAIR_OPENING_HALF_WIDTH * sign)
                upper_posts.append((point.x, point.y, upper_base + 0.505, 0.045, 0.045, 1.03))
            stair_posts.extend(upper_posts)

        unique_posts = {tuple(round(value, 6) for value in post): post for post in stair_posts}
        mesh_boxes(target, f"Stair rail posts {stair['id']}", list(unique_posts.values()), MAT["structure"])


def add_room_details(target: bpy.types.Collection, game_map: dict) -> None:
    by_id = {room["id"]: room for room in game_map["rooms"]}
    _, scale_z = layout_scales(game_map)
    for x in (5.5, 10.5, 15.5):
        mapped_x, mapped_z = layout_point(game_map, x, 10)
        box(target, "Server raised floor guide", (0.035, 10.5 * scale_z, 0.014), world_location(mapped_x, mapped_z, 0.06), MAT["cyan"])
    for x in (28, 34.2, 40.4, 46.6):
        mapped_x, mapped_z = layout_point(game_map, x, 10)
        box(target, "Operations cable guide", (0.035, 10.2 * scale_z, 0.014), world_location(mapped_x, mapped_z, FLOOR_HEIGHT + 0.06), MAT["cyan"])

    # Cabines fechadas: a mesma frente e as três laterais têm colisão na planta.
    bathroom = by_id["banheiro"]["rect"]
    _, front_z = layout_point(game_map, 0, 40.50)
    back_z = bathroom["z"] + bathroom["d"] - 0.15
    partitions = [layout_point(game_map, x, 0)[0] for x in (56.75, 60.35, 64.0)]
    for x in partitions:
        box(target, "Bathroom privacy partition", (0.085, back_z - front_z + 0.045, 2.22), world_location(x, (front_z - 0.045 + back_z) / 2, 1.21), MAT["white"], bevel=0.008)
        box(target, "Bathroom cubicle frame upright", (0.065, 0.12, 2.34), world_location(x, front_z, 1.17), MAT["structure"], bevel=0.008)
    for index, legacy_x in enumerate((58.55, 62.18)):
        door_x, _ = layout_point(game_map, legacy_x, 0)
        left, right = partitions[index], partitions[index + 1]
        opening_left, opening_right = door_x - 0.522, door_x + 0.522
        for start, end in ((left, opening_left), (opening_right, right)):
            box(target, "Bathroom fixed front panel", (end - start, 0.085, 2.22), world_location((start + end) / 2, front_z, 1.21), MAT["plaster_sage"], bevel=0.006)
        box(target, "Bathroom cubicle frame header", (right - left + 0.065, 0.12, 0.08), world_location((left + right) / 2, front_z, 2.30), MAT["structure"], bevel=0.008)
        box(target, "Bathroom closed stall door", (1.02, 0.085, 2.14), world_location(door_x, front_z, 1.19), MAT["walnut"], bevel=0.006)
        for side_x in (opening_left - 0.012, opening_right + 0.012):
            box(target, "Bathroom cubicle door jamb", (0.035, 0.105, 2.22), world_location(side_x, front_z, 1.21), MAT["structure"], bevel=0.005)
        for height in (0.42, 1.91):
            box(target, "Bathroom door hinge", (0.085, 0.045, 0.13), world_location(opening_left + 0.015, front_z - 0.048, height), MAT["brass"], bevel=0.01)
        box(target, "Bathroom lock plate", (0.12, 0.025, 0.24), world_location(door_x + 0.36, front_z - 0.052, 1.10), MAT["structure"], bevel=0.012)
        box(target, "Bathroom door handle", (0.16, 0.055, 0.035), world_location(door_x + 0.315, front_z - 0.085, 1.10), MAT["brass"], bevel=0.012)
        box(target, "Bathroom occupancy marker", (0.042, 0.012, 0.042), world_location(door_x + 0.36, front_z - 0.071, 1.17), MAT["plaster_clay"], bevel=0.008)
    for index, x in enumerate((66.5, 67.05, 67.6)):
        mapped_x, mapped_z = wall_mounted_point(game_map, x, 44.74, 0, vertical_wall=False, inward_sign=-1, surface_offset=0.018)
        box(target, "Folded hand towel", (0.38, 0.055, 0.58), world_location(mapped_x, mapped_z, 1.55), MAT[("white", "acoustic_teal", "white")[index]], bevel=0.035)
    dryer_x, dryer_z = wall_mounted_point(game_map, 65.5, 44.67, 0, vertical_wall=False, inward_sign=-1, surface_offset=0.077)
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
    variant: str,
) -> None:
    origin = Vector(world_location(x, z, base + 2.05))
    tangent = Vector((0, inward_sign, 0) if vertical_wall else (inward_sign, 0, 0))
    normal = Vector((inward_sign, 0, 0) if vertical_wall else (0, -inward_sign, 0))
    up = Vector((0, 0, 1))
    media = variant == "media"
    width, height = (3.4, 1.9125) if media else (2.8, 1.45)

    def point(u: float, v: float, depth: float) -> tuple[float, float, float]:
        return tuple(origin + tangent * u + up * v + normal * depth)

    def slab(label: str, u: float, v: float, w: float, h: float, depth: float, thickness: float, finish: str) -> None:
        size = (thickness, w, h) if vertical_wall else (w, thickness, h)
        box(target, f"{label} · {name}", size, point(u, v, depth), MAT[finish], bevel=0.012)

    def relief(label: str, coordinates: list[tuple[float, float]], finish: str, depth: float = 0.074) -> None:
        if sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(coordinates, coordinates[1:] + coordinates[:1])) < 0:
            coordinates = list(reversed(coordinates))
        count = len(coordinates)
        vertices = [point(u, v, offset) for offset in (0.065, depth + 0.009) for u, v in coordinates]
        faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
        faces.extend((index, (index + 1) % count, (index + 1) % count + count, index + count) for index in range(count))
        mesh = bpy.data.meshes.new(f"Artwork relief · {name} · {label}")
        mesh.from_pydata(vertices, [], faces)
        mesh.materials.append(MAT[finish])
        obj = bpy.data.objects.new(mesh.name, mesh)
        target.objects.link(obj)

    def disc(label: str, u: float, v: float, radius: float, finish: str, depth: float = 0.074) -> None:
        relief(label, [(u + math.cos(index * math.tau / 32) * radius, v + math.sin(index * math.tau / 32) * radius) for index in range(32)], finish, depth)

    def stroke(label: str, coordinates: list[tuple[float, float]], finish: str, radius: float = 0.017) -> None:
        tube(target, f"Artwork relief · {name} · {label}", [point(u, v, 0.075) for u, v in coordinates], radius, MAT[finish])

    if media:
        if name == "Lounge media wall":
            slab("Wall television timber backing", 0, -0.17, 4.15, 2.7, 0.01, 0.03, "oak_light")
            for side in (-1, 1):
                for index in range(3):
                    slab("Wall television timber edge slat", side * (1.84 + index * 0.075), -0.17, 0.045, 2.7, 0.025, 0.035, "walnut")
        slab("Wall television wall bracket", 0, 0, 1.25, 0.66, -0.065, 0.12, "structure")
        slab("Wall television chassis", 0, 0, width, height, 0, 0.10, "structure")
        slab("Wall television display", 0, 0, width - 0.12, height - 0.12, 0.057, 0.022, "tv_screen")
        relief("night landscape distant ridge", [(-1.54, -0.48), (1.54, -0.48), (1.54, -0.02), (0.94, 0.33), (0.34, -0.1), (-0.32, 0.53), (-0.95, 0.13), (-1.54, 0.28)], "acoustic_blue", 0.076)
        relief("night landscape foreground", [(-1.54, -0.65), (1.54, -0.65), (1.54, -0.35), (0.79, -0.19), (0.08, -0.31), (-0.62, -0.04), (-1.54, -0.35)], "acoustic_teal", 0.093)
        disc("standby sun", 0.84, 0.46, 0.16, "art_gold", 0.077)
        slab("Wall television media progress", 0, -0.77, 2.65, 0.014, 0.077, 0.018, "white")
        slab("Wall television soundbar", 0, -1.14, 1.94, 0.12, -0.015, 0.17, "structure")
        slab("Wall television soundbar grille", 0, -1.14, 1.73, 0.052, 0.072, 0.017, "glass")
        return

    if variant == "diptych":
        for index, u in enumerate((-0.76, 0.76)):
            slab("Artwork frame", u, 0, 1.38, height + 0.18, 0, 0.08, "walnut")
            slab("Artwork canvas", u, 0, 1.22, height, 0.052, 0.03, "wall_soft")
            disc("paired sun", u + (-0.12 if index == 0 else 0.12), 0.23, 0.29, "art_gold" if index == 0 else "art_coral")
            for stripe in range(4):
                v = -0.5 + stripe * 0.115
                stroke("paired contour", [(u - 0.51, v), (u - 0.2, v + 0.12), (u + 0.19, v + 0.08), (u + 0.51, v + 0.2)], "acoustic_blue" if index == 0 else "acoustic_teal", 0.018)
        return

    slab("Artwork frame", 0, 0, width + 0.18, height + 0.18, 0, 0.08, "walnut" if variant in ("landscape", "botanical") else "structure")
    slab("Artwork canvas", 0, 0, width, height, 0.052, 0.03, "wall_soft")
    if variant in ("landscape", "dusk"):
        dusk = variant == "dusk"
        disc("sun", 0.66 if dusk else -0.64, 0.28, 0.29, "art_coral" if dusk else "art_gold")
        relief("mountain silhouette", [(-1.28, -0.57), (1.28, -0.57), (1.28, -0.1), (0.7, 0.13), (0.09, -0.15), (-0.53, 0.07), (-1.28, -0.22)], "art_violet" if dusk else "acoustic_blue")
        relief("foreground ridge", [(-1.28, -0.63), (1.28, -0.63), (1.28, -0.29), (0.66, -0.42), (-0.1, -0.25), (-0.72, -0.4), (-1.28, -0.32)], "art_coral" if dusk else "acoustic_teal", 0.09)
        stroke("horizon", [(-1.15, -0.51), (-0.3, -0.49), (0.25, -0.54), (1.12, -0.49)], "art_gold", 0.011)
    elif variant == "botanical":
        for branch, center in enumerate((-0.7, 0.14, 0.82)):
            lean = 0.13 if branch % 2 else -0.11
            stroke("stem", [(center, -0.59), (center + lean, -0.1), (center + lean * 1.5, 0.51)], "walnut", 0.019)
            for leaf in range(4):
                v = -0.34 + leaf * 0.21
                direction = -1 if leaf % 2 else 1
                u = center + lean * (leaf + 1) / 3
                relief("leaf", [(u, v), (u + direction * 0.24, v + 0.24), (u + direction * 0.38, v + 0.15), (u + direction * 0.2, v - 0.015)], "acoustic_teal" if (leaf + branch) % 2 else "landscape", 0.083)
    elif variant == "orbits":
        disc("ochre orbit", -0.57, 0.04, 0.49, "art_gold")
        disc("orbit opening", -0.57, 0.04, 0.35, "wall_soft", 0.091)
        disc("violet planet", 0.58, 0.24, 0.31, "art_violet")
        disc("coral satellite", 0.94, -0.39, 0.14, "art_coral")
        stroke("orbital sweep", [(-1.22, -0.45), (-0.63, -0.2), (0.02, 0.01), (0.61, -0.05), (1.19, 0.19)], "acoustic_blue", 0.026)
    elif variant == "linework":
        for index in range(5):
            u = -1.05 + index * 0.42
            stroke("architectural contour", [(u, -0.5), (u, 0.2 + index * 0.07), (u + 0.3, 0.2 + index * 0.07), (u + 0.3, -0.27)], "acoustic_blue", 0.018)
        disc("plan focus", 0.66, -0.3, 0.23, "art_coral", 0.091)
        stroke("plan datum", [(-1.21, -0.55), (1.16, -0.55)], "art_gold", 0.025)
    else:
        raise ValueError(f"Unknown artwork variant: {variant}")


def add_modern_decor(target: bpy.types.Collection, game_map: dict) -> None:
    def mapped_art(name: str, x: float, z: float, base: float, *, vertical_wall: bool, inward_sign: int, variant: str) -> None:
        mapped_x, mapped_z = wall_mounted_point(game_map, x, z, round(base / FLOOR_HEIGHT), vertical_wall=vertical_wall, inward_sign=inward_sign)
        width = 4.15 if variant == "media" else 2.98
        for entry in unique_doors(game_map):
            if entry["horizontal"] == vertical_wall or entry["room"].get("level", 0) != round(base / FLOOR_HEIGHT):
                continue
            across = mapped_x if vertical_wall else mapped_z
            door_across = entry["x"] if vertical_wall else entry["z"]
            along = mapped_z if vertical_wall else mapped_x
            door_along = entry["z"] if vertical_wall else entry["x"]
            if abs(across - door_across) < 0.35 and abs(along - door_along) < (width + entry["door"]["width"]) / 2 + 0.1:
                raise ValueError(f"{name} overlaps a doorway")
        wall_art(target, name, mapped_x, mapped_z, base, vertical_wall=vertical_wall, inward_sign=inward_sign, variant=variant)

    mapped_art("Reception gallery", 3.23, 26, 0, vertical_wall=True, inward_sign=1, variant="landscape")
    mapped_art("Meeting room gallery", 70.77, 10.5, 0, vertical_wall=True, inward_sign=-1, variant="orbits")
    mapped_art("Lounge gallery", 3.23, 27.5, FLOOR_HEIGHT, vertical_wall=True, inward_sign=1, variant="botanical")
    mapped_art("Executive gallery", 70.77, 11.5, FLOOR_HEIGHT, vertical_wall=True, inward_sign=-1, variant="diptych")
    mapped_art("Council gallery", 18.77, 45, FLOOR_HEIGHT, vertical_wall=True, inward_sign=-1, variant="linework")
    mapped_art("Atrium gallery west", 31.5, 17.23, 0, vertical_wall=False, inward_sign=1, variant="dusk")
    mapped_art("Atrium gallery east", 42.5, 17.23, 0, vertical_wall=False, inward_sign=1, variant="diptych")
    mapped_art("Mezzanine gallery east", 42.5, 17.23, FLOOR_HEIGHT, vertical_wall=False, inward_sign=1, variant="orbits")
    mapped_art("Lounge media wall", 10.5, 34.77, FLOOR_HEIGHT, vertical_wall=False, inward_sign=-1, variant="media")
    mapped_art("Mezzanine media wall", 31.2, 17.23, FLOOR_HEIGHT, vertical_wall=False, inward_sign=1, variant="media")
    for name, x, z, level, inward, variant in (
        ("West corridor gallery", 19.23, 20.5, 0, 1, "botanical"),
        ("West corridor south gallery", 26.77, 35.0, 0, -1, "orbits"),
        ("East corridor gallery", 47.23, 22.0, 0, 1, "linework"),
        ("East corridor south gallery", 54.77, 32.5, 0, -1, "dusk"),
        ("Upper west corridor north gallery", 19.23, 20.5, 1, 1, "linework"),
        ("Upper west corridor gallery", 26.77, 35.0, 1, -1, "dusk"),
        ("Upper east corridor gallery", 47.23, 22.0, 1, 1, "orbits"),
        ("Upper east corridor south gallery", 47.23, 35.0, 1, 1, "botanical"),
        ("Service corridor gallery", 47.23, 46.0, 0, 1, "landscape"),
    ):
        mapped_art(name, x, z, level * FLOOR_HEIGHT, vertical_wall=True, inward_sign=inward, variant=variant)

    for room_name, x, z, level in (
        ("Data core telemetry", 13, 16.77, 0),
        ("Operations command wall", 29.5, 16.77, 1),
    ):
        x, z = wall_mounted_point(game_map, x, z, level, vertical_wall=False, inward_sign=-1)
        base = level * FLOOR_HEIGHT
        for entry in unique_doors(game_map):
            if entry["horizontal"] and entry["room"].get("level", 0) == level and abs(entry["z"] - z) < 0.3:
                half_door = entry["door"]["width"] / 2
                if x + 3.8 > entry["x"] - half_door and x - 3.8 < entry["x"] + half_door:
                    raise ValueError(f"{room_name} overlaps a doorway")
        box(target, room_name, (7.6, 0.07, 1.65), world_location(x, z, base + 2.05), MAT["structure"], bevel=0.06)
        for index in range(4):
            screen_x = x - 2.85 + index * 1.9
            box(target, f"Dashboard screen · {room_name}", (1.72, 0.035, 1.35), world_location(screen_x, z - 0.055, base + 2.05), MAT["screen"], bevel=0.045)
            for row in range(3):
                box(target, f"Dashboard data line · {room_name}", (1.25 - row * 0.16, 0.018, 0.025), world_location(screen_x, z - 0.082, base + 1.78 + row * 0.18), MAT["cyan"], bevel=0.01)

    for level in (0, 1):
        base = level * FLOOR_HEIGHT
        for z in (20.5, 37.5):
            hall = next(room for room in game_map["rooms"] if room["id"] == ("hall-central" if level == 0 else "hall-superior"))
            _, mapped_z = layout_point(game_map, 27.0, z)
            for side, inward, finish in (("west", 1, "cyan"), ("east", -1, "amber")):
                if side == "east" and z > 30:
                    continue
                wall_x = hall["rect"]["x"] + (hall["rect"]["w"] if side == "east" else 0)
                housing_x = wall_x + inward * 0.22
                box(target, "Atrium wall-mounted LED housing", (0.065, 0.095, 2.26), world_location(housing_x, mapped_z, base + 1.75), MAT["structure"], bevel=0.012)
                box(target, "Atrium recessed LED diffuser", (0.016, 0.045, 2.18), world_location(housing_x + inward * 0.032, mapped_z, base + 1.75), MAT[finish], bevel=0.006)

    _, scale_z = layout_scales(game_map)
    for x in (5.5, 9.5, 13.5, 17.5, 21.0):
        mapped_x, mapped_z = layout_point(game_map, x, 10)
        box(target, "Data core overhead cable tray", (0.12, 10.4 * scale_z, 0.1), world_location(mapped_x, mapped_z, 3.26), MAT["structure"], bevel=0.025)
        box(target, "Data core ceiling status LED", (0.025, 9.8 * scale_z, 0.025), world_location(mapped_x, mapped_z, 3.19), MAT["cyan"], bevel=0.01)

    # Terraço de trabalho: pergolado, jardineiras e luz integrada, para o lado
    # de fora parecer continuação do escritório em vez de uma laje vazia.
    terrace_base = FLOOR_HEIGHT
    scale_x, scale_z = layout_scales(game_map)
    pergola_top = terrace_base + 2.68
    for x in (57.25, 68.75):
        for z in (32.0, 42.0):
            mapped_x, mapped_z = layout_point(game_map, x, z)
            box(target, "Terrace pergola column", (0.14, 0.14, 2.68), world_location(mapped_x, mapped_z, terrace_base + 1.34), MAT["structure"], bevel=0.022)
    for z in (32.0, 42.0):
        mapped_x, mapped_z = layout_point(game_map, 63, z)
        box(target, "Terrace pergola cross beam", (11.64 * scale_x, 0.16, 0.18), world_location(mapped_x, mapped_z, pergola_top), MAT["structure"], bevel=0.026)
    for x in (57.25, 68.75):
        mapped_x, mapped_z = layout_point(game_map, x, 37)
        box(target, "Terrace pergola side beam", (0.16, 10.14 * scale_z, 0.18), world_location(mapped_x, mapped_z, pergola_top), MAT["structure"], bevel=0.026)
        box(target, "Terrace integrated LED", (0.024, 9.72 * scale_z, 0.024), world_location(mapped_x, mapped_z, pergola_top - 0.096), MAT["amber"], bevel=0.008)
    mapped_x, mapped_z = layout_point(game_map, 63, 37)
    box(target, "Terrace pergola center spine", (0.1, 9.86 * scale_z, 0.12), world_location(mapped_x, mapped_z, pergola_top + 0.015), MAT["structure"], bevel=0.02)
    for index in range(12):
        z = 32.38 + index * 0.84
        mapped_x, mapped_z = layout_point(game_map, 63, z)
        box(target, "Terrace solar louver", (11.28 * scale_x, 0.14, 0.07), world_location(mapped_x, mapped_z, pergola_top + 0.12), MAT["walnut"], bevel=0.018, rotation=(math.radians(10), 0, 0))
    for x, z, sx, sz in ((57.2, 20.5, 1.1, 4.2), (68.8, 29.5, 1.1, 5.2), (57.2, 51.5, 1.1, 4.2)):
        mapped_x, mapped_z = layout_point(game_map, x, z)
        box(target, "Terrace mineral planter", (sx, sz, 0.48), world_location(mapped_x, mapped_z, terrace_base + 0.24), MAT["terrazzo"], bevel=0.12)
        box(target, "Terrace planter shadow gap", (sx + 0.04, sz + 0.04, 0.055), world_location(mapped_x, mapped_z, terrace_base + 0.05), MAT["structure"], bevel=0.025)

    add_exterior_landscape(target, game_map)


def add_exterior_landscape(target: bpy.types.Collection, game_map: dict) -> None:
    rooms = [room["rect"] for room in game_map["rooms"] if room.get("level", 0) == 0]
    min_x, max_x = min(rect["x"] for rect in rooms), max(rect["x"] + rect["w"] for rect in rooms)
    min_z, max_z = min(rect["z"] for rect in rooms), max(rect["z"] + rect["d"] for rect in rooms)
    center_x, center_z = (min_x + max_x) / 2, (min_z + max_z) / 2
    ground = -0.55
    box(target, "Exterior continuous park ground", (260, 260, 0.18), world_location(center_x, center_z, ground - 0.09), MAT["landscape"])
    foundations = [(rect["x"] + rect["w"] / 2, -(rect["z"] + rect["d"] / 2), (ground - 0.16) / 2, rect["w"] + 0.4, rect["d"] + 0.4, -0.16 - ground) for rect in rooms]
    mesh_boxes(target, "Office foundations continuous down to ground", foundations, MAT["concrete"])
    paths = [
        (center_x, -(min_z - 2.2), ground + 0.035, max_x - min_x + 8, 3.6, 0.07),
        (center_x, -(max_z + 2.2), ground + 0.035, max_x - min_x + 8, 3.6, 0.07),
        (min_x - 2.2, -center_z, ground + 0.035, 3.6, max_z - min_z, 0.07),
        (max_x + 2.2, -center_z, ground + 0.035, 3.6, max_z - min_z, 0.07),
    ]
    mesh_boxes(target, "Exterior perimeter footpaths", paths, MAT["terrazzo"])
    road_x = max_x + 17
    box(target, "Grounded neighborhood road", (7.2, 170, 0.035), world_location(road_x, center_z, ground + 0.018), MAT["concrete"])
    mesh_boxes(target, "Road lane markings", [(road_x, -(center_z - 76 + index * 7), ground + 0.042, 0.07, 2.8, 0.01) for index in range(23)], MAT["white"])

    tree_positions = [(min_x - 8.5, z) for z in (min_z - 6, min_z + 10, center_z + 5, max_z + 7)]
    tree_positions += [(max_x + 8.5, z) for z in (min_z - 7, min_z + 8, center_z + 6, max_z + 8)]
    tree_positions += [(x, z) for x in (center_x - 13, center_x + 10) for z in (min_z - 12, max_z + 12)]
    for index, (x, z) in enumerate(tree_positions):
        height = 3.8 + (index % 3) * 0.4
        cylinder(target, "Landscape tree trunk", 0.13, height * 0.7, world_location(x, z, ground + height * 0.35), MAT["walnut"], vertices=8)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=world_location(x, z, ground + height * 0.77))
        crown = move_to(bpy.context.object, target)
        crown.name = "Landscape tree canopy"
        crown.scale = (1.65, 1.65, height * 0.42)
        crown.data.materials.append(MAT["landscape"])

    homes = (
        (max_x + 37, center_z - 25, 9, 12, 5.5),
        (max_x + 42, center_z + 9, 11, 14, 6.4),
        (max_x + 34, max_z + 24, 10, 9, 4.5),
        (center_x - 18, min_z - 43, 14, 11, 5.2),
        (min_x - 38, center_z + 15, 11, 14, 5.8),
    )
    mesh_boxes(target, "Distant grounded neighborhood buildings", [(x, -z, ground + height / 2, width, depth, height) for x, z, width, depth, height in homes], MAT["distant_facade"])
    mesh_boxes(target, "Distant neighborhood roof caps", [(x, -z, ground + height + 0.12, width + 0.3, depth + 0.3, 0.24) for x, z, width, depth, height in homes], MAT["structure"])
    windows = []
    for index, (x, z, width, depth, height) in enumerate(homes):
        for floor in (1.45, 3.7):
            if floor + 0.55 > height:
                continue
            for column in (-0.27, 0, 0.27):
                windows.append((x - width / 2 - 0.012, -z + column * depth, ground + floor, 0.02, 0.9, 1.0))
                if index > 2:
                    windows.append((x + column * width, -z - depth / 2 - 0.012, ground + floor, 0.9, 0.02, 1.0))
    mesh_boxes(target, "Distant warm neighborhood windows", windows, MAT["distant_window"])


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
            room_id = next((room["id"] for room in game_map["rooms"] if room.get("level", 0) == level and room["rect"]["x"] <= placement["x"] <= room["rect"]["x"] + room["rect"]["w"] and room["rect"]["z"] <= placement["z"] <= room["rect"]["z"] + room["rect"]["d"]), "")
            sofa_palette = ("fabric_sage", "plaster_sage") if room_id == "hall-superior" else ("fabric_clay", "plaster_clay") if room_id in ("recepcao", "lounge") else None
            transform = Matrix.Translation((placement["x"], -placement["z"], level * FLOOR_HEIGHT + placement.get("y", 0))) @ Matrix.Rotation(placement.get("rot", 0), 4, "Z")
            for source, source_matrix in sources:
                duplicate = source.copy()
                duplicate.data = source.data
                if kind == "sofa" and sofa_palette and source.data.materials and "fabric" in source.data.materials[0].name.lower():
                    duplicate.data = source.data.copy()
                    accent = "accent" in source.data.materials[0].name.lower()
                    duplicate.data.materials[0] = MAT[sofa_palette[1 if accent else 0]]
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
        (STAIR_PREVIEW_PATH, (34.0, -30.5, 1.72), (43.2, -37.2, 2.45), (39.0, -34.0, 5.4)),
        (MEETING_PREVIEW_PATH, (61.0, -15.4, 1.72), (61.0, -9.5, 0.9), (61.0, -11.0, 3.0)),
        (BATHROOM_PREVIEW_PATH, (56.0, -36.2, 1.68), (64.0, -42.0, 1.1), (64.0, -39.0, 3.0)),
        (PORTAL_PREVIEW_PATH, (23, -25, FLOOR_HEIGHT + 1.72), (27, -29, FLOOR_HEIGHT + 2.3), (23, -26, FLOOR_HEIGHT + 3)),
        (TERRACE_PREVIEW_PATH, (69, -35, FLOOR_HEIGHT + 1.72), (86, -39, 2.0), (67, -35, FLOOR_HEIGHT + 3)),
        (WINDOW_PREVIEW_PATH, (13, -27, FLOOR_HEIGHT + 1.72), (3, -28, FLOOR_HEIGHT + 1.8), (10, -27, FLOOR_HEIGHT + 3)),
        (SUPPORT_PREVIEW_PATH, (17, -38, 1.72), (8, -47, 1.1), (11, -45, 3)),
        (MEZZANINE_PREVIEW_PATH, (37, -29, FLOOR_HEIGHT + 1.72), (31.2, -17.23, FLOOR_HEIGHT + 2.05), (33, -24, FLOOR_HEIGHT + 3)),
        (LOUNGE_MEDIA_PREVIEW_PATH, (16, -24, FLOOR_HEIGHT + 1.72), (10.5, -34.77, FLOOR_HEIGHT + 2.05), (12, -29, FLOOR_HEIGHT + 3)),
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


def validate_portals(game_map: dict) -> None:
    bpy.context.view_layer.update()
    scene = bpy.context.scene
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for index, entry in enumerate(unique_doors(game_map)):
        base = entry["room"].get("level", 0) * FLOOR_HEIGHT
        direction = Vector((0, 1, 0) if entry["horizontal"] else (1, 0, 0))
        for height in (0.8, 1.7, 2.35, 3.5, WALL_HEIGHT - 0.065):
            center = Vector(world_location(entry["x"], entry["z"], base + height))
            hit, _, _, _, obj, _ = scene.ray_cast(depsgraph, center - direction * 0.32, direction, distance=0.64)
            if height < DOOR_HEIGHT:
                if hit:
                    raise ValueError(f"Portal {index} blocked at {height:.2f} m by {obj.name}")
            elif not hit:
                raise ValueError(f"Portal {index} has an open lintel at {height:.2f} m")
            elif height > WALL_HEIGHT - 0.13 and not obj.name.startswith("Continuous portal ceiling trim"):
                raise ValueError(f"Portal {index} has no continuous graphite ceiling trim")
    print(f"VALIDATED: {len(unique_doors(game_map))} open portals, closed lintels and continuous ceiling trim")


def main() -> None:
    clear_scene()
    create_materials()
    game_map = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    building = collection("Timbas Office Building · two floors")
    add_room_floors(building, game_map)
    add_walls(building, game_map)
    add_doors(building, game_map)
    add_ceilings(building, game_map)
    add_wall_finishes(building, game_map)
    add_feature_walls(building, game_map)
    add_stairs(building, game_map)
    add_room_details(building, game_map)
    add_modern_decor(building, game_map)
    add_vent_grilles(building, game_map)
    add_furniture(building, game_map)
    validate_portals(game_map)
    validate_exterior_windows(game_map)
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
