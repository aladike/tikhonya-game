export type MobKind = "bubul" | "shadow" | "chomper" | "jelly";
export const mobTypes: Record<
  MobKind,
  { name: string; color: string; speed: number; hits: number; trophy: number }
> = {
  bubul: {
    name: "Бубуль",
    color: "#B983FF",
    speed: 2.15,
    hits: 3,
    trophy: 111,
  },
  shadow: {
    name: "Тенюшка",
    color: "#7771CC",
    speed: 2.65,
    hits: 2,
    trophy: 112,
  },
  chomper: {
    name: "Хрумкач",
    color: "#FFB347",
    speed: 1.8,
    hits: 2,
    trophy: 113,
  },
  jelly: { name: "Желейка", color: "#F29BDB", speed: 2, hits: 2, trophy: 114 },
};
