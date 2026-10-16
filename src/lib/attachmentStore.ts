// Separate IndexedDB blob store for offline attachments.
// Kept apart from blinko_offline_db so existing notes DB needs no migration.

export interface LocalAttachment {
  id: string; // client uuid: `att-<ts>-<rand>`
  noteId: string; // owning note id (may be reassigned after create)
  name: string;
  type: string;
  size: number;
  blob: Blob;
  remotePath?: string; // `/api/file/...` after successful upload
  remoteId?: string | number;
  syncStatus: 'pending' | 'synced' | 'error';
  createdAt: string;
}

const DB_NAME = 'blinko_offline_attachments';
const DB_VERSION = 1;
const STORE = 'attachments';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('noteId', 'noteId', { unique: false });
        s.createIndex('syncStatus', 'syncStatus', { unique: false });
      }
    };
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return getDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function saveLocalAttachment(att: LocalAttachment): Promise<void> {
  await tx('readwrite', (s) => s.put(att));
}

export async function getAttachmentsByNote(noteId: string): Promise<LocalAttachment[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly');
    const idx = t.objectStore(STORE).index('noteId');
    const req = idx.getAll(noteId);
    req.onsuccess = () => resolve((req.result as LocalAttachment[]) || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingAttachments(): Promise<LocalAttachment[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly');
    const idx = t.objectStore(STORE).index('syncStatus');
    const req = idx.getAll('pending');
    req.onsuccess = () => resolve((req.result as LocalAttachment[]) || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteLocalAttachment(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
}

export async function reassignAttachmentsToNote(ids: string[], noteId: string): Promise<void> {
  const db = await getDB();
  const t = db.transaction(STORE, 'readwrite');
  const store = t.objectStore(STORE);
  await Promise.all(
    ids.map(
      (id) =>
        new Promise<void>((resolve, reject) => {
          const get = store.get(id);
          get.onsuccess = () => {
            const att = get.result as LocalAttachment | undefined;
            if (!att) return resolve();
            att.noteId = noteId;
            const put = store.put(att);
            put.onsuccess = () => resolve();
            put.onerror = () => reject(put.error);
          };
          get.onerror = () => reject(get.error);
        })
    )
  );
  await new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export function localBlobUrl(att: LocalAttachment): string {
  return URL.createObjectURL(att.blob);
}

/** Build a stable object-URL cache per attachment id to avoid leaking URLs on re-render. */
const urlCache = new Map<string, string>();
export function cachedBlobUrl(att: LocalAttachment): string {
  const hit = urlCache.get(att.id);
  if (hit) return hit;
  const url = URL.createObjectURL(att.blob);
  urlCache.set(att.id, url);
  return url;
}
