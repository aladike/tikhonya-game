import type { Recipe } from "../data/recipes.ts";
import { Inventory } from "./inventory.ts";
export function canCraft(inv: Inventory, recipe: Recipe, station?: string) {
  return (
    (!recipe.station || recipe.station === station) &&
    recipe.input.every(([id, n]) => inv.count(id) >= n)
  );
}
export function craft(inv: Inventory, recipe: Recipe, station?: string) {
  if (!canCraft(inv, recipe, station)) return false;
  const copy = new Inventory(inv.slots, [...inv.discovered]);
  recipe.input.forEach(([id, n]) => copy.remove(id, n));
  if (copy.add(...recipe.output)) return false;
  inv.slots = copy.slots;
  inv.discovered = copy.discovered;
  return true;
}
