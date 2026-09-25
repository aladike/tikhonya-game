import { decodeIsland, type IslandSave } from "./format";
export class IslandStore {
  private database?: IDBDatabase;
  slot = Math.max(
    0,
    Math.min(2, Number(localStorage.getItem("island-slot")) || 0),
  );
  key(name: string, slot = this.slot) {
    return slot ? `${name}-${slot}` : name;
  }
  async list() {
    return Promise.all([0, 1, 2].map((slot) => this.load(slot)));
  }
  select(slot: number) {
    localStorage.setItem("island-slot", String(slot));
    this.slot = slot;
  }

  async open() {
    if (this.database) return this.database;
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("tikhonya-block-island", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("worlds");
      request.onsuccess = () => {
        this.database = request.result;
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }
  async read(key: string) {
    const db = await this.open();
    return new Promise<string | undefined>((resolve, reject) => {
      const req = db.transaction("worlds").objectStore("worlds").get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async load(slot = this.slot) {
    for (const key of ["active", "backup"]) {
      try {
        const raw = await this.read(this.key(key, slot));
        if (raw) return decodeIsland(raw);
      } catch {
        /* Try the previous valid copy. */
      }
    }
    return null;
  }
  async save(state: IslandSave) {
    const raw = JSON.stringify(decodeIsland(JSON.stringify(state)));
    decodeIsland(raw);
    const db = await this.open();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction("worlds", "readwrite"),
        store = tx.objectStore("worlds"),
        previous = store.get(this.key("active"));
      previous.onsuccess = () => {
        if (previous.result) {
          try {
            decodeIsland(previous.result);
            store.put(previous.result, this.key("backup"));
          } catch {
            /* Preserve valid backup. */
          }
        }
        store.put(raw, this.key("active"));
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}
