import { AppConfig, BlinkoNote, TagInfo } from '../types';

export class BlinkoApiError extends Error {
  statusCode?: number;
  details?: string;

  constructor(message: string, statusCode?: number, details?: string) {
    super(message);
    this.name = 'BlinkoApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

interface ApiResponse<T> {
  code?: number;
  data?: T;
  message?: string;
  items?: T;
  total?: number;
  result?: { data?: T };
}

/** Raw note shape returned by real Blinko OpenAPI (POST /api/v1/note/list) */
interface ServerNote {
  id: number;
  content?: string | null;
  type?: number;
  isArchived?: boolean;
  isRecycle?: boolean;
  isShare?: boolean;
  isTop?: boolean;
  isTrash?: boolean;
  createdAt?: string;
  updatedAt?: string;
  tags?: Array<string | { tag?: { name?: string }; name?: string }>;
  attachments?: BlinkoNote['attachments'];
}

/** Normalize a server note (numeric id, isRecycle/isTop, object tags) to local BlinkoNote */
export function normalizeServerNote(remote: ServerNote & { id: string | number }): BlinkoNote {
  const tags: string[] = Array.isArray(remote.tags)
    ? remote.tags
        .map((t) => {
          if (typeof t === 'string') return t;
          return (t as { tag?: { name?: string }; name?: string })?.tag?.name || (t as { name?: string })?.name || '';
        })
        .filter(Boolean) as string[]
    : [];
  // Mock/demo notes use string ids ("mock-1", "seed-1"); keep them as-is.
  // Real server notes use numeric ids; store locally as "remote-<id>".
  const isNumericId = typeof remote.id === 'number' || /^\d+$/.test(String(remote.id));
  const numericId = isNumericId ? Number(remote.id) : undefined;
  return {
    id: isNumericId ? `remote-${remote.id}` : String(remote.id),
    remoteId: numericId ?? remote.id,
    content: remote.content || '',
    type: (remote.type === 1 ? 1 : 0) as BlinkoNote['type'],
    tags,
    isPinned: (remote as { isTop?: boolean; isPinned?: boolean }).isTop
      ?? (remote as { isPinned?: boolean }).isPinned
      ?? false,
    isArchived: remote.isArchived || false,
    isTrash: remote.isRecycle || remote.isTrash || false,
    createdAt: remote.createdAt || new Date().toISOString(),
    updatedAt: remote.updatedAt || new Date().toISOString(),
    syncStatus: 'synced',
    attachments: remote.attachments,
  };
}

/**
 * Real Blinko OpenAPI is mounted under /api:
 *   POST /api/v1/note/list, POST /api/v1/note/upsert,
 *   POST /api/v1/note/batch-trash, POST /api/v1/note/batch-update,
 *   POST /api/v1/note/batch-delete, GET /api/v1/tags/list
 * Older client code used /v1/... without the /api prefix, which hits the
 * SPA fallback (index.html, 200 text/html) -> parses as "0 notes".
 */
function toApiPath(path: string): string {
  if (path.startsWith('/api/')) return path;
  if (path.startsWith('/v1/')) return `/api${path}`;
  if (path.startsWith('api/')) return `/${path}`;
  return path.startsWith('/') ? `/api${path}` : `/api/${path}`;
}

function joinBaseAndPath(base: string, apiPath: string): string {
  const cleanBase = base.replace(/\/+$/, '');
  // Avoid doubling /api if user pasted ".../api" as server URL
  if (cleanBase.toLowerCase().endsWith('/api') && apiPath.startsWith('/api/')) {
    return `${cleanBase}${apiPath.substring(4)}`;
  }
  return `${cleanBase}${apiPath}`;
}

function isNativeCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  // Capacitor injects Capacitor.isNativePlatform() when running as APK
  try {
    const cap = w['Capacitor'] as { isNativePlatform?: () => boolean } | undefined;
    if (cap && typeof cap.isNativePlatform === 'function') return cap.isNativePlatform();
  } catch {
    // ignore
  }
  const proto = window.location?.protocol || '';
  return proto === 'capacitor:' || proto === 'ionic:';
}

export async function requestBlinko<T>(
  config: AppConfig,
  path: string,
  method: 'GET' | 'POST' = 'POST',
  body?: unknown
): Promise<T> {
  const isDemo = config.isDemoMode || config.serverUrl === 'mock' || !config.serverUrl;
  const apiPath = toApiPath(path);

  const authHeader =
    config.apiToken
      ? config.apiToken.startsWith('Bearer ')
        ? config.apiToken
        : `Bearer ${config.apiToken}`
      : undefined;

  const doFetch = async (requestUrl: string, extraHeaders: Record<string, string>): Promise<Response> => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...extraHeaders,
    };
    if (authHeader) headers['Authorization'] = authHeader;
    // Only send Content-Type when there is a JSON body (GET /v1/tags/list has none)
    const options: RequestInit = { method, headers };
    if (method === 'POST' && body !== undefined) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    return fetch(requestUrl, options);
  };

  const parseResponse = async (response: Response, requestUrl: string): Promise<T> => {
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      let errMsg = `Request failed with status ${response.status} (${response.statusText})`;
      let details = '';
      try {
        if (contentType.includes('application/json')) {
          const errData = await response.json();
          errMsg = (errData as { message?: string; error?: string })?.message
            || (errData as { error?: string })?.error
            || (errData as { result?: { message?: string } })?.result?.message
            || errMsg;
          details = JSON.stringify(errData);
        } else {
          details = await response.text();
        }
      } catch {
        // ignore parse error
      }
      // 401/403 almost always means wrong/expired API token
      if (response.status === 401 || response.status === 403) {
        throw new BlinkoApiError(
          `Unauthorized (HTTP ${response.status}). Your API token is missing, expired, or invalid. Regenerate it in Blinko Settings and paste it again.`,
          response.status,
          details
        );
      }
      if (response.status === 404) {
        throw new BlinkoApiError(
          `Endpoint not found (HTTP 404) at ${requestUrl}. Check that Server URL is the Blinko root (e.g. http://192.168.x.x:1111) without a trailing "/api".`,
          response.status,
          details
        );
      }
      throw new BlinkoApiError(errMsg, response.status, details);
    }

    // SPA fallback guard: wrong path returns index.html with 200 + text/html.
    // That used to surface as "connected, 0 notes".
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      const looksHtml = /<\s*!doctype|<\s*html/i.test(text.slice(0, 512));
      throw new BlinkoApiError(
        looksHtml
          ? `Server returned HTML instead of JSON at ${requestUrl}. The API path is wrong (Blinko OpenAPI lives under /api/v1/...) or Server URL points at the wrong port. Use the Blinko root URL, e.g. http://host:1111.`
          : `Unexpected content-type "${contentType}" from ${requestUrl}.`,
        response.status,
        text.slice(0, 500)
      );
    }

    const result: ApiResponse<T> = await response.json();
    // Handle standard envelope { code: 0, data: ... } plus tRPC-openapi { result: { data } }
    if (result && typeof result === 'object') {
      if ('data' in result && (result as { code?: number }).code !== undefined) {
        if ((result as { code?: number }).code !== 0) {
          throw new BlinkoApiError(
            (result as { message?: string }).message || 'Blinko server returned an error',
            undefined,
            JSON.stringify(result)
          );
        }
        return (result as { data: T }).data as T;
      }
      if ('result' in result && result.result && typeof result.result === 'object' && 'data' in (result.result as object)) {
        return (result.result as { data: T }).data as T;
      }
      if ('data' in result && !Array.isArray(result)) {
        // Some endpoints wrap payload in { data } without a code field
        const keys = Object.keys(result);
        if (keys.length === 1 && keys[0] === 'data') return (result as { data: T }).data as T;
      }
    }
    return result as unknown as T;
  };

  let requestUrl = '';
  const headers: Record<string, string> = {};

  if (isDemo) {
    // Talk to built-in mock endpoints (mock keeps legacy /api/mock/v1/... shape)
    const mockPath = path.startsWith('/v1/') ? path : path.replace(/^\/api\/v1\//, '/v1/');
    requestUrl = `/api/mock${mockPath}`;
  } else if (config.useProxy && !isNativeCapacitor()) {
    // Route through backend proxy to avoid CORS and mixed-content issues (web/PWA only)
    requestUrl = '/api/blinko/proxy';
    headers['x-blinko-url'] = config.serverUrl.replace(/\/+$/, '');
    headers['x-blinko-path'] = apiPath;
    headers['x-blinko-method'] = method;
  } else {
    // Direct browser fetch (required on Android APK where no local proxy exists)
    const base = config.serverUrl.replace(/\/+$/, '');
    requestUrl = joinBaseAndPath(base, apiPath);
  }

  try {
    let response = await doFetch(requestUrl, headers);
    // Auto-fallback: proxy missing (Capacitor build, static hosting) -> retry direct
    if (!isDemo && config.useProxy && !isNativeCapacitor() && response.status === 404) {
      const text = await response.clone().text().catch(() => '');
      if (!response.headers.get('content-type')?.includes('application/json') || /cannot post|not found/i.test(text)) {
        const base = config.serverUrl.replace(/\/+$/, '');
        if (base && base !== 'mock') {
          response = await doFetch(joinBaseAndPath(base, apiPath), {});
        }
      }
    }
    return await parseResponse(response, requestUrl);
  } catch (err: unknown) {
    if (err instanceof BlinkoApiError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new BlinkoApiError(
      `Network error connecting to Blinko server: ${msg}. Check if your Blinko instance is reachable.`,
      0,
      msg
    );
  }
}

// Fetch list of notes. Real Blinko returns a bare array (not {items,total}).
export async function apiFetchNotes(
  config: AppConfig,
  params: {
    type?: number;
    searchText?: string;
    tagId?: string | number;
    page?: number;
    size?: number;
  } = {}
): Promise<{ items: BlinkoNote[]; total: number }> {
  // Server schema: type -1 = all, tagId number|null, searchText '', isRecycle false.
  // Local tag filter uses names; server tagId is numeric, so omit it here and
  // let the client filter by name instead of sending an invalid string id.
  const tagIdNumeric = typeof params.tagId === 'number' ? params.tagId : undefined;
  const result = await requestBlinko<ServerNote[] | { items?: ServerNote[]; total?: number }>(
    config,
    '/api/v1/note/list',
    'POST',
    {
      page: params.page || 1,
      size: params.size || 100,
      orderBy: 'desc',
      type: params.type ?? -1,
      searchText: params.searchText ?? '',
      tagId: tagIdNumeric ?? null,
      isArchived: false,
      isRecycle: false,
    }
  );

  if (Array.isArray(result)) {
    const items = result.map(normalizeServerNote);
    return { items, total: items.length };
  }
  if (result && Array.isArray((result as { items?: ServerNote[] }).items)) {
    const raw = (result as { items: ServerNote[]; total?: number }).items;
    const items = raw.map(normalizeServerNote);
    return { items, total: (result as { total?: number }).total ?? items.length };
  }

  return { items: [], total: 0 };
}

function toNumericRemoteId(id: string | number | undefined): number | undefined {
  if (id === undefined) return undefined;
  if (typeof id === 'number' && Number.isFinite(id)) return id;
  // Client ids look like "note-..."/"seed-..."/"remote-123"; only "remote-<n>" maps back.
  const m = String(id).match(/^remote-(\d+)$/);
  if (m) return Number(m[1]);
  if (/^\d+$/.test(String(id))) return Number(String(id));
  return undefined;
}

export function resolveRemoteId(note: { id?: string | number; remoteId?: string | number }): number | undefined {
  return toNumericRemoteId(note.remoteId ?? note.id);
}

// Create or update a note. Server derives tags from #hashtags; it takes a
// numeric id only — client-generated string ids must be omitted on create.
export async function apiUpsertNote(
  config: AppConfig,
  note: {
    id?: string | number;
    remoteId?: string | number;
    content: string;
    type?: number;
    attachments?: Array<{ name: string; path: string; size?: number; type?: string }>;
  }
): Promise<BlinkoNote> {
  const numericId = toNumericRemoteId(note.remoteId ?? note.id);
  const result = await requestBlinko<ServerNote>(config, '/api/v1/note/upsert', 'POST', {
    ...(numericId !== undefined ? { id: numericId } : {}),
    content: note.content,
    type: note.type ?? 0,
    ...(note.attachments && note.attachments.length > 0 ? { attachments: note.attachments } : {}),
  });
  if (result && typeof result === 'object' && 'id' in result) {
    return normalizeServerNote(result as ServerNote);
  }
  // Some deployments return the note without normalization guarantees
  return normalizeServerNote({ ...(result as object) as ServerNote, content: note.content });
}

// Move note to trash (server field is isRecycle, no isTrash flag on this endpoint)
export async function apiTrashNotes(
  config: AppConfig,
  ids: Array<string | number>,
  _isTrash = true
): Promise<void> {
  const numericIds = ids
    .map((id) => toNumericRemoteId(id))
    .filter((n): n is number => n !== undefined);
  if (numericIds.length === 0) return;
  await requestBlinko(config, '/api/v1/note/batch-trash', 'POST', { ids: numericIds });
}

// Restore from trash via batch-update { ids, isRecycle: false }
export async function apiRestoreNotes(
  config: AppConfig,
  ids: Array<string | number>
): Promise<void> {
  const numericIds = ids
    .map((id) => toNumericRemoteId(id))
    .filter((n): n is number => n !== undefined);
  if (numericIds.length === 0) return;
  await requestBlinko(config, '/api/v1/note/batch-update', 'POST', { ids: numericIds, isRecycle: false });
}

// Upload a file blob to the real Blinko server.
// POST {serverUrl}/api/file/upload (multipart `file`, Bearer token).
// Returns the server file descriptor { path, ... } for note upsert linkage.
export async function apiUploadFile(
  config: AppConfig,
  file: Blob,
  filename: string
): Promise<{ path: string; type?: string; size?: number; name?: string }> {
  if (config.isDemoMode || !config.serverUrl || config.serverUrl === 'mock') {
    throw new BlinkoApiError('File upload is unavailable in demo mode. Connect a server first.');
  }
  const base = config.serverUrl.replace(/\/+$/, '');
  const url = `${base}/api/file/upload`;
  const form = new FormData();
  form.append('file', file, filename);
  const token = config.apiToken
    ? config.apiToken.startsWith('Bearer ')
      ? config.apiToken
      : `Bearer ${config.apiToken}`
    : '';
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: token } : {},
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new BlinkoApiError(`File upload failed (HTTP ${res.status})`, res.status, text.slice(0, 500));
  }
  const data = (await res.json()) as Record<string, unknown>;
  const path = (data['path'] ?? data['filePath'] ?? '') as string;
  if (!path) throw new BlinkoApiError('Upload succeeded but server returned no file path', res.status);
  return {
    path,
    type: (data['type'] as string) ?? (file as File).type,
    size: (data['size'] as number) ?? file.size,
    name: filename,
  };
}

