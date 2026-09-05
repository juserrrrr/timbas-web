"""Cria o personagem de escritório e o corpo reportável do Dedução.

Os pivôs de braços e pernas são preservados no GLB para a animação barata
acontecer no Three.js. O modelo do corpo morto já sai deitado e não depende de
girar uma cápsula genérica no navegador.
"""

from __future__ import annotations

import math
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "models" / "games" / "deducao"
BLEND_PATH = ROOT / "assets" / "models" / "deducao" / "timbas-crew-character.blend"
LIVE_PATH = OUTPUT / "timbas-crew-character.glb"
CORPSE_PATH = OUTPUT / "timbas-crew-corpse.glb"
PREVIEW_PATH = Path.home() / "AppData" / "Local" / "Temp" / "timbas-crew-character-v2-preview.png"


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
    roughness: float = 0.45,
    coat: float = 0,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0,
) -> bpy.types.Material:
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    result.use_backface_culling = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    set_input(shader, ("Base Color",), color)
    set_input(shader, ("Metallic",), metallic)
    set_input(shader, ("Roughness",), roughness)
    set_input(shader, ("Coat Weight", "Clearcoat"), coat)
    if coat:
        set_input(shader, ("Coat Roughness", "Clearcoat Roughness"), 0.25)
    if emission:
        set_input(shader, ("Emission Color", "Emission"), emission)
        set_input(shader, ("Emission Strength",), emission_strength)
    return result


