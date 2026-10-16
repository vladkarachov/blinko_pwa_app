import React, { useState } from 'react';
import { X, Save, Zap, FileText, Eye, Edit3, Trash2 } from 'lucide-react';
import { BlinkoNote, NoteType } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface EditNoteModalProps {
  note: BlinkoNote;
  onSave: (updated: BlinkoNote) => Promise<void>;
  onClose: () => void;
  onTrash?: (id: string, isTrash: boolean) => Promise<void>;
}

export const EditNoteModal: React.FC<EditNoteModalProps> = ({
  note,
  onSave,
  onClose,
  onTrash,
}) => {
  const [content, setContent] = useState(note.content);
  const [noteType, setNoteType] = useState<NoteType>(note.type);
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to extract tags
  const extractTags = (text: string): string[] => {
    const matches = text.match(/#([\w\u4e00-\u9fa5\-_]+)/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((t) => t.substring(1))));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const tags = extractTags(content);
      await onSave({
        ...note,
        content,
        type: noteType,
        tags,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-[var(--radius)] bg-[var(--background)] border border-[var(--border)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--accent)] border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setNoteType(0)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  noteType === 0
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold shadow-xs'
                    : 'text-[var(--desc)] hover:text-[var(--foreground)]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Blinko</span>
              </button>
              <button
                type="button"
                onClick={() => setNoteType(1)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  noteType === 1
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold shadow-xs'
                    : 'text-[var(--desc)] hover:text-[var(--foreground)]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Note</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-[var(--border)] bg-[var(--accent)] text-xs text-[var(--foreground)] hover:bg-[var(--hover)] transition cursor-pointer ml-2"
            >
              {previewMode ? (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editor</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onTrash && !note.isTrash && (
              <button
                type="button"
                onClick={async () => {
                  await onTrash(note.id, true);
                  onClose();
                }}
                className="p-1.5 rounded-lg text-[var(--desc)] hover:text-[var(--destructive)] hover:bg-[var(--hover)] transition cursor-pointer"
                title="Move to Trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--desc)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-y-auto min-h-[300px] bg-[var(--md-editor-bg)]">
          {previewMode ? (
            <div className="p-4 rounded-xl bg-[var(--accent)] border border-[var(--border)] min-h-[260px]">
              <MarkdownRenderer content={content} />
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note or markdown here..."
              className="w-full h-full min-h-[320px] bg-transparent resize-none text-[var(--md-editor-text)] placeholder-[var(--ignore)] text-sm leading-relaxed outline-hidden font-sans"
              autoFocus
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[var(--border)]">
          <div className="text-xs text-[var(--desc)] font-mono">
            {content.length} characters • {extractTags(content).length} tag(s)
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--foreground)] hover:bg-[var(--hover)] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold text-xs transition cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save Note</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
