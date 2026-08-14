import React, { useState, useRef } from 'react';
import {
  FolderOpen,
  Upload,
  Sparkles,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Network,
  Tag,
  CheckCircle2,
  Lock,
  BookOpen,
} from 'lucide-react';
import { RawFileEntry } from '../utils/vaultParser';
import { readDirectoryHandle, readFileList } from '../utils/fileSystemHelper';
import { SAMPLE_VAULT_FILES } from '../data/sampleVault';

interface VaultUploaderProps {
  onVaultLoaded: (files: RawFileEntry[], vaultName: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const VaultUploader: React.FC<VaultUploaderProps> = ({
  onVaultLoaded,
  isLoading,
  setIsLoading,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [loadStatus, setLoadStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modern File System Access API with iframe / cross-origin fallback
  const handleOpenLocalFolder = async () => {
    // Cross-origin subframes / iframes are not allowed to call showDirectoryPicker by browser security policy
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

    if (isInIframe || !('showDirectoryPicker' in window)) {
      // Direct standard folder picker via HTML5 input webkitdirectory
      fileInputRef.current?.click();
      return;
    }

    try {
      setIsLoading(true);
      setLoadStatus('Requesting folder access...');
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'read',
      });
      setLoadStatus(`Scanning "${dirHandle.name}" vault...`);
      const entries = await readDirectoryHandle(dirHandle);
      if (entries.length === 0) {
        alert('No markdown or readable files found in the selected folder.');
        setIsLoading(false);
        return;
      }
      onVaultLoaded(entries, dirHandle.name);
    } catch (err: any) {
      setIsLoading(false);
      if (err.name === 'AbortError') {
        // User closed or cancelled the dialog
        return;
      }
      // Graceful fallback to file input if showDirectoryPicker throws
      fileInputRef.current?.click();
    }
  };

  const handleStandardFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsLoading(true);
    setLoadStatus('Parsing files from selected folder...');
    try {
      const files = await readFileList(e.target.files);
      const firstPath = (e.target.files[0] as any).webkitRelativePath || '';
      const vaultName = firstPath.split('/')[0] || 'My Obsidian Vault';
      onVaultLoaded(files, vaultName);
    } catch (err) {
      console.error(err);
      alert('Error parsing uploaded files. Please check the files and retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setIsLoading(true);
      setLoadStatus('Parsing dropped vault files...');
      try {
        const files = await readFileList(e.dataTransfer.files);
        onVaultLoaded(files, 'Dropped Obsidian Vault');
      } catch (err) {
        console.error(err);
        alert('Failed to read dropped files.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLoadSampleVault = () => {
    setIsLoading(true);
    setLoadStatus('Loading interactive sample vault...');
    setTimeout(() => {
      onVaultLoaded(SAMPLE_VAULT_FILES, 'Second Brain Demo Vault');
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Hidden standard folder input fallback */}
      <input
        ref={fileInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
        onChange={handleStandardFileInput}
      />

      {/* Hero Title & Value Proposition */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0F0ED] border border-[#E5E5E1] text-[#5A5A57] text-[11px] uppercase tracking-[0.2em] font-semibold mb-4">
          <BookOpen className="w-3.5 h-3.5 text-[#1A1A1A]" />
          <span>Local & Private • 100% Client-Side Ingestion</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#1A1A1A] mb-3">
          Check Your <span className="italic font-serif">Obsidian Vault</span>
        </h1>
        <p className="text-[#5A5A57] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-sans">
          Instantly audit broken internal <code className="text-[#1A1A1A] bg-[#F0F0ED] border border-[#E5E5E1] px-1.5 py-0.5 rounded text-xs font-mono">[[wikilinks]]</code>,
          detect orphaned notes, validate YAML frontmatter, inspect tag hierarchies, and explore an interactive knowledge graph.
        </p>
      </div>

      {/* Main Upload Dropzone */}
      <div
        id="vault-dropzone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-200 ${
          dragActive
            ? 'border-[#1A1A1A] bg-[#F0F0ED] scale-[1.01]'
            : 'border-[#D6D6D2] bg-[#F7F7F4] hover:border-[#1A1A1A] hover:bg-[#F0F0ED]/70'
        }`}
      >
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-3 border-[#D6D6D2] border-t-[#1A1A1A] rounded-full animate-spin" />
            <p className="text-[#1A1A1A] font-semibold text-sm">{loadStatus || 'Analyzing vault...'}</p>
            <p className="text-xs text-[#8C8C88]">Parsing markdown files, resolving backlinks, and calculating graph metrics</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-xl bg-[#1A1A1A] text-[#FCFCF9] flex items-center justify-center mb-4 shadow-sm">
              <FolderOpen className="w-7 h-7" />
            </div>

            <h3 className="text-2xl font-serif font-bold text-[#1A1A1A] mb-2">
              Select your Obsidian Vault folder
            </h3>
            <p className="text-[#5A5A57] text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
              Pick your local vault directory. Your files stay securely in your browser and are never uploaded to any external server.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
              <button
                id="btn-open-vault-folder"
                type="button"
                onClick={handleOpenLocalFolder}
                className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#1A1A1A] hover:bg-[#333330] text-[#FCFCF9] font-medium text-xs sm:text-sm transition-all shadow-xs cursor-pointer active:scale-[0.98]"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Open Local Vault Folder</span>
              </button>

              <button
                id="btn-load-sample-vault"
                type="button"
                onClick={handleLoadSampleVault}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#FFFFFF] hover:bg-[#F7F7F4] border border-[#E5E5E1] text-[#1A1A1A] font-medium text-xs sm:text-sm transition-all cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Try Demo Vault</span>
              </button>
            </div>

            <div className="mt-4 text-xs text-[#8C8C88] flex items-center gap-1.5 font-sans">
              <Upload className="w-3.5 h-3.5" />
              <span>Or drag and drop your vault folder / markdown files directly here</span>
            </div>
          </div>
        )}
      </div>

      {/* Feature Capabilities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] flex items-start gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-[#FEF2F2] text-[#991B1B] shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1A1A1A]">Broken Links Audit</h4>
            <p className="text-[11px] text-[#5A5A57] mt-0.5 leading-relaxed font-sans">
              Find missing wikilinks and broken image embeds with fuzzy match suggestions.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] flex items-start gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-[#FEF3C7] text-[#92400E] shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1A1A1A]">Orphan Detection</h4>
            <p className="text-[11px] text-[#5A5A57] mt-0.5 leading-relaxed font-sans">
              Uncover dead-end and isolated notes disconnected from your knowledge graph.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] flex items-start gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-[#F0FDF4] text-[#166534] shrink-0">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1A1A1A]">Interactive Graph</h4>
            <p className="text-[11px] text-[#5A5A57] mt-0.5 leading-relaxed font-sans">
              Force-directed 2D network map with cluster coloring and node inspection.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] flex items-start gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-[#EEF2FF] text-[#3730A3] shrink-0">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1A1A1A]">Tags & YAML Lint</h4>
            <p className="text-[11px] text-[#5A5A57] mt-0.5 leading-relaxed font-sans">
              Verify frontmatter syntax and clean up tag inconsistencies and casing typos.
            </p>
          </div>
        </div>
      </div>

      {/* Security & Privacy Notice */}
      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#8C8C88]">
        <Lock className="w-3.5 h-3.5 text-[#5A5A57]" />
        <span>Your notes never leave your computer. Analysis runs entirely within your browser session.</span>
      </div>
    </div>
  );
};
