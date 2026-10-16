import React, { useEffect, useState } from 'react';
import { BlinkoNote } from '../types';
import { cachedBlobUrl, getAttachmentsByNote, LocalAttachment } from '../lib/attachmentStore';
import { FileText, Download } from 'lucide-react';

function remoteUrl(serverUrl: string, path: string): string {
  const base = (serverUrl || '').replace(/\/+$/, '');
  if (!base || /^blob:/.test(path) || /^data:/.test(path) || /^https?:\/\//.test(path)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

interface Props {
  note: BlinkoNote;
  serverUrl?: string;
  preview?: boolean;
}

/** Renders note attachments: local blobs offline-first, remote /api/file/* when synced. */
export const FilesAttachmentRender: React.FC<Props> = ({ note, serverUrl = '', preview = true }) => {
  const [local, setLocal] = useState<LocalAttachment[]>([]);

  useEffect(() => {
    let mounted = true;
    getAttachmentsByNote(note.id)
      .then((list) => mounted && setLocal(list))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [note.id, note.updatedAt]);

  const remote = note.attachments ?? [];
  if (local.length === 0 && remote.length === 0) return null;

  const isImage = (type: string, name: string) =>
    type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(name);

  return (
    <div className={preview ? 'my-2 grid grid-cols-3 gap-1.5' : 'my-2 space-y-1.5'}>
      {local.map((att) => (
        <a
          key={att.id}
          href={cachedBlobUrl(att)}
          target="_blank"
          rel="noreferrer"
          className="relative block rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--accent)]"
          title={`${att.name} (offline)`}
        >
          {isImage(att.type, att.name) ? (
            <img src={cachedBlobUrl(att)} alt={att.name} className="w-full h-20 object-cover" loading="lazy" />
          ) : (
            <span className="flex items-center gap-1.5 p-2 text-xs truncate">
              <FileText className="w-4 h-4 shrink-0" />
              <span className="truncate">{att.name}</span>
            </span>
          )}
          {att.syncStatus === 'pending' && (
            <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/90 text-white">
              offline
            </span>
          )}
        </a>
      ))}
      {remote
        .filter((r) => !local.some((l) => l.remotePath === (r as { path?: string }).path || l.remotePath === r.url))
        .map((r) => {
          const path = (r as { path?: string }).path ?? r.url;
          const url = remoteUrl(serverUrl, path);
          return (
            <a
              key={r.id}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="relative block rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--accent)]"
              title={r.name}
            >
              {isImage(r.type, r.name) ? (
                <img src={url} alt={r.name} className="w-full h-20 object-cover" loading="lazy" />
              ) : (
                <span className="flex items-center gap-1.5 p-2 text-xs truncate">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="truncate">{r.name}</span>
                  <Download className="w-3.5 h-3.5 ml-auto shrink-0" />
                </span>
              )}
            </a>
          );
        })}
    </div>
  );
};
