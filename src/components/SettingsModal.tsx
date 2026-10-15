import React, { useState } from 'react';
import {
  X,
  Server,
  Key,
  RefreshCw,
  Database,
  Download,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { AppConfig, SyncQueueItem, BlinkoNote } from '../types';
import { apiTestConnection } from '../lib/blinkoClient';
import { getQueueItems, resetDatabase } from '../lib/db';

interface SettingsModalProps {
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => Promise<void>;
  onClose: () => void;
  onForceSync: () => Promise<void>;
  notes: BlinkoNote[];
  onDataReset: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  config,
  onSaveConfig,
  onClose,
  onForceSync,
  notes,
  onDataReset,
}) => {
  const [formData, setFormData] = useState<AppConfig>({ ...config });
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [showQueue, setShowQueue] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    getQueueItems().then(setQueueItems).catch(console.error);
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await apiTestConnection(formData);
      setTestResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ ok: false, message: msg });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    await onSaveConfig(formData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleExportBackup = () => {
    const backupData = {
      exportDate: new Date().toISOString(),
      clientVersion: '1.0.0',
      totalNotes: notes.length,
      notes,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blinko-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Blinko Settings & Sync</h2>
              <p className="text-xs text-slate-400">Configure your self-hosted server and offline rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-sm">
          {/* Mode switch */}
          <div className="rounded-xl p-3.5 bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-slate-200">Standalone Demo Mode</span>
                <p className="text-xs text-slate-400">
                  Simulates a Blinko instance locally without needing Docker running
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.isDemoMode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isDemoMode: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Server Config */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Self-Hosted Server Connection
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Blinko Server URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.serverUrl}
                  disabled={formData.isDemoMode}
                  onChange={(e) => setFormData({ ...formData, serverUrl: e.target.value })}
                  placeholder="e.g. http://localhost:1111 or https://blinko.example.com"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden disabled:opacity-50"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Default port for self-hosted Blinko Docker container is 1111.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Open API Access Token
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.apiToken}
                  disabled={formData.isDemoMode}
                  onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                  placeholder="Paste Bearer token from Blinko Settings"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden font-mono disabled:opacity-50"
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>Find this in Blinko: Settings → Open API / Access Token</span>
                <a
                  href="https://github.com/blinkospace/blinko"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                >
                  Blinko Repo <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>

            {/* Proxy Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-xs font-medium text-slate-200">Use Server-Side Proxy</span>
                  <p className="text-[11px] text-slate-400">
                    Bypasses browser CORS & mixed-content blocks when connecting to HTTP servers
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.useProxy}
                disabled={formData.isDemoMode}
                onChange={(e) => setFormData({ ...formData, useProxy: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer disabled:opacity-50"
              />
            </div>

            {/* Test Connection Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-750 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>

              {testResult && (
                <div
                  className={`flex items-center gap-1.5 text-xs ${
                    testResult.ok ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate max-w-xs">{testResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sync & Outbox */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Sync & Offline Outbox
              </h3>
              <button
                type="button"
                onClick={() => setShowQueue(!showQueue)}
                className="text-xs text-emerald-400 hover:underline cursor-pointer"
              >
                {showQueue ? 'Hide Queue' : `View Queue (${queueItems.length})`}
              </button>
            </div>

            {showQueue && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 max-h-40 overflow-y-auto space-y-1.5 text-xs">
                {queueItems.length === 0 ? (
                  <p className="text-slate-500 italic text-center py-2">
                    Outbox is empty. All local edits are synced!
                  </p>
                ) : (
                  queueItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px]">
                          {item.action}
                        </span>
                        <span className="text-slate-300 truncate font-mono">
                          Note: {item.noteId.slice(0, 10)}...
                        </span>
                      </div>
                      <span className="text-slate-500 shrink-0">
                        Retries: {item.retries}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-300">
                  {notes.length} note(s) in local IndexedDB
                </span>
              </div>
              <button
                type="button"
                onClick={onForceSync}
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                Force Sync Now
              </button>
            </div>
          </div>

          {/* Backup & Data Reset */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Data & Backup
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-750 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON Backup</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (confirm('Are you sure you want to reset the local database?')) {
                    await resetDatabase();
                    await onDataReset();
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl border border-rose-900/40 bg-rose-950/20 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-950/40 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Demo Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition cursor-pointer active:scale-95 shadow-md shadow-emerald-500/20"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
