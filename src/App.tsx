import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { RawFileEntry, analyzeVault } from './utils/vaultParser';
import { VaultFile, VaultAuditSummary, ActiveTab } from './types';
import {
  AutoFixOptions,
  AutoFixReport,
  DEFAULT_AUTO_FIX_OPTIONS,
  executeMasterAutoFix,
  exportVaultAsZip,
  replaceLinkInContent,
  standardizeTagsInContent,
  repairOrAddFrontmatter,
  inferFolderTag,
} from './utils/vaultAutoFixer';
import { VaultUploader } from './components/VaultUploader';
import { VaultHeader } from './components/VaultHeader';
import { VaultOverview } from './components/VaultOverview';
import { GraphView } from './components/GraphView';
import { BrokenLinksAuditor } from './components/BrokenLinksAuditor';
import { OrphansAuditor } from './components/OrphansAuditor';
import { TagsAuditor } from './components/TagsAuditor';
import { FrontmatterAuditor } from './components/FrontmatterAuditor';
import { DuplicatesAuditor } from './components/DuplicatesAuditor';
import { FileListAuditor } from './components/FileListAuditor';
import { NoteInspectorModal } from './components/NoteInspectorModal';
import { AIInsightsModal } from './components/AIInsightsModal';
import { AutoFixWizardModal } from './components/AutoFixWizardModal';
import { ObsidianIntegrationModal } from './components/ObsidianIntegrationModal';
import { CheckCircle2, Wand2, X } from 'lucide-react';

