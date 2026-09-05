"""Audita a geometria salva do escritório sem reconstruir ou salvar os modelos.

Uso: blender --background --python-exit-code 1 --python
scripts/check-office-architecture-blender.py [-- --blend caminho --map caminho --glb caminho]

Verifica portais, degraus/patamar, laje, emendas/pés dos corrimãos, luminárias,
LEDs, janelas, gesso, montagem de quadros/TVs, copa, cabines do banheiro, bases externas, pergolado e
remoção da garagem, além de equivalência de
triângulos/extensão/vidros no GLB reimportado. Confere hashes antes e depois.

Limites: os raycasts são amostras, não uma prova de ausência de qualquer
interseção. O grafo dos componentes de luminárias usa bounds conservadores:
detecta peças separadas, mas não garante contato exato de superfícies curvas.
Não substitui revisão visual no navegador, testes de luz, colisão ou desempenho.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree


ROOT = Path(__file__).resolve().parents[1]
FLOOR_HEIGHT = 4.2
WALL_HEIGHT = 4.02
FAILURES: list[str] = []
METRICS: dict = {}


def check(condition: bool, message: str) -> None:
    if not condition:
        FAILURES.append(message)


def bounds(points) -> tuple[Vector, Vector]:
    values = list(points)
    return Vector(tuple(min(point[axis] for point in values) for axis in range(3))), Vector(tuple(max(point[axis] for point in values) for axis in range(3)))


def object_bounds(obj) -> tuple[Vector, Vector]:
    return bounds(obj.matrix_world @ Vector(vertex) for vertex in obj.bound_box)


def parts(obj) -> list[tuple[Vector, Vector]]:
    mesh = obj.data
    neighbors = [[] for _ in mesh.vertices]
    for edge in mesh.edges:
        a, b = edge.vertices
        neighbors[a].append(b)
        neighbors[b].append(a)
    unseen = set(range(len(mesh.vertices)))
    result = []
    while unseen:
        queue = [unseen.pop()]
        connected = []
        while queue:
            index = queue.pop()
            connected.append(obj.matrix_world @ mesh.vertices[index].co)
            for neighbor in neighbors[index]:
                if neighbor in unseen:
                    unseen.remove(neighbor)
                    queue.append(neighbor)
        result.append(bounds(connected))
    return result


def meshes(prefix: str) -> list:
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.name.startswith(prefix)]


def surface_tree(objects) -> BVHTree:
    vertices, polygons = [], []
    graph = bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        offset = len(vertices)
        vertices.extend(evaluated.matrix_world @ vertex.co for vertex in mesh.vertices)
        polygons.extend(tuple(offset + index for index in polygon.vertices) for polygon in mesh.polygons)
        evaluated.to_mesh_clear()
    return BVHTree.FromPolygons(vertices, polygons)


def ray(origin, direction, distance: float):
    return bpy.context.scene.ray_cast(bpy.context.evaluated_depsgraph_get(), Vector(origin), Vector(direction), distance=distance)


def furniture_instances(game_map: dict, kind: str) -> list[dict]:
    instances = [{"placement": prop, "objects": []} for prop in game_map["props"] if prop["kind"] == kind]
    objects = meshes(f"{kind} ·")
    check(bool(instances) and bool(objects), f"Missing mapped/exported furniture kind {kind}")
    if not instances:
        return []
    for obj in objects:
        low, high = object_bounds(obj)
        center = (low + high) / 2
        closest = min(instances, key=lambda instance: (center.x - instance["placement"]["x"]) ** 2 + (center.y + instance["placement"]["z"]) ** 2 + (center.z - instance["placement"].get("level", 0) * FLOOR_HEIGHT) ** 2)
        closest["objects"].append(obj)
    for instance in instances:
        check(bool(instance["objects"]), f"Missing mesh instance of {kind} at {instance['placement']}")
        if instance["objects"]:
            instance["bounds"] = bounds(point for obj in instance["objects"] for point in object_bounds(obj))
    return [instance for instance in instances if instance["objects"]]


def audit_portals(game_map: dict) -> None:
    lintels = surface_tree(meshes("Wall above portal"))
    crown_trims = surface_tree(meshes("Continuous portal ceiling trim"))
    seen = set()
    samples = 0
    approach_samples = 0
    for room in game_map["rooms"]:
        rect = room["rect"]
        base = room.get("level", 0) * FLOOR_HEIGHT
        for door in room.get("doors", []):
            horizontal = door["side"] in ("north", "south")
            x = rect["x"] + (door["at"] + door["width"] / 2 if horizontal else rect["w"] if door["side"] == "east" else 0)
            z = rect["z"] + (rect["d"] if door["side"] == "south" else 0) if horizontal else rect["z"] + door["at"] + door["width"] / 2
            key = (base, horizontal, round(x, 3), round(z, 3))
            if key in seen:
                continue
            seen.add(key)
            for offset in (-0.35, 0, 0.35):
                for height in (0.3, 1.6, 2.35, 3.1, 3.955):
                    for sign in (-1, 1):
                        origin = (x + offset * door["width"], -z + sign * 0.55, base + height) if horizontal else (x + sign * 0.55, -z - offset * door["width"], base + height)
                        direction = (0, -sign, 0) if horizontal else (-sign, 0, 0)
                        hit = ray(origin, direction, 1.1)
                        name = hit[4].name if hit[0] else "nothing"
                        if height < 2.4:
                            check(not hit[0], f"Portal {key}: passage blocked at {height} m by {name}")
                        else:
                            structure = lintels if height < 3.9 else crown_trims
                            structural_hit = structure.ray_cast(Vector(origin), Vector(direction), 1.1)
                            check(structural_hit[0] is not None, f"Portal {key}: missing lintel/trim at {height} m, visible surface={name}")
                        samples += 1
            for offset in (-0.25, 0, 0.25):
                for height in (0.4, 1.5, 2.05):
                    origin = (x + offset * door["width"], -z + 1.15, base + height) if horizontal else (x + 1.15, -z - offset * door["width"], base + height)
                    hit = ray(origin, (0, -1, 0) if horizontal else (-1, 0, 0), 2.3)
                    check(not hit[0], f"Portal {key}: approach blocked by {hit[4].name if hit[0] else 'nothing'}")
                    approach_samples += 1
    METRICS["portals"] = {"count": len(seen), "rays": samples, "approach_rays": approach_samples}
    check(not any("sensor" in obj.name.lower() for obj in bpy.context.scene.objects), "A detached door sensor remains in the scene")


def audit_stairs(game_map: dict) -> None:
    walls = surface_tree(meshes("Continuous architectural walls"))
    for stair in game_map["stairs"]:
        if stair["targetLevel"] <= stair["level"]:
            continue
        name = stair["id"]
        landing = bpy.data.objects.get(f"Stair landing {name}")
        treads = bpy.data.objects.get(f"Integrated stair {name}")
        check(landing is not None and treads is not None, f"Stair {name}: missing landing or treads")
        if landing is None or treads is None:
            continue
        check(not walls.overlap(surface_tree([landing, treads])), f"Stair {name}: treads or landing intersect a wall after map compaction")
        lower, upper = object_bounds(landing)
        check(abs(upper.x - lower.x - 2.42) < 0.002 and abs(upper.y - lower.y - 2.42) < 0.002, f"Stair {name}: landing is not a 2.42 m square")
        check(abs(upper.z - (stair["level"] + stair["targetLevel"]) * FLOOR_HEIGHT / 2) < 0.002, f"Stair {name}: landing is not at half rise")
        check(abs(upper.z - lower.z - 0.16) < 0.002, f"Stair {name}: landing thickness differs from 0.16 m")
        pieces = sorted(parts(treads), key=lambda item: item[1].z)
        check(len(pieces) == 18, f"Stair {name}: expected 18 independent treads, got {len(pieces)}")
        previous_height = stair["level"] * FLOOR_HEIGHT
        for index, (low, high) in enumerate(pieces):
            check(0.01 < high.z - previous_height < 0.27, f"Stair {name}: irregular rise at tread {index}")
            check(high.z - low.z <= 0.161, f"Stair {name}: over-thick tread {index}")
            run = min(high.x - low.x, high.y - low.y)
            check(run >= 0.25, f"Stair {name}: tread {index} has less than 25 cm of usable depth")
            center = (low + high) / 2
            check(not (lower.x + 0.005 < center.x < upper.x - 0.005 and lower.y + 0.005 < center.y < upper.y - 0.005), f"Stair {name}: tread {index} overlaps landing")
            previous_height = high.z
        check(abs(pieces[-1][1].z - stair["targetLevel"] * FLOOR_HEIGHT) < 0.002, f"Stair {name}: final tread misses upper floor")
        for px in (lower.x + 0.14, (lower.x + upper.x) / 2, upper.x - 0.14):
            for py in (lower.y + 0.14, (lower.y + upper.y) / 2, upper.y - 0.14):
                actual = ray((px, py, FLOOR_HEIGHT + 0.07), (0, 0, -1), 0.25)
                check(not actual[0], f"Stair {name}: geometry intrudes above landing at {(px, py)}, object={actual[4].name if actual[0] else 'none'}")
        headroom_samples = 0
        for step_low, step_high in pieces + [(lower, upper)]:
            center = (step_low + step_high) / 2
            width_axis = 0 if step_high.x - step_low.x > step_high.y - step_low.y else 1
            for offset in (-0.65, 0, 0.65):
                origin = Vector((center.x, center.y, step_high.z + 0.025))
                origin[width_axis] += offset
                hit = ray(origin, (0, 0, 1), 2.025)
                check(not hit[0], f"Stair {name}: less than 2.05 m of headroom above {tuple(origin)} due to {hit[4].name if hit[0] else 'nothing'}")
                headroom_samples += 1
        landing_ends = []
        for obj in bpy.context.scene.objects:
            if obj.type == "CURVE" and obj.name.startswith((f"Stair outer landing rail {name}", f"Stair inner landing rail {name}")):
                points = obj.data.splines[0].points
                landing_ends.extend(obj.matrix_world @ Vector(point.co[:3]) for point in (points[0], points[-1]))
        joint_gaps = []
        for obj in bpy.context.scene.objects:
            if obj.type != "CURVE" or not obj.name.startswith(f"Stair handrail {name}"):
                continue
            endpoints = [obj.matrix_world @ Vector(point.co[:3]) for point in (obj.data.splines[0].points[0], obj.data.splines[0].points[-1])]
            gap = min((a - b).length for a in endpoints for b in landing_ends)
            joint_gaps.append(gap)
            check(gap <= 0.003, f"Stair {name}: handrail-to-landing gap {gap:.4f} m at {obj.name}")
        floor_tree = surface_tree([landing, treads] + meshes("Floor slab") + meshes("Floor finish") + meshes("Carpet inset"))
        posts = bpy.data.objects.get(f"Stair rail posts {name}")
        post_gaps = []
        if posts is not None:
            seen_posts = set()
            for index, (post_low, post_high) in enumerate(parts(posts)):
                center = (post_low + post_high) / 2
                identity = tuple(round(value, 4) for point in (post_low, post_high) for value in point)
                check(identity not in seen_posts, f"Stair {name}: duplicate rail post at {tuple(center)}")
                seen_posts.add(identity)
                contacts = []
                for dx, dy in ((0, 0), (-0.018, -0.018), (-0.018, 0.018), (0.018, -0.018), (0.018, 0.018)):
                    hit = floor_tree.ray_cast(Vector((center.x + dx, center.y + dy, post_low.z + 0.25)), Vector((0, 0, -1)), 0.55)
                    if hit[0] is not None:
                        contacts.append(hit[0].z)
                gap = max(0, post_low.z - max(contacts)) if contacts else None
                post_gaps.append(gap)
                check(gap is not None and gap <= 0.01, f"Stair {name}: post {index} foot floats {gap} m at {(round(center.x, 4), round(center.y, 4), round(post_low.z, 4))}")
        check(posts is not None, f"Stair {name}: no rail support posts")
        METRICS["stairs"] = {"treads": len(pieces), "landing_width_m": round(upper.x - lower.x, 4), "landing_top_m": round(upper.z, 4), "max_handrail_joint_gap_m": round(max(joint_gaps, default=-1), 6), "post_count": len(post_gaps), "max_post_foot_gap_m": round(max((gap for gap in post_gaps if gap is not None), default=-1), 6), "headroom_rays": headroom_samples}
    check(not meshes("Suspended acoustic raft"), "Detached acoustic raft remains above the stairs/lounge")


def audit_fixtures_and_sconces() -> None:
    ceiling_tree = surface_tree(meshes("Seamless ceiling"))
    fixtures = []
    for obj in meshes("ceilingLight"):
        low, high = object_bounds(obj)
        center = (low + high) / 2
        existing = next((cluster for cluster in fixtures if math.hypot(cluster[0].x - center.x, cluster[0].y - center.y) < 1.3 and abs(cluster[0].z - center.z) < 0.5), None)
        if existing is None:
            fixtures.append([center, [low, high], [obj]])
        else:
            existing[1].extend((low, high))
            existing[2].append(obj)
    max_fixture_gap = 0
    disconnected_fixtures = []
    for center, vertices, objects in fixtures:
        low, high = bounds(vertices)
        ceiling = round((high.z - WALL_HEIGHT) / FLOOR_HEIGHT) * FLOOR_HEIGHT + WALL_HEIGHT
        gap = ceiling - high.z
        max_fixture_gap = max(max_fixture_gap, abs(gap))
        check(abs(gap) < 0.006, f"Fixture at {(round(center.x, 3), round(center.y, 3))}: ceiling mounting gap {gap:.4f} m")
        check(ceiling - low.z >= 0.2, f"Fixture at {tuple(center)} is missing its suspended light body")
        check(ceiling - low.z <= 0.3, f"Fixture at {tuple(center)} hangs more than 30 cm below ceiling")
        for dx, dy in ((0.85, 0), (0, 0.85)):
            hit = ceiling_tree.ray_cast(Vector((center.x + dx, center.y + dy, ceiling - 0.05)), Vector((0, 0, 1)), 0.11)
            check(hit[0] is not None, f"Fixture at {tuple(center)} has no adjacent ceiling support")
        components = [piece for obj in objects for piece in parts(obj)]
        connected = {index for index, (_, top) in enumerate(components) if top.z >= ceiling - 0.006}
        pending = set(range(len(components))) - connected
        while pending:
            added = {index for index in pending if any(all(components[index][0][axis] <= components[neighbor][1][axis] + 0.003 and components[index][1][axis] >= components[neighbor][0][axis] - 0.003 for axis in range(3)) for neighbor in connected)}
            if not added:
                break
            connected.update(added)
            pending.difference_update(added)
        if pending:
            disconnected_fixtures.append((round(center.x, 3), round(center.y, 3), len(pending)))
    wall_tree = surface_tree(meshes("Continuous architectural walls"))
    mounting_gaps = []
    for obj in meshes("Atrium wall-mounted LED housing"):
        low, high = object_bounds(obj)
        center = (low + high) / 2
        gap = min(wall_tree.find_nearest(Vector((x, center.y, center.z)))[3] for x in (low.x, high.x))
        mounting_gaps.append(gap)
        check(gap < 0.02, f"Sofa/atrium LED housing {obj.name}: wall gap {gap:.4f} m")
    check(len(mounting_gaps) == 6, f"Expected 6 wall-mounted atrium LEDs, found {len(mounting_gaps)}")
    check(not disconnected_fixtures, f"Fixture bodies lack a physical connection to their ceiling canopy: {disconnected_fixtures}")
    METRICS["fixtures"] = {"count": len(fixtures), "max_ceiling_gap_m": round(max_fixture_gap, 6), "disconnected_fixture_bodies": len(disconnected_fixtures), "atrium_housings": len(mounting_gaps), "max_wall_mount_distance_m": round(max(mounting_gaps, default=-1), 6)}


def audit_windows() -> None:
    glass = bpy.data.objects.get("Clear fixed exterior glazing")
    check(glass is not None, "Missing exterior glazing")
    if glass is None:
        return
    aperture_tree = surface_tree(meshes("Continuous architectural walls"))
    count = 0
    for polygon in glass.data.polygons:
        vertices = [glass.matrix_world @ glass.data.vertices[index].co for index in polygon.vertices]
        low, high = bounds(vertices)
        center = (low + high) / 2
        horizontal = high.x - low.x > high.y - low.y
        normal = Vector((0, 1, 0) if horizontal else (1, 0, 0))
        level = math.floor(low.z / FLOOR_HEIGHT)
        check(low.z - level * FLOOR_HEIGHT >= 1.1, f"Window {count}: unsafe sill at {low.z}")
        for sign in (-1, 1):
            for fraction in (0.12, 0.3, 0.7, 0.88):
                for height_fraction in (0.12, 0.5, 0.88):
                    position = low.lerp(high, fraction)
                    position.z = low.z + (high.z - low.z) * height_fraction
                    origin = position + normal * (0.55 * sign)
                    hit = aperture_tree.ray_cast(origin, -normal * sign, 1.1)
                    check(hit[0] is None, f"Window {count}: wall still fills aperture")
                    actual = ray(origin, -normal * sign, 0.8)
                    check(actual[0] and actual[4] == glass, f"Window {count}: opening obstructed by {actual[4].name if actual[0] else 'missing glass'}")
        for height in (low.z - 0.13, high.z + 0.13):
            origin = Vector((center.x, center.y, height)) + normal * 0.5
            check(aperture_tree.ray_cast(origin, -normal, 1.0)[0] is not None, f"Window {count}: missing sill or lintel")
        count += 1
    material = glass.data.materials[0]
    alpha = material.node_tree.nodes.get("Principled BSDF").inputs["Alpha"].default_value
    check(alpha <= 0.12, f"Exterior glazing is too opaque: alpha={alpha}")
    METRICS["windows"] = {"apertures": count, "alpha": round(alpha, 4), "decoration_clearance_rays": count * 24}


def audit_interiors(game_map: dict) -> None:
    gypsum = meshes("Gypsum")
    check(bool(gypsum), "Missing new gypsum ceiling details")
    gypsum_tree = surface_tree(gypsum) if gypsum else None
    gypsum_parts = 0
    for obj in gypsum:
        for low, high in parts(obj):
            level = round((high.z - WALL_HEIGHT) / FLOOR_HEIGHT)
            ceiling = level * FLOOR_HEIGHT + WALL_HEIGHT
            check(high.z >= ceiling - 0.003 and high.z <= ceiling + 0.08, f"Gypsum {obj.name}: not anchored to ceiling at {tuple(high)}")
            check(low.z >= ceiling - 0.35, f"Gypsum {obj.name}: drops more than 35 cm below ceiling")
            gypsum_parts += 1
    if gypsum_tree is not None:
        for obj in meshes("ceilingLight"):
            check(not gypsum_tree.overlap(surface_tree([obj])), f"Gypsum intersects luminaire geometry: {obj.name}")

    wall_layers = meshes("Continuous architectural walls") + meshes("Wall above portal") + meshes("Interior wall")
    wall_tree = surface_tree(wall_layers)
    timber = meshes("Wall television timber")
    brackets = meshes("Wall television wall bracket")
    supported_wall_tree = surface_tree(wall_layers + timber + brackets)
    mounted = meshes("Artwork frame") + timber + brackets + meshes("Wall television chassis") + meshes("Wall television soundbar ·")
    check(len(meshes("Wall television chassis")) >= 2, "Expected at least two new wall televisions")
    check(bool(meshes("Interior wall")), "Missing new interior wall finishes")
    mount_distances = []
    for obj in mounted:
        support = wall_tree if obj in brackets or obj in timber or obj.name.startswith("Artwork frame") else supported_wall_tree
        if support.overlap(surface_tree([obj])):
            distance = 0.0
        else:
            low, high = object_bounds(obj)
            center = (low + high) / 2
            thin_axis = 0 if high.x - low.x < high.y - low.y else 1
            points = []
            for face in (low[thin_axis], high[thin_axis]):
                point = center.copy()
                point[thin_axis] = face
                points.append(point)
            distances = []
            for point in points:
                location, normal, _index, separation = support.find_nearest(point)
                distances.append(0.0 if (point - location).dot(normal) < 0 else separation)
            distance = min(distances)
        mount_distances.append(distance)
        check(distance <= 0.01, f"Wall decoration {obj.name}: unmounted separation {distance:.4f} m")

    visible_surfaces = meshes("Artwork canvas") + meshes("Wall television display")
    structure_tree = surface_tree(meshes("Continuous architectural walls"))
    for obj in visible_surfaces:
        low, high = object_bounds(obj)
        center = (low + high) / 2
        thin_axis = 0 if high.x - low.x < high.y - low.y else 1
        exposure = []
        for face in (low[thin_axis], high[thin_axis]):
            point = center.copy()
            point[thin_axis] = face
            location, normal, _index, _distance = structure_tree.find_nearest(point)
            exposure.append((point - location).dot(normal))
        check(max(exposure) >= 0.015, f"Wall decoration {obj.name}: its visible face is buried in the wall")

    corridor_samples = 0
    for room in game_map["rooms"]:
        if room["kind"] != "corredor":
            continue
        rect = room["rect"]
        along_x = rect["w"] > rect["d"]
        length = rect["w"] if along_x else rect["d"]
        count = max(2, math.ceil(length / 1.5))
        for index in range(count):
            fraction = (index + 0.5) / count
            x = rect["x"] + rect["w"] * (fraction if along_x else 0.5)
            z = rect["z"] + rect["d"] * (0.5 if along_x else fraction)
            hit = ray((x, -z, room.get("level", 0) * FLOOR_HEIGHT + 0.08), (0, 0, 1), 1.97)
            check(not hit[0], f"Corridor {room['id']}: decor blocks the 2.05 m clearance at {(x, z)}")
            corridor_samples += 1
    METRICS["interiors"] = {"gypsum_segments": gypsum_parts, "mounted_artworks": len(meshes("Artwork frame")), "wall_televisions": len(meshes("Wall television chassis")), "max_wall_decor_mount_gap_m": round(max(mount_distances, default=-1), 6), "visible_art_surfaces": len(visible_surfaces), "corridor_clearance_rays": corridor_samples}


def audit_pantry(game_map: dict) -> None:
    room = next(room for room in game_map["rooms"] if room["id"] == "copa")
    rect = room["rect"]
    floor_tree = surface_tree(meshes("Floor finish") + meshes("Floor slab"))
    instances = {kind: furniture_instances(game_map, kind) for kind in ("coffee", "kitchen", "diningTable", "diningChair")}
    check(len(instances["coffee"]) == 1, "Pantry needs one separate floor-standing coffee machine")
    check(len(instances["diningTable"]) == 1 and len(instances["diningChair"]) == 6, "Pantry dining layout must have one table and six chairs")
    support_gaps = []
    dimensions = {"coffee": (0.85, 0.82, 1.95), "diningTable": (2.8, 1.2, 0.78), "diningChair": (0.52, 0.56, 0.9)}
    for kind, size in dimensions.items():
        for instance in instances[kind]:
            prop = instance["placement"]
            low, high = instance["bounds"]
            check(prop.get("y", 0) == 0, f"{kind}: placement still has a raised countertop offset")
            cosine, sine = abs(math.cos(prop.get("rot", 0))), abs(math.sin(prop.get("rot", 0)))
            expected = (size[0] * cosine + size[1] * sine, size[0] * sine + size[1] * cosine, size[2])
            actual = high - low
            check(all(abs(actual[axis] - expected[axis]) < 0.035 for axis in range(3)), f"{kind}: unexpected actual dimensions {tuple(round(value, 4) for value in actual)}, expected {expected}")
            check(low.x > rect["x"] + 0.2 and high.x < rect["x"] + rect["w"] - 0.2 and low.y > -rect["z"] - rect["d"] + 0.2 and high.y < -rect["z"] - 0.2, f"{kind}: furniture penetrates a pantry perimeter wall")
            vertices = [obj.matrix_world @ vertex.co for obj in instance["objects"] for vertex in obj.data.vertices]
            feet = [point for point in vertices if point.z <= low.z + 0.015]
            check(bool(feet), f"{kind}: no actual base vertices found")
            for point in feet[::max(1, len(feet) // 24)]:
                hit = floor_tree.ray_cast(point + Vector((0, 0, 0.2)), Vector((0, 0, -1)), 0.4)
                gap = point.z - hit[0].z if hit[0] is not None else None
                check(gap is not None and -0.06 <= gap <= 0.015, f"{kind}: base is unsupported by the floor, separation={gap}")
                if gap is not None:
                    support_gaps.append(max(0, gap))

    coffee_clearances = []
    for coffee in instances["coffee"]:
        low, high = coffee["bounds"]
        for kitchen in instances["kitchen"]:
            other_low, other_high = kitchen["bounds"]
            gap = math.hypot(max(0, low.x - other_high.x, other_low.x - high.x), max(0, low.y - other_high.y, other_low.y - high.y))
            coffee_clearances.append(gap)
            check(gap >= 0.2, f"Coffee machine is not visibly separate from kitchen cabinetry: {gap:.4f} m")

    dining = instances["diningTable"] + instances["diningChair"]
    dining_trees = [surface_tree(instance["objects"]) for instance in dining]
    for index, tree in enumerate(dining_trees):
        for other in range(index + 1, len(dining_trees)):
            check(not tree.overlap(dining_trees[other]), f"Dining furniture intersects: instances {index} and {other}")
    chair_alignments = []
    for chair in instances["diningChair"]:
        position = Vector((chair["placement"]["x"], -chair["placement"]["z"], 0))
        if not instances["diningTable"]:
            break
        table = min(instances["diningTable"], key=lambda item: (item["placement"]["x"] - position.x) ** 2 + (-item["placement"]["z"] - position.y) ** 2)
        toward_table = Vector((table["placement"]["x"], -table["placement"]["z"], 0)) - position
        check(0.8 < toward_table.length < 2.1, f"Dining chair is not arranged around its table: distance={toward_table.length:.4f} m")
        base = chair["placement"].get("level", 0) * FLOOR_HEIGHT
        back_points = [obj.matrix_world @ vertex.co for obj in chair["objects"] for vertex in obj.data.vertices if (obj.matrix_world @ vertex.co).z > base + 0.65]
        check(bool(back_points), "Dining chair is missing its high backrest")
        if back_points:
            back_low, back_high = bounds(back_points)
            front = position - (back_low + back_high) / 2
            front.z = 0
            alignment = front.normalized().dot(toward_table.normalized())
            chair_alignments.append(alignment)
            check(alignment > 0.7, f"Dining chair backrest faces toward the table: alignment={alignment:.4f}")
    METRICS["pantry"] = {"coffee_machines": len(instances["coffee"]), "dining_tables": len(instances["diningTable"]), "dining_chairs": len(instances["diningChair"]), "maximum_base_gap_m": round(max(support_gaps, default=-1), 6), "minimum_coffee_cabinet_clearance_m": round(min(coffee_clearances, default=-1), 4), "minimum_chair_facing_alignment": round(min(chair_alignments, default=-1), 4)}


def audit_bathroom(game_map: dict) -> None:
    room = next(room for room in game_map["rooms"] if room["id"] == "banheiro")
    storage = next(room for room in game_map["rooms"] if room["id"] == "deposito")
    check(not any(door["side"] == "south" for door in room["doors"]), "Bathroom still has a portal toward storage")
    check(not any(door["side"] == "north" for door in storage["doors"]), "Storage still opens directly into the bathroom")
    check(not meshes("Bathroom floating stall door"), "Old floating glass stall doors remain")
    sides = sorted(meshes("Bathroom privacy partition"), key=lambda obj: object_bounds(obj)[0].x)
    doors = meshes("Bathroom closed stall door")
    fronts = meshes("Bathroom fixed front panel")
    frames = meshes("Bathroom cubicle frame")
    check(len(sides) == 3 and len(doors) == 2 and bool(fronts) and bool(frames), "Bathroom is missing complete two-cubicle partitions, opaque doors or frames")
    for obj in sides + doors + fronts:
        for material in obj.data.materials:
            shader = material.node_tree.nodes.get("Principled BSDF") if material and material.use_nodes else None
            opaque = shader is not None and shader.inputs["Alpha"].default_value >= 0.99 and shader.inputs["Transmission Weight"].default_value <= 0.01
            check(opaque and "glass" not in material.name.lower(), f"Bathroom privacy surface is translucent: {obj.name}")
    for door in doors:
        low, high = object_bounds(door)
        check(abs(high.x - low.x - 1.02) < 0.004 and abs(low.z - 0.12) < 0.004 and abs(high.z - 2.26) < 0.004, f"Bathroom door has incorrect coverage: {door.name}")

    wall_tree = surface_tree(meshes("Continuous architectural walls"))
    frame_tree = surface_tree(frames)
    hinge_tree = surface_tree(meshes("Bathroom door hinge"))
    uprights = meshes("Bathroom cubicle frame upright")
    check(len(uprights) == 3, "Bathroom cabin frames need three grounded front uprights")
    for upright in uprights:
        low, high = object_bounds(upright)
        check(abs(low.z) < 0.004 and abs(high.z - 2.34) < 0.004, f"Bathroom frame is not grounded: {upright.name}")
    for side in sides:
        low, high = object_bounds(side)
        hit = wall_tree.ray_cast(Vector(((low.x + high.x) / 2, low.y + 0.3, 1.1)), Vector((0, -1, 0)), 0.5)
        check(hit[0] is not None and hit[0].y >= low.y - 0.015, f"Bathroom partition stops short of the rear wall: {side.name}")
        check(bool(frame_tree.overlap(surface_tree([side]))), f"Bathroom partition is disconnected from its grounded frame: {side.name}")
    for door in doors:
        check(bool(hinge_tree.overlap(surface_tree([door]))), f"Bathroom closed door has no attached hinges: {door.name}")

    partitions = surface_tree(sides)
    frontal = surface_tree(fronts + doors + frames)
    privacy_samples = 0
    side_bounds = [object_bounds(obj) for obj in sides]
    for low, high in side_bounds:
        check(abs(high.x - low.x - 0.085) < 0.004 and abs(low.z - 0.1) < 0.004 and abs(high.z - 2.32) < 0.004, "Bathroom side partition has wrong thickness or privacy height")
        center_x = (low.x + high.x) / 2
        for fraction in (0.08, 0.3, 0.5, 0.7, 0.92):
            y = low.y + fraction * (high.y - low.y)
            for height in (0.4, 1.1, 1.7, 2.1):
                hit = partitions.ray_cast(Vector((center_x - 0.2, y, height)), Vector((1, 0, 0)), 0.4)
                check(hit[0] is not None, f"Bathroom privacy hole in side partition at {(center_x, y, height)}")
                privacy_samples += 1
    for (left_low, left_high), (right_low, right_high) in zip(side_bounds, side_bounds[1:]):
        start, end = left_high.x, right_low.x
        front_y = max(left_high.y, right_high.y)
        seams = [value for door in doors for value in (object_bounds(door)[0].x, object_bounds(door)[1].x)]
        sample_count = math.ceil((end - start) / 0.07)
        for index in range(sample_count):
            x = start + (index + 0.5) * (end - start) / sample_count
            if any(abs(x - seam) < 0.024 for seam in seams):
                continue
            for height in (0.4, 1.1, 1.7, 2.1):
                hit = frontal.ray_cast(Vector((x, front_y + 0.25, height)), Vector((0, -1, 0)), 0.5)
                check(hit[0] is not None, f"Bathroom cubicle front remains open at {(x, front_y, height)}")
                privacy_samples += 1

    rect = room["rect"]
    south = -rect["z"] - rect["d"]
    storage_wall_samples = 0
    for index in range(math.ceil(rect["w"] / 0.3)):
        x = rect["x"] + 0.2 + index * (rect["w"] - 0.4) / (math.ceil(rect["w"] / 0.3) - 1)
        for height in (0.4, 1.1, 1.7, 2.1):
            hit = wall_tree.ray_cast(Vector((x, south + 0.5, height)), Vector((0, -1, 0)), 1.0)
            check(hit[0] is not None, f"Bathroom-storage wall is not continuous at {(x, south, height)}")
            storage_wall_samples += 1
    METRICS["bathroom"] = {"side_partitions": len(sides), "opaque_closed_doors": len(doors), "privacy_rays": privacy_samples, "closed_storage_wall_rays": storage_wall_samples}


def audit_cabinet_wall_mounts() -> None:
    wall_tree = surface_tree(meshes("Continuous architectural walls"))
    components = (
        ("bathroomVanity", "Active display", "vanity mirror", 0, 3),
        ("bathroomVanity", "Walnut", "vanity carcass", 0, 3),
        ("bathroomVanity", "Quartz stone", "vanity countertop", 0, 3),
        ("kitchen", "Warm white", "kitchen lower cabinets", 0, 0.8),
        ("kitchen", "Warm white", "kitchen upper cabinets", 1.4, 3),
        ("kitchen", "Quartz stone", "kitchen countertop", 0, 3),
    )
    results = []
    for kind, finish, label, bottom, top in components:
        objects = [obj for obj in meshes(f"{kind} ·") if any(material and material.name.startswith(finish) for material in obj.data.materials)]
        points = [obj.matrix_world @ vertex.co for obj in objects for vertex in obj.data.vertices if bottom <= (obj.matrix_world @ vertex.co).z <= top]
        check(bool(points), f"Missing mounted component: {label}")
        if not points:
            continue
        low, high = bounds(points)
        gaps = []
        for along in (0.1, 0.5, 0.9):
            for elevation in (0.08, 0.5, 0.95):
                y = low.y + (high.y - low.y) * along
                z = low.z + (high.z - low.z) * elevation
                hit = wall_tree.ray_cast(Vector((high.x - 0.25, y, z)), Vector((1, 0, 0)), 0.55)
                gap = hit[0].x - high.x if hit[0] is not None else None
                check(gap is not None and -0.08 <= gap <= 0.02, f"{label}: rear mounting is not attached to opaque wall at {(round(y, 4), round(z, 4))}, gap={gap}")
                if gap is not None:
                    gaps.append(gap)
        results.append({"component": label, "rear_x_m": round(high.x, 4), "maximum_positive_gap_m": round(max((max(0, gap) for gap in gaps), default=-1), 6), "maximum_wall_embedding_m": round(max((max(0, -gap) for gap in gaps), default=-1), 6), "mounting_rays": len(gaps)})
    METRICS["cabinet_wall_mounts"] = results


def audit_exterior() -> None:
    ground = bpy.data.objects.get("Exterior continuous park ground")
    check(ground is not None, "Missing exterior ground")
    if ground is None:
        return
    ground_top = object_bounds(ground)[1].z
    grounded = meshes("Landscape tree trunk") + meshes("Distant grounded neighborhood buildings") + meshes("Office foundations continuous down to ground")
    ground_gaps = []
    for obj in grounded:
        for low, _ in parts(obj):
            gap = low.z - ground_top
            ground_gaps.append(abs(gap))
            check(abs(gap) < 0.005, f"Exterior object {obj.name} floats {gap:.4f} m above ground")
    beams = meshes("Terrace pergola side beam") + meshes("Terrace pergola cross beam") + meshes("Terrace pergola center spine")
    beam_tree = surface_tree(beams)
    supports = []
    for obj in meshes("Terrace integrated LED") + meshes("Terrace solar louver"):
        tree = surface_tree([obj])
        if tree.overlap(beam_tree):
            gap = 0.0
        else:
            evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
            mesh = evaluated.to_mesh()
            samples = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
            samples.extend(evaluated.matrix_world @ polygon.center for polygon in mesh.polygons)
            gap = min(beam_tree.find_nearest(point)[3] for point in samples)
            evaluated.to_mesh_clear()
        supports.append({"object": obj.name, "gap_m": round(gap, 5)})
        check(gap <= 0.01, f"Pergola element {obj.name}: unsupported sampled separation {gap:.5f} m")
    for obj in meshes("Terrace pergola column"):
        low, high = object_bounds(obj)
        center = (low + high) / 2
        check(abs(low.z - FLOOR_HEIGHT) < 0.003, f"Pergola column {obj.name}: floating base")
        hit = beam_tree.ray_cast(Vector((center.x, center.y, high.z - 0.1)), Vector((0, 0, 1)), 0.25)
        check(hit[0] is not None, f"Pergola column {obj.name}: no supporting beam at top")
    METRICS["exterior"] = {"ground_top_m": round(ground_top, 4), "grounded_parts": len(ground_gaps), "maximum_ground_gap_m": round(max(ground_gaps, default=-1), 6), "pergola_supports": supports}


def audit_removed_garage(game_map: dict) -> None:
    check(any(room["id"] == "apoio" for room in game_map["rooms"]), "Replacement support room is absent")
    check(not any(room["id"] == "garagem" for room in game_map["rooms"]), "Garage remains in map")
    check(not any(prop["kind"] in ("car", "sportCar", "cone") for prop in game_map["props"]), "Vehicle/cone placements remain in map")
    forbidden = [obj.name for obj in bpy.context.scene.objects if obj.name.startswith(("car ·", "sportCar ·", "cone ·", "Garage parking"))]
    check(not forbidden, f"Garage geometry remains in scene: {forbidden}")
    check("garagem" not in json.dumps(game_map, ensure_ascii=False).lower(), "Garage task/vent references remain in map")
    METRICS["garage_removed"] = not forbidden


def audit_glb(path: Path) -> None:
    data = path.read_bytes()
    magic, version, length = struct.unpack_from("<III", data, 0)
    check(magic == 0x46546C67 and version == 2 and length == len(data), "Exported GLB has an invalid header")
    json_length = struct.unpack_from("<I", data, 12)[0]
    gltf = json.loads(data[20:20 + json_length])
    check(not gltf.get("cameras") and not gltf.get("animations") and not gltf.get("extensions", {}).get("KHR_lights_punctual"), "GLB includes presentation cameras/lights/animations")
    calls = sum(len(mesh["primitives"]) for mesh in gltf.get("meshes", []))
    check(calls <= 72, f"GLB exceeds draw-call budget: {calls}")
    materials = gltf.get("materials", [])
    check(len(materials) <= 72, f"GLB exceeds material budget: {len(materials)}")
    car_materials = [material["name"] for material in materials if any(token in material.get("name", "").lower() for token in ("carpaint", "rubber tires", "coupe", "license plate"))]
    check(not car_materials, f"Vehicle materials remain in GLB: {car_materials}")
    source_triangles = 0
    source_vertices = []
    graph = bpy.context.evaluated_depsgraph_get()
    for obj in bpy.context.scene.objects:
        if obj.type not in ("MESH", "CURVE", "FONT"):
            continue
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        source_triangles += len(mesh.loop_triangles)
        source_vertices.extend(evaluated.matrix_world @ vertex.co for vertex in mesh.vertices)
        evaluated.to_mesh_clear()
    source_bounds = bounds(source_vertices)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
    bpy.context.view_layer.update()
    exported_bounds = bounds(obj.matrix_world @ vertex.co for obj in imported for vertex in obj.data.vertices)
    bound_error = max((a - b).length for a, b in zip(source_bounds, exported_bounds))
    check(bound_error < 0.02, f"GLB spatial extent differs from editable source by {bound_error:.5f} m")
    imported_triangles = 0
    for obj in imported:
        obj.data.calc_loop_triangles()
        imported_triangles += len(obj.data.loop_triangles)
    check(imported_triangles == source_triangles, f"GLB triangle count differs from editable source: {source_triangles} -> {imported_triangles}")
    panes = [obj for obj in imported if any(material and material.name.startswith("Glass · clear fixed exterior windows") for material in obj.data.materials)]
    imported_windows = sum(len(parts(obj)) for obj in panes)
    check(imported_windows == METRICS["windows"]["apertures"], f"GLB loses window apertures: {imported_windows}")
    METRICS["glb"] = {"bytes": len(data), "draw_calls": calls, "materials": len(materials), "source_triangles": source_triangles, "imported_triangles": imported_triangles, "source_bounds_error_m": round(bound_error, 6), "imported_window_panes": imported_windows}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--blend", type=Path, default=ROOT / "assets/models/deducao/timbas-office-building.blend")
    parser.add_argument("--map", type=Path, default=ROOT / "assets/models/deducao/office-map.json")
    parser.add_argument("--glb", type=Path, default=ROOT / "public/models/games/deducao/timbas-office-building.glb")
    arguments = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    originals = {path: hashlib.sha256(path.read_bytes()).hexdigest() for path in (arguments.blend, arguments.map, arguments.glb)}
    bpy.ops.wm.open_mainfile(filepath=str(arguments.blend))
    bpy.context.view_layer.update()
    game_map = json.loads(arguments.map.read_text(encoding="utf-8"))
    audit_portals(game_map)
    audit_stairs(game_map)
    audit_fixtures_and_sconces()
    audit_windows()
    audit_interiors(game_map)
    audit_pantry(game_map)
    audit_bathroom(game_map)
    audit_cabinet_wall_mounts()
    audit_exterior()
    audit_removed_garage(game_map)
    audit_glb(arguments.glb)
    for path, digest in originals.items():
        check(hashlib.sha256(path.read_bytes()).hexdigest() == digest, f"Read-only invariant violated: {path}")
    print(json.dumps({"metrics": METRICS, "failures": FAILURES, "read_only": True}, ensure_ascii=False, indent=2))
    if FAILURES:
        raise RuntimeError(f"Architecture audit failed: {len(FAILURES)} issue(s)")
    print("ARCHITECTURE AUDIT PASSED")


if __name__ == "__main__":
    main()
