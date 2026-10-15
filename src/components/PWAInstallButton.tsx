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
        className="flex items-center gap-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition active:scale-95 cursor-pointer"
        title="Install Blinko as a native Android or desktop app"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-slate-100">Install Blinko App</h3>
                  <p className="text-xs text-slate-400">Works 100% offline with auto-sync</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 mt-4">
              <button
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'android'
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Android (Chrome)
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'ios'
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                iPhone / iPad (Safari)
              </button>
            </div>

            {/* Android Instructions */}
            {activeTab === 'android' && (
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                {isInstallable && (
                  <button
                    onClick={async () => {
                      await install();
                      setShowGuide(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20 cursor-pointer active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>Trigger Android Prompt Now</span>
                  </button>
                )}

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-750">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    Open this app link in <strong className="text-white">Google Chrome</strong> (or Brave/Samsung Internet) on your Android device.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-750">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    Tap the <strong className="text-white">three dots menu</strong>{' '}
                    <MoreVertical className="inline w-3.5 h-3.5 text-emerald-400 mx-0.5" /> in the top-right corner of Chrome.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-750">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    Select <strong className="text-white">Install app</strong> (or <strong className="text-white">Add to Home screen</strong>).
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300/90 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-emerald-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    How Android Installs It (WebAPK):
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    When you tap &ldquo;Install app&rdquo;, Android Chrome mints a real APK package in the background. It installs into your Android system with an app icon, standalone window, full offline IndexedDB storage, and background auto-sync!
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">Want a standalone .APK file?</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                      PWABuilder
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    You can package this PWA into an official signed APK package in 30 seconds using Microsoft/Google&apos;s free PWABuilder tool:
                  </p>
                  <a
                    href={`https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(
                      typeof window !== 'undefined' ? window.location.origin : ''
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition border border-slate-700 cursor-pointer"
                  >
                    <span>Build & Download .APK via PWABuilder</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* iOS Instructions */}
            {activeTab === 'ios' && (
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-750">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    Tap the <strong className="text-white">Share</strong> button{' '}
                    <Share2 className="inline w-3.5 h-3.5 text-emerald-400 ml-0.5" /> in the Safari toolbar.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-750">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-750">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    Tap <strong className="text-white">Add</strong> in the top-right corner.
                  </div>
                </div>
              </div>
            )}

            {/* Copy Link for Phone */}
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
              <label className="text-[11px] font-medium text-slate-400 block">
                Open on your mobile device:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-300 font-mono select-all focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs text-slate-200 transition shrink-0 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
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
              className="mt-5 w-full rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-750 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
