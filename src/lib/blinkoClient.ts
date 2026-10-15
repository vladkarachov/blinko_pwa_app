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
}

export async function requestBlinko<T>(
  config: AppConfig,
  path: string,
  method: 'GET' | 'POST' = 'POST',
  body?: unknown
): Promise<T> {
  const isDemo = config.isDemoMode || config.serverUrl === 'mock' || !config.serverUrl;

  let requestUrl = '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (isDemo) {
    // Talk to built-in mock endpoints
    requestUrl = `/api/mock${path}`;
  } else if (config.useProxy) {
    // Route through backend proxy to avoid CORS and mixed-content issues
    requestUrl = '/api/blinko/proxy';
    headers['x-blinko-url'] = config.serverUrl.replace(/\/+$/, '');
    headers['x-blinko-path'] = path;
    headers['x-blinko-method'] = method;
    if (config.apiToken) {
      headers['authorization'] = config.apiToken.startsWith('Bearer ')
        ? config.apiToken
        : `Bearer ${config.apiToken}`;
    }
  } else {
    // Direct browser fetch
    const base = config.serverUrl.replace(/\/+$/, '');
    requestUrl = `${base}${path}`;
    if (config.apiToken) {
      headers['authorization'] = config.apiToken.startsWith('Bearer ')
        ? config.apiToken
        : `Bearer ${config.apiToken}`;
    }
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (method === 'POST' && body !== undefined) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(requestUrl, options);
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      let errMsg = `Request failed with status ${response.status} (${response.statusText})`;
      let details = '';
      try {
        if (contentType.includes('application/json')) {
          const errData = await response.json();
          errMsg = errData.message || errData.error || errMsg;
          details = JSON.stringify(errData);
        } else {
          details = await response.text();
        }
      } catch {
        // ignore parse error
      }
      throw new BlinkoApiError(errMsg, response.status, details);
    }

    if (contentType.includes('application/json')) {
      const result: ApiResponse<T> = await response.json();
      // Handle standard Blinko envelope { code: 0, data: ... }
      if (result && typeof result === 'object' && 'data' in result) {
        return result.data as T;
      }
      return result as unknown as T;
    }

    return (await response.text()) as unknown as T;
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

// Fetch list of notes
export async function apiFetchNotes(
  config: AppConfig,
  params: {
    type?: number;
    searchText?: string;
    tagId?: string;
    page?: number;
    size?: number;
  } = {}
): Promise<{ items: BlinkoNote[]; total: number }> {
  const result = await requestBlinko<{ items?: BlinkoNote[]; total?: number } | BlinkoNote[]>(
    config,
    '/v1/note/list',
    'POST',
    {
      page: params.page || 1,
      size: params.size || 100,
      type: params.type,
      searchText: params.searchText,
      tagId: params.tagId,
    }
  );

  if (Array.isArray(result)) {
    return { items: result, total: result.length };
  }
  if (result && Array.isArray(result.items)) {
    return { items: result.items, total: result.total || result.items.length };
  }

  return { items: [], total: 0 };
}

// Create or update a note
export async function apiUpsertNote(
  config: AppConfig,
  note: {
    id?: string | number;
    content: string;
    type?: number;
    tags?: string[];
  }
): Promise<BlinkoNote> {
  const result = await requestBlinko<BlinkoNote>(config, '/v1/note/upsert', 'POST', note);
  return result;
}

// Move note to trash
export async function apiTrashNotes(
  config: AppConfig,
  ids: Array<string | number>,
  isTrash = true
): Promise<void> {
  await requestBlinko(config, '/v1/note/batch-trash', 'POST', { ids, isTrash });
}

// Permanent delete note
export async function apiDeleteNotes(
  config: AppConfig,
  ids: Array<string | number>
): Promise<void> {
  await requestBlinko(config, '/v1/note/batch-delete', 'POST', { ids });
}

// Fetch tags
export async function apiFetchTags(config: AppConfig): Promise<TagInfo[]> {
  try {
    const result = await requestBlinko<TagInfo[] | { items: TagInfo[] }>(
      config,
      '/v1/tag/list',
      'POST',
      {}
    );
    if (Array.isArray(result)) return result;
    if (result && Array.isArray((result as { items: TagInfo[] }).items)) {
      return (result as { items: TagInfo[] }).items;
    }
    return [];
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
