import React from 'react';
import {
  Folder,
  Network,
  AlertTriangle,
  FileQuestion,
  Tags,
  FileCode,
  Files,
  Sparkles,
  Download,
  RotateCcw,
  Search,
  CheckCircle2,
  BookOpen,
  Wand2,
  Copy,
} from 'lucide-react';
import { ActiveTab, VaultAuditSummary } from '../types';

interface VaultHeaderProps {
  summary: VaultAuditSummary;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onResetVault: () => void;
  onOpenAiModal: () => void;
  onOpenAutoFixWizard?: () => void;
  onOpenObsidianModal?: () => void;
  onExportReport: () => void;
  onDownloadZip?: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const VaultHeader: React.FC<VaultHeaderProps> = ({
  summary,
  activeTab,
  setActiveTab,
  onResetVault,
  onOpenAiModal,
  onOpenAutoFixWizard,
  onOpenObsidianModal,
  onExportReport,
  onDownloadZip,
  searchQuery,
  setSearchQuery,
}) => {
  const getGradeBadgeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]';
      case 'B':
        return 'bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]';
      case 'C':
        return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
      default:
        return 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]';
    }
  };

  const totalFixable =
    summary.brokenLinksCount +
    summary.brokenAttachmentsCount +
    summary.orphanedNotesCount +
    summary.frontmatterIssuesCount;

  const navTabs = [
    { id: 'overview' as ActiveTab, label: 'Overview', icon: CheckCircle2 },
    { id: 'graph' as ActiveTab, label: 'Graph View', icon: Network },
    {
      id: 'broken-links' as ActiveTab,
      label: 'Broken Links',
      icon: AlertTriangle,
      badge: summary.brokenLinksCount + summary.brokenAttachmentsCount,
      badgeColor: summary.brokenLinksCount + summary.brokenAttachmentsCount > 0 ? 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]' : undefined,
    },
    {
      id: 'orphans' as ActiveTab,
      label: 'Orphans',
      icon: FileQuestion,
      badge: summary.orphanedNotesCount,
      badgeColor: summary.orphanedNotesCount > 0 ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]' : undefined,
    },
    {
      id: 'duplicates' as ActiveTab,
      label: 'Duplicates',
      icon: Copy,
      badge: summary.duplicateGroupsCount,
      badgeColor: summary.duplicateGroupsCount > 0 ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]' : undefined,
    },
    { id: 'tags' as ActiveTab, label: 'Tags Audit', icon: Tags, badge: summary.uniqueTagsCount },
    {
      id: 'frontmatter' as ActiveTab,
      label: 'Frontmatter',
      icon: FileCode,
      badge: summary.frontmatterIssuesCount,
      badgeColor: summary.frontmatterIssuesCount > 0 ? 'bg-[#EEF2FF] text-[#3730A3] border-[#C7D2FE]' : undefined,
    },
    { id: 'files' as ActiveTab, label: 'Files Explorer', icon: Files, badge: summary.totalNotes },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#FCFCF9]/95 backdrop-blur-md border-b border-[#E5E5E1] px-4 sm:px-8 py-3.5">
      {/* Top row: Vault info & primary actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[#FCFCF9] shrink-0 shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C8C88]">
                Vault Health Auditor
              </span>
              <span className="text-[#8C8C88] text-xs">/</span>
              <h2 className="text-xl font-serif font-bold text-[#1A1A1A] tracking-tight truncate max-w-xs sm:max-w-md">
                {summary.vaultName}
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${getGradeBadgeColor(
                  summary.grade
                )}`}
              >
                <span>Score {summary.healthScore}/100</span>
                <span className="opacity-40">•</span>
                <span>{summary.grade}</span>
              </span>
            </div>
            <p className="text-xs text-[#8C8C88] font-sans mt-0.5">
              {summary.totalNotes} notes · {summary.totalLinks} links · {summary.totalWords.toLocaleString()} words · Avg {summary.avgLinksPerNote} links/note
            </p>
          </div>
        </div>

        {/* Global Search & Primary Action Suite */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-56 min-w-[150px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C88]" />
            <input
              id="global-vault-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vault & notes..."
              className="w-full bg-[#FFFFFF] border border-[#E5E5E1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#1A1A1A] placeholder-[#8C8C88] focus:outline-none focus:border-[#1A1A1A] transition-colors shadow-xs"
            />
          </div>

          {/* Auto-Fix Magic Button */}
          {onOpenAutoFixWizard && (
            <button
              id="btn-auto-fix-wizard"
              type="button"
              onClick={onOpenAutoFixWizard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#166534] hover:bg-[#14532D] text-[#FFFFFF] text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="Open Auto-Fix & Repair Wizard"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Auto-Fix</span>
              {totalFixable > 0 && (
                <span className="bg-[#14532D] text-[#BBF7D0] px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                  {totalFixable}
                </span>
              )}
            </button>
          )}

          {/* Use inside Obsidian Button */}
          {onOpenObsidianModal && (
            <button
              id="btn-open-obsidian-integration"
              type="button"
              onClick={onOpenObsidianModal}
              title="Add this app inside your Obsidian Vault"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#C7D2FE] text-[#4338CA] text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#6366F1]" />
              <span className="hidden sm:inline">Use in Obsidian</span>
              <span className="sm:hidden">Obsidian</span>
            </button>
          )}

          {/* AI Advisor Button */}
          <button
            id="btn-ai-insights"
            type="button"
            onClick={onOpenAiModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#333330] text-[#FCFCF9] text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">AI Advisor</span>
            <span className="sm:hidden">AI</span>
          </button>

          {/* Download Zip */}
          {onDownloadZip && (
            <button
              id="btn-download-vault-zip"
              type="button"
              onClick={onDownloadZip}
              title="Download entire vault as a .ZIP archive"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F7F7F4] border border-[#E5E5E1] text-[#1A1A1A] text-xs font-medium transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-[#5A5A57]" />
              <span className="hidden md:inline">Export .ZIP</span>
            </button>
          )}

          {/* Switch Vault */}
          <button
            id="btn-switch-vault"
            type="button"
            onClick={onResetVault}
            title="Open a different vault"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F7F7F4] border border-[#E5E5E1] text-[#5A5A57] hover:text-[#1A1A1A] text-xs font-medium transition-all cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Switch</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-[#E5E5E1]">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#1A1A1A] text-[#FCFCF9] font-semibold shadow-xs'
                  : 'text-[#5A5A57] hover:text-[#1A1A1A] hover:bg-[#F0F0ED]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#FCFCF9]' : 'text-[#8C8C88]'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full border font-mono ${
                    isActive
                      ? 'bg-[#333330] text-[#FCFCF9] border-[#4A4A47]'
                      : tab.badgeColor || 'bg-[#F0F0ED] text-[#5A5A57] border-[#E5E5E1]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
