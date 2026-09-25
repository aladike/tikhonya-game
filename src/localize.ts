import catalog from "./locales/ru.json" with { type: "json" };
export function localize(id: string, ...parts: unknown[]): string {
  const text = (catalog as Record<string, string>)[id];
  if (text === undefined) throw new Error(`Missing translation: ${id}`);
  return text.replace(/\{#(\d+)#\}/g, (_, index) =>
    String(parts[Number(index)] ?? ""),
  );
}
