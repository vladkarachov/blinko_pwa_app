export type NoteType = 0 | 1; // 0 = Blinko (fleeting idea), 1 = Note (permanent document)

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error';

export interface BlinkoNote {
  id: string; // client UUID or remote ID string
  remoteId?: string | number;
  content: string;
  type: NoteType;
  tags: string[];
  isPinned?: boolean;
  isArchived: boolean;
  isTrash: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  syncStatus: SyncStatus;
  syncError?: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size?: number;
  }>;
}

export type QueueAction = 'UPSERT' | 'TRASH' | 'RESTORE' | 'DELETE';

export interface SyncQueueItem {
  id: string;
  action: QueueAction;
  noteId: string;
  payload: Partial<BlinkoNote>;
  timestamp: number;
  retries: number;
  lastError?: string;
}

export interface AppConfig {
  serverUrl: string; // e.g. "http://localhost:1111" or "mock"
  apiToken: string;  // Bearer token
  useProxy: boolean; // Route through /api/blinko/proxy to avoid CORS/mixed-content
  isDemoMode: boolean; // Use built-in mock server
  autoSync: boolean;
  syncIntervalSec: number;
  theme: 'dark' | 'light' | 'system';
}

export interface TagInfo {
  name: string;
  count: number;
}

export type NoteFilter = 'all' | 'blinko' | 'note' | 'pinned' | 'archived' | 'trash';
