import React from 'react';
import {
  FileText,
  Zap,
  Pin,
  Archive,
  Trash2,
  Hash,
  Database,
  Layers,
  Sparkles,
  Server,
} from 'lucide-react';
import { NoteFilter, BlinkoNote } from '../types';
import { ActivityHeatmap } from './ActivityHeatmap';
import { SyncState } from '../lib/syncEngine';

interface SidebarProps {
  currentFilter: NoteFilter;
  onFilterChange: (filter: NoteFilter) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  notes: BlinkoNote[];
  syncState: SyncState;
  onOpenSettings: () => void;
  isDemoMode: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentFilter,
  onFilterChange,
  selectedTag,
  onSelectTag,
  notes,
  syncState,
  onOpenSettings,
  isDemoMode,
}) => {
  // Counts
  const activeNotes = notes.filter((n) => !n.isTrash);
  const totalCount = activeNotes.length;
  const blinkoCount = activeNotes.filter((n) => n.type === 0).length;
  const permanentCount = activeNotes.filter((n) => n.type === 1).length;
  const pinnedCount = activeNotes.filter((n) => n.isPinned).length;
  const archivedCount = activeNotes.filter((n) => n.isArchived).length;
  const trashCount = notes.filter((n) => n.isTrash).length;

  // Extract all tags with counts
  const tagCounts: Record<string, number> = {};
  for (const n of activeNotes) {
    for (const t of n.tags) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
  }
  const tagsList = Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const navItems = [
    {
      id: 'all' as NoteFilter,
      label: 'All Notes',
      icon: Layers,
      count: totalCount,
    },
    {
      id: 'blinko' as NoteFilter,
      label: 'Blinkos (Fleeting)',
      icon: Zap,
      count: blinkoCount,
      color: 'text-emerald-400',
    },
    {
      id: 'note' as NoteFilter,
      label: 'Permanent Notes',
      icon: FileText,
      count: permanentCount,
      color: 'text-sky-400',
    },
    {
      id: 'pinned' as NoteFilter,
      label: 'Pinned',
      icon: Pin,
      count: pinnedCount,
      color: 'text-amber-400',
    },
    {
      id: 'archived' as NoteFilter,
      label: 'Archive',
      icon: Archive,
      count: archivedCount,
    },
    {
      id: 'trash' as NoteFilter,
      label: 'Trash',
      icon: Trash2,
      count: trashCount,
      color: 'text-rose-400',
    },
  ];

  return (
    <aside className="w-full flex flex-col gap-6 p-4 bg-[var(--background)]">
      {/* Navigation Filter Links */}
      <nav className="space-y-1">
        <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--desc)]">
          Views
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentFilter === item.id && !selectedTag;
          return (
            <button
              key={item.id}
              onClick={() => {
                onFilterChange(item.id);
                onSelectTag(null);
              }}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold shadow-xs'
                  : 'text-[var(--foreground)] hover:bg-[var(--hover)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-black/10 dark:bg-white/20'
                    : 'text-[var(--desc)] bg-[var(--accent)]'
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Activity Heatmap */}
      <div>
        <ActivityHeatmap notes={notes} />
      </div>

      {/* Tags Cloud */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--desc)]">
          <span>Tags</span>
          {selectedTag && (
            <button
              onClick={() => onSelectTag(null)}
              className="text-[var(--secondary)] hover:underline cursor-pointer lowercase"
            >
              clear
            </button>
          )}
        </div>

        {tagsList.length === 0 ? (
          <p className="px-2 text-xs text-[var(--ignore)] italic">No tags yet. Use #tag in your notes.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 px-1 max-h-48 overflow-y-auto">
            {tagsList.map(({ name, count }) => {
              const isTagActive = selectedTag === name;
              return (
                <button
                  key={name}
                  onClick={() => onSelectTag(isTagActive ? null : name)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs transition cursor-pointer ${
                    isTagActive ? 'blinko-tag font-bold ring-2 ring-[var(--tag)]' : 'blinko-tag'
                  }`}
                >
                  <Hash className="w-3 h-3" />
                  <span>{name}</span>
                  <span className="text-[10px] ml-0.5 opacity-70">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Offline Storage Status Card */}
      <div className="mt-auto pt-4 border-t border-[var(--border)]">
        <div className="p-3 rounded-[var(--radius)] bg-[var(--accent)] border border-[var(--border)] text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[var(--foreground)] font-medium">
              <Database className="w-3.5 h-3.5 text-[var(--secondary)]" />
              <span>IndexedDB Storage</span>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]">
              Active
            </span>
          </div>

          <div className="text-[11px] text-[var(--desc)] space-y-0.5">
            <div className="flex justify-between">
              <span>Sync Outbox:</span>
              <span className="font-mono text-[var(--foreground)]">
                {syncState.pendingCount === 0 ? '0 pending' : `${syncState.pendingCount} queued`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Mode:</span>
              <span className="text-[var(--foreground)]">
                {isDemoMode ? 'Standalone Mock' : 'Self-Hosted'}
              </span>
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium transition cursor-pointer"
          >
            <Server className="w-3 h-3" />
            <span>Server Settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
