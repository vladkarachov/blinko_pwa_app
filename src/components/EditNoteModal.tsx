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
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setNoteType(0)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  noteType === 0
                    ? 'bg-emerald-500/20 text-emerald-400 font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
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
                    ? 'bg-emerald-500/20 text-emerald-400 font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Note</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-300 hover:bg-slate-750 transition cursor-pointer ml-2"
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition cursor-pointer"
                title="Move to Trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-y-auto min-h-[300px]">
          {previewMode ? (
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 min-h-[260px]">
              <MarkdownRenderer content={content} />
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note or markdown here..."
              className="w-full h-full min-h-[320px] bg-transparent resize-none text-slate-100 placeholder-slate-500 text-sm leading-relaxed outline-hidden font-sans"
              autoFocus
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-500 font-mono">
            {content.length} characters • {extractTags(content).length} tag(s)
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition cursor-pointer active:scale-95 shadow-md shadow-emerald-500/20"
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
