import React from 'react';
import { Menu, RefreshCw, WifiOff, Search, X } from 'lucide-react';
import { SyncState } from '../../lib/syncEngine';

interface Props {
  title: string;
  syncState: SyncState;
  onSyncNow: () => void;
  searchText: string;
  onSearchChange: (v: string) => void;
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
}

/**
 * Official-style fixed blur mobile header:
 * hamburger | title + offline badge | search | sync.
 * Mirrors blinko-server/blinko/app/src/components/Layout/index.tsx header.
 */
export const MobileHeader: React.FC<Props> = ({
  title,
  syncState,
  onSyncNow,
  searchText,
  onSearchChange,
  onOpenSidebar,
}) => {
  const [searchOpen, setSearchOpen] = React.useState(false);

  return (
    <header
      className="blinko-mobile-header md:hidden fixed top-0 z-40 w-full flex items-center gap-1 px-2 pt-2 pb-2"
      style={{
        minHeight: 56,
        borderRadius: '0 0 12px 12px',
        background: 'var(--header)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border)',
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
      }}
    >
      <button
        onClick={onOpenSidebar}
        className="p-2 rounded-lg text-[var(--desc)] active:scale-95"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      <div className="flex items-center gap-1.5 min-w-0">
        <span className="font-black select-none text-[15px] truncate">{title}</span>
        {!syncState.isOnline && (
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 animate-pulse shrink-0">
            <WifiOff className="w-3 h-3" />
            <span>Offline</span>
          </span>
        )}
      </div>

      <div className="flex-1" />

      {searchOpen ? (
        <div className="flex items-center gap-1 flex-1 max-w-[220px]">
          <input
            autoFocus
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-xl bg-[var(--accent)] border border-[var(--border)] px-3 py-1.5 text-sm outline-none"
          />
          <button
            onClick={() => {
              onSearchChange('');
              setSearchOpen(false);
            }}
            className="p-1.5 text-[var(--desc)]"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-lg text-[var(--desc)] active:scale-95"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={onSyncNow}
            disabled={syncState.isSyncing || !syncState.isOnline}
            className="p-2 rounded-lg text-[var(--desc)] active:scale-95 disabled:opacity-40"
            aria-label="Sync now"
            title={syncState.pendingCount > 0 ? `${syncState.pendingCount} queued` : 'Sync now'}
          >
            <RefreshCw className={`w-5 h-5 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </>
      )}
    </header>
  );
};
