import React, { useMemo } from 'react';
import { BlinkoNote } from '../types';
import { NoteCard } from '../components/NoteCard';
import { Lightbulb } from 'lucide-react';

interface Props {
  notes: BlinkoNote[];
  serverUrl: string;
  cardProps: Omit<React.ComponentProps<typeof NoteCard>, 'note' | 'serverUrl'>;
}

/** Daily review: recent unarchived notes, mirroring official /review mobile view. */
export const ReviewPage: React.FC<Props> = ({ notes, serverUrl, cardProps }) => {
  const recent = useMemo(() => {
    const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 1;
    return notes
      .filter((n) => !n.isTrash && !n.isArchived && new Date(n.updatedAt).getTime() >= cutoff)
      .slice(0, 20);
  }, [notes]);

  return (
    <div className="w-full max-w-4xl mx-auto px-2 md:px-6 pb-24 pt-[64px] md:pt-2">
      <div className="flex items-center gap-2 pt-2 mb-1">
        <span className="w-1 self-stretch rounded-full bg-[var(--primary)]" />
        <h1 className="text-lg font-black">Daily Review</h1>
      </div>
      <p className="text-xs text-[var(--desc)] mb-4">Notes touched in the last 24 hours.</p>
      {recent.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--background)] p-8 text-center">
          <Lightbulb className="w-6 h-6 mx-auto mb-2 text-[var(--secondary)]" />
          <p className="text-sm font-medium">Nothing to review</p>
          <p className="text-xs text-[var(--desc)]">New and edited notes will show up here.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {recent.map((n) => (
            <NoteCard key={n.id} note={n} serverUrl={serverUrl} {...cardProps} />
          ))}
        </div>
      )}
    </div>
  );
};