BODY = make_material("Crew Body Color", (0.045, 0.23, 0.48, 1), metallic=0.02, roughness=0.68)
DARK = make_material("Crew Dark Uniform", (0.028, 0.04, 0.054, 1), metallic=0.02, roughness=0.76)
VISOR = make_material(
    "Crew Visor",
    (0.006, 0.025, 0.038, 1),
    metallic=0.18,
    roughness=0.23,
    coat=0.25,
    emission=(0.015, 0.16, 0.24, 1),
    emission_strength=0.08,
)
WHITE = make_material("Crew Badge White", (0.73, 0.8, 0.82, 1), roughness=0.58)
RED = make_material(
    "Crew Report Beacon",
    (0.58, 0.01, 0.02, 1),
    roughness=0.2,
    emission=(1, 0.01, 0.015, 1),
    emission_strength=2.1,
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


def empty(target: bpy.types.Collection, name: str, location=(0, 0, 0), parent=None) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = 0.12
    obj.location = location
    target.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


def parent_keep_world(obj: bpy.types.Object, parent: bpy.types.Object) -> None:
    bpy.context.view_layer.update()
    matrix = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = matrix


def rounded_box(target, name, size, location, finish, *, bevel=0.04, rotation=(0, 0, 0), parent=None):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = move_to(bpy.context.object, target)
    obj.name = name
    obj.scale = tuple(value / 2 for value in size)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("Tailored edge", "BEVEL")
    modifier.width = min(bevel, min(size) * 0.4)
    modifier.segments = 1
    obj.data.materials.append(finish)
    if parent:
        parent_keep_world(obj, parent)
    return obj


def cylinder(target, name, radius, depth, location, finish, *, rotation=(0, 0, 0), parent=None, vertices=20):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = move_to(bpy.context.object, target)
    obj.name = name
    obj.data.materials.append(finish)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    bevel = obj.modifiers.new("Soft cylinder edge", "BEVEL")
    bevel.width = min(radius * 0.13, 0.018)
    bevel.segments = 2
    if parent:
        parent_keep_world(obj, parent)
    return obj


def profile_mesh(target, name, rings, finish, *, x=0, parent=None, segments=16, exponent=0.72, material_for=None):
    """Superelipses conectadas dão costura e silhueta contínuas, sem empilhar esferas."""
    vertices = []
    for z, radius_x, radius_y, center_y in rings:
        for index in range(segments):
            angle = -math.pi + index * math.tau / segments
            sine, cosine = math.sin(angle), math.cos(angle)
            vertices.append((x + radius_x * math.copysign(abs(sine) ** exponent, sine),
                             center_y - radius_y * math.copysign(abs(cosine) ** exponent, cosine), z))
    faces_by_material = {finish: [tuple(reversed(range(segments)))]}
    for row in range(len(rings) - 1):
        for index in range(segments):
            material = material_for(row, index) if material_for else finish
            following = (index + 1) % segments
            face = (row * segments + index, row * segments + following,
                    (row + 1) * segments + following, (row + 1) * segments + index)
            faces_by_material.setdefault(material, []).append(face)
    faces_by_material[finish].append(tuple((len(rings) - 1) * segments + index for index in range(segments)))
    objects = []
    for material, faces in faces_by_material.items():
        mesh = bpy.data.meshes.new(f"{name} {material.name}")
        used = sorted({index for face in faces for index in face})
        remap = {original: index for index, original in enumerate(used)}
        mesh.from_pydata([vertices[index] for index in used], [], [tuple(remap[index] for index in face) for face in faces])
        mesh.update()
        obj = bpy.data.objects.new(f"{name} {material.name}", mesh)
        target.objects.link(obj)
        mesh.materials.append(material)
        for face in mesh.polygons:
            face.use_smooth = len(face.vertices) == 4
        if parent:
            parent_keep_world(obj, parent)
        objects.append(obj)
    return objects


def build_live_character(name="Timbas Crew Character", root_name="CrewCharacterRoot") -> tuple[bpy.types.Collection, bpy.types.Object]:
    target = collection(name)
    root = empty(target, root_name)
    body_rig = empty(target, "BodyRig", parent=root)

    profile_mesh(target, "Tailored Torso", [
        (0.84, 0.205, 0.145, 0), (0.94, 0.242, 0.17, 0), (1.22, 0.275, 0.19, 0),
        (1.34, 0.307, 0.198, 0), (1.40, 0.278, 0.18, 0), (1.46, 0.195, 0.15, 0),
    ], BODY, parent=body_rig)
    profile_mesh(target, "Uniform Belt", [(0.875, 0.231, 0.16, 0), (0.925, 0.243, 0.176, 0)], DARK, parent=body_rig)
    profile_mesh(target, "Helmet Collar", [(1.405, 0.198, 0.151, 0), (1.482, 0.207, 0.171, 0)], DARK, parent=body_rig)

    def helmet_material(row, index):
        angle = -math.pi + (index + 0.5) * math.tau / 24
        if row == 6 and index in (11, 12):
            return WHITE
        if row in (2, 3, 4) and abs(angle) < math.radians(75):
            return VISOR if row == 3 and abs(angle) < math.radians(60) else DARK
        return BODY

    profile_mesh(target, "Helmet Shell", [
        (1.44, 0.19, 0.16, 0), (1.48, 0.244, 0.209, 0), (1.535, 0.275, 0.232, 0),
        (1.56, 0.279, 0.236, 0), (1.775, 0.279, 0.236, 0), (1.80, 0.268, 0.227, 0),
        (1.895, 0.197, 0.166, 0), (1.94, 0.065, 0.06, 0),
    ], BODY, parent=body_rig, segments=24, material_for=helmet_material)
    rounded_box(target, "Compact Backpack", (0.35, 0.165, 0.43), (0, 0.227, 1.155), DARK, bevel=0.055, parent=body_rig)
    rounded_box(target, "Backpack Inset", (0.23, 0.018, 0.26), (0, 0.314, 1.165), BODY, bevel=0.022, parent=body_rig)
    rounded_box(target, "ID Badge", (0.09, 0.014, 0.12), (0.126, -0.187, 1.258), WHITE, bevel=0.008, parent=body_rig)
    rounded_box(target, "Badge ID Line", (0.053, 0.008, 0.017), (0.126, -0.198, 1.234), DARK, bevel=0.003, parent=body_rig)
    rounded_box(target, "Badge Clip", (0.028, 0.012, 0.024), (0.126, -0.191, 1.324), DARK, bevel=0.004, parent=body_rig)
    rounded_box(target, "Chest Seam", (0.016, 0.01, 0.28), (-0.04, -0.19, 1.155), DARK, bevel=0.003, parent=body_rig)

    for side, label in ((-1, "Left"), (1, "Right")):
        arm_rig = empty(target, f"{label}ArmRig", (side * 0.345, 0, 1.37), body_rig)
        profile_mesh(target, f"{label} Sleeve", [
            (0.96, 0.087, 0.097, -0.018), (1.08, 0.101, 0.112, -0.006),
            (1.26, 0.117, 0.13, 0), (1.37, 0.111, 0.119, 0), (1.408, 0.064, 0.07, 0),
        ], BODY, x=side * 0.345, parent=arm_rig, segments=12)
        profile_mesh(target, f"{label} Glove and Cuff", [
            (0.785, 0.065, 0.071, -0.036), (0.82, 0.095, 0.097, -0.034),
            (0.905, 0.098, 0.10, -0.029), (0.965, 0.089, 0.099, -0.019),
            (0.996, 0.094, 0.102, -0.014),
        ], DARK, x=side * 0.345, parent=arm_rig, segments=12)

        leg_rig = empty(target, f"{label}LegRig", (side * 0.14, 0, 0.89), body_rig)
        profile_mesh(target, f"{label} Trouser", [
            (0.19, 0.089, 0.101, 0), (0.36, 0.10, 0.11, 0),
            (0.59, 0.115, 0.123, 0), (0.78, 0.125, 0.133, 0), (0.915, 0.125, 0.13, 0),
        ], BODY, x=side * 0.14, parent=leg_rig, segments=12)
        profile_mesh(target, f"{label} Technical Boot", [
            (0.0, 0.107, 0.162, -0.044), (0.035, 0.12, 0.18, -0.044),
            (0.107, 0.121, 0.18, -0.044), (0.155, 0.106, 0.153, -0.028),
            (0.23, 0.097, 0.113, -0.008),
        ], DARK, x=side * 0.14, parent=leg_rig, segments=12)

    return target, root


def build_corpse() -> tuple[bpy.types.Collection, bpy.types.Object]:
    target, root = build_live_character("Timbas Crew Corpse", "CrewCorpseRoot")
    for side, label in ((-1, "Left"), (1, "Right")):
        arm = next(obj for obj in target.all_objects if obj.name.startswith(f"{label}ArmRig"))
        leg = next(obj for obj in target.all_objects if obj.name.startswith(f"{label}LegRig"))
        arm.rotation_euler = (0.49517, -side * 0.16, side * 0.05)
        leg.rotation_euler = (0.22086, -side * 0.09, 0)
    bpy.context.view_layer.update()
    fallen = Matrix.Translation((-0.97, 0, 0)) @ Matrix.Rotation(-math.pi / 2, 4, "Z") @ Matrix.Rotation(-math.pi / 2, 4, "X")
    parts = [(obj, obj.matrix_world.copy()) for obj in target.all_objects if obj.type == "MESH"]
    for obj, matrix in parts:
        obj.parent = root
        obj.matrix_world = fallen @ matrix
    for obj in list(target.all_objects):
        if obj.type == "EMPTY" and obj != root:
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.context.view_layer.update()
    lowest = math.inf
    for obj, _ in parts:
        evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = evaluated.to_mesh()
        lowest = min(lowest, *((evaluated.matrix_world @ vertex.co).z for vertex in mesh.vertices))
        evaluated.to_mesh_clear()
    root.location.z = -lowest
    bpy.context.view_layer.update()
    rounded_box(target, "Dropped ID Card", (0.16, 0.11, 0.018), (0.25, -0.54, 0.02), WHITE, bevel=0.012, rotation=(0, 0, -0.28), parent=root)
    cylinder(target, "Report Beacon", 0.065, 0.048, (0.25, -0.54, 0.053), RED, parent=root, vertices=16)
    return target, root


def apply_modifiers(target: bpy.types.Collection) -> None:
    for obj in target.all_objects:
        if obj.type != "MESH":
            continue
        bpy.context.view_layer.objects.active = obj
        for modifier in list(obj.modifiers):
            bpy.ops.object.select_all(action="DESELECT")
            obj.select_set(True)
            bpy.ops.object.modifier_apply(modifier=modifier.name)


def validate_character(target: bpy.types.Collection) -> None:
    bpy.context.view_layer.update()
    meshes = [obj for obj in target.all_objects if obj.type == "MESH"]
    points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    assert abs(min(point.z for point in points)) < 0.0001, "As botas precisam tocar o piso"
    assert abs(max(point.z for point in points) - 1.94) < 0.0001, "Capacete ou membro fora da altura do ator"
    assert max(point.x for point in points) - min(point.x for point in points) < 0.94, "Pivôs duplicaram a largura"
    for side, label in ((-1, "Left"), (1, "Right")):
        for limb, expected in (("Arm", Vector((side * 0.345, 0, 1.37))), ("Leg", Vector((side * 0.14, 0, 0.89)))):
            rig = target.objects[f"{label}{limb}Rig"]
            assert (rig.matrix_world.translation - expected).length < 0.0001, "Pivô incompatível com a animação"
        boot = next(obj for obj in meshes if obj.name.startswith(f"{label} Technical Boot"))
        boot_base = min((boot.matrix_world @ Vector(corner)).z for corner in boot.bound_box)
        assert abs(boot_base) < 0.0001, "Bota flutuando por transformação do quadril"


def join_static_parts(target: bpy.types.Collection) -> None:
    groups: dict[tuple[str, str], list[bpy.types.Object]] = {}
    for obj in target.all_objects:
        if obj.type != "MESH" or not obj.data.materials:
            continue
        parent_name = obj.parent.name if obj.parent else ""
        groups.setdefault((obj.data.materials[0].name, parent_name), []).append(obj)
    for (material_name, parent_name), objects in groups.items():
        if len(objects) < 2:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        objects[0].name = f"{parent_name or 'Root'} · {material_name}"


def export_model(target: bpy.types.Collection, path: Path) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in target.all_objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
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
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )


