from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
GLB_PATH = ROOT / "public" / "models" / "games" / "deducao" / "timbas-coupe-suv.glb"
BLEND_PATH = ROOT / "assets" / "models" / "deducao" / "timbas-coupe-suv.blend"
PREVIEW_PATH = Path.home() / "AppData" / "Local" / "Temp" / "timbas-coupe-blender-preview.png"
REAR_PREVIEW_PATH = Path.home() / "AppData" / "Local" / "Temp" / "timbas-coupe-blender-rear.png"


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)


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
    metallic: float = 0.0,
    roughness: float = 0.4,
    coat: float = 0.0,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.use_backface_culling = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    set_input(shader, ("Base Color",), color)
    set_input(shader, ("Metallic",), metallic)
    set_input(shader, ("Roughness",), roughness)
    set_input(shader, ("Coat Weight", "Clearcoat"), coat)
    set_input(shader, ("Coat Roughness", "Clearcoat Roughness"), 0.14)
    if emission is not None:
        set_input(shader, ("Emission Color", "Emission"), emission)
        set_input(shader, ("Emission Strength",), emission_strength)
    return material


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)


def smooth(obj: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def add_beveled_cube(
    collection: bpy.types.Collection,
    name: str,
    size: tuple[float, float, float],
    location: tuple[float, float, float],
    material: bpy.types.Material,
    *,
    bevel: float = 0.03,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = tuple(dimension / 2 for dimension in size)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("Soft edges", "BEVEL")
        modifier.width = min(bevel, min(size) * 0.45)
        modifier.segments = 3
    obj.data.materials.append(material)
    move_to_collection(obj, collection)
    return obj


def add_curve(
    collection: bpy.types.Collection,
    name: str,
    points: list[tuple[float, float, float]],
    material: bpy.types.Material,
    radius: float,
    *,
    cyclic: bool = False,
) -> bpy.types.Object:
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 2
    data.bevel_depth = radius
    data.bevel_resolution = 3
    spline = data.splines.new("NURBS")
    spline.points.add(len(points) - 1)
    for item, coordinate in zip(spline.points, points):
        item.co = (*coordinate, 1.0)
    spline.use_cyclic_u = cyclic
    spline.order_u = min(3, len(points))
    spline.use_endpoint_u = not cyclic
    obj = bpy.data.objects.new(name, data)
    data.materials.append(material)
    collection.objects.link(obj)
    return obj


def add_loft(
    collection: bpy.types.Collection,
    name: str,
    sections: list[tuple[float, float, float, float, float]],
    material: bpy.types.Material,
    *,
    ring_segments: int = 32,
    subdivision: int = 2,
) -> bpy.types.Object:
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []

    for y, half_width, center_z, half_height, power in sections:
        for segment in range(ring_segments):
            angle = segment / ring_segments * math.tau
            cosine = math.cos(angle)
            sine = math.sin(angle)
            x = math.copysign(abs(cosine) ** (2.0 / power), cosine) * half_width
            z = center_z + math.copysign(abs(sine) ** (2.0 / power), sine) * half_height
            vertices.append((x, y, z))

    for section in range(len(sections) - 1):
        current = section * ring_segments
        following = (section + 1) * ring_segments
        for segment in range(ring_segments):
            next_segment = (segment + 1) % ring_segments
            faces.append(
                (
                    current + segment,
                    following + segment,
                    following + next_segment,
                    current + next_segment,
                )
            )

    faces.append(tuple(range(ring_segments)))
    final_ring = (len(sections) - 1) * ring_segments
    faces.append(tuple(reversed([final_ring + index for index in range(ring_segments)])))

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    mesh.materials.append(material)
    collection.objects.link(obj)
    smooth(obj)
    if subdivision > 0:
        modifier = obj.modifiers.new("Subdivision", "SUBSURF")
        modifier.subdivision_type = "CATMULL_CLARK"
        modifier.levels = subdivision
        modifier.render_levels = subdivision
    return obj


def add_roof_surface(
    collection: bpy.types.Collection,
    paint: bpy.types.Material,
    glass: bpy.types.Material,
) -> None:
    x_values = [-0.73, -0.54, -0.28, 0.0, 0.28, 0.54, 0.73]
    y_values = [-1.05, -0.78, -0.45, -0.1, 0.25, 0.55, 0.78]
    vertices = []
    for y in y_values:
        for x in x_values:
            rear_drop = max(0.0, (-y - 0.2) / 1.25) * 0.095
            front_drop = max(0.0, (y - 0.5) / 0.4) * 0.045
            crown = 0.045 * (1.0 - (x / 0.73) ** 2)
            vertices.append((x, y, 1.535 + crown - rear_drop - front_drop))

    faces = []
    width = len(x_values)
    for row in range(len(y_values) - 1):
        for column in range(width - 1):
            current = row * width + column
            faces.append((current, current + 1, current + width + 1, current + width))

    mesh = bpy.data.meshes.new("Coupe roof")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    roof = bpy.data.objects.new("Coupe roof", mesh)
    roof.data.materials.append(paint)
    collection.objects.link(roof)
    solidify = roof.modifiers.new("Roof thickness", "SOLIDIFY")
    solidify.thickness = 0.055
    solidify.offset = 0.0
    bevel = roof.modifiers.new("Roof edge", "BEVEL")
    bevel.width = 0.025
    bevel.segments = 3
    subdivision = roof.modifiers.new("Roof smoothing", "SUBSURF")
    subdivision.levels = 2
    subdivision.render_levels = 2
    smooth(roof)

    add_beveled_cube(
        collection,
        "Panoramic roof",
        (0.92, 1.05, 0.018),
        (0.0, -0.03, 1.595),
        glass,
        bevel=0.035,
        rotation=(math.radians(-2.5), 0.0, 0.0),
    )


def add_glass_panel(
    collection: bpy.types.Collection,
    name: str,
    corners: tuple[
        tuple[float, float, float],
        tuple[float, float, float],
        tuple[float, float, float],
        tuple[float, float, float],
    ],
    material: bpy.types.Material,
    bulge_direction: tuple[float, float, float],
    *,
    divisions: int = 5,
    bulge: float = 0.022,
) -> bpy.types.Object:
    bottom_left, bottom_right, top_right, top_left = [Vector(point) for point in corners]
    direction = Vector(bulge_direction).normalized()
    vertices = []
    for row in range(divisions + 1):
        vertical = row / divisions
        left = bottom_left.lerp(top_left, vertical)
        right = bottom_right.lerp(top_right, vertical)
        for column in range(divisions + 1):
            horizontal = column / divisions
            point = left.lerp(right, horizontal)
            amount = math.sin(horizontal * math.pi) * math.sin(vertical * math.pi) * bulge
            vertices.append(tuple(point + direction * amount))

    faces = []
    width = divisions + 1
    for row in range(divisions):
        for column in range(divisions):
            current = row * width + column
            faces.append((current, current + 1, current + width + 1, current + width))

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    panel = bpy.data.objects.new(name, mesh)
    panel.data.materials.append(material)
    collection.objects.link(panel)
    solidify = panel.modifiers.new("Glass thickness", "SOLIDIFY")
    solidify.thickness = 0.016
    solidify.offset = 0.0
    bevel = panel.modifiers.new("Glass edge", "BEVEL")
    bevel.width = 0.012
    bevel.segments = 2
    smooth(panel)
    return panel


def add_wheel(
    collection: bpy.types.Collection,
    side: int,
    y: float,
    tire: bpy.types.Material,
    rim: bpy.types.Material,
    brake: bpy.types.Material,
    trim: bpy.types.Material,
) -> None:
    x = side * 1.03
    wheel_rotation = (0.0, math.pi / 2, 0.0)
    bpy.ops.mesh.primitive_torus_add(
        align="WORLD",
        major_segments=40,
        minor_segments=14,
        location=(x, y, 0.43),
        rotation=wheel_rotation,
        major_radius=0.285,
        minor_radius=0.105,
    )
    tire_obj = bpy.context.object
    tire_obj.name = "Performance tire"
    tire_obj.scale.x = 1.12
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    tire_obj.data.materials.append(tire)
    move_to_collection(tire_obj, collection)
    smooth(tire_obj)

    outer_x = side * 1.145
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.215, depth=0.035, location=(outer_x, y, 0.43), rotation=wheel_rotation)
    disc = bpy.context.object
    disc.name = "Brake disc"
    disc.data.materials.append(brake)
    move_to_collection(disc, collection)
    bevel = disc.modifiers.new("Disc edge", "BEVEL")
    bevel.width = 0.008
    bevel.segments = 2

    bpy.ops.mesh.primitive_torus_add(
        align="WORLD",
        major_segments=32,
        minor_segments=10,
        location=(side * 1.17, y, 0.43),
        rotation=wheel_rotation,
        major_radius=0.175,
        minor_radius=0.028,
    )
    rim_ring = bpy.context.object
    rim_ring.name = "Machined rim"
    rim_ring.data.materials.append(rim)
    move_to_collection(rim_ring, collection)
    smooth(rim_ring)

    for spoke in range(10):
        angle = spoke / 10 * math.tau
        add_beveled_cube(
            collection,
            "Wheel spoke",
            (0.025, 0.032, 0.29),
            (side * 1.19, y, 0.43),
            rim,
            bevel=0.009,
            rotation=(angle, 0.0, 0.0),
        )

    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.065, depth=0.055, location=(side * 1.205, y, 0.43), rotation=wheel_rotation)
    hub = bpy.context.object
    hub.name = "Wheel hub"
    hub.data.materials.append(trim)
    move_to_collection(hub, collection)
    smooth(hub)