export default function App() {
  const [rawFiles, setRawFiles] = useState<RawFileEntry[] | null>(null);
  const [vaultName, setVaultName] = useState<string>('My Obsidian Vault');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedNote, setSelectedNote] = useState<VaultFile | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isAutoFixModalOpen, setIsAutoFixModalOpen] = useState<boolean>(false);
  const [isObsidianModalOpen, setIsObsidianModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{ title: string; desc?: string } | null>(null);

  const showToast = (title: string, desc?: string) => {
    setToastMessage({ title, desc });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.title === title ? null : prev));
    }, 4000);
  };

  // Re-run analysis whenever raw files change
  const summary = useMemo(() => {
    if (!rawFiles || rawFiles.length === 0) {
      return null;
    }
    return analyzeVault(rawFiles, vaultName);
  }, [rawFiles, vaultName]);

  const parsedFiles = useMemo(() => summary?.parsedFiles || [], [summary]);

  // Keep selectedNote in sync if files are updated or removed
  React.useEffect(() => {
    if (selectedNote) {
      const refreshed = parsedFiles.find((f) => f.id === selectedNote.id);
      if (!refreshed) {
        setSelectedNote(null);
      } else if (refreshed !== selectedNote) {
        setSelectedNote(refreshed);
      }
    }
  }, [parsedFiles, selectedNote]);

  const handleVaultLoaded = (files: RawFileEntry[], name: string) => {
    setRawFiles(files);
    setVaultName(name);
    setActiveTab('overview');

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (_) {}
  };

  const handleResetVault = () => {
    setRawFiles(null);
    setSelectedNote(null);
    setSearchQuery('');
  };

  const handleNavigateToNote = (targetName: string) => {
    const targetLower = targetName.toLowerCase();
    const found = parsedFiles.find(
      (f) =>
        f.baseName.toLowerCase() === targetLower ||
        f.id.toLowerCase() === targetLower ||
        f.name.toLowerCase() === targetLower
    );
    if (found) {
      setSelectedNote(found);
    } else {
      const confirmCreate = window.confirm(
        `Note "[[${targetName}]]" does not exist yet. Would you like to create a stub note for it in your vault?`
      );
      if (confirmCreate) {
        handleCreateStubNote(targetName);
      }
    }
  };

  const handleCreateStubNote = (noteTitle: string) => {
    if (!rawFiles) return;

    const newPath = `02 - Notes/${noteTitle}.md`;
    const newContent = `---
title: ${noteTitle}
date: ${new Date().toISOString().split('T')[0]}
tags:
  - stub
  - seedling
status: seedling
---

# ${noteTitle}

> *Auto-generated stub note to resolve missing wikilink references in the vault.*

## References & Backlinks
This note was automatically initialized to provide a central node for incoming references.
`;

    const updated = [
      ...rawFiles.filter((rf) => rf.path !== newPath),
      {
        path: newPath,
        name: `${noteTitle}.md`,
        content: newContent,
        size: newContent.length,
        lastModified: Date.now(),
      },
    ];

    setRawFiles(updated);
    showToast(`Created Stub Note: "[[${noteTitle}]]"`, `Saved to ${newPath}`);

    setTimeout(() => {
      const newlyCreated = parsedFiles.find((f) => f.baseName === noteTitle);
      if (newlyCreated) {
        setSelectedNote(newlyCreated);
      }
    }, 100);
  };

  const handleUpdateNoteContent = (fileId: string, newContent: string) => {
    if (!rawFiles) return;

    const updated = rawFiles.map((rf) => {
      if (rf.path === fileId) {
        return {
          ...rf,
          content: newContent,
          size: newContent.length,
          lastModified: Date.now(),
        };
      }
      return rf;
    });

    setRawFiles(updated);

    const target = parsedFiles.find((f) => f.id === fileId);
    if (target) {
      setSelectedNote({
        ...target,
        content: newContent,
      });
    }
  };

  // --- Auto Fix Handlers ---

  const handleExecuteMasterAutoFix = (options: AutoFixOptions): AutoFixReport => {
    if (!rawFiles || !summary) {
      return {
        brokenLinksFixed: 0,
        stubsCreated: 0,
        orphansLinked: 0,
        tagsStandardized: 0,
        untaggedNotesFixed: 0,
        frontmatterRepaired: 0,
        modifiedFilesCount: 0,
        newFilesCount: 0,
        actionsTaken: [],
      };
    }

    const { updatedRawFiles, report } = executeMasterAutoFix(
      rawFiles,
      parsedFiles,
      summary.brokenLinkItems,
      summary.orphanedItems,
      summary.tagAuditItems,
      summary.frontmatterIssueItems,
      options
    );

    setRawFiles(updatedRawFiles);

    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.7 },
      });
    } catch (_) {}

    showToast(
      'Vault Successfully Auto-Repaired!',
      `Applied ${report.actionsTaken.length} optimizations across ${report.modifiedFilesCount + report.newFilesCount} files.`
    );

    return report;
  };

  const handleDownloadZip = async () => {
    if (!rawFiles) return;
    showToast('Preparing ZIP Archive...', 'Packaging all markdown and attachment files.');
    try {
      await exportVaultAsZip(rawFiles, vaultName);
      showToast('Download Complete!', `${vaultName}-Repaired.zip is ready for Obsidian.`);
    } catch (err) {
      console.error(err);
      showToast('Export Error', 'Failed to generate ZIP archive.');
    }
  };

  const handleReplaceLink = (sourceId: string, oldTarget: string, newTarget: string) => {
    if (!rawFiles) return;
    const updated = rawFiles.map((file) => {
      if (file.path === sourceId) {
        const newContent = replaceLinkInContent(file.content, oldTarget, newTarget);
        return {
          ...file,
          content: newContent,
          size: newContent.length,
          lastModified: Date.now(),
        };
      }
      return file;
    });
    setRawFiles(updated);
    showToast(`Replaced [[${oldTarget}]] → [[${newTarget}]]`, `Updated in ${sourceId}`);
  };

  const handleAutoFixAllBroken = () => {
    if (!summary) return;
    handleExecuteMasterAutoFix({
      fixBrokenWithFuzzy: true,
      createMissingStubs: true,
      generateOrphanMOC: false,
      standardizeTagCasings: false,
      autoTagUntaggedNotes: false,
      repairFrontmatter: false,
    });
  };

  const handleCreateAllStubs = () => {
    if (!summary) return;
    handleExecuteMasterAutoFix({
      fixBrokenWithFuzzy: false,
      createMissingStubs: true,
      generateOrphanMOC: false,
      standardizeTagCasings: false,
      autoTagUntaggedNotes: false,
      repairFrontmatter: false,
    });
  };

  const handleAutoGenerateOrphanMOC = () => {
    if (!summary) return;
    handleExecuteMasterAutoFix({
      fixBrokenWithFuzzy: false,
      createMissingStubs: false,
      generateOrphanMOC: true,
      standardizeTagCasings: false,
      autoTagUntaggedNotes: false,
      repairFrontmatter: false,
    });
  };

  const handleAutoTagOrphans = () => {
    if (!rawFiles || !summary) return;
    const orphanIds = new Set(summary.orphanedItems.map((o) => o.id));
    const updated = rawFiles.map((file) => {
      if (orphanIds.has(file.path)) {
        const { updatedContent, changed } = repairOrAddFrontmatter(
          file.content,
          file.name.replace(/\.md$/, ''),
          ['seedling', 'unlinked']
        );
        if (changed) {
          return {
            ...file,
            content: updatedContent,
            size: updatedContent.length,
            lastModified: Date.now(),
          };
        }
      }
      return file;
    });
    setRawFiles(updated);
    showToast('Tagged Orphan Notes', `Added #seedling #unlinked to ${orphanIds.size} orphan notes`);
  };

  const handleStandardizeTagCasings = () => {
    if (!summary) return;
    handleExecuteMasterAutoFix({
      fixBrokenWithFuzzy: false,
      createMissingStubs: false,
      generateOrphanMOC: false,
      standardizeTagCasings: true,
      autoTagUntaggedNotes: false,
      repairFrontmatter: false,
    });
  };

  const handleAutoTagUntagged = () => {
    if (!summary) return;
    handleExecuteMasterAutoFix({
      fixBrokenWithFuzzy: false,
      createMissingStubs: false,
      generateOrphanMOC: false,
      standardizeTagCasings: false,
      autoTagUntaggedNotes: true,
      repairFrontmatter: false,
    });
  };

  const handleAutoRepairAllFrontmatter = () => {
    if (!summary) return;
    handleExecuteMasterAutoFix({
      fixBrokenWithFuzzy: false,
      createMissingStubs: false,
      generateOrphanMOC: false,
      standardizeTagCasings: false,
      autoTagUntaggedNotes: false,
      repairFrontmatter: true,
    });
  };

  const handleRepairSingleNote = (fileId: string) => {
    if (!rawFiles) return;
    const target = rawFiles.find((f) => f.path === fileId);
    if (!target) return;

    const baseName = target.name.replace(/\.md$/, '');
    const folderTag = inferFolderTag(target.path);
    const { updatedContent, changed } = repairOrAddFrontmatter(target.content, baseName, [folderTag]);

    if (changed) {
      const updated = rawFiles.map((rf) => (rf.path === fileId ? { ...rf, content: updatedContent, size: updatedContent.length, lastModified: Date.now() } : rf));
      setRawFiles(updated);
      showToast('Frontmatter Repaired', `Added valid YAML schema to ${target.name}`);
    }
  };

  const handleRenameTagAcrossVault = (oldTag: string, newTag: string) => {
    if (!rawFiles) return;
    const cleanOld = oldTag.replace(/^#/, '').toLowerCase();
    const cleanNew = newTag.replace(/^#/, '').toLowerCase();

    const casingMap = new Map<string, string>();
    casingMap.set(cleanOld, cleanNew);

    let count = 0;
    const updated = rawFiles.map((file) => {
      if (file.name.endsWith('.md')) {
        const { updatedContent, changed } = standardizeTagsInContent(file.content, casingMap);
        if (changed) {
          count++;
          return {
            ...file,
            content: updatedContent,
            size: updatedContent.length,
            lastModified: Date.now(),
          };
        }
      }
      return file;
    });

    setRawFiles(updated);
    showToast(`Renamed #${oldTag} → #${newTag}`, `Updated across ${count} notes in vault.`);
  };

  const handleAddNoteToVault = (entry: RawFileEntry) => {
    if (!rawFiles) return;
    const existingIndex = rawFiles.findIndex((f) => f.path === entry.path);
    let updated: RawFileEntry[];
    if (existingIndex >= 0) {
      updated = [...rawFiles];
      updated[existingIndex] = entry;
    } else {
      updated = [entry, ...rawFiles];
    }
    setRawFiles(updated);
    showToast(
      'Added Note to Vault!',
      `Created ${entry.name}. It will be included when exporting your vault.`
    );
  };

  const handleUpdateRawFiles = (updated: RawFileEntry[], message?: string) => {
    setRawFiles(updated);
    if (message) {
      showToast('Vault Updated', message);
    }
  };

  const handleExportReport = () => {
    if (!summary) return;

    const report = `# Obsidian Vault Audit Report: ${summary.vaultName}
Generated on: ${new Date().toLocaleString()}

## 📊 Summary & Health Score
- **Health Score**: ${summary.healthScore} / 100 (Grade: ${summary.grade})
- **Total Notes**: ${summary.totalNotes}
- **Total Attachments**: ${summary.totalAttachments}
- **Total Links**: ${summary.totalLinks} (Avg ${summary.avgLinksPerNote} links/note)
- **Broken Links**: ${summary.brokenLinksCount}
- **Broken Attachment Embeds**: ${summary.brokenAttachmentsCount}
- **Orphan Notes**: ${summary.orphanedNotesCount}
- **Unique Tags**: ${summary.uniqueTagsCount}

---

## ⚠️ Broken Links (${summary.brokenLinkItems.length})
${
  summary.brokenLinkItems.length === 0
    ? '✅ No broken links found!'
    : summary.brokenLinkItems
        .map(
          (b) =>
            `- **[[${b.target}]]** in \`${b.sourceTitle}\` (Line ${b.line}) ${
              b.suggestedFix ? `*(Did you mean [[${b.suggestedFix}]]?)*` : ''
            }`
        )
        .join('\n')
}

---

## 🏝️ Orphan Notes (${summary.orphanedItems.length})
${
  summary.orphanedItems.length === 0
    ? '✅ No orphan notes!'
    : summary.orphanedItems.map((o) => `- [[${o.baseName}]] (\`${o.folder}\`)`).join('\n')
}

---

## 🏷️ Top Tags
${Object.entries(summary.tagFrequency)
  .slice(0, 15)
  .map(([tag, count]) => `- #${tag}: ${count} notes`)
  .join('\n')}
`;

    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vault-Audit-Report-${summary.vaultName.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-[#1A1A1A] flex flex-col font-sans selection:bg-[#1A1A1A] selection:text-[#FCFCF9] relative">
      {!rawFiles || !summary ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <VaultUploader
            onVaultLoaded={handleVaultLoaded}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <VaultHeader
            summary={summary}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onResetVault={handleResetVault}
            onOpenAiModal={() => setIsAiModalOpen(true)}
            onOpenAutoFixWizard={() => setIsAutoFixModalOpen(true)}
            onOpenObsidianModal={() => setIsObsidianModalOpen(true)}
            onExportReport={handleExportReport}
            onDownloadZip={handleDownloadZip}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {/* Main Body View Container */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {activeTab === 'overview' && (
              <VaultOverview
                summary={summary}
                files={parsedFiles}
                setActiveTab={setActiveTab}
                onSelectNote={(note) => setSelectedNote(note)}
                onOpenAutoFixWizard={() => setIsAutoFixModalOpen(true)}
                onOpenObsidianModal={() => setIsObsidianModalOpen(true)}
                onDownloadZip={handleDownloadZip}
              />
            )}

            {activeTab === 'graph' && (
              <GraphView
                files={parsedFiles}
                onSelectNote={(note) => setSelectedNote(note)}
                searchQuery={searchQuery}
              />
            )}

            {activeTab === 'broken-links' && (
              <BrokenLinksAuditor
                brokenLinks={summary.brokenLinkItems}
                files={parsedFiles}
                onSelectNote={(note) => setSelectedNote(note)}
                onCreateStubNote={handleCreateStubNote}
                onReplaceLink={handleReplaceLink}
                onAutoFixAllBroken={handleAutoFixAllBroken}
                onCreateAllStubs={handleCreateAllStubs}
              />
            )}

            {activeTab === 'orphans' && (
              <OrphansAuditor
                files={parsedFiles}
                onSelectNote={(note) => setSelectedNote(note)}
                onAutoGenerateMOC={handleAutoGenerateOrphanMOC}
                onAutoTagOrphans={handleAutoTagOrphans}
              />
            )}

            {activeTab === 'duplicates' && (
              <DuplicatesAuditor
                groups={summary.duplicateGroups}
                rawFiles={rawFiles}
                onUpdateRawFiles={handleUpdateRawFiles}
                onSelectFile={(note) => setSelectedNote(note)}
              />
            )}

            {activeTab === 'tags' && (
              <TagsAuditor
                tagAuditItems={summary.tagAuditItems}
                files={parsedFiles}
                onSelectNote={(note) => setSelectedNote(note)}
                onStandardizeCasings={handleStandardizeTagCasings}
                onAutoTagUntagged={handleAutoTagUntagged}
                onRenameTag={handleRenameTagAcrossVault}
              />
            )}

            {activeTab === 'frontmatter' && (
              <FrontmatterAuditor
                issues={summary.frontmatterIssueItems}
                files={parsedFiles}
                onSelectNote={(note) => setSelectedNote(note)}
                onAutoRepairAllFrontmatter={handleAutoRepairAllFrontmatter}
                onRepairSingleNote={handleRepairSingleNote}
              />
            )}

            {activeTab === 'files' && (
              <FileListAuditor
                files={parsedFiles}
                onSelectNote={(note) => setSelectedNote(note)}
              />
            )}
          </main>

          {/* Note Reader & Inspector Modal */}
          {selectedNote && (
            <NoteInspectorModal
              note={selectedNote}
              allFiles={parsedFiles}
              onClose={() => setSelectedNote(null)}
              onNavigateToNote={handleNavigateToNote}
              onUpdateNoteContent={handleUpdateNoteContent}
            />
          )}

          {/* AI Advisor Modal */}
          {isAiModalOpen && (
            <AIInsightsModal
              summary={summary}
              files={parsedFiles}
              onClose={() => setIsAiModalOpen(false)}
            />
          )}

          {/* Auto-Fix Master Wizard Modal */}
          {isAutoFixModalOpen && (
            <AutoFixWizardModal
              summary={summary}
              files={parsedFiles}
              onClose={() => setIsAutoFixModalOpen(false)}
              onExecuteAutoFix={handleExecuteMasterAutoFix}
              onDownloadZip={handleDownloadZip}
            />
          )}

          {/* Obsidian Integration Modal */}
          {isObsidianModalOpen && (
            <ObsidianIntegrationModal
              isOpen={isObsidianModalOpen}
              onClose={() => setIsObsidianModalOpen(false)}
              vaultName={summary.vaultName}
              onAddNoteToVault={handleAddNoteToVault}
              isNoteAlreadyInVault={rawFiles?.some((f) => f.name.includes('Vault Health Auditor')) || false}
            />
          )}

          {/* Toast Notification Banner */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-3 duration-200">
              <div className="p-4 rounded-xl bg-[#1A1A1A] text-[#FCFCF9] shadow-2xl border border-[#333330] flex items-start gap-3 max-w-sm">
                <Wand2 className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-serif font-bold text-[#FCFCF9]">
                    {toastMessage.title}
                  </h5>
                  {toastMessage.desc && (
                    <p className="text-[11px] text-[#D6D6D2] mt-0.5 leading-relaxed font-sans">
                      {toastMessage.desc}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="text-[#8C8C88] hover:text-[#FCFCF9] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
