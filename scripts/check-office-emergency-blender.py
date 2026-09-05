"""Confere as luminárias dinâmicas de emergência contra o prédio salvo, sem salvar.

Usa emergencyPlacements do cliente e emergency-light.glb, incluindo todas as
transformações dos nós. Verifica apoio no teto, corpo/difusor visíveis por baixo
e ausência de interseções com gesso. Um canário reproduz o encaixe antigo dentro
da sanca para garantir que o teste detecta uma peça completamente enterrada.
Confere também as seis fontes decorativas azuis/amarelas com seus difusores.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import runpy
import subprocess

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
BUILDING = ROOT / "assets/models/deducao/timbas-office-building.blend"
MODEL = ROOT / "public/models/games/deducao/emergency-light.glb"
MAP = ROOT / "assets/models/deducao/office-map.json"
SOURCE = ROOT / "app/(game)/games/deducao/[roomId]/scene/office-world.tsx"
PROFILE = SOURCE.with_name("lighting-profile.ts")
FLOOR_HEIGHT = 4.2
WALL_HEIGHT = 4.02


def client_placements() -> dict:
    javascript = r"""
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const path = 'app/(game)/games/deducao/[roomId]/scene/office-world.tsx';
const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['WALL_HEIGHT', 'STAIR_OPENING_HALF_WIDTH', 'STAIR_OPENING_END_PADDING', 'isInsideStairOpening', 'emergencyPlacements', 'accentLightSources'];
const selected = file.statements.filter(statement => ts.isFunctionDeclaration(statement)
  ? names.includes(statement.name?.text)
  : ts.isVariableStatement(statement) && statement.declarationList.declarations.some(declaration => names.includes(declaration.name.text)));
