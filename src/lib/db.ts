import { AppConfig, BlinkoNote, SyncQueueItem } from '../types';

const DB_NAME = 'blinko_offline_db';
const DB_VERSION = 1;

const STORES = {
  NOTES: 'notes',
  SYNC_QUEUE: 'sync_queue',
  CONFIG: 'config',
};

const DEFAULT_CONFIG: AppConfig = {
  serverUrl: 'http://localhost:1111',
  apiToken: '',
  useProxy: true,
  isDemoMode: true, // Default to demo mode so the app works immediately out of the box
  autoSync: true,
  syncIntervalSec: 20,
  theme: 'dark',
};

const SEED_NOTES: BlinkoNote[] = [
  {
    id: 'seed-1',
    content: '⚡ **Welcome to Blinko Offline Client!**\n\nThis app is your offline-first companion for [Blinko](https://github.com/blinkospace/blinko). It preserves all your notes and fleeting thoughts in local **IndexedDB** storage and automatically pushes changes to your self-hosted Blinko instance whenever you are online.\n\n### What you can do:\n- ⚡ **Instant Capture**: Press `Cmd + Enter` or `Ctrl + Enter` to record ideas immediately.\n- 📴 **100% Offline Capable**: Create, edit, and organize notes without any internet connection.\n- 🔄 **Auto-Sync Engine**: Disconnect your Wi-Fi, create notes, and watch them seamlessly synchronize when you reconnect.\n- 🏷️ **Tagging**: Just write `#idea`, `#todo`, or `#work` anywhere in your text.\n- 📝 **Markdown & Checklists**: Click on `- [ ]` checkboxes right from the note card!\n\n#welcome #blinko #offline',
    type: 0,
    tags: ['welcome', 'blinko', 'offline'],
    isPinned: true,
    isArchived: false,
    isTrash: false,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    syncStatus: 'synced',
  },
  {
    id: 'seed-2',
    content: '💡 **Project Brainstorm: Offline-First Synchronization**\n\nDesigning local-first software means the local database is the single source of truth for the UI:\n\n- [x] Write to local IndexedDB first (< 5ms response time)\n- [x] Push delta into persistent Outbox queue\n- [ ] Background sync worker flushes pending queue on network reconnect\n- [ ] Conflict resolution strategy (Last-Write-Wins with timestamp comparison)\n\n#architecture #dev #sync',
    type: 1,
    tags: ['architecture', 'dev', 'sync'],
    isPinned: false,
    isArchived: false,
    isTrash: false,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    syncStatus: 'synced',
  },
  {
    id: 'seed-3',
    content: 'Meeting recap with product team:\n- Finalize mobile touch targets\n- Add PWA install button for iOS and Android\n- Test network failure edge-cases\n\n#meeting #work',
    type: 0,
    tags: ['meeting', 'work'],
    isPinned: false,
    isArchived: false,
    isTrash: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    syncStatus: 'synced',
  },
];

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Notes store
      if (!db.objectStoreNames.contains(STORES.NOTES)) {
        const noteStore = db.createObjectStore(STORES.NOTES, { keyPath: 'id' });
        noteStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        noteStore.createIndex('type', 'type', { unique: false });
        noteStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        noteStore.createIndex('isTrash', 'isTrash', { unique: false });
      }

      // Sync queue store
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        queueStore.createIndex('noteId', 'noteId', { unique: false });
      }

      // Config store
      if (!db.objectStoreNames.contains(STORES.CONFIG)) {
        db.createObjectStore(STORES.CONFIG, { keyPath: 'key' });
      }
    };
  });

  return dbPromise;
}

// Database initial seeding check
export async function initDatabase(): Promise<void> {
  const db = await getDB();
  const notes = await getAllNotes();

  if (notes.length === 0) {
    const tx = db.transaction(STORES.NOTES, 'readwrite');
    const store = tx.objectStore(STORES.NOTES);
    for (const note of SEED_NOTES) {
      store.put(note);
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  // Ensure config exists
  const existingConfig = await getConfig();
  if (!existingConfig) {
    await saveConfig(DEFAULT_CONFIG);
  }
}

// Note operations
export async function getAllNotes(): Promise<BlinkoNote[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTES, 'readonly');
    const store = tx.objectStore(STORES.NOTES);
    const request = store.getAll();

    request.onsuccess = () => {
      const notes = (request.result as BlinkoNote[]) || [];
      // Sort newest updated first
      notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      resolve(notes);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getNote(id: string): Promise<BlinkoNote | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTES, 'readonly');
    const store = tx.objectStore(STORES.NOTES);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveNote(note: BlinkoNote): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTES, 'readwrite');
    const store = tx.objectStore(STORES.NOTES);
    const request = store.put(note);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteNotePermanently(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTES, 'readwrite');
    const store = tx.objectStore(STORES.NOTES);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Sync Queue operations
export async function getQueueItems(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const request = store.getAll();

    request.onsuccess = () => {
      const items = (request.result as SyncQueueItem[]) || [];
      items.sort((a, b) => a.timestamp - b.timestamp);
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function addQueueItem(item: SyncQueueItem): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function removeQueueItem(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearQueue(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Config operations
export async function getConfig(): Promise<AppConfig> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CONFIG, 'readonly');
    const store = tx.objectStore(STORES.CONFIG);
    const request = store.get('app_config');

    request.onsuccess = () => {
      if (request.result && request.result.value) {
        resolve({ ...DEFAULT_CONFIG, ...request.result.value });
      } else {
        resolve(DEFAULT_CONFIG);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CONFIG, 'readwrite');
    const store = tx.objectStore(STORES.CONFIG);
    const request = store.put({ key: 'app_config', value: config });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Reset data helper
export async function resetDatabase(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([STORES.NOTES, STORES.SYNC_QUEUE], 'readwrite');
  tx.objectStore(STORES.NOTES).clear();
  tx.objectStore(STORES.SYNC_QUEUE).clear();

  const noteStore = tx.objectStore(STORES.NOTES);
  for (const note of SEED_NOTES) {
    noteStore.put(note);
  }

  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
