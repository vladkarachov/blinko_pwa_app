import React, { useRef, useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import { LocalAttachment, saveLocalAttachment } from '../lib/attachmentStore';

interface Props {
  noteId: string; // temp id for new notes (`pending-<ts>`) or real note id
  onAttached: (atts: LocalAttachment[]) => void;
  compact?: boolean;
}

function uid(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Picks files, stores blobs in IndexedDB immediately (works offline). */
export const AttachmentPicker: React.FC<Props> = ({ noteId, onAttached, compact }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<LocalAttachment[]>([]);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const next: LocalAttachment[] = [];
      for (const f of Array.from(files)) {
        const att: LocalAttachment = {
          id: uid(),
          noteId,
          name: f.name,
          type: f.type || 'application/octet-stream',
          size: f.size,
          blob: f,
          syncStatus: 'pending',
          createdAt: new Date().toISOString(),
        };
        await saveLocalAttachment(att);
        next.push(att);
      }
      const all = [...staged, ...next];
      setStaged(all);
      onAttached(next);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = (id: string) => setStaged((s) => s.filter((a) => a.id !== id));

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={pick}
        disabled={busy}
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[var(--hover)] text-xs transition disabled:opacity-50"
        title="Attach files (stored offline)"
      >
        <Paperclip className="w-3.5 h-3.5" />
        {!compact && <span>{busy ? 'Saving...' : `Attach${staged.length ? ` (${staged.length})` : ''}`}</span>}
      </button>
      {staged.map((a) => (
        <span
          key={a.id}
          className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 max-w-[140px]"
          title={`${a.name} — saved offline, will upload on sync`}
        >
          <span className="truncate">{a.name}</span>
          <button onClick={() => remove(a.id)} className="shrink-0" aria-label={`Remove ${a.name}`}>
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  );
};
