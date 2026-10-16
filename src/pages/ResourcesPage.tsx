import React, { useEffect, useState } from 'react';
import { Database, Image, FileText, Music, Video } from 'lucide-react';
import { getPendingAttachments, getAttachmentsByNote, LocalAttachment } from '../lib/attachmentStore';
import { getAllNotes } from '../lib/db';

export const ResourcesPage: React.FC = () => {
  const [items, setItems] = useState<LocalAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const notes = await getAllNotes();
        const all: LocalAttachment[] = [];
        for (const n of notes.slice(0, 200)) {
          const list = await getAttachmentsByNote(n.id).catch(() => []);
          all.push(...list);
        }
        const pending = await getPendingAttachments().catch(() => []);
        const seen = new Set(all.map((a) => a.id));
        for (const p of pending) if (!seen.has(p.id)) all.push(p);
        setItems(all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const icon = (t: string) => {
    if (t.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (t.startsWith('audio/')) return <Music className="w-4 h-4" />;
    if (t.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 md:px-6 pb-24 pt-[64px] md:pt-2">
      <div className="flex items-center gap-2 pt-2 mb-1">
        <span className="w-1 self-stretch rounded-full bg-[var(--primary)]" />
        <h1 className="text-lg font-black">Resources</h1>
      </div>
      <p className="text-xs text-[var(--desc)] mb-4">Files stored offline on this device, pending upload included.</p>
      {loading ? (
        <p className="text-xs text-[var(--desc)]">Loading attachments...</p>
      ) : items.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--background)] p-8 text-center">
          <Database className="w-6 h-6 mx-auto mb-2 text-[var(--secondary)]" />
          <p className="text-sm font-medium">No attachments yet</p>
          <p className="text-xs text-[var(--desc)]">Attach files from the capture box — they persist offline.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((a) => (
            <div key={a.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-medium truncate">
                {icon(a.type)}
                <span className="truncate" title={a.name}>{a.name}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--desc)]">
                <span>{(a.size / 1024).toFixed(1)} KB</span>
                <span className={a.syncStatus === 'pending' ? 'text-amber-500' : 'text-emerald-500'}>
                  {a.syncStatus === 'pending' ? 'offline' : 'synced'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
