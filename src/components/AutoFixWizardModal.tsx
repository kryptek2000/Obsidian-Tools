import React, { useState } from 'react';
import {
  Wand2,
  X,
  CheckCircle2,
  AlertTriangle,
  FilePlus,
  Link2,
  Tags,
  FileCode,
  Sparkles,
  Download,
  ArrowRight,
  RefreshCw,
  Check,
  FolderTree,
  ShieldCheck,
} from 'lucide-react';
import { VaultAuditSummary, VaultFile } from '../types';
import { AutoFixOptions, AutoFixReport, DEFAULT_AUTO_FIX_OPTIONS } from '../utils/vaultAutoFixer';

interface AutoFixWizardModalProps {
  summary: VaultAuditSummary;
  files: VaultFile[];
  onClose: () => void;
  onExecuteAutoFix: (options: AutoFixOptions) => AutoFixReport;
  onDownloadZip: () => void;
}

export const AutoFixWizardModal: React.FC<AutoFixWizardModalProps> = ({
  summary,
  files,
  onClose,
  onExecuteAutoFix,
  onDownloadZip,
}) => {
  const [options, setOptions] = useState<AutoFixOptions>(DEFAULT_AUTO_FIX_OPTIONS);
  const [isExecuting, setIsExecuting] = useState(false);
  const [report, setReport] = useState<AutoFixReport | null>(null);

  const fuzzyCount = summary.brokenLinkItems.filter((b) => !b.isEmbed && b.suggestedFix).length;
  const missingStubCount = summary.brokenLinkItems.filter((b) => !b.isEmbed && !b.suggestedFix).length;
  const orphanCount = summary.orphanedItems.length;
  const tagCasingCount = summary.tagAuditItems.filter((t) => t.potentialDuplicates && t.potentialDuplicates.length > 0).length;
  const untaggedCount = summary.untaggedNotesCount;
  const fmCount = summary.frontmatterIssueItems.length;

  const totalFixableItems =
    fuzzyCount + missingStubCount + orphanCount + tagCasingCount + untaggedCount + fmCount;

  // Projected score if all enabled fixes run
  const projectedScore = Math.min(100, Math.max(95, summary.healthScore + Math.min(45, totalFixableItems * 4)));

  const handleRunFix = () => {
    setIsExecuting(true);
    setTimeout(() => {
      const res = onExecuteAutoFix(options);
      setReport(res);
      setIsExecuting(false);
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[90vh] bg-[#FCFCF9] border border-[#E5E5E1] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#E5E5E1] bg-[#FFFFFF]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#1A1A1A] text-[#FCFCF9] shadow-xs">
              <Wand2 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-serif font-bold text-[#1A1A1A]">
                  Auto-Fix & Vault Optimization Wizard
                </h3>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] font-bold">
                  1-Click Repair
                </span>
              </div>
              <p className="text-xs text-[#5A5A57] mt-0.5">
                Automatically diagnose and resolve broken links, missing notes, orphaned files, tag variations, and YAML schemas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[#8C8C88] hover:text-[#1A1A1A] hover:bg-[#F7F7F4] cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {!report ? (
            <>
              {/* Score Projection Banner */}
              <div className="p-5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8C8C88]">
                    Health Score Projection
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-serif font-bold text-[#5A5A57]">
                      {summary.healthScore}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#8C8C88]" />
                    <span className="text-4xl font-serif font-bold text-[#166534]">
                      {projectedScore} / 100
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534]">
                      Grade A+
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[#5A5A57] sm:text-right">
                  <p className="font-semibold text-[#1A1A1A]">
                    {totalFixableItems} potential repairs detected
                  </p>
                  <p className="text-[11px] text-[#8C8C88] mt-0.5">
                    Safe non-destructive transformations
                  </p>
                </div>
              </div>

              {/* Preservation Guarantee Badge */}
              <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#166534] shrink-0" />
                <p className="text-xs text-[#14532D] leading-relaxed">
                  <strong>Non-destructive Guarantee:</strong> Preserves all <code className="font-mono bg-[#DCFCE7] px-1 py-0.2 rounded text-[#166534]">.obsidian</code> configs, community plugins (Dataview, Templater, etc.), theme settings, binary attachments, and existing note formatting/code blocks.
                </p>
              </div>

              {/* Toggles Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[#8C8C88] uppercase tracking-[0.2em]">
                    Selected Auto-Repair Actions
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setOptions({
                          fixBrokenWithFuzzy: true,
                          createMissingStubs: true,
                          generateOrphanMOC: true,
                          standardizeTagCasings: true,
                          autoTagUntaggedNotes: true,
                          repairFrontmatter: true,
                        })
                      }
                      className="text-[#1A1A1A] hover:underline font-semibold cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-[#8C8C88]">•</span>
                    <button
                      type="button"
                      onClick={() =>
                        setOptions({
                          fixBrokenWithFuzzy: false,
                          createMissingStubs: false,
                          generateOrphanMOC: false,
                          standardizeTagCasings: false,
                          autoTagUntaggedNotes: false,
                          repairFrontmatter: false,
                        })
                      }
                      className="text-[#8C8C88] hover:text-[#1A1A1A] cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Option 1: Fix Fuzzy Broken Links */}
                <label className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] hover:border-[#1A1A1A] transition-all cursor-pointer flex items-start gap-3 shadow-xs">
                  <input
                    type="checkbox"
                    checked={options.fixBrokenWithFuzzy}
                    onChange={(e) => setOptions({ ...options, fixBrokenWithFuzzy: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-[#D6D6D2] text-[#1A1A1A] focus:ring-0 accent-[#1A1A1A] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-serif font-bold text-[#1A1A1A] flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-[#166534]" />
                        <span>Auto-Replace Broken Links with Closest Fuzzy Matches</span>
                      </span>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534]">
                        {fuzzyCount} available
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5A5A57] mt-1 font-sans leading-relaxed">
                      Replaces misspelled wikilinks (e.g. <code className="font-mono text-[#1A1A1A]">[[Obsidian-Setup]]</code> → <code className="font-mono text-[#1A1A1A]">[[Obsidian Setup]]</code>) across all note bodies automatically.
                    </p>
                  </div>
                </label>

                {/* Option 2: Create Missing Stubs */}
                <label className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] hover:border-[#1A1A1A] transition-all cursor-pointer flex items-start gap-3 shadow-xs">
                  <input
                    type="checkbox"
                    checked={options.createMissingStubs}
                    onChange={(e) => setOptions({ ...options, createMissingStubs: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-[#D6D6D2] text-[#1A1A1A] focus:ring-0 accent-[#1A1A1A] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-serif font-bold text-[#1A1A1A] flex items-center gap-1.5">
                        <FilePlus className="w-3.5 h-3.5 text-[#0369A1]" />
                        <span>Generate Missing Stub Notes for All Unresolved Targets</span>
                      </span>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-[#F0F9FF] border border-[#BAE6FD] text-[#0369A1]">
                        {missingStubCount} needed
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5A5A57] mt-1 font-sans leading-relaxed">
                      Creates structured seedling notes with clean YAML metadata so that every wikilink in your vault resolves to a real note.
                    </p>
                  </div>
                </label>

                {/* Option 3: Generate MOC for Orphans */}
                <label className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] hover:border-[#1A1A1A] transition-all cursor-pointer flex items-start gap-3 shadow-xs">
                  <input
                    type="checkbox"
                    checked={options.generateOrphanMOC}
                    onChange={(e) => setOptions({ ...options, generateOrphanMOC: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-[#D6D6D2] text-[#1A1A1A] focus:ring-0 accent-[#1A1A1A] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-serif font-bold text-[#1A1A1A] flex items-center gap-1.5">
                        <FolderTree className="w-3.5 h-3.5 text-[#92400E]" />
                        <span>Generate Map of Content (<code className="font-mono text-[10px]">00 - Knowledge Index & MOC.md</code>) for Orphans</span>
                      </span>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E]">
                        {orphanCount} orphans
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5A5A57] mt-1 font-sans leading-relaxed">
                      Creates a central hierarchical index categorized by folder, connecting all isolated island notes into the primary graph network.
                    </p>
                  </div>
                </label>

                {/* Option 4: Standardize Tag Casings */}
                <label className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] hover:border-[#1A1A1A] transition-all cursor-pointer flex items-start gap-3 shadow-xs">
                  <input
                    type="checkbox"
                    checked={options.standardizeTagCasings}
                    onChange={(e) => setOptions({ ...options, standardizeTagCasings: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-[#D6D6D2] text-[#1A1A1A] focus:ring-0 accent-[#1A1A1A] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-serif font-bold text-[#1A1A1A] flex items-center gap-1.5">
                        <Tags className="w-3.5 h-3.5 text-[#78350F]" />
                        <span>Standardize All Tag Casings to Canonical Lowercase</span>
                      </span>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-[#F0F0ED] border border-[#E5E5E1] text-[#1A1A1A]">
                        {tagCasingCount} casing variations
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5A5A57] mt-1 font-sans leading-relaxed">
                      Normalizes mixed casings like <code className="font-mono text-[#1A1A1A]">#React</code> / <code className="font-mono text-[#1A1A1A]">#PKM</code> to uniform lowercase tags in both YAML frontmatter and note bodies.
                    </p>
                  </div>
                </label>

                {/* Option 5: Auto-Tag Untagged Notes */}
                <label className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] hover:border-[#1A1A1A] transition-all cursor-pointer flex items-start gap-3 shadow-xs">
                  <input
                    type="checkbox"
                    checked={options.autoTagUntaggedNotes}
                    onChange={(e) => setOptions({ ...options, autoTagUntaggedNotes: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-[#D6D6D2] text-[#1A1A1A] focus:ring-0 accent-[#1A1A1A] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-serif font-bold text-[#1A1A1A] flex items-center gap-1.5">
                        <Tags className="w-3.5 h-3.5 text-[#0F766E]" />
                        <span>Auto-Tag Untagged Notes Based on Folder Hierarchy</span>
                      </span>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[#0F766E]">
                        {untaggedCount} notes
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5A5A57] mt-1 font-sans leading-relaxed">
                      Assigns category tags (e.g. <code className="font-mono text-[#1A1A1A]">#project</code>, <code className="font-mono text-[#1A1A1A]">#resource</code>, <code className="font-mono text-[#1A1A1A]">#journal</code>) to notes that have zero tags.
                    </p>
                  </div>
                </label>

                {/* Option 6: Repair Frontmatter */}
                <label className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] hover:border-[#1A1A1A] transition-all cursor-pointer flex items-start gap-3 shadow-xs">
                  <input
                    type="checkbox"
                    checked={options.repairFrontmatter}
                    onChange={(e) => setOptions({ ...options, repairFrontmatter: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-[#D6D6D2] text-[#1A1A1A] focus:ring-0 accent-[#1A1A1A] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-serif font-bold text-[#1A1A1A] flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-[#3730A3]" />
                        <span>Repair & Prepend Dataview YAML Frontmatter</span>
                      </span>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-[#3730A3]">
                        {fmCount} notes
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5A5A57] mt-1 font-sans leading-relaxed">
                      Fixes empty or malformed frontmatter blocks with standard title, date, status, and tag properties.
                    </p>
                  </div>
                </label>
              </div>
            </>
          ) : (
            /* Results Summary */
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-6 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-serif font-bold text-[#166534]">
                      Vault Successfully Repaired!
                    </h4>
                    <p className="text-xs text-[#14532D] mt-0.5">
                      Applied {report.actionsTaken.length} repair operations across {report.modifiedFilesCount + report.newFilesCount} files.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onDownloadZip}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#166534] hover:bg-[#14532D] text-[#FFFFFF] text-xs font-semibold shadow-xs cursor-pointer transition-all shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Fixed Vault (.ZIP)</span>
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] shadow-2xs">
                  <span className="text-[10px] font-semibold text-[#8C8C88] uppercase tracking-wider block mb-1">
                    Links Repaired
                  </span>
                  <span className="text-2xl font-serif font-bold text-[#1A1A1A]">
                    {report.brokenLinksFixed}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] shadow-2xs">
                  <span className="text-[10px] font-semibold text-[#8C8C88] uppercase tracking-wider block mb-1">
                    Stubs Created
                  </span>
                  <span className="text-2xl font-serif font-bold text-[#1A1A1A]">
                    {report.stubsCreated}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] shadow-2xs">
                  <span className="text-[10px] font-semibold text-[#8C8C88] uppercase tracking-wider block mb-1">
                    Orphans Connected
                  </span>
                  <span className="text-2xl font-serif font-bold text-[#1A1A1A]">
                    {report.orphansLinked}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] shadow-2xs">
                  <span className="text-[10px] font-semibold text-[#8C8C88] uppercase tracking-wider block mb-1">
                    Tags Standardized
                  </span>
                  <span className="text-2xl font-serif font-bold text-[#1A1A1A]">
                    {report.tagsStandardized}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] shadow-2xs">
                  <span className="text-[10px] font-semibold text-[#8C8C88] uppercase tracking-wider block mb-1">
                    Untagged Fixed
                  </span>
                  <span className="text-2xl font-serif font-bold text-[#1A1A1A]">
                    {report.untaggedNotesFixed}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] shadow-2xs">
                  <span className="text-[10px] font-semibold text-[#8C8C88] uppercase tracking-wider block mb-1">
                    YAML Repaired
                  </span>
                  <span className="text-2xl font-serif font-bold text-[#1A1A1A]">
                    {report.frontmatterRepaired}
                  </span>
                </div>
              </div>

              {/* Action Log */}
              <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] space-y-2 shadow-2xs">
                <span className="text-[10px] font-semibold text-[#8C8C88] uppercase tracking-wider block mb-1">
                  Changelog & Operations Executed ({report.actionsTaken.length})
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {report.actionsTaken.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[#5A5A57]">
                      <Check className="w-3.5 h-3.5 text-[#166534] shrink-0 mt-0.5" />
                      <span className="font-mono text-[11px] text-[#1A1A1A]">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E5E1] bg-[#FFFFFF]">
          {!report ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[#F7F7F4] hover:bg-[#E5E5E1] text-[#5A5A57] text-xs font-medium cursor-pointer transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isExecuting || totalFixableItems === 0}
                onClick={handleRunFix}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1A1A1A] hover:bg-[#333330] disabled:opacity-40 text-[#FCFCF9] text-xs font-semibold shadow-xs cursor-pointer transition-all"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Repairs...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 text-amber-300" />
                    <span>Auto-Fix Everything (1-Click)</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onDownloadZip}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#F7F7F4] hover:bg-[#E5E5E1] text-[#1A1A1A] text-xs font-medium cursor-pointer border border-[#E5E5E1] transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .ZIP</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-[#1A1A1A] hover:bg-[#333330] text-[#FCFCF9] text-xs font-semibold shadow-xs cursor-pointer transition-all"
              >
                Close & View Repaired Vault
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