if (selected.length !== names.length) throw new Error('As posições reais do cliente não foram localizadas');
const printer = ts.createPrinter();
const profile = readFileSync('app/(game)/games/deducao/[roomId]/scene/lighting-profile.ts', 'utf8');
const text = profile + '\n' + selected.map(statement => printer.printNode(ts.EmitHint.Unspecified, statement, file)).join('\n');
const output = ts.transpileModule(text + '\nmodule.exports = { emergencyPlacements, accentLightSources };', { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports }, { filename: path, timeout: 1000 });
const map = JSON.parse(readFileSync('assets/models/deducao/office-map.json', 'utf8'));
const placements = name => [0, 1].flatMap(level => module.exports[name](map, level).map(placement => ({ ...placement, level })));
console.log(JSON.stringify({ emergencies: placements('emergencyPlacements'), accents: placements('accentLightSources') }));
"""
    result = subprocess.run(["node", "--input-type=module", "-e", javascript], cwd=ROOT, text=True, capture_output=True, check=True)
    return json.loads(result.stdout)


def main() -> None:
    helpers = runpy.run_path(str(ROOT / "scripts/check-office-architecture-blender.py"))
    check, object_bounds, surface_tree = (helpers[name] for name in ("check", "object_bounds", "surface_tree"))
    originals = {path: hashlib.sha256(path.read_bytes()).hexdigest() for path in (BUILDING, MODEL, MAP, SOURCE, PROFILE)}
    client = client_placements()
    placements = client["emergencies"]
    game_map = json.loads(MAP.read_text(encoding="utf-8"))
    check(len(placements) == 10, f"Expected ten physical emergency fixtures, got {len(placements)}")
    bpy.ops.wm.open_mainfile(filepath=str(BUILDING))
    bpy.context.view_layer.update()
    structure = surface_tree([obj for obj in bpy.context.scene.objects if obj.type == "MESH"])
    # O topo toca o forro e a face inferior da laje, com erro de float submicrométrico.
    obstructions = surface_tree([obj for obj in bpy.context.scene.objects if obj.type == "MESH" and not obj.name.startswith(("Seamless ceiling", "Floor slab"))])
    accent_diffusers = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.name.startswith("Atrium recessed LED diffuser")]
    assigned_diffusers = set()
    accent_gaps = []
    check(len(client["accents"]) == len(accent_diffusers) == 6, "All six decorative LEDs need their own light source")
    for light in client["accents"]:
        origin = Vector((light["x"], -light["z"], light["level"] * FLOOR_HEIGHT + light["y"]))
        fixture = min(accent_diffusers, key=lambda obj: (origin - sum(object_bounds(obj), Vector()) / 2).length)
        center = sum(object_bounds(fixture), Vector()) / 2
        check(abs(center.y - origin.y) < 0.001 and abs(center.z - origin.z) < 0.001, f"Decorative light is not aligned to its diffuser: {fixture.name}")
        direction = (center - origin).normalized()
        hit = bpy.context.scene.ray_cast(bpy.context.evaluated_depsgraph_get(), origin, direction, distance=0.12)
        check(hit[0] and hit[4] == fixture, f"Decorative light is inside geometry or lacks its visible diffuser: {fixture.name}")
        if hit[0]:
            gap = (hit[1] - origin).length
            accent_gaps.append(gap)
            check(0.07 < gap < 0.10, f"Decorative light must sit immediately in front of its diffuser: {fixture.name}")
        assigned_diffusers.add(fixture)
    check(len(assigned_diffusers) == 6, "Two decorative sources were assigned to the same diffuser")
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(MODEL))
    fixture_parts = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
    bpy.context.view_layer.update()
    check(len(fixture_parts) >= 2, "Emergency fixture needs both a physical housing and a separate diffuser")
    housing = [obj for obj in fixture_parts if not any(material.name.startswith("Red diffuser") for material in obj.data.materials if material)]
    diffuser = [obj for obj in fixture_parts if obj not in housing]
    check(bool(housing) and bool(diffuser), "Emergency GLB must retain the housing and emissive material")
    original_matrices = {obj: obj.matrix_world.copy() for obj in fixture_parts}
    maximum_mount_gap = 0
    visible_samples = 0

    def set_placement(placement: dict) -> None:
        matrix = Matrix.Translation((placement["x"], -placement["z"], placement["level"] * FLOOR_HEIGHT + placement["y"])) @ Matrix.Rotation(-placement["rot"], 4, "Z")
        for obj in fixture_parts:
            obj.matrix_world = matrix @ original_matrices[obj]
        bpy.context.view_layer.update()

    def blocked_samples() -> int:
        blocked = 0
        for obj in fixture_parts:
            low, high = object_bounds(obj)
            for fraction in (0.15, 0.5, 0.85):
                axis = 0 if high.x - low.x >= high.y - low.y else 1
                target = (low + high) / 2
                target[axis] = low[axis] + (high[axis] - low[axis]) * fraction
                target.z = low.z
                origin = target - Vector((0, 0, 0.3))
                hit = structure.ray_cast(origin, Vector((0, 0, 1)), 0.301)
                blocked += hit[0] is not None
        return blocked

    for placement in placements:
        set_placement(placement)
        label = f"floor {placement['level']} at {placement['x']:.2f}/{placement['z']:.2f}"
        low = min(object_bounds(obj)[0].z for obj in fixture_parts)
        high = max(object_bounds(obj)[1].z for obj in fixture_parts)
        ceiling = placement["level"] * FLOOR_HEIGHT + WALL_HEIGHT
        maximum_mount_gap = max(maximum_mount_gap, abs(high - ceiling))
        check(abs(high - ceiling) < 0.0001, f"Emergency {label}: housing is not attached to the ceiling")
        mount = Vector((placement["x"], -placement["z"], high - 0.002))
        support = structure.ray_cast(mount, Vector((0, 0, 1)), 0.003)
        check(support[0] is not None, f"Emergency {label}: ceiling support is missing")
        check(not obstructions.overlap(surface_tree(fixture_parts)), f"Emergency {label}: fixture geometry intersects a cornice, wall or decoration")
        check(blocked_samples() == 0, f"Emergency {label}: housing or diffuser is hidden inside the cornice")
        visible_samples += len(fixture_parts) * 3
        light_height = placement["level"] * FLOOR_HEIGHT + placement["y"] - 0.08
        check(0 < low - light_height < 0.03, f"Emergency {label}: light source is not immediately below the diffuser")

    legacy_hidden = 0
    for placement in placements:
        legacy = dict(placement)
        corridor = next(room for room in game_map["rooms"] if room["kind"] == "corredor"
                        and room.get("level", 0) == placement["level"]
                        and room["rect"]["x"] < placement["x"] < room["rect"]["x"] + room["rect"]["w"]
                        and room["rect"]["z"] < placement["z"] < room["rect"]["z"] + room["rect"]["d"])
        # O arranjo antigo usava 0,70 m, dentro da sanca de 0,48 a 0,90 m.
        if abs(legacy["rot"]) < 0.01:
            legacy["z"] = corridor["rect"]["z"] + 0.7
        else:
            legacy["x"] = corridor["rect"]["x"] + 0.7
        set_placement(legacy)
        legacy_hidden += blocked_samples() > 0
    check(legacy_hidden > 0, "Visibility audit failed to detect the deliberately buried legacy fixture")
    for path, digest in originals.items():
        check(hashlib.sha256(path.read_bytes()).hexdigest() == digest, f"Read-only invariant violated: {path}")
    failures = helpers["FAILURES"]
    print(json.dumps({"fixtures": len(placements), "housing_and_diffuser_samples": visible_samples, "maximum_ceiling_gap_m": maximum_mount_gap, "buried_legacy_fixtures_detected": legacy_hidden, "decorative_led_sources": len(assigned_diffusers), "decorative_source_diffuser_gaps_m": accent_gaps, "read_only": True, "failures": failures}, ensure_ascii=False, indent=2))
    if failures:
        raise RuntimeError(f"Emergency fixture audit failed: {len(failures)} issue(s)")
    print("EMERGENCY FIXTURE AUDIT PASSED")


if __name__ == "__main__":
    main()
