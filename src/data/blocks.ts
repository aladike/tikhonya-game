export type Shape = "cube" | "flower" | "slab" | "stairs" | "fence";
export interface Block {
  id: number;
  name: string;
  color: string;
  tile: number;
  top?: number;
  bottom?: number;
  solid: boolean;
  transparent?: boolean;
  cutout?: boolean;
  shape?: Shape;
  material: string;
  light?: number;
  bounce?: number;
  special?: string;
}
const definitions: Omit<Block, "id">[] = [
  { name: "Воздух", color: "#BDE8FF", tile: 0, solid: false, material: "air" },
  {
    name: "Трава",
    color: "#6BD34A",
    tile: 1,
    top: 2,
    bottom: 3,
    solid: true,
    material: "grass",
  },
  { name: "Земля", color: "#B87A4B", tile: 3, solid: true, material: "sand" },
  { name: "Песок", color: "#F6DB8C", tile: 4, solid: true, material: "sand" },
  { name: "Камень", color: "#9AA3B5", tile: 5, solid: true, material: "stone" },
  {
    name: "Булыжник",
    color: "#8593AB",
    tile: 6,
    solid: true,
    material: "stone",
  },
  {
    name: "Бревно",
    color: "#9C6B3F",
    tile: 7,
    top: 8,
    bottom: 8,
    solid: true,
    material: "wood",
  },
  { name: "Доски", color: "#E0A96D", tile: 9, solid: true, material: "wood" },
  {
    name: "Листва",
    color: "#3FBF5A",
    tile: 10,
    solid: true,
    cutout: true,
    material: "grass",
  },
  {
    name: "Стекло",
    color: "#B0E7F6",
    tile: 11,
    solid: true,
    transparent: true,
    material: "glass",
  },
  {
    name: "Вода",
    color: "#3CC8E8",
    tile: 12,
    solid: false,
    transparent: true,
    material: "water",
  },
  { name: "Снег", color: "#F2F6FF", tile: 13, solid: true, material: "snow" },
  {
    name: "Кирпич",
    color: "#E98B76",
    tile: 14,
    solid: true,
    material: "stone",
  },
  {
    name: "Шерсть: коралл",
    color: "#FF7A91",
    tile: 15,
    solid: true,
    material: "wool",
  },
  {
    name: "Шерсть: мята",
    color: "#47C7A5",
    tile: 16,
    solid: true,
    material: "wool",
  },
  {
    name: "Шерсть: солнце",
    color: "#FFD23F",
    tile: 17,
    solid: true,
    material: "wool",
  },
  {
    name: "Фонарь",
    color: "#FFC76B",
    tile: 18,
    solid: true,
    material: "glass",
    light: 15,
  },
  {
    name: "Батут",
    color: "#B983FF",
    tile: 19,
    solid: true,
    material: "wool",
    bounce: 13,
  },
  {
    name: "Розовый цветок",
    color: "#FF5D8F",
    tile: 20,
    solid: false,
    cutout: true,
    shape: "flower",
    material: "grass",
  },
  {
    name: "Жёлтый цветок",
    color: "#FFD23F",
    tile: 21,
    solid: false,
    cutout: true,
    shape: "flower",
    material: "grass",
  },
  {
    name: "Лиловый цветок",
    color: "#B983FF",
    tile: 22,
    solid: false,
    cutout: true,
    shape: "flower",
    material: "grass",
  },
  {
    name: "Белый цветок",
    color: "#FFFFFF",
    tile: 23,
    solid: false,
    cutout: true,
    shape: "flower",
    material: "grass",
  },
  {
    name: "Полублок",
    color: "#E0A96D",
    tile: 9,
    solid: true,
    shape: "slab",
    material: "wood",
  },
  {
    name: "Ступеньки",
    color: "#E0A96D",
    tile: 9,
    solid: true,
    shape: "stairs",
    material: "wood",
  },
  {
    name: "Забор",
    color: "#DCA064",
    tile: 9,
    solid: true,
    shape: "fence",
    material: "wood",
  },
  {
    name: "Ракушка-эхо",
    color: "#FFB8D4",
    tile: 24,
    solid: true,
    material: "glass",
    special: "shell",
  },
  {
    name: "Мыльный блок",
    color: "#8CE8F0",
    tile: 25,
    solid: true,
    transparent: true,
    material: "water",
    special: "bubbles",
  },
  {
    name: "Парадный блок",
    color: "#FFAE60",
    tile: 26,
    solid: true,
    material: "wool",
    special: "confetti",
  },
  {
    name: "Клевер-пружинка",
    color: "#8CDF62",
    tile: 27,
    solid: true,
    material: "grass",
    bounce: 10,
    special: "clover",
  },
  {
    name: "Звёздный маячок",
    color: "#A3ECFF",
    tile: 28,
    solid: true,
    material: "glass",
    light: 12,
    special: "star",
  },
  {
    name: "Вишнёвая листва",
    color: "#FF9CC7",
    tile: 29,
    solid: true,
    cutout: true,
    material: "grass",
  },
];
export const blocks: Block[] = definitions.map((b, id) => ({ ...b, id }));
export const block = (id: number) => blocks[id] || blocks[0];
export const initialBar = [1, 7, 9, 12, 13, 14, 16, 17, 18];
export const WORLD_SIZE = 256,
  WORLD_HEIGHT = 64,
  CHUNK = 16,
  SEA = 8;
export const index = (x: number, y: number, z: number) =>
  (y * CHUNK + z) * CHUNK + x;
export function heightOf(id: number) {
  return id === 22 ? 0.5 : 1;
}
