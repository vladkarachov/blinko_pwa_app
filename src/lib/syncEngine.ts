import {
  apiDeleteNotes,
  apiFetchNotes,
  apiRestoreNotes,
  apiTrashNotes,
  apiUpsertNote,
} from './blinkoClient';
import {
  addQueueItem,
  getAllNotes,
  getConfig,
  getNote,
  getQueueItems,
  removeQueueItem,
  saveNote,
} from './db';
import { BlinkoNote, QueueAction, SyncQueueItem } from '../types';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  pendingCount: number;
  lastSyncError: string | null;
}

type SyncListener = (state: SyncState) => void;

class SyncEngine {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private lastSyncedAt: Date | null = null;
  private pendingCount: number = 0;
  private lastSyncError: string | null = null;
  private listeners: Set<SyncListener> = new Set();
  private timer: NodeJS.Timeout | null = null;
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  public init() {
    if (this.initialized) return;
    this.initialized = true;
    this.updatePendingCount();

    // Start background sync loop
    this.startBackgroundTimer();

    // Initial sync if online
    if (this.isOnline) {
      setTimeout(() => {
        this.syncNow().catch((err) => console.warn('Initial sync failed:', err));
      }, 1000);
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): SyncState {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
      pendingCount: this.pendingCount,
      lastSyncError: this.lastSyncError,
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {
        console.error('Error notifying sync listener:', e);
      }
    });
  }

  private handleOnline = () => {
    console.log('[SyncEngine] Network restored (online). Triggering automatic sync.');
    this.isOnline = true;
    this.lastSyncError = null;
    this.notify();
    this.syncNow();
  };

  private handleOffline = () => {
    console.log('[SyncEngine] Device went offline. Local changes will be queued in Outbox.');
    this.isOnline = false;
    this.notify();
  };

  private async updatePendingCount() {
    try {
      const items = await getQueueItems();
      this.pendingCount = items.length;
      this.notify();
    } catch {
      // ignore
    }
  }

  private startBackgroundTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(async () => {
      if (this.isOnline && !this.isSyncing) {
        const config = await getConfig();
        if (config.autoSync) {
          this.syncNow().catch((err) => {
            console.debug('[SyncEngine] Periodic sync skipped or error:', err);
          });
        }
      }
    }, 25000); // Check every 25 seconds
  }

  // Enqueue a local action to be pushed remotely
  public async queueAction(
    action: QueueAction,
    noteId: string,
    payload: Partial<BlinkoNote>
  ): Promise<void> {
    const item: SyncQueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      action,
      noteId,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };

    await addQueueItem(item);
    await this.updatePendingCount();

    // If online, kick off an immediate sync
    if (this.isOnline && !this.isSyncing) {
      this.syncNow().catch((err) => console.warn('Immediate sync attempt failed:', err));
    }
  }

  // Trigger complete synchronization
  public async syncNow(): Promise<{ success: boolean; pushed: number; pulled: number; error?: string }> {
    if (this.isSyncing) {
      return { success: false, pushed: 0, pulled: 0, error: 'Sync already in progress' };
    }

    if (!this.isOnline) {
      return { success: false, pushed: 0, pulled: 0, error: 'Device is offline' };
    }

    this.isSyncing = true;
    this.lastSyncError = null;
    this.notify();

    let pushed = 0;
    let pulled = 0;

    try {
      const config = await getConfig();

      // Step 1: Drain the Outbox queue
      const queue = await getQueueItems();

      for (const item of queue) {
        try {
          const localNote = await getNote(item.noteId);

          if (item.action === 'UPSERT') {
            if (localNote) {
              // Mark as syncing in local DB
              localNote.syncStatus = 'syncing';
              await saveNote(localNote);

              const remoteResult = await apiUpsertNote(config, {
                remoteId: localNote.remoteId ?? localNote.id,
                content: localNote.content,
                type: localNote.type,
              });

              // Mark as synced with numeric remote ID if returned
              localNote.syncStatus = 'synced';
              localNote.syncError = undefined;
              if (remoteResult) {
                const rid = remoteResult.remoteId ?? remoteResult.id;
                if (rid !== undefined) localNote.remoteId = rid;
              }
              await saveNote(localNote);
              await removeQueueItem(item.id);
              pushed++;
            } else {
              // Note was deleted locally before sync
              await removeQueueItem(item.id);
            }
          } else if (item.action === 'TRASH' || item.action === 'RESTORE') {
            const targetId = localNote?.remoteId ?? item.noteId;
            if (item.action === 'TRASH') {
              await apiTrashNotes(config, [targetId], true);
            } else {
              await apiRestoreNotes(config, [targetId]);
            }
            if (localNote) {
              localNote.syncStatus = 'synced';
              await saveNote(localNote);
            }
            await removeQueueItem(item.id);
            pushed++;
          } else if (item.action === 'DELETE') {
            const targetId = item.payload.remoteId || item.noteId;
            await apiDeleteNotes(config, [targetId]);
            await removeQueueItem(item.id);
            pushed++;
          }
        } catch (itemErr: unknown) {
          console.warn(`[SyncEngine] Error syncing item ${item.id}:`, itemErr);
          item.retries += 1;
          const msg = itemErr instanceof Error ? itemErr.message : String(itemErr);
          item.lastError = msg;

          const localNote = await getNote(item.noteId);
          if (localNote) {
            localNote.syncStatus = 'error';
            localNote.syncError = msg;
            await saveNote(localNote);
          }
        }
      }

      await this.updatePendingCount();

      // Step 2: Pull latest remote notes (apiFetchNotes already normalizes
      // numeric ids -> "remote-<id>", isRecycle -> isTrash, isTop -> isPinned)
      try {
        const remoteList = await apiFetchNotes(config, { page: 1, size: 100 });
        const localNotes = await getAllNotes();
        const localKey = (n: BlinkoNote) =>
          n.remoteId !== undefined ? String(n.remoteId) : n.id;
        const localMap = new Map(localNotes.map((n) => [localKey(n), n]));

        for (const remoteNote of remoteList.items) {
          const key = remoteNote.remoteId !== undefined ? String(remoteNote.remoteId) : remoteNote.id;
          const existing = localMap.get(key);

          if (!existing) {
            // New note from remote (already normalized: id "remote-<n>")
            await saveNote({ ...remoteNote, syncStatus: 'synced' });
            pulled++;
          } else {
            // Merge conflict resolution:
            // If local has pending edits, local wins!
            if (existing.syncStatus === 'pending' || existing.syncStatus === 'syncing') {
              continue;
            }

            // Otherwise, update if remote is newer
            const remoteTime = new Date(remoteNote.updatedAt || 0).getTime();
            const localTime = new Date(existing.updatedAt || 0).getTime();

            if (remoteTime > localTime) {
              existing.content = remoteNote.content || '';
              existing.type = remoteNote.type ?? existing.type;
              existing.tags = remoteNote.tags || existing.tags;
              existing.isPinned = remoteNote.isPinned ?? existing.isPinned;
              existing.isArchived = remoteNote.isArchived ?? existing.isArchived;
              existing.isTrash = remoteNote.isTrash ?? existing.isTrash;
              existing.updatedAt = remoteNote.updatedAt || existing.updatedAt;
              existing.syncStatus = 'synced';
              if (existing.remoteId === undefined && remoteNote.remoteId !== undefined) {
                existing.remoteId = remoteNote.remoteId;
              }
              await saveNote(existing);
              pulled++;
            } else if (existing.remoteId === undefined && remoteNote.remoteId !== undefined) {
              // Backfill linkage for notes pushed earlier in this same sync
              existing.remoteId = remoteNote.remoteId;
              await saveNote(existing);
            }
          }
        }
      } catch (pullErr: unknown) {
        console.warn('[SyncEngine] Error pulling remote notes:', pullErr);
      }

      this.lastSyncedAt = new Date();
      this.isSyncing = false;
      this.notify();
      return { success: true, pushed, pulled };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.lastSyncError = msg;
      this.isSyncing = false;
      this.notify();
      return { success: false, pushed, pulled, error: msg };
    }
  }

  public destroy() {
    if (this.timer) clearInterval(this.timer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }
}

export const syncEngine = new SyncEngine();
