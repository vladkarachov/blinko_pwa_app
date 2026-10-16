import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BlinkoNote } from '../types';
import { NoteDetailModal } from '../components/NoteDetailModal';

interface Props {
  notes: BlinkoNote[];
  serverUrl: string;
  cardHandlers: {
    onUpdate: (n: BlinkoNote) => Promise<void>;
    onTogglePin: (id: string, v: boolean) => Promise<void>;
    onToggleArchive: (id: string, v: boolean) => Promise<void>;
    onTrash: (id: string, v: boolean) => Promise<void>;
    onDeletePermanent: (id: string) => Promise<void>;
    onTagClick: (t: string) => void;
  };
}

/** Full-page note view on mobile (official /detail/* parity), modal content reused. */
export const DetailPage: React.FC<Props> = ({ notes, cardHandlers }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const note = notes.find((n) => n.id === id) ?? null;
  const [startEdit, setStartEdit] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setStartEdit(params.get('edit') === '1');
  }, [id]);

  if (!note) {
    return (
      <div className="pt-[72px] px-4 pb-24 text-center">
        <p className="text-sm font-medium">Note not found</p>
        <button onClick={() => navigate(-1)} className="mt-2 text-xs text-[var(--secondary)]">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="pt-[56px] md:pt-0 pb-24 md:pb-10">
      <button
        onClick={() => navigate(-1)}
        className="md:hidden fixed top-[64px] left-2 z-30 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-[var(--background)] border border-[var(--border)] shadow-sm"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>
      <NoteDetailModal
        note={note}
        initialEdit={startEdit}
        onClose={() => navigate(-1)}
        onSave={cardHandlers.onUpdate}
        onTogglePin={cardHandlers.onTogglePin}
        onToggleArchive={cardHandlers.onToggleArchive}
        onTrash={cardHandlers.onTrash}
        onDeletePermanent={async (nid) => {
          await cardHandlers.onDeletePermanent(nid);
          navigate('/', { replace: true });
        }}
        onTagClick={(t) => {
          cardHandlers.onTagClick(t);
          navigate('/');
        }}
      />
    </div>
  );
};
