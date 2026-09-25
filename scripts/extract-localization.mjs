import ts from "typescript";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
await mkdir("src/locales", { recursive: true });
let catalog = {};
try {
  catalog = JSON.parse(await readFile("src/locales/ru.json", "utf8"));
} catch {
  /* first extraction */
}
const idFor = (text) => {
  const id = `s_${createHash("sha256").update(text).digest("hex").slice(0, 10)}`;
  catalog[id] = text;
  return id;
};
for (const file of (await readdir("src")).filter(
  (n) => n.endsWith(".ts") && !["strings.ts", "localize.ts"].includes(n),
)) {
  let source = await readFile(`src/${file}`, "utf8"),
    changed = false;
  for (let pass = 0; pass < 10; pass++) {
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true),
      edits = [];
    function visit(node) {
      if (
        (ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node)) &&
        /[А-Яа-яЁё]/.test(node.text)
      ) {
        edits.push({
          start: node.getStart(ast),
          end: node.end,
          text: `localize('${idFor(node.text)}')`,
        });
        return;
      }
      if (
        ts.isTemplateExpression(node) &&
        /[А-Яа-яЁё]/.test(
          node.head.text +
            node.templateSpans.map((s) => s.literal.text).join(""),
        )
      ) {
        const text =
          node.head.text +
          node.templateSpans
            .map((s, i) => `{#${i}#}` + s.literal.text)
            .join("");
        edits.push({
          start: node.getStart(ast),
          end: node.end,
          text: `localize('${idFor(text)}', ${node.templateSpans.map((s) => s.expression.getText(ast)).join(", ")})`,
        });
        return;
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
    if (!edits.length) break;
    changed = true;
    for (const edit of edits.sort((a, b) => b.start - a.start))
      source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  }
  if (changed) {
    if (!/import\s*\{\s*localize\s*\}/.test(source))
      source = "import {localize} from './localize';\n" + source;
    await writeFile(`src/${file}`, source);
  }
}
await writeFile("src/locales/ru.json", JSON.stringify(catalog, null, 2) + "\n");
console.log(`Russian catalog: ${Object.keys(catalog).length} entries`);
