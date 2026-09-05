"""Audita origem, articulações, viseira integrada, materiais e GLBs do tripulante."""

from collections import Counter
import hashlib
import json
from pathlib import Path
import struct

import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/models/deducao/timbas-crew-character.blend"
FILES = [ROOT / f"public/models/games/deducao/timbas-crew-{name}.glb" for name in ("character", "corpse")]
PROTECTED = [SOURCE, *FILES]
BACKUP = SOURCE.with_suffix(".blend1")
if BACKUP.exists():
    PROTECTED.append(BACKUP)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def vertices(obj):
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    result = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    evaluated.to_mesh_clear()
    return result


def bounds(objects):
    points = [point for obj in objects if obj.type == "MESH" for point in vertices(obj)]
    return tuple(Vector(tuple(function(point[axis] for point in points) for axis in range(3))) for function in (min, max))


def assert_close(actual, expected, message, tolerance=0.0002):
    assert (actual - expected).length <= tolerance, f"{message}: {tuple(actual)} != {tuple(expected)}"


def check_source():
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    live = bpy.data.collections["Timbas Crew Character"]
    corpse = bpy.data.collections["Timbas Crew Corpse"]
    assert all(obj.type in ("EMPTY", "MESH") for obj in bpy.data.objects), "Apresentação contaminou o arquivo editável"
    low, high = bounds(live.all_objects)
    assert abs(low.z) < 0.0001 and abs(high.z - 1.94) < 0.0001, "Origem ou altura do tripulante mudou"
    assert high.x - low.x < 0.94, "Largura incompatível com o ator"
    assert live.objects["BodyRig"].parent == live.objects["CrewCharacterRoot"]
    for side, label in ((-1, "Left"), (1, "Right")):
        for limb, expected in (("Arm", Vector((side * 0.345, 0, 1.37))), ("Leg", Vector((side * 0.14, 0, 0.89)))):
            rig = live.objects[f"{label}{limb}Rig"]
            assert rig.parent == live.objects["BodyRig"], "Articulação deixou de seguir o corpo"
            assert_close(rig.matrix_world.translation, expected, "Pivô mudou")
            assert len(rig.children) == 2, "Partes do membro perderam o pivô comum"
        boot = next(obj for obj in live.all_objects if obj.name.startswith(f"{label} Technical Boot"))
        assert abs(bounds([boot])[0].z) < 0.0001, "Bota flutua no chão"
    torso = [obj for obj in live.all_objects if obj.name.startswith("Tailored Torso")]
    assert len(torso) == 1, "Torso voltou a ser um conjunto de volumes sobrepostos"

    helmet = [obj for obj in live.all_objects if obj.name.startswith("Helmet Shell")]
    assert len(helmet) == 4, "Casco, moldura, visor e marca precisam da mesma superfície"
    edge_count = Counter()
    for obj in helmet:
        coords = [tuple(round(value, 7) for value in vertex.co) for vertex in obj.data.vertices]
        for polygon in obj.data.polygons:
            indices = list(polygon.vertices)
            for a, b in zip(indices, indices[1:] + indices[:1]):
                edge_count[tuple(sorted((coords[a], coords[b])))] += 1
    assert all(count == 2 for count in edge_count.values()), "Casco possui abertura ou visor sem encaixe"
    visor = next(obj for obj in helmet if obj.data.materials[0].name == "Crew Visor")
    frame = next(obj for obj in helmet if obj.data.materials[0].name == "Crew Dark Uniform")
    tree = KDTree(len(frame.data.vertices))
    for index, vertex in enumerate(frame.data.vertices):
        tree.insert(frame.matrix_world @ vertex.co, index)
    tree.balance()
    for point in vertices(visor):
        assert tree.find(point)[2] < 0.0001, "Viseira flutuando fora da moldura"
    visor_low, visor_high = bounds([visor])
    assert visor_high.x - visor_low.x > 0.49, "Visor perdeu leitura panorâmica"
    assert 0.20 < visor_high.z - visor_low.z < 0.24, "Visor saiu da faixa do capacete"
    assert visor_high.y - visor_low.y > 0.08, "Viseira voltou a ser uma caixa plana"

    corpse_low, corpse_high = bounds(corpse.all_objects)
    assert abs(corpse_low.z) < 0.0001 and corpse_high.z < 0.65, f"Cadáver não repousa no piso: {tuple(corpse_low)} .. {tuple(corpse_high)}"
    for label in ("Left", "Right"):
        for part in ("Technical Boot", "Glove and Cuff"):
            obj = next(obj for obj in corpse.all_objects if obj.name.startswith(f"{label} {part}"))
            contact = bounds([obj])[0].z
            assert -0.001 <= contact <= 0.008, f"{label} {part} sem apoio real no piso: {contact:.6f} m"
            print(f"OK apoio {label} {part}: {contact * 1000:.3f} mm")
    return (low, high), (corpse_low, corpse_high)


