import React, { useState } from 'react';
import {
  Zap,
  FileText,
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
            className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full"
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
      className={`group relative rounded-2xl bg-slate-900/80 border p-4 shadow-md transition-all hover:shadow-xl hover:border-slate-700/80 ${
        note.isPinned
          ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 to-slate-900/90'
          : 'border-slate-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          {note.type === 0 ? (
            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400" title="Blinko Fleeting Thought">
              <Zap className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="p-1 rounded-md bg-sky-500/10 text-sky-400" title="Permanent Note">
              <FileText className="w-3.5 h-3.5" />
            </div>
          )}
          <span className="text-xs text-slate-400 font-medium">{formatDate(note.updatedAt)}</span>
        </div>

        <div className="flex items-center gap-2">
          {renderSyncBadge()}

          {onTogglePin && !note.isTrash && (
            <button
              onClick={() => onTogglePin(note.id, !note.isPinned)}
              className={`p-1 rounded-md transition cursor-pointer ${
                note.isPinned
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
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
      <div className="mt-3 pt-2.5 flex items-center justify-between border-t border-slate-800/60 text-slate-400">
        <div className="flex items-center gap-1.5 flex-wrap">
          {note.tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick?.(tag)}
              className="text-[11px] font-medium text-slate-400 hover:text-emerald-300 px-1.5 py-0.5 rounded bg-slate-800/60 hover:bg-emerald-950/40 border border-slate-750 transition cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition cursor-pointer"
            title="Copy note content"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {onEdit && !note.isTrash && (
            <button
              onClick={() => onEdit(note)}
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition cursor-pointer"
              title="Edit note"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {onToggleArchive && !note.isTrash && (
            <button
              onClick={() => onToggleArchive(note.id, !note.isArchived)}
              className={`p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer ${
                note.isArchived ? 'text-amber-400' : 'hover:text-slate-200'
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
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                  title="Restore note from trash"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              {onDeletePermanent && (
                <button
                  onClick={() => onDeletePermanent(note.id)}
                  className="p-1.5 rounded-lg hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition cursor-pointer"
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
                className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-rose-400 transition cursor-pointer"
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
