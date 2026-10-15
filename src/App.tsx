import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  initDatabase,
  getAllNotes,
  saveNote,
  deleteNotePermanently,
  getConfig,
  saveConfig,
} from './lib/db';
import { syncEngine, SyncState } from './lib/syncEngine';
import { AppConfig, BlinkoNote, NoteFilter, NoteType, SyncStatus } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CaptureInput } from './components/CaptureInput';
import { NoteCard } from './components/NoteCard';
import { SettingsModal } from './components/SettingsModal';
import { EditNoteModal } from './components/EditNoteModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  Zap,
  FileText,
  Search,
  Filter,
  Sparkles,
  Inbox,
  X,
  Plus,
} from 'lucide-react';

export default function App() {
  const [notes, setNotes] = useState<BlinkoNote[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(syncEngine.getState());
  const [currentFilter, setCurrentFilter] = useState<NoteFilter>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<BlinkoNote | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load notes from local IndexedDB
  const refreshNotes = useCallback(async () => {
    try {
      const allNotes = await getAllNotes();
      setNotes(allNotes);
    } catch (err) {
      console.error('Failed to load notes from IndexedDB:', err);
    }
  }, []);

  // Initialize DB and SyncEngine
  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
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
    }

    bootstrap();

    // Subscribe to sync engine status
    const unsubscribe = syncEngine.subscribe((state) => {
      setSyncState(state);
      // Auto-refresh notes whenever sync updates items
      refreshNotes();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [refreshNotes]);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Extract tags helper
  const extractTags = (content: string): string[] => {
    const matches = content.match(/#([\w\u4e00-\u9fa5\-_]+)/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((t) => t.substring(1))));
  };

  // Create new note
  const handleCreateNote = async (content: string, type: NoteType) => {
    const tags = extractTags(content);
    const now = new Date().toISOString();
    const currentSyncStatus: SyncStatus = syncState.isOnline ? 'syncing' : 'pending';
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
      syncStatus: currentSyncStatus,
    };

    // Save to local IndexedDB first
    await saveNote(newNote);
    await refreshNotes();

    // Enqueue in Outbox for remote sync
    await syncEngine.queueAction('UPSERT', newNote.id, newNote);
  };

  // Update existing note
  const handleUpdateNote = async (updatedNote: BlinkoNote) => {
    const tags = extractTags(updatedNote.content);
    const currentSyncStatus: SyncStatus = syncState.isOnline ? 'syncing' : 'pending';
    const noteToSave: BlinkoNote = {
      ...updatedNote,
      tags,
      updatedAt: new Date().toISOString(),
      syncStatus: currentSyncStatus,
    };

    await saveNote(noteToSave);
    await refreshNotes();

    await syncEngine.queueAction('UPSERT', noteToSave.id, noteToSave);
  };

  // Pin toggle
  const handleTogglePin = async (id: string, isPinned: boolean) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const updated = { ...note, isPinned, updatedAt: new Date().toISOString() };
    await saveNote(updated);
    await refreshNotes();
    await syncEngine.queueAction('UPSERT', updated.id, updated);
  };

  // Archive toggle
  const handleToggleArchive = async (id: string, isArchived: boolean) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const updated = { ...note, isArchived, updatedAt: new Date().toISOString() };
    await saveNote(updated);
    await refreshNotes();
    await syncEngine.queueAction('UPSERT', updated.id, updated);
  };

  // Move to trash or restore
  const handleTrash = async (id: string, isTrash: boolean) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const currentSyncStatus: SyncStatus = syncState.isOnline ? 'syncing' : 'pending';
    const updated: BlinkoNote = {
      ...note,
      isTrash,
      updatedAt: new Date().toISOString(),
      syncStatus: currentSyncStatus,
    };
    await saveNote(updated);
    await refreshNotes();
    await syncEngine.queueAction(isTrash ? 'TRASH' : 'RESTORE', updated.id, updated);
  };

  // Permanent Delete
  const handleDeletePermanent = async (id: string) => {
    const note = notes.find((n) => n.id === id);
    await deleteNotePermanently(id);
    await refreshNotes();
    await syncEngine.queueAction('DELETE', id, { remoteId: note?.remoteId || id });
  };

  // Config save
  const handleSaveConfig = async (newConfig: AppConfig) => {
    setConfig(newConfig);
    await saveConfig(newConfig);
    // Trigger sync with new config
    syncEngine.syncNow();
  };

  // Filtered notes calculation
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      // Trash filter
      if (currentFilter === 'trash') {
        if (!note.isTrash) return false;
      } else {
        if (note.isTrash) return false;
      }

      // Archive filter
      if (currentFilter === 'archived') {
        if (!note.isArchived) return false;
      } else if (currentFilter !== 'trash') {
        if (note.isArchived) return false;
      }

      // Type filter
      if (currentFilter === 'blinko' && note.type !== 0) return false;
      if (currentFilter === 'note' && note.type !== 1) return false;
      if (currentFilter === 'pinned' && !note.isPinned) return false;

      // Tag filter
      if (selectedTag && !note.tags.includes(selectedTag)) return false;

      // Search text
      if (searchText.trim()) {
        const query = searchText.toLowerCase();
        const matchesContent = note.content.toLowerCase().includes(query);
        const matchesTag = note.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchesContent && !matchesTag) return false;
      }

      return true;
    });
  }, [notes, currentFilter, selectedTag, searchText]);

  // All active tags for capture autocomplete
  const existingTags = useMemo(() => {
    const tags = new Set<string>();
    for (const n of notes) {
      if (!n.isTrash) {
        n.tags.forEach((t) => tags.add(t));
      }
    }
    return Array.from(tags);
  }, [notes]);

  const filterTitles: Record<NoteFilter, { title: string; desc: string }> = {
    all: { title: 'All Notes & Thoughts', desc: 'Fleeting ideas and structured notes' },
    blinko: { title: 'Blinkos (Fleeting Thoughts)', desc: 'Quick sparks and micro-notes' },
    note: { title: 'Permanent Notes', desc: 'Structured long-form documentation' },
    pinned: { title: 'Pinned Notes', desc: 'Important thoughts pinned to top' },
    archived: { title: 'Archived Notes', desc: 'Preserved notes hidden from main view' },
    trash: { title: 'Trash', desc: 'Deleted notes' },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        syncState={syncState}
        onSyncNow={() => syncEngine.syncNow()}
        searchText={searchText}
        onSearchChange={setSearchText}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-72 shrink-0 border-r border-slate-800/80 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <Sidebar
            currentFilter={currentFilter}
            onFilterChange={(f) => {
              setCurrentFilter(f);
              setSelectedTag(null);
            }}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            notes={notes}
            syncState={syncState}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isDemoMode={config?.isDemoMode ?? true}
          />
        </div>

        {/* Mobile Sidebar Drawer */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative w-72 max-w-xs bg-slate-950 border-r border-slate-800 h-full overflow-y-auto z-50">
              <div className="flex justify-end p-2 border-b border-slate-800">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Sidebar
                currentFilter={currentFilter}
                onFilterChange={(f) => {
                  setCurrentFilter(f);
                  setSelectedTag(null);
                  setSidebarOpen(false);
                }}
                selectedTag={selectedTag}
                onSelectTag={(t) => {
                  setSelectedTag(t);
                  setSidebarOpen(false);
                }}
                notes={notes}
                syncState={syncState}
                onOpenSettings={() => {
                  setIsSettingsOpen(true);
                  setSidebarOpen(false);
                }}
                isDemoMode={config?.isDemoMode ?? true}
              />
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
          {/* Quick Capture Bar (Visible in active views) */}
          {currentFilter !== 'trash' && currentFilter !== 'archived' && (
            <div className="space-y-1">
              <CaptureInput onSave={handleCreateNote} existingTags={existingTags} />
            </div>
          )}

          {/* Section Header with active filters */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-100">
                  {filterTitles[currentFilter]?.title || 'Notes'}
                </h1>
                {selectedTag && (
                  <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    #{selectedTag}
                    <button
                      onClick={() => setSelectedTag(null)}
                      className="hover:text-emerald-200 ml-0.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {searchText ? (
                  <span>
                    Searching for &ldquo;<span className="text-emerald-400">{searchText}</span>&rdquo; (
                    {filteredNotes.length} results)
                  </span>
                ) : (
                  filterTitles[currentFilter]?.desc
                )}
              </p>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
            </div>
          </div>

          {/* Notes Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <p className="text-xs">Loading local IndexedDB...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 space-y-3">
              <div className="p-3 rounded-2xl bg-slate-800/80 text-emerald-400">
                {currentFilter === 'trash' ? (
                  <Inbox className="w-6 h-6" />
                ) : currentFilter === 'pinned' ? (
                  <Sparkles className="w-6 h-6" />
                ) : (
                  <Zap className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-200">
                  {searchText
                    ? 'No matching notes found'
                    : selectedTag
                    ? `No notes with #${selectedTag}`
                    : currentFilter === 'trash'
                    ? 'Trash is empty'
                    : currentFilter === 'pinned'
                    ? 'No pinned notes'
                    : currentFilter === 'archived'
                    ? 'No archived notes'
                    : 'Capture your first thought'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  {searchText
                    ? 'Try adjusting your search keywords or clearing active tag filters.'
                    : currentFilter === 'trash'
                    ? 'Deleted notes will appear here before being permanently removed.'
                    : 'Use the capture box above to record ideas, checklists, and snippets instantly.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onUpdate={handleUpdateNote}
                  onTogglePin={handleTogglePin}
                  onToggleArchive={handleToggleArchive}
                  onTrash={handleTrash}
                  onDeletePermanent={handleDeletePermanent}
                  onTagClick={(tag) => setSelectedTag(tag)}
                  onEdit={(note) => setEditingNote(note)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Floating Offline Indicator & Outbox Banner */}
      <OfflineIndicator
        syncState={syncState}
        onSyncNow={() => syncEngine.syncNow()}
      />

      {/* Settings Modal */}
      {isSettingsOpen && config && (
        <SettingsModal
          config={config}
          onSaveConfig={handleSaveConfig}
          onClose={() => setIsSettingsOpen(false)}
          onForceSync={async () => {
            await syncEngine.syncNow();
          }}
          notes={notes}
          onDataReset={refreshNotes}
        />
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <EditNoteModal
          note={editingNote}
          onSave={handleUpdateNote}
          onClose={() => setEditingNote(null)}
          onTrash={handleTrash}
        />
      )}
    </div>
  );
}