def point_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_preview(scene: bpy.types.Scene, live_root: bpy.types.Object, corpse_root: bpy.types.Object) -> None:
    bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0))
    floor = bpy.context.object
    floor.data.materials.append(make_material("Preview Floor", (0.035, 0.045, 0.06, 1), roughness=0.64))

    bpy.ops.object.light_add(type="AREA", location=(3.8, -4.5, 6.5))
    key = bpy.context.object
    key.data.energy = 1000
    key.data.shape = "DISK"
    key.data.size = 4.5
    key.data.color = (0.75, 0.86, 1.0)
    point_at(key, (0, 0, 0.8))
    bpy.ops.object.light_add(type="AREA", location=(-4, 2.5, 4))
    fill = bpy.context.object
    fill.data.energy = 850
    fill.data.size = 3
    fill.data.color = (1.0, 0.48, 0.22)
    point_at(fill, (0, 0, 0.8))
    bpy.ops.object.camera_add(location=(4.8, -7.2, 3.2))
    camera = bpy.context.object
    camera.data.lens = 58
    point_at(camera, (0, 0, 0.75))
    scene.camera = camera
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    if hasattr(scene.cycles, "denoising_use_gpu"):
        scene.cycles.denoising_use_gpu = False
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 4
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW_PATH)
    scene.world.color = (0.012, 0.018, 0.03)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 4.0
    live_root.location.x = -0.77
    corpse_root.location.x = 0.78
    corpse_root.location.y = 0.25
    bpy.ops.render.render(write_still=True)
    if "--preview-hero-only" in sys.argv:
        return
    for obj in bpy.data.collections["Timbas Crew Corpse"].all_objects:
        obj.hide_render = True
    live_root.location.x = 0
    camera.data.ortho_scale = 2.2
    scene.render.resolution_x = 640
    scene.render.resolution_y = 900
    for name, location in (("front", (0, -6, 1.0)), ("back", (0, 6, 1.0))):
        camera.location = location
        point_at(camera, (0, 0, 0.98))
        scene.render.filepath = str(PREVIEW_PATH.with_name(f"{PREVIEW_PATH.stem}-{name}.png"))
        bpy.ops.render.render(write_still=True)


def main() -> None:
    clear_scene()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    live, live_root = build_live_character()
    corpse, corpse_root = build_corpse()
    validate_character(live)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH), check_existing=False)
    apply_modifiers(live)
    apply_modifiers(corpse)
    join_static_parts(live)
    join_static_parts(corpse)
    export_model(live, LIVE_PATH)
    export_model(corpse, CORPSE_PATH)
    add_preview(bpy.context.scene, live_root, corpse_root)
    print(f"BLEND: {BLEND_PATH}")
    print(f"LIVE: {LIVE_PATH}")
    print(f"CORPSE: {CORPSE_PATH}")
    print(f"PREVIEW: {PREVIEW_PATH}")


if __name__ == "__main__":
    main()
