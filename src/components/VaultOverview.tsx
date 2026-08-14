import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  FileQuestion,
  Tags,
  FileCode,
  ArrowRight,
  TrendingUp,
  Image,
  Sparkles,
  Link2,
  CheckCircle,
  FileText,
  BookOpen,
  Wand2,
  Download,
  FolderTree,
  ShieldCheck,
} from 'lucide-react';
import { ActiveTab, VaultAuditSummary, VaultFile } from '../types';

interface VaultOverviewProps {
  summary: VaultAuditSummary;
  files: VaultFile[];
  setActiveTab: (tab: ActiveTab) => void;
  onSelectNote: (note: VaultFile) => void;
  onOpenAutoFixWizard?: () => void;
  onOpenObsidianModal?: () => void;
  onDownloadZip?: () => void;
}

export const VaultOverview: React.FC<VaultOverviewProps> = ({
  summary,
  files,
  setActiveTab,
  onSelectNote,
  onOpenAutoFixWizard,
  onOpenObsidianModal,
  onDownloadZip,
}) => {
  const notes = files.filter((f) => !f.isAttachment);

  // Top 5 Hub notes (highest backlink count)
  const topHubNotes = [...notes]
    .sort((a, b) => b.backlinks.length - a.backlinks.length)
    .slice(0, 5);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-[#166534]';
    if (score >= 75) return 'text-[#0369A1]';
    if (score >= 60) return 'text-[#92400E]';
    return 'text-[#991B1B]';
  };

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-[#166534]';
    if (score >= 75) return 'bg-[#0369A1]';
    if (score >= 60) return 'bg-[#92400E]';
    return 'bg-[#991B1B]';
  };

  const totalFixableIssues =
    summary.brokenLinksCount +
    summary.brokenAttachmentsCount +
    summary.orphanedNotesCount +
    summary.frontmatterIssuesCount;

  return (
    <div className="space-y-8">
      {/* Auto-Fix Magic Callout Banner */}
      {totalFixableIssues > 0 && onOpenAutoFixWizard && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2A] text-[#FCFCF9] border border-[#333330] flex flex-col md:flex-row md:items-center md:justify-between gap-5 shadow-lg relative overflow-hidden">
          <div className="relative z-10 space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                1-Click Vault Repair Available
              </span>
              <span className="text-xs text-[#D6D6D2] font-mono">
                {totalFixableIssues} issues detected
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#FCFCF9] tracking-tight">
              Auto-Fix & Optimize Your Entire Vault
            </h3>
            <p className="text-xs text-[#D6D6D2] leading-relaxed font-sans">
              Automatically resolve broken wikilinks with fuzzy matches, generate missing stub notes, connect isolated orphans into a structured Map of Content, standardize tag casings, and repair YAML schemas.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={onOpenAutoFixWizard}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#FCFCF9] hover:bg-[#FFFFFF] text-[#1A1A1A] text-xs font-bold shadow-md cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Wand2 className="w-4 h-4 text-amber-600" />
              <span>Launch Auto-Fix Wizard</span>
            </button>

            {onDownloadZip && (
              <button
                type="button"
                onClick={onDownloadZip}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-[#333330] hover:bg-[#4A4A47] text-[#FCFCF9] text-xs font-medium border border-[#4A4A47] cursor-pointer transition-all"
              >
                <Download className="w-4 h-4 text-[#D6D6D2]" />
                <span>Export Vault (.ZIP)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Banner: Health Score & Diagnostic Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score Card */}
        <div className="lg:col-span-1 p-6 sm:p-7 rounded-xl bg-[#F7F7F4] border border-[#E5E5E1] flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C8C88]">
                Vault Health Index
              </span>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  summary.grade === 'A+' || summary.grade === 'A'
                    ? 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]'
                    : summary.grade === 'B'
                    ? 'bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]'
                    : summary.grade === 'C'
                    ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                    : 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                }`}
              >
                Grade {summary.grade}
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className={`text-6xl font-serif font-bold tracking-tight ${getScoreColor(summary.healthScore)}`}>
                {summary.healthScore}
              </span>
              <span className="text-[#8C8C88] font-serif text-2xl">/100</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#E5E5E1] rounded-full h-2 my-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                  summary.healthScore
                )}`}
                style={{ width: `${summary.healthScore}%` }}
              />
            </div>

            <p className="text-xs text-[#5A5A57] leading-relaxed italic border-l-2 border-[#1A1A1A] pl-3 py-0.5 my-3">
              {summary.healthScore >= 90
                ? 'Your Obsidian vault demonstrates pristine link integrity and dense associative structure.'
                : summary.healthScore >= 75
                ? 'Good structural foundation with minor broken links or orphan notes to clean up.'
                : 'Several broken wikilinks and disconnected notes were detected that impact graph connectivity.'}
            </p>
          </div>

          {/* Mini breakdown penalties */}
          <div className="grid grid-cols-2 gap-2 text-xs border-t border-[#E5E5E1] pt-3 mt-3">
            <div className="flex items-center justify-between text-[#8C8C88]">
              <span>Broken Links</span>
              <span className={summary.brokenLinksCount > 0 ? 'text-[#991B1B] font-semibold' : 'text-[#5A5A57]'}>
                {summary.brokenLinksCount > 0 ? `-${summary.brokenLinksCount * 2} pts` : '0'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#8C8C88]">
              <span>Orphans</span>
              <span className={summary.orphanedNotesCount > 0 ? 'text-[#92400E] font-semibold' : 'text-[#5A5A57]'}>
                {summary.orphanedNotesCount > 0 ? `-${summary.orphanedNotesCount * 2} pts` : '0'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Diagnostic Metrics Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Total Notes */}
          <div className="p-5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-[#8C8C88] mb-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">Total Notes</span>
              <FileText className="w-4 h-4 text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-3xl font-serif font-bold text-[#1A1A1A]">{summary.totalNotes}</div>
              <div className="text-[11px] text-[#8C8C88] mt-1 font-sans">
                {summary.totalWords.toLocaleString()} words total
              </div>
            </div>
          </div>

          {/* Broken Links Card */}
          <div
            onClick={() => setActiveTab('broken-links')}
            className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between shadow-xs ${
              summary.brokenLinksCount > 0
                ? 'bg-[#FFFFFF] border-[#E5E5E1] hover:border-[#991B1B]'
                : 'bg-[#FFFFFF] border-[#E5E5E1] hover:border-[#1A1A1A]'
            }`}
          >
            <div className="flex items-center justify-between text-[#8C8C88] mb-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">Broken Links</span>
              <span
                className={`p-1.5 rounded-md ${
                  summary.brokenLinksCount > 0 ? 'bg-[#FEF2F2] text-[#991B1B]' : 'bg-[#F0FDF4] text-[#166534]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
            </div>
            <div>
              <div
                className={`text-3xl font-serif font-bold ${
                  summary.brokenLinksCount > 0 ? 'text-[#991B1B]' : 'text-[#166534]'
                }`}
              >
                {summary.brokenLinksCount}
              </div>
              <div className="text-[11px] text-[#5A5A57] flex items-center gap-1 mt-1 font-medium">
                <span>Review & Fix</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Orphaned Notes Card */}
          <div
            onClick={() => setActiveTab('orphans')}
            className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between shadow-xs ${
              summary.orphanedNotesCount > 0
                ? 'bg-[#FFFFFF] border-[#E5E5E1] hover:border-[#92400E]'
                : 'bg-[#FFFFFF] border-[#E5E5E1] hover:border-[#1A1A1A]'
            }`}
          >
            <div className="flex items-center justify-between text-[#8C8C88] mb-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">Orphan Notes</span>
              <span
                className={`p-1.5 rounded-md ${
                  summary.orphanedNotesCount > 0 ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#F0FDF4] text-[#166534]'
                }`}
              >
                <FileQuestion className="w-3.5 h-3.5" />
              </span>
            </div>
            <div>
              <div
                className={`text-3xl font-serif font-bold ${
                  summary.orphanedNotesCount > 0 ? 'text-[#92400E]' : 'text-[#166534]'
                }`}
              >
                {summary.orphanedNotesCount}
              </div>
              <div className="text-[11px] text-[#5A5A57] flex items-center gap-1 mt-1 font-medium">
                <span>Connect with MOC</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div
            onClick={() => setActiveTab('tags')}
            className="p-5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] hover:border-[#1A1A1A] transition-all cursor-pointer flex flex-col justify-between shadow-xs"
          >
            <div className="flex items-center justify-between text-[#8C8C88] mb-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">Unique Tags</span>
              <span className="p-1.5 rounded-md bg-[#F0F0ED] text-[#1A1A1A]">
                <Tags className="w-3.5 h-3.5" />
              </span>
            </div>
            <div>
              <div className="text-3xl font-serif font-bold text-[#1A1A1A]">{summary.uniqueTagsCount}</div>
              <div className="text-[11px] text-[#8C8C88] mt-1 font-sans">
                {summary.untaggedNotesCount} notes untagged
              </div>
            </div>
          </div>

          {/* Frontmatter Health */}
          <div
            onClick={() => setActiveTab('frontmatter')}
            className="p-5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] hover:border-[#1A1A1A] transition-all cursor-pointer flex flex-col justify-between shadow-xs"
          >
            <div className="flex items-center justify-between text-[#8C8C88] mb-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">YAML Metadata</span>
              <span className="p-1.5 rounded-md bg-[#EEF2FF] text-[#3730A3]">
                <FileCode className="w-3.5 h-3.5" />
              </span>
            </div>
            <div>
              <div
                className={`text-3xl font-serif font-bold ${
                  summary.frontmatterIssuesCount > 0 ? 'text-[#3730A3]' : 'text-[#166534]'
                }`}
              >
                {summary.frontmatterIssuesCount}
              </div>
              <div className="text-[11px] text-[#8C8C88] mt-1 font-sans">
                YAML schema diagnostics
              </div>
            </div>
          </div>

          {/* Link Density */}
          <div
            onClick={() => setActiveTab('graph')}
            className="p-5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] hover:border-[#1A1A1A] transition-all cursor-pointer flex flex-col justify-between shadow-xs"
          >
            <div className="flex items-center justify-between text-[#8C8C88] mb-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">Link Density</span>
              <span className="p-1.5 rounded-md bg-[#F0FDF4] text-[#166534]">
                <Link2 className="w-3.5 h-3.5" />
              </span>
            </div>
            <div>
              <div className="text-3xl font-serif font-bold text-[#1A1A1A]">
                {summary.avgLinksPerNote}
                <span className="text-xs text-[#8C8C88] font-sans font-normal"> / note</span>
              </div>
              <div className="text-[11px] text-[#8C8C88] mt-1 font-sans">
                {summary.totalLinks} total connections
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section: Actionable Issues & Top Hubs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Action Items Triage */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif font-bold text-[#1A1A1A] flex items-center gap-2">
              <span>Issues Requiring Attention</span>
            </h3>
            <span className="text-xs text-[#8C8C88]">
              {summary.brokenLinkItems.length + summary.orphanedItems.length + summary.frontmatterIssueItems.length} total diagnostics
            </span>
          </div>

          <div className="space-y-3">
            {/* Broken Links alert item */}
            {summary.brokenLinkItems.length > 0 ? (
              <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#FECACA] flex items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-[#FEF2F2] text-[#991B1B] mt-0.5 shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#991B1B]">
                      {summary.brokenLinkItems.length} Broken WikiLink{summary.brokenLinkItems.length > 1 ? 's' : ''} Detected
                    </h4>
                    <p className="text-xs text-[#5A5A57] mt-0.5 font-sans">
                      Links pointing to non-existent notes (e.g. <code className="text-[#991B1B] font-mono font-bold">[[{summary.brokenLinkItems[0].target}]]</code> in <em className="font-serif">{summary.brokenLinkItems[0].sourceTitle}</em>)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('broken-links')}
                  className="px-3.5 py-1.5 rounded-md bg-[#1A1A1A] hover:bg-[#333330] text-[#FCFCF9] text-xs font-semibold shrink-0 cursor-pointer shadow-xs transition-all"
                >
                  Review & Fix
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-3 text-xs text-[#166534]">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Zero broken internal links. All wikilinks resolve cleanly!</span>
              </div>
            )}

            {/* Orphan Notes item */}
            {summary.orphanedItems.length > 0 ? (
              <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#FDE68A] flex items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-[#FEF3C7] text-[#92400E] mt-0.5 shrink-0">
                    <FileQuestion className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#92400E]">
                      {summary.orphanedItems.length} Orphaned Note{summary.orphanedItems.length > 1 ? 's' : ''} (Isolated Islands)
                    </h4>
                    <p className="text-xs text-[#5A5A57] mt-0.5 font-sans">
                      Notes that have 0 incoming backlinks and 0 outgoing links, isolated from your knowledge network.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('orphans')}
                  className="px-3.5 py-1.5 rounded-md bg-[#1A1A1A] hover:bg-[#333330] text-[#FCFCF9] text-xs font-semibold shrink-0 cursor-pointer shadow-xs transition-all"
                >
                  Inspect
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-3 text-xs text-[#166534]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Zero orphan notes. All notes are connected into the knowledge graph!</span>
              </div>
            )}

            {/* Frontmatter YAML issues */}
            {summary.frontmatterIssueItems.length > 0 ? (
              <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#C7D2FE] flex items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-[#EEF2FF] text-[#3730A3] mt-0.5 shrink-0">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#3730A3]">
                      {summary.frontmatterIssueItems.length} Frontmatter Issue{summary.frontmatterIssueItems.length > 1 ? 's' : ''}
                    </h4>
                    <p className="text-xs text-[#5A5A57] mt-0.5 font-sans">
                      Notes with syntax errors or missing metadata tags.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('frontmatter')}
                  className="px-3.5 py-1.5 rounded-md bg-[#1A1A1A] hover:bg-[#333330] text-[#FCFCF9] text-xs font-semibold shrink-0 cursor-pointer shadow-xs transition-all"
                >
                  Lint YAML
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Top Hubs / Core MOCs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif font-bold text-[#1A1A1A] flex items-center gap-2">
              <span>Top Knowledge Hubs</span>
            </h3>
            <span className="text-xs text-[#8C8C88]">Most backlinked</span>
          </div>

          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] space-y-2.5 shadow-xs">
            {topHubNotes.map((note, idx) => (
              <div
                key={note.id}
                onClick={() => onSelectNote(note)}
                className="p-2.5 rounded-lg hover:bg-[#F7F7F4] transition-colors cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-serif font-bold text-xs text-[#8C8C88] w-4">
                    0{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h5 className="text-xs font-semibold text-[#1A1A1A] group-hover:underline truncate font-serif">
                      {note.baseName}
                    </h5>
                    <p className="text-[11px] text-[#8C8C88] truncate font-sans">{note.folder}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#F0F0ED] border border-[#E5E5E1] text-[#5A5A57]">
                    {note.backlinks.length} backlinks
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Use Inside Obsidian Card */}
          {onOpenObsidianModal && (
            <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E5E5E1] space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-md bg-[#EEF2FF] text-[#4F46E5]">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#1A1A1A] font-serif">
                      Use App Inside Obsidian
                    </h4>
                    <p className="text-[11px] text-[#5A5A57]">
                      Embed directly in Obsidian sidebar or split pane
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[#5A5A57] leading-relaxed">
                Save an embedded note or Custom Frame to audit and auto-fix notes directly inside your active Obsidian window.
              </p>
              <button
                id="btn-overview-open-obsidian"
                type="button"
                onClick={onOpenObsidianModal}
                className="w-full py-2 px-3 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Get In-Vault Embed Note</span>
              </button>
            </div>
          )}

          {/* Obsidian Config & Community Plugins Preserved */}
          {summary.obsidianSettings && summary.obsidianSettings.hasObsidianConfig && (
            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-md bg-[#F0FDF4] text-[#166534]">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#1A1A1A] font-serif">
                      Obsidian Settings & Plugins Preserved
                    </h4>
                    <p className="text-[11px] text-[#5A5A57]">
                      {summary.obsidianSettings.configFilesCount} config files & {summary.obsidianSettings.communityPlugins.length} community plugins loaded
                    </p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
                  100% Safe
                </span>
              </div>

              {summary.obsidianSettings.communityPlugins.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-[#F0F0ED]">
                  <span className="text-[10px] uppercase tracking-wider text-[#8C8C88] font-semibold">
                    Detected Community Plugins
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.obsidianSettings.communityPlugins.map((plugin) => (
                      <span
                        key={plugin}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F7F7F4] border border-[#E5E5E1] text-[#1A1A1A] font-medium"
                      >
                        {plugin}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {summary.obsidianSettings.themeName && (
                <div className="flex items-center justify-between text-xs text-[#5A5A57] pt-1 border-t border-[#F0F0ED]">
                  <span>Active Theme:</span>
                  <span className="font-mono font-semibold text-[#1A1A1A]">{summary.obsidianSettings.themeName}</span>
                </div>
              )}

              <p className="text-[11px] text-[#166534] bg-[#F0FDF4] p-2 rounded-lg border border-[#DCFCE7] leading-relaxed">
                ✨ <strong>Non-destructive Auto-Fix</strong>: All original markdown formatting, indentation, code blocks, line endings, <code className="font-mono">.obsidian</code> configs, and plugin data are fully preserved on export.
              </p>
            </div>
          )}

          {/* Folder Breakdown */}
          <div className="p-4 rounded-xl bg-[#F7F7F4] border border-[#E5E5E1] space-y-2 shadow-xs">
            <h4 className="text-[10px] font-semibold text-[#8C8C88] uppercase tracking-[0.2em] mb-2">
              Folder Distribution
            </h4>
            <div className="space-y-1.5">
              {Object.entries(summary.folderDistribution)
                .slice(0, 5)
                .map(([folder, count]) => (
                  <div key={folder} className="flex items-center justify-between text-xs text-[#1A1A1A]">
                    <span className="truncate max-w-[180px] text-[#5A5A57]">{folder}</span>
                    <span className="font-mono text-[#8C8C88] text-[11px]">{count} files</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
