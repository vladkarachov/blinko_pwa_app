import React from 'react';
import {
  Search,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { SyncState } from '../lib/syncEngine';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  syncState: SyncState;
  onSyncNow: () => void;
  searchText: string;
  onSearchChange: (val: string) => void;
  onOpenSettings: () => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  syncState,
  onSyncNow,
  searchText,
  onSearchChange,
  onOpenSettings,
  onToggleSidebar,
  sidebarOpen,
}) => {
  const { isOnline, isSyncing, lastSyncedAt, pendingCount } = syncState;

  const formatLastSync = () => {
    if (!lastSyncedAt) return 'Not synced yet';
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - lastSyncedAt.getTime()) / 1000);
    if (diffSec < 10) return 'Synced just now';
    if (diffSec < 60) return `Synced ${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    return `Synced ${diffMin}m ago`;
  };

  return (
    <header className="sticky top-0 z-30 w-full glass-effect border-b border-[var(--border)] px-4 py-2.5 md:h-16 h-14 flex items-center">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
        {/* Left: Brand & Mobile Sidebar Toggle */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-1.5 rounded-lg text-[var(--desc)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] transition cursor-pointer"
              title="Toggle Menu"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <div className="flex items-center gap-2 select-none">
            <span className="w-1 h-6 rounded-full bg-[var(--primary)]" />
            <span className="font-black tracking-tight text-base text-[var(--foreground)]">
              Blinko
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-[var(--accent)] text-[var(--desc)]">
              Offline
            </span>
          </div>
        </div>

        {/* Center: Search Box */}
        <div className="flex-1 max-w-md mx-2 hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--desc)]" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search notes, thoughts, tags... (Press /)"
              className="w-full rounded-xl bg-[var(--accent)] border border-[var(--border)] pl-9 pr-8 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--ignore)] focus:border-[var(--ring)] focus:outline-hidden transition"
            />
            {searchText && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--desc)] hover:text-[var(--foreground)] text-xs p-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: Sync Status, PWA Install, Settings */}
        <div className="flex items-center gap-2">
          {/* Online/Offline & Sync Trigger Button */}
          <button
            onClick={onSyncNow}
            disabled={isSyncing || !isOnline}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-[var(--border)] text-xs font-medium transition cursor-pointer bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--hover)]"
            title={
              !isOnline
                ? 'Device offline. Edits saved in IndexedDB.'
                : isSyncing
                ? 'Synchronizing with Blinko server...'
                : `${formatLastSync()}. Click to sync immediately.`
            }
          >
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-[var(--secondary)]" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}

            <span className="hidden md:inline">
              {!isOnline
                ? 'Offline'
                : isSyncing
                ? 'Syncing...'
                : pendingCount > 0
                ? `${pendingCount} to sync`
                : formatLastSync()}
            </span>

            <RefreshCw
              className={`w-3 h-3 text-[var(--desc)] ${isSyncing ? 'animate-spin' : ''}`}
            />
          </button>

          {/* In-app PWA install button */}
          <PWAInstallButton />

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-[var(--desc)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] transition cursor-pointer"
            title="Settings & Server Connection"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="mt-2 sm:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--desc)]" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes, tags..."
            className="w-full rounded-xl bg-[var(--accent)] border border-[var(--border)] pl-9 pr-8 py-2 text-xs text-[var(--foreground)] placeholder-[var(--ignore)] focus:border-[var(--ring)] focus:outline-hidden"
          />
          {searchText && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--desc)] hover:text-[var(--foreground)] text-xs p-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
