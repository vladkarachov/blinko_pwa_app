import React, { useState } from 'react';
import {
  Download,
  Share2,
  X,
  Smartphone,
  MoreVertical,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { APP_VERSION, RELEASES_URL } from '../lib/version';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>(isIOS ? 'ios' : 'android');
  const [copiedLink, setCopiedLink] = useState(false);

  // If already running as an installed standalone PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (!outcome) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
        title="Install Blinko as a native Android or desktop app"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[var(--radius)] bg-[var(--background)] border border-[var(--border)] p-6 shadow-2xl text-[var(--foreground)] flex flex-col max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--accent)] text-[var(--secondary)]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-[var(--foreground)]">Install Blinko App</h3>
                  <p className="text-xs text-[var(--desc)]">Works 100% offline with auto-sync</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-[var(--desc)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--accent)] border border-[var(--border)] mt-4">
              <button
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'android'
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs'
                    : 'text-[var(--desc)] hover:text-[var(--foreground)]'
                }`}
              >
                Android (Chrome)
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'ios'
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs'
                    : 'text-[var(--desc)] hover:text-[var(--foreground)]'
                }`}
              >
                iPhone / iPad (Safari)
              </button>
            </div>

            {/* Android Instructions */}
            {activeTab === 'android' && (
              <div className="mt-4 space-y-3 text-sm text-[var(--foreground)]">
                {isInstallable && (
                  <button
                    onClick={async () => {
                      await install();
                      setShowGuide(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] font-bold text-xs transition hover:opacity-90 cursor-pointer active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>Trigger Android Prompt Now</span>
                  </button>
                )}

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--accent)] border border-[var(--border)]">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--secondary)] border border-[var(--border)] text-xs font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    Open this app link in <strong className="text-[var(--foreground)]">Google Chrome</strong> (or Brave/Samsung Internet) on your Android device.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--accent)] border border-[var(--border)]">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--secondary)] border border-[var(--border)] text-xs font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    Tap the <strong className="text-[var(--foreground)]">three dots menu</strong>{' '}
                    <MoreVertical className="inline w-3.5 h-3.5 text-[var(--secondary)] mx-0.5" /> in the top-right corner of Chrome.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--accent)] border border-[var(--border)]">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--secondary)] border border-[var(--border)] text-xs font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    Select <strong className="text-[var(--foreground)]">Install app</strong> (or <strong className="text-[var(--foreground)]">Add to Home screen</strong>).
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--accent)] border border-[var(--border)] text-xs text-[var(--foreground)] space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-[var(--secondary)]">
                    <Sparkles className="w-3.5 h-3.5" />
                    How Android Installs It (WebAPK):
                  </div>
                  <p className="text-[11px] leading-relaxed text-[var(--desc)]">
                    When you tap &ldquo;Install app&rdquo;, Android Chrome mints a real APK package in the background. It installs into your Android system with an app icon, standalone window, full offline IndexedDB storage, and background auto-sync!
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--accent)] border border-[var(--border)] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--foreground)]">Want a standalone .APK file? (v{APP_VERSION})</span>
                    <span className="text-[10px] text-[var(--secondary)] bg-[var(--accent)] border border-[var(--border)] px-1.5 py-0.5 rounded font-mono">
                      GitHub
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--desc)] leading-relaxed">
                    Download the ready-made APK from GitHub Releases — built automatically by CI, or package this PWA yourself with PWABuilder:
                  </p>
                  <a
                    href={RELEASES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold transition hover:opacity-90 cursor-pointer"
                  >
                    <span>Download .APK from GitHub Releases</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={`https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(
                      typeof window !== 'undefined' ? window.location.origin : ''
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-[var(--accent)] hover:bg-[var(--hover)] text-[var(--secondary)] text-xs font-semibold transition border border-[var(--border)] cursor-pointer"
                  >
                    <span>Build & Download .APK via PWABuilder</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* iOS Instructions */}
            {activeTab === 'ios' && (
              <div className="mt-4 space-y-3 text-sm text-[var(--foreground)]">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--accent)] border border-[var(--border)]">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--secondary)] border border-[var(--border)] text-xs font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    Tap the <strong className="text-[var(--foreground)]">Share</strong> button{' '}
                    <Share2 className="inline w-3.5 h-3.5 text-[var(--secondary)] ml-0.5" /> in the Safari toolbar.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--accent)] border border-[var(--border)]">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--secondary)] border border-[var(--border)] text-xs font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    Scroll down and tap <strong className="text-[var(--foreground)]">Add to Home Screen</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--accent)] border border-[var(--border)]">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--secondary)] border border-[var(--border)] text-xs font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    Tap <strong className="text-[var(--foreground)]">Add</strong> in the top-right corner.
                  </div>
                </div>
              </div>
            )}

            {/* Copy Link for Phone */}
            <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-2">
              <label className="text-[11px] font-medium text-[var(--desc)] block">
                Open on your mobile device:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  className="flex-1 rounded-xl bg-[var(--accent)] border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--foreground)] font-mono select-all focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--hover)] text-xs text-[var(--foreground)] transition shrink-0 cursor-pointer border border-[var(--border)]"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[var(--secondary)]" />
                      <span className="text-[var(--secondary)]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-xl bg-[var(--accent)] hover:bg-[var(--hover)] py-2.5 text-xs font-semibold text-[var(--foreground)] transition cursor-pointer border border-[var(--border)]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