def build_vehicle(collection: bpy.types.Collection) -> None:
    paint = make_material("Timbas wine paint", (0.32, 0.012, 0.035, 1.0), metallic=0.55, roughness=0.19, coat=1.0)
    trim = make_material("Satin black trim", (0.008, 0.011, 0.016, 1.0), metallic=0.2, roughness=0.28, coat=0.35)
    glass = make_material("Smoked glass", (0.006, 0.035, 0.055, 1.0), metallic=0.22, roughness=0.14, coat=0.65)
    tire = make_material("Performance tire", (0.006, 0.007, 0.009, 1.0), roughness=0.78)
    rim = make_material("Machined alloy", (0.48, 0.56, 0.66, 1.0), metallic=0.92, roughness=0.17, coat=0.45)
    brake = make_material("Brake rotor", (0.17, 0.19, 0.22, 1.0), metallic=0.88, roughness=0.3)
    caliper = make_material("Red brake caliper", (0.55, 0.015, 0.01, 1.0), metallic=0.45, roughness=0.24, coat=0.6)
    interior = make_material("Charcoal interior", (0.018, 0.022, 0.029, 1.0), roughness=0.58)
    chrome = make_material("Dark chrome", (0.28, 0.34, 0.42, 1.0), metallic=0.96, roughness=0.16)
    headlight = make_material(
        "LED headlight",
        (0.55, 0.78, 1.0, 1.0),
        metallic=0.08,
        roughness=0.12,
        emission=(0.45, 0.72, 1.0, 1.0),
        emission_strength=1.8,
    )
    tail_light = make_material(
        "LED tail light",
        (0.65, 0.008, 0.02, 1.0),
        metallic=0.08,
        roughness=0.14,
        emission=(1.0, 0.005, 0.015, 1.0),
        emission_strength=2.2,
    )

    add_loft(
        collection,
        "Continuous sculpted body",
        [
            (-2.25, 0.48, 0.61, 0.2, 3.4),
            (-2.12, 0.78, 0.63, 0.28, 3.6),
            (-1.72, 0.94, 0.66, 0.35, 3.8),
            (-1.2, 1.0, 0.68, 0.39, 4.0),
            (-0.25, 1.02, 0.69, 0.41, 4.2),
            (0.55, 1.01, 0.68, 0.4, 4.2),
            (1.25, 0.99, 0.66, 0.37, 4.0),
            (1.78, 0.92, 0.64, 0.32, 3.8),
            (2.05, 0.86, 0.61, 0.28, 3.6),
            (2.18, 0.76, 0.59, 0.23, 3.5),
            (2.22, 0.75, 0.59, 0.22, 3.5),
        ],
        paint,
        ring_segments=36,
        subdivision=2,
    )

    add_glass_panel(
        collection,
        "Windshield",
        (
            (-0.7, 1.02, 1.0),
            (0.7, 1.02, 1.0),
            (0.62, 0.6, 1.52),
            (-0.62, 0.6, 1.52),
        ),
        glass,
        (0.0, 1.0, 0.0),
        bulge=0.028,
    )
    add_glass_panel(
        collection,
        "Rear windshield",
        (
            (0.66, -1.64, 1.0),
            (-0.66, -1.64, 1.0),
            (-0.6, -0.72, 1.49),
            (0.6, -0.72, 1.49),
        ),
        glass,
        (0.0, -1.0, 0.0),
        bulge=0.02,
    )
    for side in (-1, 1):
        x = side * 0.77
        add_glass_panel(
            collection,
            "Front side window",
            (
                (x, 0.06, 1.01),
                (x, 0.96, 1.01),
                (x, 0.59, 1.51),
                (x, 0.06, 1.55),
            ),
            glass,
            (side, 0.0, 0.0),
            bulge=0.014,
        )
        add_glass_panel(
            collection,
            "Rear side window",
            (
                (x, -1.6, 1.01),
                (x, -0.02, 1.01),
                (x, -0.02, 1.55),
                (x, -0.72, 1.48),
            ),
            glass,
            (side, 0.0, 0.0),
            bulge=0.014,
        )

    add_beveled_cube(collection, "Lower floor", (1.82, 3.75, 0.16), (0.0, -0.02, 0.28), trim, bevel=0.075)
    add_beveled_cube(collection, "Rear deck", (1.58, 0.38, 0.1), (0.0, -1.93, 0.99), paint, bevel=0.045, rotation=(math.radians(-2), 0.0, 0.0))
    add_roof_surface(collection, paint, glass)

    for wheel_y in (-1.38, 1.38):
        for side in (-1, 1):
            add_wheel(collection, side, wheel_y, tire, rim, brake, trim)
            arch_points = []
            for index in range(13):
                angle = index / 12 * math.pi
                arch_points.append(
                    (
                        side * 1.015,
                        wheel_y + math.cos(angle) * 0.435,
                        0.43 + math.sin(angle) * 0.435,
                    )
                )
            add_curve(collection, "Wheel arch trim", arch_points, trim, 0.026)
            add_beveled_cube(
                collection,
                "Brake caliper",
                (0.035, 0.09, 0.18),
                (side * 1.21, wheel_y - 0.1, 0.43),
                caliper,
                bevel=0.018,
            )

    for side in (-1, 1):
        x = side * 1.008
        add_curve(collection, "Shoulder line", [(x, -1.36, 1.0), (x, -0.15, 1.035), (x, 1.25, 0.99)], paint, 0.025)
        add_curve(collection, "Front door seam", [(x, 0.82, 0.5), (x, 0.75, 1.01)], trim, 0.009)
        add_curve(collection, "Center door seam", [(x, 0.0, 0.47), (x, 0.0, 1.02)], trim, 0.008)
        add_curve(collection, "Rear door seam", [(x, -0.96, 0.51), (x, -0.88, 0.99)], trim, 0.008)
        add_beveled_cube(collection, "Front door handle", (0.028, 0.24, 0.035), (side * 1.035, 0.4, 0.96), chrome, bevel=0.012)
        add_beveled_cube(collection, "Rear door handle", (0.028, 0.24, 0.035), (side * 1.035, -0.53, 0.96), chrome, bevel=0.012)
        add_beveled_cube(collection, "Side skirt", (0.075, 2.12, 0.13), (side * 1.005, -0.05, 0.35), trim, bevel=0.035)

        add_curve(collection, "A pillar", [(side * 0.78, 1.03, 1.0), (side * 0.65, 0.59, 1.53)], trim, 0.042)
        add_curve(collection, "B pillar", [(side * 0.79, 0.03, 1.0), (side * 0.76, 0.03, 1.56)], trim, 0.038)
        add_curve(collection, "C pillar", [(side * 0.64, -0.71, 1.5), (side * 0.76, -1.61, 1.01)], trim, 0.045)
        add_curve(collection, "Roof edge", [(side * 0.63, -0.73, 1.51), (side * 0.71, -0.2, 1.58), (side * 0.64, 0.6, 1.54)], paint, 0.032)

        bpy.ops.mesh.primitive_uv_sphere_add(segments=28, ring_count=14, location=(side * 1.08, 0.79, 1.12))
        mirror = bpy.context.object
        mirror.name = "Door mirror"
        mirror.scale = (0.16, 0.22, 0.085)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        mirror.data.materials.append(paint)
        move_to_collection(mirror, collection)
        smooth(mirror)
        add_beveled_cube(collection, "Mirror support", (0.07, 0.16, 0.07), (side * 0.94, 0.77, 1.08), trim, bevel=0.025)

    for x in (-0.39, 0.39):
        for y in (-0.48, 0.46):
            add_beveled_cube(collection, "Seat cushion", (0.43, 0.5, 0.18), (x, y, 0.87), interior, bevel=0.08)
            add_beveled_cube(collection, "Seat back", (0.43, 0.16, 0.52), (x, y - 0.18, 1.12), interior, bevel=0.075, rotation=(math.radians(-8), 0.0, 0.0))

    add_beveled_cube(collection, "Dashboard", (1.45, 0.34, 0.18), (0.0, 0.78, 1.0), interior, bevel=0.055)
    bpy.ops.mesh.primitive_torus_add(
        major_segments=28,
        minor_segments=10,
        location=(-0.4, 0.64, 1.17),
        rotation=(math.pi / 2, 0.0, 0.0),
        major_radius=0.13,
        minor_radius=0.018,
    )
    steering = bpy.context.object
    steering.name = "Steering wheel"
    steering.data.materials.append(interior)
    move_to_collection(steering, collection)

    add_beveled_cube(collection, "Front light fascia", (1.48, 0.026, 0.13), (0.0, 2.237, 0.755), trim, bevel=0.045)
    add_beveled_cube(collection, "Front grille", (1.08, 0.038, 0.22), (0.0, 2.245, 0.57), trim, bevel=0.04)
    for x in (-0.42, -0.28, -0.14, 0.0, 0.14, 0.28, 0.42):
        add_beveled_cube(collection, "Grille blade", (0.02, 0.016, 0.15), (x, 2.267, 0.57), chrome, bevel=0.007)
    add_beveled_cube(collection, "Front splitter", (1.42, 0.12, 0.075), (0.0, 2.17, 0.3), trim, bevel=0.032)

    for side in (-1, 1):
        add_beveled_cube(
            collection,
            "Headlight housing",
            (0.46, 0.032, 0.095),
            (side * 0.5, 2.242, 0.76),
            trim,
            bevel=0.032,
            rotation=(0.0, 0.0, side * math.radians(2.5)),
        )
        add_beveled_cube(
            collection,
            "Slim LED headlight",
            (0.34, 0.022, 0.032),
            (side * 0.5, 2.263, 0.765),
            headlight,
            bevel=0.014,
            rotation=(0.0, 0.0, side * math.radians(2.5)),
        )
        add_beveled_cube(collection, "Front intake", (0.2, 0.022, 0.13), (side * 0.64, 2.245, 0.47), trim, bevel=0.032)

    add_beveled_cube(collection, "Rear light bar", (1.5, 0.045, 0.06), (0.0, -2.205, 0.84), tail_light, bevel=0.025)
    add_beveled_cube(collection, "Rear diffuser", (1.5, 0.12, 0.19), (0.0, -2.12, 0.34), trim, bevel=0.045)
    add_beveled_cube(collection, "Rear spoiler lip", (1.46, 0.22, 0.045), (0.0, -1.91, 1.055), trim, bevel=0.02, rotation=(math.radians(-3), 0.0, 0.0))
    add_beveled_cube(collection, "Rear plate", (0.47, 0.035, 0.13), (0.0, -2.232, 0.57), chrome, bevel=0.025)
    for x in (-0.55, 0.55):
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.055, depth=0.16, location=(x, -2.17, 0.29), rotation=(math.pi / 2, 0.0, 0.0))
        exhaust = bpy.context.object
        exhaust.name = "Exhaust"
        exhaust.data.materials.append(chrome)
        move_to_collection(exhaust, collection)
        smooth(exhaust)


