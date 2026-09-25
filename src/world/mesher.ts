import { block, heightOf, CHUNK, WORLD_HEIGHT } from "../data/blocks.ts";
export interface MeshData {
  positions: number[];
  normals: number[];
  colors: number[];
  uvs: number[];
  indices: number[];
}
const normals = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
const corners = [
  [
    [1, 0, 1],
    [1, 0, 0],
    [1, 1, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 0],
    [0, 0, 1],
    [0, 1, 1],
    [0, 1, 0],
  ],
  [
    [0, 1, 1],
    [1, 1, 1],
    [1, 1, 0],
    [0, 1, 0],
  ],
  [
    [0, 0, 0],
    [1, 0, 0],
    [1, 0, 1],
    [0, 0, 1],
  ],
  [
    [0, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
    [0, 1, 1],
  ],
  [
    [1, 0, 0],
    [0, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
  ],
];
export function meshChunk(
  get: (x: number, y: number, z: number) => number,
  seed = 0,
) {
  const meshes: MeshData[] = Array.from({ length: 3 }, () => ({
    positions: [],
    normals: [],
    colors: [],
    uvs: [],
    indices: [],
  }));
  const solid = (x: number, y: number, z: number) => {
    const b = block(get(x, y, z));
    return b.solid && !b.transparent && !b.cutout;
  };
  function face(
    out: MeshData,
    x: number,
    y: number,
    z: number,
    points: number[][],
    normal: number[],
    tile: number,
    ao: boolean,
    scale = [1, 1, 1],
    offset = [0, 0, 0],
  ) {
    const start = out.positions.length / 3;
    const shade =
      [0.88, 0.77, 1, 0.65, 0.92, 0.8][normals.indexOf(normal)] || 1;
    const variation =
      1 + Math.sin(x * 17.1 + z * 83.4 + y * 5.2 + seed) * 0.035;
    points.forEach((c, i) => {
      out.positions.push(
        x + c[0] * scale[0] + offset[0],
        y + c[1] * scale[1] + offset[1],
        z + c[2] * scale[2] + offset[2],
      );
      out.normals.push(...normal);
      let occlusion = 0;
      if (ao) {
        const axes = [0, 1, 2].filter((a) => normal[a] === 0),
          base = [x + normal[0], y + normal[1], z + normal[2]],
          s1 = base.slice(),
          s2 = base.slice(),
          diagonal = base.slice();
        s1[axes[0]] += c[axes[0]] ? 1 : -1;
        s2[axes[1]] += c[axes[1]] ? 1 : -1;
        diagonal[axes[0]] = s1[axes[0]];
        diagonal[axes[1]] = s2[axes[1]];
        const a = Number(solid(s1[0], s1[1], s1[2])),
          b = Number(solid(s2[0], s2[1], s2[2]));
        occlusion =
          a && b
            ? 3
            : a + b + Number(solid(diagonal[0], diagonal[1], diagonal[2]));
      }
      const light = shade * variation * (1 - occlusion * 0.13);
      out.colors.push(light * 0.98, light * 0.99, Math.min(1, light * 1.04));
      const uv = [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ][i],
        u = ((tile % 8) + uv[0] * 0.98 + 0.01) / 8,
        v = 1 - (Math.floor(tile / 8) + (1 - uv[1]) * 0.98 + 0.01) / 4;
      out.uvs.push(u, v);
    });
    out.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  for (let y = 0; y < WORLD_HEIGHT; y++)
    for (let z = 0; z < CHUNK; z++)
      for (let x = 0; x < CHUNK; x++) {
        const id = get(x, y, z);
        if (!id) continue;
        const b = block(id),
          out = meshes[b.transparent ? 2 : b.cutout ? 1 : 0];
        if (b.shape === "flower") {
          face(
            out,
            x,
            y,
            z,
            [
              [0, 0, 0],
              [1, 0, 1],
              [1, 1, 1],
              [0, 1, 0],
            ],
            [0, 0, 1],
            b.tile,
            false,
          );
          face(
            out,
            x,
            y,
            z,
            [
              [1, 0, 0],
              [0, 0, 1],
              [0, 1, 1],
              [1, 1, 0],
            ],
            [1, 0, 0],
            b.tile,
            false,
          );
          continue;
        }
        const shapes =
          b.shape === "stairs"
            ? [
                [
                  [1, 0.5, 1],
                  [0, 0, 0],
                ],
                [
                  [1, 0.5, 0.5],
                  [0, 0.5, 0.5],
                ],
              ]
            : b.shape === "fence"
              ? [
                  [
                    [0.25, 1, 0.25],
                    [0.375, 0, 0.375],
                  ],
                  [
                    [1, 0.15, 0.15],
                    [0, 0.25, 0.425],
                  ],
                  [
                    [1, 0.15, 0.15],
                    [0, 0.75, 0.425],
                  ],
                ]
              : [
                  [
                    [1, heightOf(id), 1],
                    [0, 0, 0],
                  ],
                ];
        for (const [scale, offset] of shapes)
          for (let f = 0; f < 6; f++) {
            const n = normals[f],
              neighbor = get(x + n[0], y + n[1], z + n[2]),
              nb = block(neighbor);
            if (
              !b.shape &&
              ((neighbor === id && b.transparent) ||
                (nb.solid && !nb.transparent && !nb.cutout && !nb.shape))
            )
              continue;
            const tile =
              f === 2
                ? (b.top ?? b.tile)
                : f === 3
                  ? (b.bottom ?? b.tile)
                  : b.tile;
            face(
              out,
              x,
              y,
              z,
              corners[f],
              n,
              tile,
              !b.transparent && !b.shape,
              scale,
              offset,
            );
          }
      }
  return meshes;
}
