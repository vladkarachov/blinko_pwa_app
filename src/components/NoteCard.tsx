import React, { useState } from 'react';
import {
  Pin,
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Trash2,
  RotateCcw,
  Copy,
  Check,
  Edit3,
} from 'lucide-react';
import { BlinkoNote } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface NoteCardProps {
  note: BlinkoNote;
  onUpdate: (updatedNote: BlinkoNote) => Promise<void>;
  onTogglePin?: (id: string, isPinned: boolean) => Promise<void>;
  onToggleArchive?: (id: string, isArchived: boolean) => Promise<void>;
  onTrash?: (id: string, isTrash: boolean) => Promise<void>;
  onDeletePermanent?: (id: string) => Promise<void>;
  onTagClick?: (tag: string) => void;
  onEdit?: (note: BlinkoNote) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onUpdate,
  onTogglePin,
  onToggleArchive,
  onTrash,
  onDeletePermanent,
  onTagClick,
  onEdit,
}) => {
  const [copied, setCopied] = useState(false);

  // Format date relative or concise
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(note.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Checkbox toggle inside markdown
  const handleToggleTodo = async (todoText: string, newDone: boolean) => {
    const escaped = todoText.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const oldPattern = new RegExp(`-\s*\\[([ xX])\\]\\s*${escaped}`);
    const replacement = `- [${newDone ? 'x' : ' '}] ${todoText}`;

    const newContent = note.content.replace(oldPattern, replacement);
    if (newContent !== note.content) {
      await onUpdate({
        ...note,
        content: newContent,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const renderSyncBadge = () => {
    switch (note.syncStatus) {
      case 'synced':
        return (
          <span
            className="flex items-center gap-1 text-[11px] text-[var(--secondary)] bg-[var(--accent)] px-2 py-0.5 rounded-full"
            title="Synced with Blinko server"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span className="hidden sm:inline">Synced</span>
          </span>
        );
      case 'syncing':
        return (
          <span
            className="flex items-center gap-1 text-[11px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full animate-pulse"
            title="Syncing to server..."
          >
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span className="hidden sm:inline">Syncing</span>
          </span>
        );
      case 'pending':
        return (
          <span
            className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full"
            title="Stored locally in IndexedDB; will auto-sync when online"
          >
            <Clock className="w-3 h-3" />
            <span className="hidden sm:inline">Local</span>
          </span>
        );
      case 'error':
        return (
          <span
            className="flex items-center gap-1 text-[11px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full"
            title={note.syncError || 'Sync failed, will retry'}
          >
            <AlertTriangle className="w-3 h-3" />
            <span className="hidden sm:inline">Retry queued</span>
          </span>
        );
    }
  };

  return (
    <div
      className={`group relative rounded-[var(--radius)] bg-[var(--background)] border p-4 shadow-none transition-all hover:translate-y-0.5 break-inside-avoid ${
        note.isPinned
          ? 'border-2 border-[var(--primary)]'
          : 'border-[var(--border)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          {note.type === 0 ? (
            <span className="text-xs font-bold text-yellow-500" title="Blinko Fleeting Thought">
              blinko⚡
            </span>
          ) : (
            <span className="text-xs font-bold text-blue-500" title="Permanent Note">
              note
            </span>
          )}
          <span className="text-xs text-[var(--desc)] font-medium">{formatDate(note.updatedAt)}</span>
        </div>

        <div className="flex items-center gap-2">
          {renderSyncBadge()}

          {onTogglePin && !note.isTrash && (
            <button
              onClick={() => onTogglePin(note.id, !note.isPinned)}
              className={`p-1 rounded-md transition cursor-pointer ${
                note.isPinned
                  ? 'text-[#EFC646]'
                  : 'text-[var(--desc)] opacity-0 group-hover:opacity-100 hover:text-[var(--foreground)]'
              }`}
              title={note.isPinned ? 'Unpin note' : 'Pin to top'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="py-1">
        <MarkdownRenderer
          content={note.content}
          onTagClick={onTagClick}
          onToggleTodo={handleToggleTodo}
        />
      </div>

      {/* Footer / Actions Toolbar */}
      <div className="mt-3 pt-2.5 flex items-center justify-between border-t border-[var(--border)] text-[var(--desc)]">
        <div className="flex items-center gap-1 flex-wrap">
          {note.tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick?.(tag)}
              className="blinko-tag font-medium transition cursor-pointer hover:opacity-80"
            >
              #{tag}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition max-md:opacity-100">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-[var(--hover)] hover:text-[var(--foreground)] transition cursor-pointer"
            title="Copy note content"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[var(--secondary)]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {onEdit && !note.isTrash && (
            <button
              onClick={() => onEdit(note)}
              className="p-1.5 rounded-lg hover:bg-[var(--hover)] hover:text-[var(--foreground)] transition cursor-pointer"
              title="Edit note"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {onToggleArchive && !note.isTrash && (
            <button
              onClick={() => onToggleArchive(note.id, !note.isArchived)}
              className={`p-1.5 rounded-lg hover:bg-[var(--hover)] transition cursor-pointer ${
                note.isArchived ? 'text-amber-400' : 'hover:text-[var(--foreground)]'
              }`}
              title={note.isArchived ? 'Unarchive' : 'Archive note'}
            >
              {note.isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
            </button>
          )}

          {note.isTrash ? (
            <>
              {onTrash && (
                <button
                  onClick={() => onTrash(note.id, false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--hover)] text-[var(--secondary)] transition cursor-pointer"
                  title="Restore note from trash"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              {onDeletePermanent && (
                <button
                  onClick={() => onDeletePermanent(note.id)}
                  className="p-1.5 rounded-lg hover:bg-[var(--hover)] text-[var(--destructive)] transition cursor-pointer"
                  title="Delete permanently"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          ) : (
            onTrash && (
              <button
                onClick={() => onTrash(note.id, true)}
                className="p-1.5 rounded-lg hover:bg-[var(--hover)] hover:text-[var(--destructive)] transition cursor-pointer"
                title="Move to trash"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