def point_camera(camera: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_studio(scene: bpy.types.Scene) -> None:
    studio = bpy.data.collections.new("Preview studio")
    scene.collection.children.link(studio)

    floor_material = make_material("Studio floor", (0.035, 0.045, 0.06, 1.0), metallic=0.05, roughness=0.5)
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0.0, 0.0, 0.0))
    floor = bpy.context.object
    floor.name = "Studio floor"
    floor.data.materials.append(floor_material)
    move_to_collection(floor, studio)

    bpy.ops.object.camera_add(location=(6.0, 6.2, 3.4))
    camera = bpy.context.object
    camera.data.lens = 58
    point_camera(camera, (0.0, 0.05, 0.76))
    move_to_collection(camera, studio)
    scene.camera = camera

    lights = [
        ("Key", (4.5, 4.8, 6.4), 1200.0, 5.0, (1.0, 0.92, 0.84)),
        ("Fill", (-4.2, 2.5, 3.6), 800.0, 4.0, (0.45, 0.65, 1.0)),
        ("Rim", (1.0, -5.0, 4.8), 1100.0, 3.5, (1.0, 0.18, 0.08)),
    ]
    for name, location, energy, size, color in lights:
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        light = bpy.data.objects.new(name, data)
        light.location = location
        point_camera(light, (0.0, 0.0, 0.7))
        studio.objects.link(light)


