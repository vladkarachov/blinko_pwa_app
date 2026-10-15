import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

// In-memory demo/mock server database for preview and fallback testing
interface MockNote {
  id: string | number;
  content: string;
  type: number; // 0 = Blinko (fleeting idea), 1 = Note (structured document)
  tags: string[];
  isArchived: boolean;
  isTrash: boolean;
  isShare?: boolean;
  createdAt: string;
  updatedAt: string;
}

const mockNotes: MockNote[] = [
  {
    id: 'mock-1',
    content: '⚡ Welcome to **Blinko Offline Client**!\n\nThis app is built to connect seamlessly to your self-hosted [Blinko](https://github.com/blinkospace/blinko) instance or run completely standalone.\n\n- [x] Local-first storage with IndexedDB\n- [x] Auto-sync queue when reconnecting\n- [ ] Try creating your first fleeting thought (#idea)',
    type: 0,
    tags: ['welcome', 'guide'],
    isArchived: false,
    isTrash: false,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'mock-2',
    content: '💡 **Architecture Note: Local-First Synchronization**\n\nEvery note created or modified is instantly saved in your device\'s local storage. When you\'re offline, actions enter an Outbox queue. Once network access returns, background synchronization pushes changes to your Blinko instance without losing a keystroke.\n\n#architecture #offline #pwa',
    type: 1,
    tags: ['architecture', 'offline', 'pwa'],
    isArchived: false,
    isTrash: false,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'mock-3',
    content: 'Quick capture test: remember to review the weekly sprint backlog tomorrow morning at 10 AM. #todo #urgent',
    type: 0,
    tags: ['todo', 'urgent'],
    isArchived: false,
    isTrash: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

// Helper to extract tags from content (e.g. #tag)
function extractTags(content: string): string[] {
  const matches = content.match(/#([\w\u4e00-\u9fa5\-_]+)/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((t) => t.substring(1))));
}

// Mock Blinko API endpoints
app.post('/api/mock/v1/note/list', (req: Request, res: Response) => {
  const { type, searchText, tagId, page = 1, size = 50 } = req.body || {};

  let list = mockNotes.filter((n) => !n.isTrash);

  if (typeof type === 'number') {
    list = list.filter((n) => n.type === type);
  }

  if (tagId && typeof tagId === 'string') {
    list = list.filter((n) => n.tags.includes(tagId));
  }

  if (searchText && typeof searchText === 'string') {
    const q = searchText.toLowerCase();
    list = list.filter(
      (n) => n.content.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Sort by updatedAt desc
  list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const total = list.length;
  const start = (page - 1) * size;
  const paginated = list.slice(start, start + size);

  res.json({
    code: 0,
    data: {
      items: paginated,
      total,
      page,
      size,
    },
    message: 'Success',
  });
});

app.post('/api/mock/v1/note/upsert', (req: Request, res: Response) => {
  const { id, content, type = 0, tags } = req.body || {};

  if (!content && content !== '') {
    return res.status(400).json({ code: 400, message: 'Content is required' });
  }

  const detectedTags = tags || extractTags(content);
  const now = new Date().toISOString();

  let existingIndex = -1;
  if (id) {
    existingIndex = mockNotes.findIndex((n) => String(n.id) === String(id));
  }

  if (existingIndex >= 0) {
    mockNotes[existingIndex] = {
      ...mockNotes[existingIndex],
      content,
      type,
      tags: detectedTags,
      updatedAt: now,
    };
    return res.json({
      code: 0,
      data: mockNotes[existingIndex],
      message: 'Note updated',
    });
  } else {
    const newNote: MockNote = {
      id: id || `mock-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      content,
      type,
      tags: detectedTags,
      isArchived: false,
      isTrash: false,
      createdAt: now,
      updatedAt: now,
    };
    mockNotes.unshift(newNote);
    return res.json({
      code: 0,
      data: newNote,
      message: 'Note created',
    });
  }
});

app.post('/api/mock/v1/note/batch-trash', (req: Request, res: Response) => {
  const { ids, isTrash = true } = req.body || {};
  if (Array.isArray(ids)) {
    for (const id of ids) {
      const item = mockNotes.find((n) => String(n.id) === String(id));
      if (item) {
        item.isTrash = isTrash;
        item.updatedAt = new Date().toISOString();
      }
    }
  }
  res.json({ code: 0, message: 'Updated trash status' });
});

app.post('/api/mock/v1/note/batch-delete', (req: Request, res: Response) => {
  const { ids } = req.body || {};
  if (Array.isArray(ids)) {
    for (const id of ids) {
      const idx = mockNotes.findIndex((n) => String(n.id) === String(id));
      if (idx >= 0) {
        mockNotes.splice(idx, 1);
      }
    }
  }
  res.json({ code: 0, message: 'Deleted' });
});

app.post('/api/mock/v1/tag/list', (_req: Request, res: Response) => {
  const tagCounts: Record<string, number> = {};
  for (const n of mockNotes) {
    if (n.isTrash) continue;
    for (const t of n.tags) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
  }
  const items = Object.entries(tagCounts).map(([name, count]) => ({
    name,
    count,
  }));
  res.json({
    code: 0,
    data: items,
    message: 'Success',
  });
});

// Proxy endpoint for user-configured Blinko server
// Bypasses browser CORS and mixed-content issues for self-hosted instances
app.post('/api/blinko/proxy', async (req: Request, res: Response) => {
  const targetBaseUrl = req.headers['x-blinko-url'] as string;
  const token = req.headers['authorization'] as string;
  const targetPath = (req.headers['x-blinko-path'] as string) || '/api/v1/note/list';
  const method = (req.headers['x-blinko-method'] as string) || 'POST';

  if (!targetBaseUrl) {
    return res.status(400).json({
      error: 'Missing x-blinko-url header. Specify your Blinko instance URL.',
    });
  }

  // Sanitize base URL
  const cleanBase = targetBaseUrl.replace(/\/+$/, '');
  const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  const fullUrl = `${cleanBase}${cleanPath}`;

  try {
    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) {
      fetchHeaders['Authorization'] = token;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: fetchHeaders,
    };

    if (method !== 'GET' && method !== 'HEAD' && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const targetRes = await fetch(fullUrl, fetchOptions);
    const contentType = targetRes.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await targetRes.json();
      return res.status(targetRes.status).json(data);
    } else {
      const text = await targetRes.text();
      return res.status(targetRes.status).send(text);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Blinko Proxy Error] ${fullUrl}:`, message);
    return res.status(502).json({
      error: `Failed to connect to Blinko server at ${cleanBase}`,
      details: message,
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Explicit manifest endpoints
app.get(['/manifest.json', '/manifest.webmanifest'], (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.resolve(__dirname, 'public', 'manifest.json'));
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // In dev mode, attach Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built static files
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Blinko Offline Client running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
