export interface Recipe {
  id: string;
  name: string;
  input: [number, number][];
  output: [number, number];
  station?: "bench" | "furnace";
  seconds?: number;
}
export const recipes: Recipe[] = [
  { id: "planks", name: "Доски", input: [[6, 1]], output: [7, 4] },
  { id: "bench", name: "Верстак", input: [[7, 4]], output: [31, 1] },
  { id: "pick1", name: "Деревянная кирка", input: [[7, 3]], output: [100, 1] },
  { id: "axe1", name: "Деревянный топор", input: [[7, 3]], output: [103, 1] },
  {
    id: "shovel1",
    name: "Деревянная лопата",
    input: [[7, 2]],
    output: [104, 1],
  },
  {
    id: "pick2",
    name: "Каменная кирка",
    input: [
      [4, 3],
      [7, 2],
    ],
    output: [101, 1],
    station: "bench",
  },
  {
    id: "pick3",
    name: "Кристальная кирка",
    input: [
      [115, 3],
      [7, 2],
    ],
    output: [102, 1],
    station: "bench",
  },
  {
    id: "axe2",
    name: "Каменный топор",
    input: [
      [4, 3],
      [7, 2],
    ],
    output: [122, 1],
    station: "bench",
  },
  {
    id: "axe3",
    name: "Кристальный топор",
    input: [
      [115, 3],
      [7, 2],
    ],
    output: [123, 1],
    station: "bench",
  },
  {
    id: "shovel2",
    name: "Каменная лопата",
    input: [
      [4, 2],
      [7, 1],
    ],
    output: [124, 1],
    station: "bench",
  },
  {
    id: "shovel3",
    name: "Кристальная лопата",
    input: [
      [115, 2],
      [7, 1],
    ],
    output: [125, 1],
    station: "bench",
  },
  {
    id: "chest",
    name: "Сундук",
    input: [[7, 6]],
    output: [33, 1],
    station: "bench",
  },
  {
    id: "furnace",
    name: "Печка",
    input: [[4, 6]],
    output: [32, 1],
    station: "bench",
  },
  { id: "lamp", name: "Фонарь", input: [[7, 2]], output: [16, 2] },
  {
    id: "bed",
    name: "Кровать",
    input: [
      [7, 4],
      [13, 2],
    ],
    output: [34, 1],
    station: "bench",
  },
  { id: "wool", name: "Мягкая шерсть", input: [[111, 1]], output: [13, 4] },
  {
    id: "softwool",
    name: "Цветочная шерсть",
    input: [
      [18, 3],
      [8, 2],
    ],
    output: [13, 2],
  },
  {
    id: "glass",
    name: "Стекло из песка",
    input: [
      [3, 3],
      [116, 1],
    ],
    output: [9, 3],
    station: "furnace",
    seconds: 8,
  },
  {
    id: "coal",
    name: "Уголь из дерева",
    input: [[6, 1]],
    output: [116, 2],
    station: "furnace",
    seconds: 6,
  },
  {
    id: "pie",
    name: "Ягодный пирог",
    input: [
      [108, 3],
      [116, 1],
    ],
    output: [109, 1],
    station: "furnace",
    seconds: 8,
  },
  {
    id: "wand",
    name: "Пузырь-палочка",
    input: [
      [7, 2],
      [18, 1],
    ],
    output: [105, 1],
  },
  {
    id: "flash",
    name: "Фонарик",
    input: [
      [16, 1],
      [7, 1],
    ],
    output: [106, 1],
  },
  {
    id: "quick",
    name: "Быстрые пузыри",
    input: [
      [114, 2],
      [7, 2],
    ],
    output: [117, 1],
    station: "bench",
  },
  {
    id: "triple",
    name: "Тройные пузыри",
    input: [
      [111, 2],
      [112, 2],
    ],
    output: [118, 1],
    station: "bench",
  },
  {
    id: "giant",
    name: "Огромный пузырь",
    input: [
      [114, 4],
      [112, 1],
    ],
    output: [119, 1],
    station: "bench",
  },
  {
    id: "bounce",
    name: "Прыгучие пузыри",
    input: [
      [114, 3],
      [111, 1],
    ],
    output: [120, 1],
    station: "bench",
  },
  {
    id: "spring",
    name: "Батут",
    input: [
      [114, 2],
      [7, 3],
    ],
    output: [17, 2],
    station: "bench",
  },
  {
    id: "crystal",
    name: "Ночной кристалл",
    input: [
      [112, 3],
      [114, 1],
    ],
    output: [115, 2],
    station: "bench",
  },
  {
    id: "nightlamp",
    name: "Звёздный маячок",
    input: [
      [112, 1],
      [9, 1],
    ],
    output: [29, 2],
  },
  {
    id: "honey",
    name: "Мёд-липучка",
    input: [
      [113, 2],
      [114, 1],
    ],
    output: [35, 3],
    station: "bench",
  },
  {
    id: "jellypath",
    name: "Мармеладная дорожка",
    input: [[114, 2]],
    output: [36, 4],
  },
  {
    id: "drum",
    name: "Сонный барабан",
    input: [
      [111, 2],
      [7, 2],
    ],
    output: [37, 1],
    station: "bench",
  },
  {
    id: "mirror",
    name: "Зеркало смешинок",
    input: [
      [112, 2],
      [9, 2],
    ],
    output: [38, 1],
    station: "bench",
  },
  {
    id: "cookie",
    name: "Печенье-хохотушка",
    input: [
      [108, 2],
      [113, 1],
    ],
    output: [121, 2],
    station: "furnace",
    seconds: 6,
  },
];
