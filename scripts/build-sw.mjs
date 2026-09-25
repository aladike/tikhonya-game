import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
async function list(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (e) =>
        e.isDirectory() ? list(`${path}/${e.name}`) : `${path}/${e.name}`,
      ),
    )
  ).flat();
}
const files = (await list("dist"))
  .filter((p) => !p.endsWith("/sw.js") && !p.endsWith("/release.json"))
  .sort();
const hash = createHash("sha256");
for (const file of files) hash.update(await readFile(file));
hash.update(await readFile(new URL(import.meta.url)));
const version = hash.digest("hex").slice(0, 12);
const sw = `const CACHE='tikhonya-${version}';
const BASE=new URL('./',self.location).href;
const FILES=${JSON.stringify(files.map((p) => p.slice(5)))};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(p=>new Request(new URL(p,BASE).href,{cache:"reload"}))))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tikhonya-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||!url.href.startsWith(BASE)||url.origin!==self.location.origin)return;
 event.respondWith(caches.open(CACHE).then(async cache=>{
  if(event.request.mode==='navigate')return await cache.match(new URL('index.html',BASE).href)||fetch(event.request);
  return await cache.match(event.request,{ignoreVary:true})||fetch(event.request);
 }));
});
`;
await writeFile("dist/sw.js", sw);
await writeFile("dist/release.json", JSON.stringify({ version, stage: 5 }));
console.log(`Offline shell: ${files.length} files, version ${version}`);
