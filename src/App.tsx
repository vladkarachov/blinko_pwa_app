import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  initDatabase,
  getAllNotes,
  saveNote,
  deleteNotePermanently,
  getConfig,
  saveConfig,
} from './lib/db';
import { reassignAttachmentsToNote, LocalAttachment } from './lib/attachmentStore';
import { syncEngine, SyncState } from './lib/syncEngine';
import { AppConfig, BlinkoNote, NoteType, SyncStatus } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { MobileHeader } from './components/Layout/MobileHeader';
import { MobileNavBar } from './components/Layout/MobileNavBar';
import { HomePage, HomeView } from './pages/HomePage';
import { ResourcesPage } from './pages/ResourcesPage';
import { ReviewPage } from './pages/ReviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { DetailPage } from './pages/DetailPage';
import { X } from 'lucide-react';

function viewFromParams(path: string | null): HomeView {
  if (path === 'notes' || path === 'todo' || path === 'archived' || path === 'trash' || path === 'all') return path;
  return 'blinko';
}

function titleForRoute(pathname: string, view: HomeView): string {
  if (pathname.startsWith('/detail')) return 'Detail';
  if (pathname.startsWith('/resources')) return 'Resources';
  if (pathname.startsWith('/review')) return 'Daily Review';
  if (pathname.startsWith('/settings')) return 'Settings';
  if (view === 'blinko') return 'Blinko';
  if (view === 'notes') return 'Notes';
  if (view === 'todo') return 'Todo';
  if (view === 'archived') return 'Archive';
  if (view === 'trash') return 'Trash';
  return 'Blinko';
}

