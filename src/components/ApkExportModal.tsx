/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { downloadAndroidPackage } from '../game/apkExport';
import { X, Smartphone, Download, Check, Terminal, ExternalLink, Sparkles } from 'lucide-react';

interface ApkExportModalProps {
  onClose: () => void;
}

export const ApkExportModal: React.FC<ApkExportModalProps> = ({ onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    try {
      downloadAndroidPackage();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch {
      //
    } finally {
      setDownloading(false);
    }
  };

  const copyCommands = () => {
    navigator.clipboard.writeText('npm install\nnpm run build\nnpx cap sync android\nnpx cap open android');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 md:p-6 backdrop-blur-xs select-none">
      <div className="w-full max-w-xl bg-[#0e090b] border-2 border-emerald-900/80 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-emerald-950/60 bg-[#121c16]">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <h2 className="font-cinzel font-bold text-lg text-emerald-200 tracking-wide">
              Playable Mobile Android Game & APK
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Method 1: Instant Android Install (Native PWA APK equivalent) */}
          <div className="p-3.5 rounded-lg border border-emerald-500/70 bg-[#0d1f14]">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm mb-1">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Method 1: Instant Native Android Install (Recommended)
            </div>
            <p className="text-slate-300 leading-relaxed">
              This game is fully configured as an installable standalone Android App (PWA) with landscape sensor lock, offline caching, and 60fps hardware acceleration!
            </p>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-slate-200 font-mono text-[11px]">
              <li>Open this game URL in Google Chrome on your Android device.</li>
              <li>Tap the <strong className="text-emerald-300">⋮ (Three Dots)</strong> menu in the top right.</li>
              <li>Tap <strong className="text-emerald-300">&quot;Install App&quot;</strong> or <strong className="text-emerald-300">&quot;Add to Home Screen&quot;</strong>.</li>
              <li>Grimblade will launch directly from your Android app drawer with full touch virtual controls!</li>
            </ol>
          </div>

          {/* Method 2: Export Official Native Android Studio APK Project */}
          <div className="p-3.5 rounded-lg border border-slate-800 bg-[#140e11] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-100">Method 2: Export Android Studio APK Project (.zip)</h3>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Generates ready-to-build Capacitor project including AndroidManifest.xml and Gradle scripts.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-98 cursor-pointer"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Downloaded Successfully!
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Download Android APK Project Package (.zip)
                </>
              )}
            </button>

            {/* Build commands snippet */}
            <div className="bg-[#090608] border border-slate-900 rounded p-2.5 font-mono text-[11px] text-slate-300">
              <div className="flex justify-between items-center text-slate-500 text-[10px] mb-1">
                <span>CLI BUILD COMMANDS</span>
                <button
                  onClick={copyCommands}
                  className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3" /> : null} {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="text-emerald-400 overflow-x-auto whitespace-pre">
{`npm install
npm run build
npx cap sync android
npx cap open android`}
              </pre>
              <p className="mt-2 text-slate-400 text-[10px]">
                In Android Studio: Select <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong> to generate <code className="text-amber-300">app-debug.apk</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
