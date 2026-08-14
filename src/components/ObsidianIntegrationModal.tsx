import React, { useState } from 'react';
import {
  BookOpen,
  Copy,
  Check,
  Download,
  PlusCircle,
  Laptop,
  Layers,
  X,
  FileCode,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { RawFileEntry } from '../utils/vaultParser';

interface ObsidianIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultName: string;
  onAddNoteToVault: (entry: RawFileEntry) => void;
  isNoteAlreadyInVault: boolean;
}

export const ObsidianIntegrationModal: React.FC<ObsidianIntegrationModalProps> = ({
  isOpen,
  onClose,
  vaultName,
  onAddNoteToVault,
  isNoteAlreadyInVault,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'embed-note' | 'custom-frames' | 'sidebar'>('embed-note');
  const [installedSuccess, setInstalledSuccess] = useState(isNoteAlreadyInVault);

  if (!isOpen) return null;

  const currentAppUrl = typeof window !== 'undefined' ? window.location.href : 'https://ais-pre-7a3nlqzx57sovv4rbk5np4-486377300301.us-west2.run.app';

  // Markdown note content with iframe embed
  const embedNoteContent = [
    '---',
    'title: Vault Health Auditor',
    'tags:',
    '  - dashboard',
    '  - tools',
    '  - obsidian',
    'status: active',
    'banner: false',
    '---',
    '',
    '> [!abstract] 🛡️ Obsidian Vault Health & Graph Auditor',
    '> This dashboard audits broken wikilinks, orphans, unindexed attachments, tag casing inconsistencies, and graph topology directly inside your Obsidian workspace.',
    '',
    '<div style="width: 100%; height: 85vh; min-height: 600px; border-radius: 12px; overflow: hidden; border: 1px solid var(--background-modifier-border); box-shadow: var(--shadow-s);">',
    `  <iframe`,
    `    src="${currentAppUrl}"`,
    `    style="width: 100%; height: 100%; border: none; background: var(--background-primary);"`,
    `    allow="clipboard-read; clipboard-write"`,
    `    loading="lazy"`,
    `  ></iframe>`,
    '</div>',
    '',
    '---',
    '*Tip: Pin this note to your right or left sidebar dock, or open in a split pane (Ctrl/Cmd + Click) to audit and auto-fix your vault while writing!*',
  ].join('\n');

  // Custom Frames plugin config JSON
  const customFramesConfig = JSON.stringify(
    {
      url: currentAppUrl,
      displayName: 'Vault Auditor',
      icon: 'shield-check',
      hideOnMobile: false,
      zoomLevel: 1.0,
      customCss: '',
    },
    null,
    2
  );

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleDownloadNote = () => {
    const blob = new Blob([embedNoteContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Vault Health Auditor.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    handleCopy(embedNoteContent, 'downloaded');
  };

  const handleInjectIntoVault = () => {
    const entry: RawFileEntry = {
      path: '00 - Dashboards/Vault Health Auditor.md',
      name: 'Vault Health Auditor.md',
      content: embedNoteContent,
      isBinary: false,
      isConfigOrPlugin: false,
      size: embedNoteContent.length,
      lastModified: Date.now(),
    };
    onAddNoteToVault(entry);
    setInstalledSuccess(true);
  };

  return (
    <div
      id="obsidian-integration-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/60 backdrop-blur-xs"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#FFFFFF] border border-[#E5E5E1] rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E5E5E1] flex items-center justify-between bg-[#FAF9F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6366F1] text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-serif text-[#1A1A1A]">
                  Use Vault Auditor Inside Obsidian
                </h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]">
                  Native Integration
                </span>
              </div>
              <p className="text-xs text-[#5A5A57]">
                Embed the auditor directly in an Obsidian note, split pane, or sidebar ribbon
              </p>
            </div>
          </div>
          <button
            id="close-obsidian-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8C8C88] hover:text-[#1A1A1A] rounded-lg hover:bg-[#F0F0ED] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Integration Methods Navigation */}
        <div className="flex border-b border-[#E5E5E1] bg-[#FCFCF9] px-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('embed-note')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeSubTab === 'embed-note'
                ? 'border-[#1A1A1A] text-[#1A1A1A]'
                : 'border-transparent text-[#8C8C88] hover:text-[#1A1A1A]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Method 1: Embedded Note (Recommended)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('custom-frames')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeSubTab === 'custom-frames'
                ? 'border-[#1A1A1A] text-[#1A1A1A]'
                : 'border-transparent text-[#8C8C88] hover:text-[#1A1A1A]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Method 2: Custom Frames Plugin</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('sidebar')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeSubTab === 'sidebar'
                ? 'border-[#1A1A1A] text-[#1A1A1A]'
                : 'border-transparent text-[#8C8C88] hover:text-[#1A1A1A]'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Method 3: Split Pane / Sidebar</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeSubTab === 'embed-note' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#166534] shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-[#14532D]">
                  <p className="font-bold">Zero-Plugin Setup</p>
                  <p className="leading-relaxed">
                    Obsidian natively renders HTML <code className="font-mono bg-[#DCFCE7] px-1 py-0.2 rounded text-[#166534]">&lt;iframe&gt;</code> blocks inside markdown notes. You can view, audit, and auto-fix your vault right inside your Obsidian window!
                  </p>
                </div>
              </div>

              {/* 1-Click Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  id="btn-inject-embed-note"
                  type="button"
                  onClick={handleInjectIntoVault}
                  disabled={installedSuccess}
                  className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    installedSuccess
                      ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#166534]'
                      : 'bg-[#1A1A1A] hover:bg-[#333330] border-[#1A1A1A] text-[#FFFFFF] shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {installedSuccess ? (
                      <Check className="w-4 h-4 text-[#166534]" />
                    ) : (
                      <PlusCircle className="w-4 h-4 text-amber-300" />
                    )}
                    <div>
                      <div className="text-xs font-bold font-serif">
                        {installedSuccess ? 'Added to Loaded Vault!' : 'Add to Active Vault'}
                      </div>
                      <div className={`text-[10px] ${installedSuccess ? 'text-[#166534]' : 'text-[#A3A3A0]'}`}>
                        Creates <code className="font-mono">00 - Dashboards/Vault Health Auditor.md</code>
                      </div>
                    </div>
                  </div>
                  {installedSuccess && (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534] font-bold">
                      Saved
                    </span>
                  )}
                </button>

                <button
                  id="btn-download-embed-note"
                  type="button"
                  onClick={handleDownloadNote}
                  className="p-3.5 rounded-xl border border-[#E5E5E1] bg-[#FFFFFF] hover:bg-[#F7F7F4] text-[#1A1A1A] text-left flex items-center justify-between transition-all cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-[#6366F1]" />
                    <div>
                      <div className="text-xs font-bold font-serif">Download .md Note</div>
                      <div className="text-[10px] text-[#8C8C88]">Drag & drop into Obsidian file tree</div>
                    </div>
                  </div>
                  {copiedType === 'downloaded' && (
                    <span className="text-[10px] text-[#166534] font-bold font-mono">Downloaded!</span>
                  )}
                </button>
              </div>

              {/* Note Preview Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#5A5A57] uppercase tracking-wider">
                    Note Content (<code className="font-mono">Vault Health Auditor.md</code>)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(embedNoteContent, 'note')}
                    className="inline-flex items-center gap-1.5 text-xs text-[#6366F1] hover:text-[#4F46E5] font-semibold cursor-pointer"
                  >
                    {copiedType === 'note' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied Markdown!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Markdown</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-[#1E1E1E] text-[#E0E0E0] text-[11px] font-mono overflow-x-auto max-h-48 leading-relaxed border border-[#333330]">
                  {embedNoteContent}
                </pre>
              </div>
            </div>
          )}

          {activeSubTab === 'custom-frames' && (
            <div className="space-y-4 text-xs text-[#5A5A57]">
              <p className="leading-relaxed">
                If you use the community plugin <strong className="text-[#1A1A1A]">Custom Frames</strong> in Obsidian, you can add Vault Auditor as a native sidebar icon on your Obsidian ribbon.
              </p>

              <ol className="list-decimal pl-4 space-y-2 leading-relaxed">
                <li>Install and enable the <strong>Custom Frames</strong> community plugin from Obsidian Settings.</li>
                <li>Go to <strong>Settings → Custom Frames → Add Frame</strong>.</li>
                <li>Paste the URL below into the <strong>Frame URL</strong> setting:</li>
              </ol>

              <div className="p-3 rounded-xl bg-[#F7F7F4] border border-[#E5E5E1] flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-[#1A1A1A] truncate select-all">{currentAppUrl}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(currentAppUrl, 'url')}
                  className="px-3 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#333330] text-[#FFFFFF] text-xs font-semibold shrink-0 cursor-pointer"
                >
                  {copiedType === 'url' ? 'Copied URL!' : 'Copy URL'}
                </button>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">
                    Custom Frames Config JSON
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(customFramesConfig, 'json')}
                    className="text-xs text-[#6366F1] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedType === 'json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Config</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-[#1E1E1E] text-[#E0E0E0] text-[11px] font-mono">
                  {customFramesConfig}
                </pre>
              </div>
            </div>
          )}

          {activeSubTab === 'sidebar' && (
            <div className="space-y-4 text-xs text-[#5A5A57]">
              <div className="p-4 rounded-xl bg-[#F7F7F4] border border-[#E5E5E1] space-y-2">
                <h4 className="font-bold text-[#1A1A1A] font-serif">Pin to Obsidian Sidebar Layout</h4>
                <p className="leading-relaxed">
                  Once you add the <code className="font-mono bg-[#FFFFFF] px-1 py-0.5 rounded border border-[#E5E5E1]">Vault Health Auditor.md</code> note into your vault:
                </p>
                <ul className="list-disc pl-4 space-y-1.5 text-[#5A5A57]">
                  <li>Open the note in Obsidian.</li>
                  <li>Click and drag the note's tab to the <strong>Right Sidebar</strong> or <strong>Left Sidebar</strong> dock in Obsidian.</li>
                  <li>Click the three dots <code className="font-mono text-[10px] bg-white px-1 border rounded">...</code> on the tab header and select <strong>Pin</strong>.</li>
                  <li>Now you have an omnipresent Vault Health & Broken Link inspector right beside your active writing canvas!</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#4F46E5] shrink-0" />
                <p className="text-xs text-[#3730A3] leading-relaxed">
                  <strong>Full Local Privacy:</strong> The auditor runs 100% in your browser memory via WebAssembly/JS. No note text or private knowledge is ever sent to an external server.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#E5E5E1] bg-[#FAF9F5] flex items-center justify-between">
          <span className="text-xs text-[#8C8C88]">
            Vault: <strong className="text-[#1A1A1A]">{vaultName}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#333330] text-[#FFFFFF] text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
