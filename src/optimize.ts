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