// Permanent delete note
export async function apiDeleteNotes(
  config: AppConfig,
  ids: Array<string | number>
): Promise<void> {
  const numericIds = ids
    .map((id) => toNumericRemoteId(id))
    .filter((n): n is number => n !== undefined);
  if (numericIds.length === 0) return;
  await requestBlinko(config, '/api/v1/note/batch-delete', 'POST', { ids: numericIds });
}

// Fetch tags. Real endpoint is GET /api/v1/tags/list (plural) returning
// [{ id, name, ... }] with no counts — map to local TagInfo.
export async function apiFetchTags(config: AppConfig): Promise<TagInfo[]> {
  try {
    const result = await requestBlinko<Array<{ name?: string }> | { items: Array<{ name?: string }> }>(
      config,
      '/api/v1/tags/list',
      'GET'
    );
    const raw = Array.isArray(result)
      ? result
      : Array.isArray((result as { items?: Array<{ name?: string }> }).items)
        ? (result as { items: Array<{ name?: string }> }).items
        : [];
    return raw
      .map((t) => ({ name: t?.name || '', count: 0 }))
      .filter((t) => t.name);
  } catch (err) {
    console.warn('Failed to fetch remote tags:', err);
    return [];
  }
}

// Test connection
export async function apiTestConnection(
  config: AppConfig
): Promise<{ ok: boolean; message: string; noteCount?: number }> {
  try {
    const list = await apiFetchNotes(config, { page: 1, size: 5 });
    return {
      ok: true,
      message: `Successfully connected! Found ${list.total} note(s) on server.`,
      noteCount: list.total,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      message: msg,
    };
  }
}
