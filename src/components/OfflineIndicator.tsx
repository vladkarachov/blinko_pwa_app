import React from 'react';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { SyncState } from '../lib/syncEngine';

interface OfflineIndicatorProps {
  syncState: SyncState;
  onSyncNow: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ syncState, onSyncNow }) => {
  const { isOnline, isSyncing, pendingCount, lastSyncError } = syncState;

  if (isOnline && pendingCount === 0 && !lastSyncError) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm flex flex-col gap-2 pointer-events-auto">
      {!isOnline && (
        <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/90 backdrop-blur-md px-3.5 py-2 text-xs font-medium text-slate-950 shadow-lg shadow-amber-950/20 border border-amber-300/40 animate-in slide-in-from-bottom-2">
          <WifiOff className="w-4 h-4 shrink-0 text-slate-900" />
          <div className="flex-1">
            <span className="font-semibold">Offline Mode</span>
            <span className="block text-[11px] text-slate-900/80">
              {pendingCount > 0 ? `${pendingCount} change(s) saved locally & queued` : 'Saved in local IndexedDB'}
            </span>
          </div>
        </div>
      )}

      {isOnline && pendingCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--background)] backdrop-blur-md px-3.5 py-2 text-xs text-[var(--foreground)] shadow-xl border border-[var(--border)]">
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-3.5 h-3.5 text-[var(--secondary)] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing ? 'Synchronizing changes...' : `${pendingCount} unsynced change(s)`}
            </span>
          </div>
          {!isSyncing && (
            <button
              onClick={onSyncNow}
              className="text-xs font-semibold text-[var(--secondary)] hover:underline cursor-pointer"
            >
              Sync Now
            </button>
          )}
        </div>
      )}

      {lastSyncError && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-950/90 backdrop-blur-md px-3.5 py-2 text-xs text-rose-200 shadow-lg border border-rose-800">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <div className="truncate flex-1">
            <span className="font-semibold block">Sync Alert</span>
            <span className="text-[11px] text-rose-300 truncate block">{lastSyncError}</span>
          </div>
          <button
            onClick={onSyncNow}
            className="text-[11px] font-semibold text-rose-300 hover:text-rose-100 underline shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};
