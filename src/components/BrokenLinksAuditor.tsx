import React, { useState } from 'react';
import {
  AlertTriangle,
  FilePlus,
  Sparkles,
  Copy,
  Check,
  Image,
  FileText,
  Search,
  ExternalLink,
  CheckCircle2,
  Wand2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { BrokenLinkItem, VaultFile } from '../types';

interface BrokenLinksAuditorProps {
  brokenLinks: BrokenLinkItem[];
  files: VaultFile[];
  onSelectNote: (note: VaultFile) => void;
  onCreateStubNote: (noteTitle: string) => void;
  onReplaceLink?: (sourceId: string, oldTarget: string, newTarget: string) => void;
  onAutoFixAllBroken?: () => void;
  onCreateAllStubs?: () => void;
}

export const BrokenLinksAuditor: React.FC<BrokenLinksAuditorProps> = ({
  brokenLinks,
  files,
  onSelectNote,
  onCreateStubNote,
  onReplaceLink,
  onAutoFixAllBroken,
  onCreateAllStubs,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'notes' | 'embeds'>('all');
  const [search, setSearch] = useState('');
  const [copiedRaw, setCopiedRaw] = useState<string | null>(null);

  const filteredItems = brokenLinks.filter((item) => {
    if (filterType === 'notes' && item.isEmbed) return false;
    if (filterType === 'embeds' && !item.isEmbed) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.target.toLowerCase().includes(q) ||
        item.sourceTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const fuzzyCount = brokenLinks.filter((b) => !b.isEmbed && b.suggestedFix).length;
  const missingStubCount = brokenLinks.filter((b) => !b.isEmbed).length;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRaw(text);
    setTimeout(() => setCopiedRaw(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls & Auto-Fix Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C8C88]">
              Link Integrity Diagnostic
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]">
              {brokenLinks.length} missing
            </span>
          </div>
          <h3 className="text-xl font-serif font-bold text-[#1A1A1A]">
            Broken Links & Missing Targets
          </h3>
          <p className="text-xs text-[#5A5A57] mt-0.5 font-sans">
            Wikilinks and image embeds referencing targets that do not exist in this vault.
          </p>
        </div>

        {/* Global Batch Fix Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onAutoFixAllBroken && brokenLinks.length > 0 && (
            <button
              type="button"
              onClick={onAutoFixAllBroken}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#333330] text-[#FCFCF9] text-xs font-semibold shadow-xs cursor-pointer transition-all"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Auto-Fix All Links ({brokenLinks.length})</span>
            </button>
          )}

          {onCreateAllStubs && missingStubCount > 0 && (
            <button
              type="button"
              onClick={onCreateAllStubs}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#F7F7F4] hover:bg-[#E5E5E1] border border-[#E5E5E1] text-[#1A1A1A] text-xs font-medium cursor-pointer transition-all shadow-xs"
            >
              <FilePlus className="w-3.5 h-3.5 text-[#0369A1]" />
              <span>Create All Missing Stubs ({missingStubCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C88]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search broken target or note..."
              className="w-full bg-[#FFFFFF] border border-[#E5E5E1] rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-[#1A1A1A] placeholder:text-[#8C8C88] focus:outline-none focus:border-[#1A1A1A] shadow-xs"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-[#FFFFFF] border border-[#E5E5E1] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A] font-medium focus:outline-none focus:border-[#1A1A1A] shadow-xs cursor-pointer"
          >
            <option value="all">All Targets ({brokenLinks.length})</option>
            <option value="notes">
              Wikilinks only ({brokenLinks.filter((b) => !b.isEmbed).length})
            </option>
            <option value="embeds">
              Embeds only ({brokenLinks.filter((b) => b.isEmbed).length})
            </option>
          </select>
        </div>

        {fuzzyCount > 0 && (
          <span className="text-xs text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{fuzzyCount} links can be auto-repaired via fuzzy matching</span>
          </span>
        )}
      </div>

      {/* Results List */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-serif font-bold text-[#1A1A1A] mb-1">
            {brokenLinks.length === 0
              ? 'Zero Broken Links Detected'
              : 'No matching broken links'}
          </h4>
          <p className="text-xs text-[#5A5A57] max-w-sm mx-auto font-sans">
            {brokenLinks.length === 0
              ? 'All internal [[wikilinks]] and attachments in this vault resolve cleanly to existing notes.'
              : 'Try adjusting your search filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item, idx) => {
            const sourceFile = files.find((f) => f.id === item.sourceId);

            return (
              <div
                key={`${item.sourceId}-${item.target}-${idx}`}
                className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] hover:border-[#D6D6D2] transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xs"
              >
                {/* Left: Source Note & Target */}
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${
                        item.isEmbed
                          ? 'bg-[#F0F9FF] text-[#0369A1] border border-[#BAE6FD]'
                          : 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'
                      }`}
                    >
                      {item.isEmbed ? <Image className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                      <span>{item.isEmbed ? 'Missing Attachment' : 'Missing Note'}</span>
                    </span>

                    <code className="text-xs font-mono font-bold text-[#991B1B] bg-[#FEF2F2] px-2 py-0.5 rounded border border-[#FECACA]">
                      {item.raw}
                    </code>
                  </div>

                  <div className="text-xs text-[#5A5A57] flex items-center gap-1.5 flex-wrap">
                    <span>In source note:</span>
                    <button
                      type="button"
                      onClick={() => sourceFile && onSelectNote(sourceFile)}
                      className="font-semibold text-[#1A1A1A] hover:underline cursor-pointer font-serif"
                    >
                      {item.sourceTitle}
                    </button>
                    <span className="text-[#8C8C88]">•</span>
                    <span className="font-mono text-[#8C8C88] text-[11px]">Line {item.line}</span>
                  </div>

                  {/* Fuzzy Match Suggestion */}
                  {item.suggestedFix && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F7F7F4] border border-[#E5E5E1] text-xs text-[#1A1A1A]">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>
                          Did you mean: <strong className="font-mono font-semibold text-[#1A1A1A]">[[{item.suggestedFix}]]</strong>?
                        </span>
                      </div>

                      {onReplaceLink && (
                        <button
                          type="button"
                          onClick={() => onReplaceLink(item.sourceId, item.target, item.suggestedFix!)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] text-xs font-semibold cursor-pointer shadow-2xs transition-all"
                        >
                          <Wand2 className="w-3 h-3" />
                          <span>Auto-Replace with [[{item.suggestedFix}]]</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Quick Fix Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {!item.isEmbed && (
                    <button
                      type="button"
                      onClick={() => onCreateStubNote(item.target)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#166534] hover:bg-[#14532D] text-[#FFFFFF] text-xs font-semibold cursor-pointer shadow-xs transition-all"
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                      <span>Create Stub</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopy(item.raw)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#F7F7F4] hover:bg-[#E5E5E1] border border-[#E5E5E1] text-[#1A1A1A] text-xs font-medium cursor-pointer transition-all"
                    title="Copy wikilink"
                  >
                    {copiedRaw === item.raw ? (
                      <Check className="w-3.5 h-3.5 text-[#166534]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[#5A5A57]" />
                    )}
                    <span>{copiedRaw === item.raw ? 'Copied' : 'Copy'}</span>
                  </button>

                  {sourceFile && (
                    <button
                      type="button"
                      onClick={() => onSelectNote(sourceFile)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#1A1A1A] hover:bg-[#333330] text-[#FCFCF9] text-xs font-medium cursor-pointer shadow-xs transition-all"
                    >
                      <span>Inspect</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
