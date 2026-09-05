"""Audita cadeiras de escritório no .blend salvo, sem gerar ou salvar assets.

Uso: blender --background --python-exit-code 1 --python
scripts/check-office-seating-blender.py [-- --blend caminho --map caminho]

A frente é medida pelo encosto da malha real, não inferida da rotação do mapa.
Cada cadeira precisa pertencer a um escritório/reunião e servir à mesa mais
próxima do mesmo cômodo/andar. Mesas longas usam o ponto projetado na borda,
não o centro: assentos laterais nas pontas não devem olhar diagonalmente.
Verifica alinhamento longitudinal, intervalo físico cadeira/tampo e hashes.
Bounds são conservadores e não substituem testes de circulação do servidor.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import runpy
import sys

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
ARCHITECTURE = runpy.run_path(str(Path(__file__).with_name("check-office-architecture-blender.py")))
FAILURES = ARCHITECTURE["FAILURES"]
check = ARCHITECTURE["check"]
furniture_instances = ARCHITECTURE["furniture_instances"]
bounds = ARCHITECTURE["bounds"]
FLOOR_HEIGHT = ARCHITECTURE["FLOOR_HEIGHT"]
DESK_ROOMS = {"openspace", "operacoes", "apoio", "chefe"}
MEETING_ROOMS = {"reuniao", "conselho"}


def room_at(game_map: dict, placement: dict) -> str:
    for room in game_map["rooms"]:
        rect = room["rect"]
        if (room.get("level", 0) == placement.get("level", 0)
                and rect["x"] <= placement["x"] <= rect["x"] + rect["w"]
                and rect["z"] <= placement["z"] <= rect["z"] + rect["d"]):
            return room["id"]
    return "outside"


def origin(placement: dict) -> Vector:
    return Vector((placement["x"], -placement["z"], placement.get("level", 0) * FLOOR_HEIGHT + placement.get("y", 0)))


def points(instance: dict) -> list[Vector]:
    return [obj.matrix_world @ vertex.co for obj in instance["objects"] for vertex in obj.data.vertices]


def audit_seating(game_map: dict) -> list[dict]:
    chairs = furniture_instances(game_map, "chair")
    tables = furniture_instances(game_map, "desk") + furniture_instances(game_map, "meetingTable")
    results = []
    for chair in chairs:
        placement = chair["placement"]
        room = room_at(game_map, placement)
        label = f"{room}: chair ({placement['x']:.3f}, {placement['z']:.3f})"
        check(room in DESK_ROOMS | MEETING_ROOMS, f"{label}: office chair remains outside an intentional work/meeting area")
        expected_kind = "meetingTable" if room in MEETING_ROOMS else "desk"
        candidates = [table for table in tables if table["placement"]["kind"] == expected_kind
                      and table["placement"].get("level", 0) == placement.get("level", 0)
                      and room_at(game_map, table["placement"]) == room]
        check(bool(candidates), f"{label}: no matching table in the same room/floor")
        if not candidates:
            continue
        chair_origin = origin(placement)
        table = min(candidates, key=lambda item: (origin(item["placement"]) - chair_origin).length_squared)
        table_origin = origin(table["placement"])
        chair_points = points(chair)
        back_points = [point for point in chair_points if 1.0 < point.z - chair_origin.z < 1.4]
        check(bool(back_points), f"{label}: cannot identify the actual ergonomic backrest")
        if not back_points:
            continue
        back_center = sum(back_points, Vector()) / len(back_points)
        front = Vector((chair_origin.x - back_center.x, chair_origin.y - back_center.y, 0))
        check(0.15 < front.length < 0.6, f"{label}: backrest is not attached to its mapped chair")
        if front.length < 0.001:
            continue
        front.normalize()
        inverse = Matrix.Rotation(-table["placement"].get("rot", 0), 3, "Z")
        local_points = [inverse @ (point - table_origin) for point in points(table)]
        low, high = bounds(local_points)
        chair_local = inverse @ (chair_origin - table_origin)
        outside = [max(low[axis] - chair_local[axis], 0, chair_local[axis] - high[axis]) for axis in (0, 1)]
        check(sum(value > 0.001 for value in outside) == 1, f"{label}: chair center is inside the tabletop footprint or beyond a corner")
        if max(outside) <= 0.001:
            continue
        axis = 0 if outside[0] > outside[1] else 1
        tangent = 1 - axis
        target = chair_local.copy()
        target[axis] = max(low[axis], min(high[axis], chair_local[axis]))
        direction = target - chair_local
        direction.z = 0
        direction.normalize()
        facing_dot = (inverse @ front).dot(direction)
        check(facing_dot > 0.7, f"{label}: actual backrest faces away from its {expected_kind}, facing_dot={facing_dot:.4f}")
        local_chair = [inverse @ (point - chair_origin) for point in chair_points]
        low_chair, high_chair = bounds(local_chair)
        check(chair_local[tangent] + low_chair[tangent] >= low[tangent] - 0.04
              and chair_local[tangent] + high_chair[tangent] <= high[tangent] + 0.04,
              f"{label}: chair projects past the longitudinal edge of its table")
        forward_extent = max(point.dot(direction) for point in local_chair)
        clearance = outside[axis] - forward_extent
        check(-0.035 <= clearance <= 0.7, f"{label}: chair/table separation is not intentional, edge_clearance={clearance:.4f} m")
        results.append({"room": room, "chair": [round(placement["x"], 4), round(placement["z"], 4)],
                        "table": expected_kind, "table_center": [round(table["placement"]["x"], 4), round(table["placement"]["z"], 4)],
                        "facing_dot": round(facing_dot, 5), "edge_clearance_m": round(clearance, 5)})
    check(len(results) == len(chairs), f"Unattached seating: only {len(results)} of {len(chairs)} chairs have a measurable table relationship")
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--blend", type=Path, default=ROOT / "assets/models/deducao/timbas-office-building.blend")
    parser.add_argument("--map", type=Path, default=ROOT / "assets/models/deducao/office-map.json")
    arguments = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    originals = {path: hashlib.sha256(path.read_bytes()).hexdigest() for path in (arguments.blend, arguments.map)}
    bpy.ops.wm.open_mainfile(filepath=str(arguments.blend))
    bpy.context.view_layer.update()
    game_map = json.loads(arguments.map.read_text(encoding="utf-8"))
    results = audit_seating(game_map)
    for path, digest in originals.items():
        check(hashlib.sha256(path.read_bytes()).hexdigest() == digest, f"Read-only invariant violated: {path}")
    print(json.dumps({"mapped_office_chairs": sum(prop["kind"] == "chair" for prop in game_map["props"]),
                      "attached_office_chairs": len(results), "seating": results, "failures": FAILURES, "read_only": True}, ensure_ascii=False, indent=2))
    if FAILURES:
        raise RuntimeError(f"Office seating audit failed: {len(FAILURES)} issue(s)")
    print("OFFICE SEATING AUDIT PASSED")


if __name__ == "__main__":
    main()