const Shell: React.FC = () => {
  const [notes, setNotes] = useState<BlinkoNote[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(syncEngine.getState());
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const pathParam = location.pathname === '/' ? searchParams.get('path') : null;
  const view = viewFromParams(pathParam);

  const refreshNotes = useCallback(async () => {
    try {
      setNotes(await getAllNotes());
    } catch (err) {
      console.error('Failed to load notes from IndexedDB:', err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await initDatabase();
        const conf = await getConfig();
        if (mounted) {
          setConfig(conf);
          await refreshNotes();
          syncEngine.init();
        }
      } catch (err) {
        console.error('Bootstrap error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    const unsub = syncEngine.subscribe((state) => {
      setSyncState(state);
      refreshNotes();
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, [refreshNotes]);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (theme: AppConfig['theme']) => {
      const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', dark);
    };
    applyTheme(config?.theme ?? 'system');
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(config?.theme ?? 'system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [config?.theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.querySelector('input[type="text"]')?.dispatchEvent(new Event('focus'));
        (document.querySelector('input[type="text"]') as HTMLInputElement)?.focus?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const extractTags = (content: string): string[] => {
    const matches = content.match(/#([\w\u4e00-\u9fa5\-_]+)/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((t) => t.substring(1))));
  };

  const handleCreateNote = async (content: string, type: NoteType, atts?: LocalAttachment[]) => {
    const tags = extractTags(content);
    const now = new Date().toISOString();
    const newNote: BlinkoNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      content,
      type,
      tags,
      isPinned: false,
      isArchived: false,
      isTrash: false,
      createdAt: now,
      updatedAt: now,
      syncStatus: (syncState.isOnline ? 'syncing' : 'pending') as SyncStatus,
    };
    await saveNote(newNote);
    if (atts && atts.length > 0) {
      await reassignAttachmentsToNote(
        atts.map((a) => a.id),
        newNote.id
      ).catch((e) => console.warn('Attachment reassign failed:', e));
    }
    await refreshNotes();
    await syncEngine.queueAction('UPSERT', newNote.id, newNote);
  };

  const handleUpdateNote = async (updatedNote: BlinkoNote) => {
    const noteToSave: BlinkoNote = {
      ...updatedNote,
      tags: extractTags(updatedNote.content),
      updatedAt: new Date().toISOString(),
      syncStatus: (syncState.isOnline ? 'syncing' : 'pending') as SyncStatus,
    };
    await saveNote(noteToSave);
    await refreshNotes();
    await syncEngine.queueAction('UPSERT', noteToSave.id, noteToSave);
  };

  const handleTogglePin = async (id: string, isPinned: boolean) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const updated = { ...note, isPinned, updatedAt: new Date().toISOString() };
    await saveNote(updated);
    await refreshNotes();
    await syncEngine.queueAction('UPSERT', updated.id, updated);
  };

  const handleToggleArchive = async (id: string, isArchived: boolean) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const updated = { ...note, isArchived, updatedAt: new Date().toISOString() };
    await saveNote(updated);
    await refreshNotes();
    await syncEngine.queueAction('UPSERT', updated.id, updated);
  };

  const handleTrash = async (id: string, isTrash: boolean) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const updated: BlinkoNote = {
      ...note,
      isTrash,
      updatedAt: new Date().toISOString(),
      syncStatus: (syncState.isOnline ? 'syncing' : 'pending') as SyncStatus,
    };
    await saveNote(updated);
    await refreshNotes();
    await syncEngine.queueAction(isTrash ? 'TRASH' : 'RESTORE', updated.id, updated);
  };

  const handleDeletePermanent = async (id: string) => {
    const note = notes.find((n) => n.id === id);
    await deleteNotePermanently(id);
    await refreshNotes();
    await syncEngine.queueAction('DELETE', id, { remoteId: note?.remoteId || id });
  };

  const handleSaveConfig = async (newConfig: AppConfig) => {
    setConfig(newConfig);
    await saveConfig(newConfig);
    syncEngine.syncNow();
  };

  // Sidebar filter (desktop) maps onto router views
  const sidebarFilter = view === 'blinko' ? 'all' : view === 'notes' ? 'note' : view;
  const filteredNotes = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return notes.filter((note) => {
      if (view === 'trash') {
        if (!note.isTrash) return false;
      } else {
        if (note.isTrash) return false;
      }
      if (view === 'archived') {
        if (!note.isArchived) return false;
      } else if (view !== 'trash') {
        if (note.isArchived) return false;
      }
      if (view === 'blinko' && note.type !== 0) return false;
      if (view === 'notes' && note.type !== 1) return false;
      if (view === 'todo' && !/- \[[ xX]\]/.test(note.content)) return false;
      if (selectedTag && !note.tags.includes(selectedTag)) return false;
      if (q) {
        const inContent = note.content.toLowerCase().includes(q);
        const inTag = note.tags.some((t) => t.toLowerCase().includes(q));
        if (!inContent && !inTag) return false;
      }
      return true;
    });
  }, [notes, view, selectedTag, searchText]);

  const existingTags = useMemo(() => {
    const tags = new Set<string>();
    for (const n of notes) if (!n.isTrash) n.tags.forEach((t) => tags.add(t));
    return Array.from(tags);
  }, [notes]);

  const cardProps = {
    onUpdate: handleUpdateNote,
    onTogglePin: handleTogglePin,
    onToggleArchive: handleToggleArchive,
    onTrash: handleTrash,
    onDeletePermanent: handleDeletePermanent,
    onTagClick: (tag: string) => setSelectedTag(tag),
    onEdit: (n: BlinkoNote) => navigate(`/detail/${encodeURIComponent(n.id)}?edit=1`),
    onOpen: (n: BlinkoNote) => navigate(`/detail/${encodeURIComponent(n.id)}`),
  };

  const title = titleForRoute(location.pathname, view);
  const showEditor = view !== 'trash' && view !== 'archived';
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-[var(--secondbackground)] text-[var(--foreground)] flex flex-col font-sans">
      {/* Desktop header */}
      <div className="hidden md:block">
        <Header
          syncState={syncState}
          onSyncNow={() => syncEngine.syncNow()}
          searchText={searchText}
          onSearchChange={setSearchText}
          onOpenSettings={() => navigate('/settings')}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />
      </div>
      {/* Mobile header */}
      <div className="md:hidden">
        <MobileHeader
          title={title}
          syncState={syncState}
          onSyncNow={() => syncEngine.syncNow()}
          searchText={searchText}
          onSearchChange={setSearchText}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenSettings={() => navigate('/settings')}
        />
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        <div className="hidden lg:block w-72 shrink-0 bg-[var(--background)] border-r border-[var(--border)] sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          {config && (
            <Sidebar
              currentFilter={sidebarFilter as 'all' | 'blinko' | 'note' | 'pinned' | 'archived' | 'trash'}
              onFilterChange={(f) => {
                setSelectedTag(null);
                if (f === 'all') navigate('/');
                else if (f === 'note') navigate('/?path=notes');
                else if (f === 'blinko') navigate('/');
                else if (f === 'pinned') navigate('/?path=all');
                else navigate(`/?path=${f}`);
              }}
              selectedTag={selectedTag}
              onSelectTag={setSelectedTag}
              notes={notes}
              syncState={syncState}
              onOpenSettings={() => navigate('/settings')}
              isDemoMode={config.isDemoMode}
            />
          )}
        </div>

        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
            <div className="relative w-72 max-w-xs bg-[var(--background)] border-r border-[var(--border)] h-full overflow-y-auto">
              <div className="flex justify-end p-2 border-b border-[var(--border)]">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--desc)]"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {config && (
                <Sidebar
                  currentFilter={sidebarFilter as 'all' | 'blinko' | 'note' | 'pinned' | 'archived' | 'trash'}
                  onFilterChange={(f) => {
                    setSelectedTag(null);
                    setSidebarOpen(false);
                    if (f === 'all' || f === 'blinko') navigate('/');
                    else if (f === 'note') navigate('/?path=notes');
                    else navigate(`/?path=${f}`);
                  }}
                  selectedTag={selectedTag}
                  onSelectTag={(t) => {
                    setSelectedTag(t);
                    setSidebarOpen(false);
                    if (isHome === false) navigate('/');
                  }}
                  notes={notes}
                  syncState={syncState}
                  onOpenSettings={() => {
                    setSidebarOpen(false);
                    navigate('/settings');
                  }}
                  isDemoMode={config.isDemoMode}
                />
              )}
              {/* Official parity: extra mobile links (resources / review / settings) */}
              <div className="p-4 pt-0 space-y-1">
                {[
                  { to: '/resources', label: 'Resources' },
                  { to: '/review', label: 'Daily Review' },
                  { to: '/settings', label: 'Settings' },
                ].map((l) => (
                  <button
                    key={l.to}
                    onClick={() => {
                      setSidebarOpen(false);
                      navigate(l.to);
                    }}
                    className="w-full text-left p-2 rounded-xl text-xs font-medium hover:bg-[var(--hover)]"
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0">
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  view={view}
                  notes={{ all: notes, filtered: filteredNotes }}
                  searchText={searchText}
                  selectedTag={selectedTag}
                  onClearTag={() => setSelectedTag(null)}
                  isLoading={isLoading}
                  showEditor={showEditor}
                  existingTags={existingTags}
                  serverUrl={config?.serverUrl ?? ''}
                  onCreateNote={handleCreateNote}
                  cardProps={cardProps}
                />
              }
            />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/review" element={<ReviewPage notes={notes} serverUrl={config?.serverUrl ?? ''} cardProps={cardProps} />} />
            <Route
              path="/settings"
              element={
                config ? (
                  <SettingsPage
                    config={config}
                    notes={notes}
                    onSaveConfig={handleSaveConfig}
                    onForceSync={async () => {
                      await syncEngine.syncNow();
                    }}
                    onDataReset={refreshNotes}
                  />
                ) : null
              }
            />
            <Route
              path="/detail/:id"
              element={
                <DetailPage
                  notes={notes}
                  serverUrl={config?.serverUrl ?? ''}
                  cardHandlers={{
                    onUpdate: handleUpdateNote,
                    onTogglePin: handleTogglePin,
                    onToggleArchive: handleToggleArchive,
                    onTrash: handleTrash,
                    onDeletePermanent: handleDeletePermanent,
                    onTagClick: (t: string) => setSelectedTag(t),
                  }}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <MobileNavBar />

      <OfflineIndicator syncState={syncState} onSyncNow={() => syncEngine.syncNow()} />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
