import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  X,
  Pin,
  Copy,
  Check,
  Archive,
  ArchiveRestore,
  Trash2,
  RotateCcw,
  Edit3,
  Eye,
  Save,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { BlinkoNote, NoteType } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface NoteDetailModalProps {
  note: BlinkoNote;
  initialEdit?: boolean;
  onClose: () => void;
  onSave: (updated: BlinkoNote) => Promise<void>;
  onTogglePin?: (id: string, isPinned: boolean) => Promise<void>;
  onToggleArchive?: (id: string, isArchived: boolean) => Promise<void>;
  onTrash?: (id: string, isTrash: boolean) => Promise<void>;
  onDeletePermanent?: (id: string) => Promise<void>;
  onTagClick?: (tag: string) => void;
}

const extractTags = (text: string): string[] => {
  const matches = text.match(/#([\w\u4e00-\u9fa5\-_]+)/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((t) => t.substring(1))));
};

const formatFullDate = (isoString: string) => {
  try {
    return new Date(isoString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({
  note,
  initialEdit = false,
  onClose,
  onSave,
  onTogglePin,
  onToggleArchive,
  onTrash,
  onDeletePermanent,
  onTagClick,
}) => {
  const [isEdit, setIsEdit] = useState(initialEdit);
  const [content, setContent] = useState(note.content);
  const [noteType, setNoteType] = useState<NoteType>(note.type);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Stay in sync with the note list (sync pull, pin/archive from elsewhere)
  useEffect(() => {
    if (!isEdit) setContent(note.content);
    setNoteType(note.type);
  }, [note.content, note.type, isEdit]);

  // Reset edit state when a different note is opened
  useEffect(() => {
    setIsEdit(initialEdit);
    setContent(note.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  // Esc closes, body scroll locks — like official FullscreenEditor
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(note.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave({
        ...note,
        content,
        type: noteType,
        tags: extractTags(content),
        updatedAt: new Date().toISOString(),
      });
      setIsEdit(false);
    } finally {
      setIsSaving(false);
    }
  };

  const renderSyncBadge = () => {
    switch (note.syncStatus) {
      case 'synced':
        return (
          <span className="flex items-center gap-1 text-[11px] text-[var(--secondary)]">
            <CheckCircle2 className="w-3 h-3" />
            <span>Synced</span>
          </span>
        );
      case 'syncing':
        return (
          <span className="flex items-center gap-1 text-[11px] text-[var(--desc)] animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Syncing</span>
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-[11px] text-amber-500">
            <Clock className="w-3 h-3" />
            <span>Local</span>
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-[11px] text-[var(--destructive)]" title={note.syncError}>
            <AlertTriangle className="w-3 h-3" />
            <span>Retry queued</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--secondbackground)] flex flex-col animate-in fade-in duration-150">
      {/* Top bar */}
      <div className="glass-effect border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between gap-2 px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--desc)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] transition cursor-pointer shrink-0"
              title="Back to notes (Esc)"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            {note.type === 0 ? (
              <span className="text-xs font-bold text-yellow-500 shrink-0">blinko⚡</span>
            ) : (
              <span className="text-xs font-bold text-blue-500 shrink-0">note</span>
            )}
            <span className="text-xs text-[var(--desc)] truncate">
              {formatFullDate(note.updatedAt)}
            </span>
            {renderSyncBadge()}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isEdit ? (
              <>
                <button
                  onClick={() => {
                    setContent(note.content);
                    setNoteType(note.type);
                    setIsEdit(false);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--foreground)] hover:bg-[var(--hover)] transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">View</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
              </>
            ) : (
              <>
                {onTogglePin && !note.isTrash && (
                  <button
                    onClick={() => onTogglePin(note.id, !note.isPinned)}
                    className={`p-2 rounded-xl transition cursor-pointer ${
                      note.isPinned
                        ? 'text-[#EFC646]'
                        : 'text-[var(--desc)] hover:text-[var(--foreground)] hover:bg-[var(--hover)]'
                    }`}
                    title={note.isPinned ? 'Unpin' : 'Pin to top'}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-xl text-[var(--desc)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] transition cursor-pointer"
                  title="Copy content"
                >
                  {copied ? <Check className="w-4 h-4 text-[var(--secondary)]" /> : <Copy className="w-4 h-4" />}
                </button>
                {onToggleArchive && !note.isTrash && (
                  <button
                    onClick={() => onToggleArchive(note.id, !note.isArchived)}
                    className="p-2 rounded-xl text-[var(--desc)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] transition cursor-pointer"
                    title={note.isArchived ? 'Unarchive' : 'Archive'}
                  >
                    {note.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                  </button>
                )}
                {!note.isTrash ? (
                  <>
                    <button
                      onClick={() => setIsEdit(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold transition cursor-pointer active:scale-95"
                      title="Edit note"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    {onTrash && (
                      <button
                        onClick={async () => {
                          await onTrash(note.id, true);
                          onClose();
                        }}
                        className="p-2 rounded-xl text-[var(--desc)] hover:text-[var(--destructive)] hover:bg-[var(--hover)] transition cursor-pointer"
                        title="Move to trash"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {onTrash && (
                      <button
                        onClick={async () => {
                          await onTrash(note.id, false);
                          onClose();
                        }}
                        className="p-2 rounded-xl text-[var(--secondary)] hover:bg-[var(--hover)] transition cursor-pointer"
                        title="Restore"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    {onDeletePermanent && (
                      <button
                        onClick={async () => {
                          if (confirm('Delete this note permanently?')) {
                            await onDeletePermanent(note.id);
                            onClose();
                          }
                        }}
                        className="p-2 rounded-xl text-[var(--destructive)] hover:bg-[var(--hover)] transition cursor-pointer"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-[var(--desc)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] transition cursor-pointer sm:hidden"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content — the single note, nothing else */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-4 py-6">
          {isEdit ? (
            <div className="rounded-[var(--radius)] bg-[var(--md-editor-bg)] border border-[var(--md-editor-border)] p-4">
              <div className="flex items-center gap-1.5 mb-3">
                {([0, 1] as NoteType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNoteType(t)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                      noteType === t
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold'
                        : 'text-[var(--desc)] hover:text-[var(--foreground)] bg-[var(--accent)]'
                    }`}
                  >
                    {t === 0 ? 'Blinko' : 'Note'}
                  </button>
                ))}
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note or markdown here..."
                className="w-full min-h-[50vh] bg-transparent resize-y text-[var(--md-editor-text)] placeholder-[var(--ignore)] text-[15px] leading-relaxed outline-hidden font-sans"
                autoFocus
              />
              <div className="mt-2 pt-2 border-t border-[var(--md-editor-border)] text-xs text-[var(--desc)] font-mono">
                {content.length} characters • {extractTags(content).length} tag(s)
              </div>
            </div>
          ) : (
            <div className="rounded-[var(--radius)] bg-[var(--background)] border border-[var(--border)] p-5">
              <MarkdownRenderer content={note.content} onTagClick={onTagClick} />
              {note.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mt-4 pt-3 border-t border-[var(--border)]">
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
              )}
              <div className="mt-4 pt-3 border-t border-[var(--border)] text-[11px] text-[var(--ignore)]">
                Created {formatFullDate(note.createdAt)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
