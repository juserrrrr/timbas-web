"""Cria o personagem de escritório e o corpo reportável do Dedução.

Os pivôs de braços e pernas são preservados no GLB para a animação barata
acontecer no Three.js. O modelo do corpo morto já sai deitado e não depende de
girar uma cápsula genérica no navegador.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "models" / "games" / "deducao"
BLEND_PATH = ROOT / "assets" / "models" / "deducao" / "timbas-crew-character.blend"
LIVE_PATH = OUTPUT / "timbas-crew-character.glb"
CORPSE_PATH = OUTPUT / "timbas-crew-corpse.glb"
PREVIEW_PATH = Path.home() / "AppData" / "Local" / "Temp" / "timbas-crew-character-preview.png"


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
    shader = result.node_tree.nodes.get("Principled BSDF")
    set_input(shader, ("Base Color",), color)
    set_input(shader, ("Metallic",), metallic)
    set_input(shader, ("Roughness",), roughness)
    set_input(shader, ("Coat Weight", "Clearcoat"), coat)
    set_input(shader, ("Coat Roughness", "Clearcoat Roughness"), 0.16)
    if emission:
        set_input(shader, ("Emission Color", "Emission"), emission)
        set_input(shader, ("Emission Strength",), emission_strength)
    return result


BODY = make_material("Crew Body Color", (0.05, 0.32, 0.75, 1), metallic=0.08, roughness=0.34, coat=0.32)
DARK = make_material("Crew Dark Uniform", (0.015, 0.025, 0.05, 1), metallic=0.12, roughness=0.48)
ACCENT = make_material("Crew Accent Color", (0.16, 0.62, 0.95, 1), metallic=0.18, roughness=0.3, coat=0.25)
VISOR = make_material(
    "Crew Visor",
    (0.008, 0.06, 0.11, 1),
    metallic=0.28,
    roughness=0.12,
    coat=0.75,
    emission=(0.05, 0.48, 0.9, 1),
    emission_strength=0.72,
)
METAL = make_material("Crew Brushed Metal", (0.42, 0.5, 0.58, 1), metallic=0.86, roughness=0.22)
WHITE = make_material("Crew Badge White", (0.82, 0.88, 0.91, 1), roughness=0.4)
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
    modifier.segments = 2
    obj.data.materials.append(finish)
    if parent:
        parent_keep_world(obj, parent)
    return obj


def ellipsoid(target, name, scale, location, finish, *, parent=None, subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1, location=location)
    obj = move_to(bpy.context.object, target)
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(finish)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
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


def build_live_character() -> tuple[bpy.types.Collection, bpy.types.Object]:
    target = collection("Timbas Crew Character")
    root = empty(target, "CrewCharacterRoot")
    body_rig = empty(target, "BodyRig", parent=root)

    ellipsoid(target, "Tailored Torso", (0.32, 0.245, 0.43), (0, 0, 1.15), BODY, parent=body_rig)
    ellipsoid(target, "Shoulder Shell", (0.36, 0.23, 0.22), (0, 0, 1.38), BODY, parent=body_rig)
    ellipsoid(target, "Helmet Head", (0.245, 0.225, 0.255), (0, 0, 1.68), BODY, parent=body_rig)
    rounded_box(target, "Panoramic Visor", (0.31, 0.09, 0.145), (0, -0.205, 1.69), VISOR, bevel=0.055, parent=body_rig)
    rounded_box(target, "Compact Backpack", (0.34, 0.16, 0.45), (0, 0.235, 1.18), DARK, bevel=0.07, parent=body_rig)
    rounded_box(target, "Uniform Belt", (0.53, 0.04, 0.075), (0, -0.235, 0.96), DARK, bevel=0.025, parent=body_rig)
    rounded_box(target, "Reflective Chest Panel", (0.23, 0.025, 0.12), (0, -0.248, 1.29), ACCENT, bevel=0.025, parent=body_rig)
    rounded_box(target, "ID Badge", (0.1, 0.018, 0.13), (0.17, -0.255, 1.26), WHITE, bevel=0.018, parent=body_rig)
    cylinder(target, "Badge Clip", 0.018, 0.03, (0.17, -0.256, 1.36), METAL, rotation=(math.pi / 2, 0, 0), parent=body_rig, vertices=14)

    for side, label in ((-1, "Left"), (1, "Right")):
        arm_rig = empty(target, f"{label}ArmRig", (side * 0.345, 0, 1.37), body_rig)
        ellipsoid(target, f"{label} Uniform Arm", (0.105, 0.105, 0.31), (side * 0.345, 0, 1.13), DARK, parent=arm_rig)
        ellipsoid(target, f"{label} Glove", (0.115, 0.11, 0.12), (side * 0.345, -0.018, 0.84), BODY, parent=arm_rig)

        leg_rig = empty(target, f"{label}LegRig", (side * 0.14, 0, 0.89), body_rig)
        ellipsoid(target, f"{label} Uniform Leg", (0.13, 0.14, 0.34), (side * 0.14, 0, 0.61), DARK, parent=leg_rig)
        rounded_box(target, f"{label} Work Shoe", (0.24, 0.36, 0.13), (side * 0.14, -0.075, 0.27), DARK, bevel=0.055, parent=leg_rig)

    return target, root


def build_corpse() -> tuple[bpy.types.Collection, bpy.types.Object]:
    target = collection("Timbas Crew Corpse")
    root = empty(target, "CrewCorpseRoot")
    ellipsoid(target, "Fallen Torso", (0.43, 0.28, 0.25), (0, 0, 0.31), BODY, parent=root)
    ellipsoid(target, "Fallen Shoulder", (0.31, 0.3, 0.19), (0.28, -0.01, 0.32), BODY, parent=root)
    ellipsoid(target, "Fallen Helmet", (0.245, 0.225, 0.235), (0.64, -0.02, 0.29), BODY, parent=root)
    rounded_box(target, "Fallen Visor", (0.13, 0.1, 0.285), (0.72, -0.18, 0.31), VISOR, bevel=0.05, rotation=(0, math.radians(76), 0), parent=root)
    rounded_box(target, "Fallen Backpack", (0.32, 0.17, 0.37), (-0.05, 0.25, 0.27), DARK, bevel=0.065, rotation=(0, math.radians(88), 0), parent=root)
    for side in (-1, 1):
        ellipsoid(target, "Fallen Arm", (0.3, 0.105, 0.105), (0.05, side * 0.38, 0.18), DARK, parent=root)
        ellipsoid(target, "Fallen Leg", (0.34, 0.135, 0.125), (-0.48, side * 0.14, 0.18), DARK, parent=root)
        rounded_box(target, "Fallen Shoe", (0.25, 0.27, 0.13), (-0.78, side * 0.17, 0.14), DARK, bevel=0.05, rotation=(0, 0, side * 0.18), parent=root)
    rounded_box(target, "Dropped ID Card", (0.16, 0.11, 0.018), (0.26, -0.43, 0.035), WHITE, bevel=0.018, rotation=(0, 0, -0.28), parent=root)
    cylinder(target, "Report Beacon", 0.075, 0.065, (0.28, -0.43, 0.078), RED, parent=root, vertices=20)
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
    )


def point_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_preview(scene: bpy.types.Scene, live_root: bpy.types.Object, corpse_root: bpy.types.Object) -> None:
    live_root.location.x = -0.75
    corpse_root.location.x = 0.8
    corpse_root.location.y = 0.2
    bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, -0.01))
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
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW_PATH)
    scene.world.color = (0.012, 0.018, 0.03)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    clear_scene()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    live, live_root = build_live_character()
    corpse, corpse_root = build_corpse()
    apply_modifiers(live)
    apply_modifiers(corpse)
    join_static_parts(live)
    join_static_parts(corpse)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH), check_existing=False)
    export_model(live, LIVE_PATH)
    export_model(corpse, CORPSE_PATH)
    add_preview(bpy.context.scene, live_root, corpse_root)
    print(f"BLEND: {BLEND_PATH}")
    print(f"LIVE: {LIVE_PATH}")
    print(f"CORPSE: {CORPSE_PATH}")
    print(f"PREVIEW: {PREVIEW_PATH}")


if __name__ == "__main__":
    main()
