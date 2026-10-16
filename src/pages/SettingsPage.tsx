import React, { useEffect, useState } from 'react';
import { Server, RefreshCw, Database, CheckCircle2, AlertTriangle, Sun, Moon, Monitor } from 'lucide-react';
import { AppConfig, BlinkoNote, SyncQueueItem } from '../types';
import { apiTestConnection } from '../lib/blinkoClient';
import { getQueueItems, resetDatabase } from '../lib/db';
import { APP_VERSION } from '../lib/version';

interface Props {
  config: AppConfig;
  notes: BlinkoNote[];
  onSaveConfig: (c: AppConfig) => Promise<void>;
  onForceSync: () => Promise<void>;
  onDataReset: () => Promise<void>;
}

/** Full settings page (official /settings parity, mobile-friendly). */
export const SettingsPage: React.FC<Props> = ({ config, notes, onSaveConfig, onForceSync, onDataReset }) => {
  const [form, setForm] = useState<AppConfig>({ ...config });
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => setForm({ ...config }), [config]);
  useEffect(() => {
    getQueueItems().then(setQueue).catch(() => {});
  }, []);

  const test = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      setTestResult(await apiTestConnection(form));
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setIsTesting(false);
    }
  };

  const save = async () => {
    await onSaveConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const set = <K extends keyof AppConfig>(k: K, v: AppConfig[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="w-full max-w-2xl mx-auto px-3 md:px-6 pb-24 pt-[64px] md:pt-2 space-y-4">
      <div className="flex items-center gap-2 pt-2">
        <span className="w-1 self-stretch rounded-full bg-[var(--primary)]" />
        <div>
          <h1 className="text-lg font-black">Settings</h1>
          <p className="text-xs text-[var(--desc)]">Server connection · v{APP_VERSION} · {notes.length} local notes</p>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] p-4 space-y-3">
        <label className="flex items-center justify-between text-xs font-medium gap-2">
          <span className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5" /> Demo mode</span>
          <input type="checkbox" checked={form.isDemoMode} onChange={(e) => set('isDemoMode', e.target.checked)} className="w-4 h-4 accent-black dark:accent-white" />
        </label>
        <div className="space-y-1">
          <label className="text-xs font-medium">Server URL</label>
          <input
            value={form.serverUrl}
            onChange={(e) => set('serverUrl', e.target.value)}
            placeholder="http://192.168.x.x:1111"
            disabled={form.isDemoMode}
            className="w-full rounded-xl bg-[var(--accent)] border border-[var(--border)] px-3 py-2 text-sm outline-none disabled:opacity-50"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">API token</label>
          <input
            value={form.apiToken}
            onChange={(e) => set('apiToken', e.target.value)}
            type="password"
            placeholder="Blinko Settings → API token"
            disabled={form.isDemoMode}
            className="w-full rounded-xl bg-[var(--accent)] border border-[var(--border)] px-3 py-2 text-sm outline-none disabled:opacity-50"
          />
        </div>
        <label className="flex items-center justify-between text-xs font-medium">
          <span>Use proxy (avoids CORS in browser)</span>
          <input type="checkbox" checked={form.useProxy} onChange={(e) => set('useProxy', e.target.checked)} className="w-4 h-4 accent-black dark:accent-white" />
        </label>
        <label className="flex items-center justify-between text-xs font-medium">
          <span>Auto-sync</span>
          <input type="checkbox" checked={form.autoSync} onChange={(e) => set('autoSync', e.target.checked)} className="w-4 h-4 accent-black dark:accent-white" />
        </label>
        <div className="flex items-center gap-1.5">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => set('theme', t)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl border text-xs font-medium ${form.theme === t ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent' : 'border-[var(--border)]'}`}
            >
              {t === 'light' ? <Sun className="w-3.5 h-3.5" /> : t === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
              {t}
            </button>
          ))}
        </div>
        {testResult && (
          <div className={`flex items-start gap-1.5 text-xs p-2.5 rounded-xl ${testResult.ok ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'}`}>
            {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={test} disabled={isTesting} className="flex-1 py-2 rounded-xl border border-[var(--border)] text-xs font-medium disabled:opacity-50">
            {isTesting ? 'Testing...' : 'Test connection'}
          </button>
          <button onClick={save} className="flex-1 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold">
            {saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] p-4 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Database className="w-3.5 h-3.5 text-[var(--secondary)]" /> Offline storage
        </div>
        <p className="text-xs text-[var(--desc)]">Outbox: {queue.length} queued · auto-sync pushes on reconnect.</p>
        <div className="flex gap-2">
          <button onClick={onForceSync} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[var(--border)] text-xs font-medium">
            <RefreshCw className="w-3.5 h-3.5" /> Sync now
          </button>
          <button
            onClick={async () => {
              if (confirm('Reset local data to seed notes? (Outbox cleared)')) {
                await resetDatabase();
                await onDataReset();
              }
            }}
            className="flex-1 py-2 rounded-xl border border-rose-500/30 text-rose-500 text-xs font-medium"
          >
            Reset local data
          </button>
        </div>
      </div>
    </div>
  );
};
