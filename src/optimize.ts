import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
/** Combine static decorations by material. Animated and interactive roots remain separate. */
export function batchStatic(root: T.Object3D, exclude: T.Object3D[] = []) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const groups = new Map<
    T.Material,
    { nodes: T.Mesh[]; geometries: T.BufferGeometry[] }
  >();
  const visit = (node: T.Object3D) => {
    if (exclude.includes(node)) return;
    if (
      node instanceof T.Mesh &&
      !(node instanceof T.InstancedMesh) &&
      !Array.isArray(node.material)
    ) {
      const group = groups.get(node.material) || { nodes: [], geometries: [] };
      const geometry = node.geometry.index
        ? node.geometry.toNonIndexed()
        : node.geometry.clone();
      geometry.applyMatrix4(inverse.clone().multiply(node.matrixWorld));
      group.nodes.push(node);
      group.geometries.push(geometry);
      groups.set(node.material, group);
    } else node.children.forEach(visit);
  };
  root.children.forEach(visit);
  for (const [mat, { nodes, geometries }] of groups) {
    if (nodes.length < 2) {
      geometries.forEach((g) => g.dispose());
      continue;
    }
    const geometry = mergeGeometries(geometries);
    geometries.forEach((g) => g.dispose());
    if (!geometry) continue;
    geometry.userData.owned = true;
    const mesh = new T.Mesh(geometry, mat);
    mesh.castShadow = nodes.some((n) => n.castShadow);
    mesh.receiveShadow = true;
    nodes.forEach((n) => n.removeFromParent());
    root.add(mesh);
  }
}
export function clearGenerated(root: T.Object3D) {
  root.traverse((n) => {
    if (n instanceof T.Mesh && n.geometry.userData.owned) n.geometry.dispose();
  });
  root.clear();
}

/** Bake static colored model parts into one draw call; keep animated roots separate. */
export function batchColored(root: T.Group, exclude: T.Object3D[] = []) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const geometries: T.BufferGeometry[] = [],
    nodes: T.Mesh[] = [];
  const visit = (node: T.Object3D) => {
    if (exclude.includes(node)) return;
    if (
      node instanceof T.Mesh &&
      node.material instanceof T.MeshStandardMaterial
    ) {
      const geometry = node.geometry.index
        ? node.geometry.toNonIndexed()
        : node.geometry.clone();
      geometry.applyMatrix4(inverse.clone().multiply(node.matrixWorld));
      const colors = new Float32Array(
          geometry.getAttribute("position").count * 3,
        ),
        color = node.material.color;
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
      }
      geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
      geometries.push(geometry);
      nodes.push(node);
    } else node.children.forEach(visit);
  };
  root.children.forEach(visit);
  if (!geometries.length) return;
  const geometry = mergeGeometries(geometries);
  geometries.forEach((g) => g.dispose());
  if (!geometry) return;
  nodes.forEach((n) => {
    n.removeFromParent();
    n.geometry.dispose();
    (n.material as T.Material).dispose();
  });
  const mesh = new T.Mesh(
    geometry,
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }),
  );
  mesh.castShadow = true;
  root.add(mesh);
}
