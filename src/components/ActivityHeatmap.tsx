import React from 'react';
import { BlinkoNote } from '../types';

interface ActivityHeatmapProps {
  notes: BlinkoNote[];
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ notes }) => {
  // Generate days for the last 12 weeks (84 days)
  const totalDays = 84;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group notes by YYYY-MM-DD
  const countByDate: Record<string, number> = {};
  for (const n of notes) {
    if (n.isTrash) continue;
    try {
      const d = new Date(n.createdAt);
      const key = d.toISOString().split('T')[0];
      countByDate[key] = (countByDate[key] || 0) + 1;
    } catch {
      // ignore
    }
  }

  const days: Array<{ date: string; count: number; dayOfWeek: number }> = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    days.push({
      date: key,
      count: countByDate[key] || 0,
      dayOfWeek: d.getDay(),
    });
  }

  // Weeks array (columns)
  const weeks: Array<typeof days> = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getColorClass = (count: number) => {
    if (count === 0) return 'bg-[var(--accent)]';
    if (count === 1) return 'bg-[var(--secondary)] opacity-40';
    if (count === 2) return 'bg-[var(--secondary)] opacity-70';
    if (count <= 4) return 'bg-[var(--secondary)] opacity-90';
    return 'bg-[var(--secondary)] font-bold';
  };

  const totalCaptured = notes.filter((n) => !n.isTrash).length;

  return (
    <div className="p-3 rounded-[var(--radius)] bg-[var(--accent)] border border-[var(--border)] text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-[var(--foreground)]">Activity Heatmap</span>
        <span className="text-[11px] text-[var(--desc)]">{totalCaptured} total captures</span>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 pt-0.5">
        {weeks.map((week, wIdx) => (
          <div key={`w-${wIdx}`} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                className={`w-3 h-3 rounded-[3px] transition-colors ${getColorClass(day.count)}`}
                title={`${day.date}: ${day.count} note(s)`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[var(--border)] text-[10px] text-[var(--desc)]">
        <span>Less</span>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--accent)] border border-[var(--border)]" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--secondary)] opacity-40" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--secondary)] opacity-70" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--secondary)] opacity-90" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--secondary)]" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
};
