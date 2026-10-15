import React from 'react';
import {
  Zap,
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
    <header className="sticky top-0 z-30 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand & Mobile Sidebar Toggle */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Toggle Menu"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <div className="flex items-center gap-2 select-none">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-md shadow-emerald-900/30 text-slate-950">
              <Zap className="w-4 h-4 fill-slate-950 stroke-slate-950" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-100 tracking-tight text-base font-sans">
                  Blinko
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Offline
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Search Box */}
        <div className="flex-1 max-w-md mx-2 hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search notes, thoughts, tags... (Press /)"
              className="w-full rounded-xl bg-slate-900/90 border border-slate-800 pl-9 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/40 focus:outline-hidden transition"
            />
            {searchText && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs p-0.5 rounded cursor-pointer"
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
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
              !isOnline
                ? 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                : isSyncing
                ? 'bg-slate-900 border-slate-700 text-sky-300'
                : pendingCount > 0
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
            title={
              !isOnline
                ? 'Device offline. Edits saved in IndexedDB.'
                : isSyncing
                ? 'Synchronizing with Blinko server...'
                : `${formatLastSync()}. Click to sync immediately.`
            }
          >
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
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
              className={`w-3 h-3 text-slate-400 ${isSyncing ? 'animate-spin text-sky-400' : ''}`}
            />
          </button>

          {/* In-app PWA install button */}
          <PWAInstallButton />

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
            title="Settings & Server Connection"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="mt-2 sm:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes, tags..."
            className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500/80 focus:outline-hidden"
          />
          {searchText && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs p-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
