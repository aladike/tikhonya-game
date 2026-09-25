import { blocks } from "./blocks.ts";
export interface Item {
  id: number;
  name: string;
  icon?: string;
  tool?: "pick" | "axe" | "shovel" | "wand" | "flash";
  tier?: number;
  food?: number;
}
export const items: Item[] = [
  ...blocks.slice(1).map((b) => ({ id: b.id, name: b.name })),
  { id: 100, name: "Деревянная кирка", icon: "⛏️", tool: "pick", tier: 1 },
  { id: 101, name: "Каменная кирка", icon: "⛏️", tool: "pick", tier: 2 },
  { id: 102, name: "Кристальная кирка", icon: "✨", tool: "pick", tier: 3 },
  { id: 103, name: "Деревянный топор", icon: "🪓", tool: "axe", tier: 1 },
  { id: 104, name: "Деревянная лопата", icon: "🥄", tool: "shovel", tier: 1 },
  { id: 105, name: "Пузырь-палочка", icon: "🫧", tool: "wand", tier: 1 },
  { id: 106, name: "Фонарик", icon: "🔦", tool: "flash" },
  { id: 107, name: "Шишка-приманка", icon: "🌰" },
  { id: 108, name: "Ягоды", icon: "🍓", food: 1 },
  { id: 109, name: "Ягодный пирог", icon: "🥧", food: 3 },
  { id: 110, name: "Косточка", icon: "🦴" },
  { id: 111, name: "Пушинка", icon: "🪶" },
  { id: 112, name: "Искра тени", icon: "🌟" },
  { id: 113, name: "Огрызок", icon: "🍏" },
  { id: 114, name: "Желе", icon: "🟣" },
  { id: 115, name: "Кристалл", icon: "💎" },
  { id: 116, name: "Уголь", icon: "⚫" },
  { id: 117, name: "Быстрые пузыри", icon: "💨", tool: "wand", tier: 2 },
  { id: 118, name: "Тройные пузыри", icon: "🫧", tool: "wand", tier: 3 },
  { id: 119, name: "Огромный пузырь", icon: "🔮", tool: "wand", tier: 4 },
  { id: 120, name: "Прыгучие пузыри", icon: "🎈", tool: "wand", tier: 5 },
  { id: 121, name: "Печенье-хохотушка", icon: "🍪", food: 2 },
  { id: 122, name: "Каменный топор", icon: "🪓", tool: "axe", tier: 2 },
  { id: 123, name: "Кристальный топор", icon: "✨", tool: "axe", tier: 3 },
  { id: 124, name: "Каменная лопата", icon: "🥄", tool: "shovel", tier: 2 },
  { id: 125, name: "Кристальная лопата", icon: "✨", tool: "shovel", tier: 3 },
];
export const item = (id: number): Item =>
  items.find((i) => i.id === id) ?? { id: 0, name: "Пусто" };
