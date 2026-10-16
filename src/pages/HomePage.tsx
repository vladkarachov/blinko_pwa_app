import React, { useMemo } from 'react';
import Masonry from 'react-masonry-css';
import { Zap, Sparkles, Inbox } from 'lucide-react';
import { BlinkoNote, NoteType } from '../types';
import { CaptureInput } from '../components/CaptureInput';
import { AttachmentPicker } from '../components/AttachmentPicker';
import { NoteCard } from '../components/NoteCard';
import { LocalAttachment } from '../lib/attachmentStore';

export type HomeView = 'blinko' | 'notes' | 'todo' | 'all' | 'archived' | 'trash' | 'pinned';

interface Props {
  view: HomeView;
  notes: { all: BlinkoNote[]; filtered: BlinkoNote[] };
  searchText: string;
  selectedTag: string | null;
  onClearTag: () => void;
  isLoading: boolean;
  showEditor: boolean;
  existingTags: string[];
  serverUrl: string;
  onCreateNote: (content: string, type: NoteType, atts?: LocalAttachment[]) => Promise<void>;
  cardProps: {
    onUpdate: (n: BlinkoNote) => Promise<void>;
    onTogglePin: (id: string, v: boolean) => Promise<void>;
    onToggleArchive: (id: string, v: boolean) => Promise<void>;
    onTrash: (id: string, v: boolean) => Promise<void>;
    onDeletePermanent: (id: string) => Promise<void>;
    onTagClick: (t: string) => void;
    onEdit: (n: BlinkoNote) => void;
    onOpen: (n: BlinkoNote) => void;
  };
}

const TITLES: Record<HomeView, { title: string; desc: string }> = {
  blinko: { title: 'Blinko', desc: 'Fleeting thoughts' },
  notes: { title: 'Notes', desc: 'Structured long-form notes' },
  todo: { title: 'Todo', desc: 'Checklists grouped by day' },
  all: { title: 'All Notes & Thoughts', desc: 'Fleeting ideas and structured notes' },
  archived: { title: 'Archived Notes', desc: 'Preserved notes hidden from main view' },
  trash: { title: 'Trash', desc: 'Deleted notes' },
  pinned: { title: 'Pinned Notes', desc: 'Important thoughts pinned to top' },
};

export const HomePage: React.FC<Props> = ({
  view,
  notes,
  searchText,
  selectedTag,
  onClearTag,
  isLoading,
  showEditor,
  existingTags,
  serverUrl,
  onCreateNote,
  cardProps,
}) => {
  const [stagedAtts, setStagedAtts] = React.useState<LocalAttachment[]>([]);
  const pendingNoteId = useMemo(() => `pending-${Date.now()}`, []);

  const todosByDate = useMemo(() => {
    if (view !== 'todo') return null;
    const groups: Record<string, { displayDate: string; todos: BlinkoNote[] }> = {};
    for (const n of notes.filtered) {
      const d = new Date(n.createdAt);
      const key = d.toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const displayDate = key === today ? 'Today' : key === yesterday ? 'Yesterday' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });
      (groups[key] ??= { displayDate, todos: [] }).todos.push(n);
    }
    return Object.entries(groups).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [view, notes.filtered]);

  const meta = TITLES[view];

  return (
    <div className="w-full max-w-4xl mx-auto px-2 md:px-6 pb-24 md:pb-10 pt-[64px] md:pt-2">
      {showEditor && (
        <div className="space-y-1.5 mb-4">
          <CaptureInput
            onSave={(c, t) => onCreateNote(c, t, stagedAtts).then(() => setStagedAtts([]))}
            existingTags={existingTags}
          />
          <AttachmentPicker noteId={pendingNoteId} onAttached={(a) => setStagedAtts((s) => [...s, ...a])} />
        </div>
      )}

      <div className="flex items-center justify-between pt-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1 self-stretch rounded-full bg-[var(--primary)]" />
            <h1 className="text-lg font-black">{meta.title}</h1>
            {selectedTag && (
              <button onClick={onClearTag} className="blinko-tag font-semibold">
                #{selectedTag} ✕
              </button>
            )}
          </div>
          <p className="text-xs text-[var(--desc)]">
            {searchText ? (
              <span>Searching “<span className="text-[var(--secondary)]">{searchText}</span>” ({notes.filtered.length})</span>
            ) : (
              meta.desc
            )}
          </p>
        </div>
        <div className="text-xs text-[var(--desc)] font-medium">
          {notes.filtered.length} {notes.filtered.length === 1 ? 'note' : 'notes'}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center py-16 gap-3 text-[var(--desc)]">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--secondary)] border-t-transparent animate-spin" />
          <p className="text-xs">Loading local IndexedDB...</p>
        </div>
      ) : notes.filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 px-4 text-center rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--background)] space-y-3">
          <div className="p-3 rounded-2xl bg-[var(--accent)] text-[var(--secondary)]">
            {view === 'trash' ? <Inbox className="w-6 h-6" /> : view === 'pinned' ? <Sparkles className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
          </div>
          <h3 className="text-sm font-semibold">Capture your first thought</h3>
          <p className="text-xs text-[var(--desc)] max-w-sm">Use the capture box above — works offline, syncs later.</p>
        </div>
      ) : todosByDate ? (
        <div className="space-y-6">
          {todosByDate.map(([date, { displayDate, todos }]) => (
            <div key={date}>
              <div className="flex items-center mb-2">
                <div className="w-4 h-4 rounded-sm bg-[var(--primary)]" />
                <h3 className="text-base font-bold ml-2">{displayDate}</h3>
              </div>
              <div className="space-y-2.5">
                {todos.map((n) => (
                  <NoteCard key={n.id} note={n} serverUrl={serverUrl} {...cardProps} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Masonry
          breakpointCols={{ default: 2, 768: 1 }}
          className="card-masonry-grid"
          columnClassName="card-masonry-grid_column"
        >
          {notes.filtered.map((n) => (
            <NoteCard key={n.id} note={n} serverUrl={serverUrl} {...cardProps} />
          ))}
        </Masonry>
      )}
    </div>
  );
};