def check_glb(path, expected_bounds, index):
    raw = path.read_bytes()
    assert raw[:4] == b"glTF" and struct.unpack_from("<I", raw, 4)[0] == 2
    length = struct.unpack_from("<I", raw, 12)[0]
    gltf = json.loads(raw[20:20 + length])
    primitives = [primitive for mesh in gltf["meshes"] for primitive in mesh["primitives"]]
    triangles = sum(gltf["accessors"][primitive["indices"]]["count"] // 3 for primitive in primitives)
    assert len(primitives) <= (12 if index == 0 else 5), "Draw calls acima do orçamento"
    assert triangles <= (2000 if index == 0 else 2400), "Topologia desnecessária para a silhueta"
    assert len(raw) < 40_000 and len(gltf["materials"]) <= (4 if index == 0 else 5)
    assert not any(gltf.get(name) for name in ("cameras", "animations", "skins", "textures"))
    assert not gltf.get("extensions", {}).get("KHR_lights_punctual"), "Luz de apresentação exportada"
    assert all("KHR_draco_mesh_compression" in primitive.get("extensions", {}) for primitive in primitives)
    materials = {material["name"]: material for material in gltf["materials"]}
    for name in ("Crew Body Color", "Crew Dark Uniform"):
        material = materials[name]
        pbr = material["pbrMetallicRoughness"]
        assert pbr["roughnessFactor"] >= 0.6 and pbr["metallicFactor"] <= 0.03, "Uniforme voltou a parecer metal"
        assert not material.get("extensions", {}).get("KHR_materials_clearcoat"), "Tecido com camada brilhante"
    assert max(materials["Crew Dark Uniform"]["pbrMetallicRoughness"]["baseColorFactor"][:3]) < 0.1
    assert max(materials["Crew Visor"]["emissiveFactor"]) < 0.025, "Visor virou uma lâmpada"
    assert all(not material.get("doubleSided") and material.get("alphaMode", "OPAQUE") == "OPAQUE" for material in materials.values())

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    actual = bounds(bpy.context.scene.objects)
    assert_close(actual[0], expected_bounds[0], "Base mudou na exportação", 0.0005)
    assert_close(actual[1], expected_bounds[1], "Envelope mudou na exportação", 0.0005)
    if index == 0:
        for name in ("BodyRig", "LeftArmRig", "RightArmRig", "LeftLegRig", "RightLegRig"):
            assert bpy.data.objects.get(name), f"Pivô {name} perdido pelo GLB"
    print(f"OK {path.name}: {len(primitives)} draws, {triangles} triângulos, {len(materials)} materiais, {len(raw)} bytes; envelope {tuple(actual[0])} .. {tuple(actual[1])}")


before = {path: digest(path) for path in PROTECTED}
try:
    envelopes = check_source()
    for index, path in enumerate(FILES):
        check_glb(path, envelopes[index], index)
    print("OK pés, pivôs, torso contínuo, visor integrado, cadáver apoiado, Draco e materiais foscos")
finally:
    assert all(digest(path) == value for path, value in before.items()), "A auditoria alterou um modelo ou backup"