def save_editable_source() -> None:
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH), check_existing=False)


def optimize_vehicle(collection: bpy.types.Collection) -> None:
    for obj in list(collection.all_objects):
        if obj.type not in {"MESH", "CURVE"}:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        if obj.type == "CURVE":
            bpy.ops.object.convert(target="MESH")
            obj = bpy.context.object
        for modifier in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=modifier.name)

    buckets: dict[str, list[bpy.types.Object]] = {}
    for obj in collection.all_objects:
        if obj.type != "MESH":
            continue
        material_name = obj.data.materials[0].name if obj.data.materials else "Unassigned"
        buckets.setdefault(material_name, []).append(obj)

    for material_name, objects in buckets.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        bpy.context.object.name = material_name


def export_vehicle(collection: bpy.types.Collection) -> None:
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.object.select_all(action="DESELECT")
    for obj in collection.all_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = next((obj for obj in collection.all_objects if obj.type == "MESH"), None)

    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_materials="EXPORT",
    )


def render_preview(scene: bpy.types.Scene) -> None:
    add_studio(scene)
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW_PATH)
    scene.render.film_transparent = False
    scene.world.color = (0.008, 0.012, 0.02)
    scene.render.image_settings.color_mode = "RGBA"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    bpy.ops.render.render(write_still=True)

    scene.camera.location = (6.0, -6.2, 3.15)
    point_camera(scene.camera, (0.0, -0.05, 0.76))
    scene.render.filepath = str(REAR_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    clear_scene()
    scene = bpy.context.scene
    vehicle = bpy.data.collections.new("Timbas Coupe SUV")
    scene.collection.children.link(vehicle)
    build_vehicle(vehicle)
    save_editable_source()
    optimize_vehicle(vehicle)
    export_vehicle(vehicle)
    render_preview(scene)
    print(f"GLB: {GLB_PATH}")
    print(f"BLEND: {BLEND_PATH}")
    print(f"PREVIEW: {PREVIEW_PATH}")
    print(f"REAR PREVIEW: {REAR_PREVIEW_PATH}")


if __name__ == "__main__":
    main()
