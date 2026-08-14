import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Copy,
  GitCompare,
  GitMerge,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Folder,
  ArrowRight,
  Search,
  Filter,
  Layers,
  FileText,
  Tag,
  Link2,
  X,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { DuplicateGroup, VaultFile } from '../types';
import { RawFileEntry } from '../utils/vaultParser';
import {
  deleteDuplicateNote,
  mergeDuplicateNotes,
  batchResolveExactDuplicates,
  batchResolveExactDuplicatesAsync,
  batchMergeDuplicateGroupsAsync,
} from '../utils/vaultAutoFixer';

interface DuplicatesAuditorProps {
  groups: DuplicateGroup[];
  rawFiles: RawFileEntry[];
  onUpdateRawFiles: (files: RawFileEntry[], message: string) => void;
  onSelectFile?: (file: VaultFile) => void;
}

type FilterType = 'all' | 'exact-content' | 'same-name';

interface BatchProgressState {
  isActive: boolean;
  title: string;
  phase: 'analyzing' | 'deleting' | 'updating-links' | 'completed';
  current: number;
  total: number;
  percentage: number;
  message: string;
}

export const DuplicatesAuditor: React.FC<DuplicatesAuditorProps> = ({
  groups = [],
  rawFiles = [],
  onUpdateRawFiles,
  onSelectFile,
}) => {
  const isMountedRef = useRef(true);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => new Set((groups || []).filter(Boolean).map((g) => g.id)));

  // Diff comparison modal state
  const [compareGroup, setCompareGroup] = useState<DuplicateGroup | null>(null);
  const [compareFileA, setCompareFileA] = useState<VaultFile | null>(null);
  const [compareFileB, setCompareFileB] = useState<VaultFile | null>(null);

  // Merge modal state
  const [mergeModalGroup, setMergeModalGroup] = useState<DuplicateGroup | null>(null);
  const [primaryPath, setPrimaryPath] = useState<string>('');
  const [duplicatePath, setDuplicatePath] = useState<string>('');
  const [mergeTags, setMergeTags] = useState(true);
  const [appendContent, setAppendContent] = useState(true);
  const [redirectLinks, setRedirectLinks] = useState(true);

  // Delete modal state
  const [deleteFileItem, setDeleteFileItem] = useState<{ file: VaultFile; group: DuplicateGroup } | null>(null);
  const [redirectOnDeletePath, setRedirectOnDeletePath] = useState<string>('');

  // Batch action in-flight state & batched incremental progress
  const [isCleaning, setIsCleaning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgressState>({
    isActive: false,
    title: '',
    phase: 'analyzing',
    current: 0,
    total: 0,
    percentage: 0,
    message: '',
  });

  // Action status toast/message
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const showToast = (msg: string) => {
    if (!isMountedRef.current) return;
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setActionNotice(msg);
    toastTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setActionNotice(null);
      }
    }, 4000);
  };

  // Group stats
  const stats = useMemo(() => {
    const validGroups = (groups || []).filter((g): g is DuplicateGroup => Boolean(g && Array.isArray(g.files)));
    const exactGroups = validGroups.filter((g) => g.type === 'exact-content');
    const sameNameGroups = validGroups.filter((g) => g.type === 'same-name');
    const exactClonesCount = exactGroups.reduce((acc, g) => acc + Math.max(0, (g.files?.length || 0) - 1), 0);
    const totalDuplicateNotes = validGroups.reduce((acc, g) => acc + (g.files?.length || 0), 0);
    const potentialBytesSaved = exactGroups.reduce((acc, g) => {
      if (!g.files || g.files.length === 0) return acc;
      const sizes = g.files.map((f) => f?.size || 0);
      if (sizes.length === 0) return acc;
      const totalSize = sizes.reduce((a, b) => a + b, 0);
      const keepSize = Math.max(...sizes);
      return acc + Math.max(0, totalSize - keepSize);
    }, 0);

    return {
      totalGroups: validGroups.length,
      exactCount: exactGroups.length,
      exactClonesCount,
      sameNameCount: sameNameGroups.length,
      totalDuplicateNotes,
      potentialBytesSaved: Math.max(0, potentialBytesSaved),
    };
  }, [groups]);

  // Synchronize modal state if files are deleted or modified
  useEffect(() => {
    if (compareGroup) {
      const refreshedGroup = (groups || []).find((g) => g && g.id === compareGroup.id);
      if (!refreshedGroup || !refreshedGroup.files || refreshedGroup.files.length < 2) {
        setCompareGroup(null);
        setCompareFileA(null);
        setCompareFileB(null);
      } else {
        const fileAExists = refreshedGroup.files.find((f) => f && f.path === compareFileA?.path);
        const fileBExists = refreshedGroup.files.find((f) => f && f.path === compareFileB?.path);
        setCompareGroup(refreshedGroup);
        if (fileAExists) setCompareFileA(fileAExists);
        else setCompareFileA(refreshedGroup.files[0] || null);
        if (fileBExists) setCompareFileB(fileBExists);
        else setCompareFileB(refreshedGroup.files[1] || refreshedGroup.files[0] || null);
      }
    }

    if (mergeModalGroup) {
      const refreshedGroup = (groups || []).find((g) => g && g.id === mergeModalGroup.id);
      if (!refreshedGroup || !refreshedGroup.files || refreshedGroup.files.length < 2) {
        setMergeModalGroup(null);
      } else {
        setMergeModalGroup(refreshedGroup);
      }
    }

    if (deleteFileItem) {
      const fileStillExists = (rawFiles || []).some((f) => f && f.path === deleteFileItem.file?.path);
      if (!fileStillExists) {
        setDeleteFileItem(null);
      }
    }
  }, [groups, rawFiles]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return (groups || []).filter((group) => {
      if (!group) return false;
      if (filterType !== 'all' && group.type !== filterType) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (group.title || '').toLowerCase().includes(q);
        const matchesFiles = (group.files || []).some(
          (f) =>
            f &&
            ((f.name || '').toLowerCase().includes(q) ||
              (f.folder || '').toLowerCase().includes(q) ||
              (f.tags || []).some((t) => t && t.toLowerCase().includes(q)))
        );
        if (!matchesTitle && !matchesFiles) return false;
      }

      return true;
    });
  }, [groups, filterType, searchQuery]);

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Batch action: Auto-clean all exact clones in non-blocking incremental batches
  const handleBatchCleanExact = async () => {
    if (isCleaning || batchProgress.isActive) return;
    setIsCleaning(true);
    setBatchProgress({
      isActive: true,
      title: 'Auto-Cleaning Redundant Clones',
      phase: 'analyzing',
      current: 0,
      total: stats.exactCount,
      percentage: 5,
      message: 'Scanning duplicate notes for primary instances...',
    });

    try {
      const { updatedRawFiles, resolvedCount } = await batchResolveExactDuplicatesAsync(
        rawFiles || [],
        groups || [],
        (progress) => {
          if (isMountedRef.current) {
            setBatchProgress({
              isActive: true,
              title: 'Auto-Cleaning Redundant Clones',
              ...progress,
            });
          }
        },
        6 // batch chunk size
      );

      if (isMountedRef.current) {
        setBatchProgress({
          isActive: false,
          title: '',
          phase: 'completed',
          current: 0,
          total: 0,
          percentage: 100,
          message: '',
        });
        setIsCleaning(false);
        setCompareGroup(null);
        setMergeModalGroup(null);
        setDeleteFileItem(null);
      }

      // Yield control so modal dismisses cleanly before dispatching parent state update
      await new Promise((resolve) => setTimeout(resolve, 80));

      if (resolvedCount === 0) {
        showToast('No exact content duplicates found to clean.');
      } else {
        onUpdateRawFiles(
          updatedRawFiles,
          `Successfully cleaned ${resolvedCount} redundant clone note${resolvedCount === 1 ? '' : 's'}`
        );
        showToast(`Resolved ${resolvedCount} exact duplicate files across vault!`);
      }
    } catch (err) {
      console.error('Batch clean failed:', err);
      if (isMountedRef.current) {
        showToast('Encountered an issue during batch cleanup.');
      }
    } finally {
      if (isMountedRef.current) {
        setBatchProgress((prev) => ({ ...prev, isActive: false }));
        setIsCleaning(false);
      }
    }
  };

  // Bulk merge all exact duplicate groups in non-blocking incremental batches
  const handleBulkMergeExactGroups = async () => {
    const exactGroups = (groups || []).filter((g) => g && g.type === 'exact-content');
    if (exactGroups.length === 0 || isCleaning || batchProgress.isActive) return;

    setIsCleaning(true);
    setBatchProgress({
      isActive: true,
      title: 'Bulk Merging Duplicate Groups',
      phase: 'analyzing',
      current: 0,
      total: exactGroups.length,
      percentage: 5,
      message: 'Preparing incremental merge batches...',
    });

    try {
      const { updatedRawFiles, resolvedCount, mergedGroupCount } = await batchMergeDuplicateGroupsAsync(
        rawFiles || [],
        exactGroups,
        {
          mergeTags: true,
          appendContent: false,
          redirectLinks: true,
        },
        (progress) => {
          if (isMountedRef.current) {
            setBatchProgress({
              isActive: true,
              title: 'Bulk Merging Duplicate Groups',
              ...progress,
            });
          }
        },
        4 // batch chunk size
      );

      if (isMountedRef.current) {
        setBatchProgress({
          isActive: false,
          title: '',
          phase: 'completed',
          current: 0,
          total: 0,
          percentage: 100,
          message: '',
        });
        setIsCleaning(false);
        setCompareGroup(null);
        setMergeModalGroup(null);
        setDeleteFileItem(null);
      }

      // Yield control so modal dismisses cleanly before dispatching parent state update
      await new Promise((resolve) => setTimeout(resolve, 80));

      if (resolvedCount === 0) {
        showToast('No duplicate notes needed merging.');
      } else {
        onUpdateRawFiles(
          updatedRawFiles,
          `Merged ${mergedGroupCount} duplicate groups (${resolvedCount} redundant files resolved)`
        );
        showToast(`Bulk merged ${mergedGroupCount} duplicate groups successfully!`);
      }
    } catch (err) {
      console.error('Bulk merge failed:', err);
      if (isMountedRef.current) {
        showToast('Failed to complete bulk merge.');
      }
    } finally {
      if (isMountedRef.current) {
        setBatchProgress((prev) => ({ ...prev, isActive: false }));
        setIsCleaning(false);
      }
    }
  };

  // Open Compare Diff View
  const handleOpenCompare = (group: DuplicateGroup) => {
    if (!group || !group.files || group.files.length < 2) return;
    setCompareGroup(group);
    setCompareFileA(group.files[0] || null);
    setCompareFileB(group.files[1] || group.files[0] || null);
  };

  // Open Merge Modal
  const handleOpenMerge = (group: DuplicateGroup, defaultPrimary?: VaultFile | null, defaultDup?: VaultFile | null) => {
    if (!group || !group.files || group.files.length < 2) return;
    const prim = defaultPrimary || group.files[0];
    if (!prim || !prim.path) return;
    const dup = defaultDup || (group.files.find((f) => f && f.path !== prim.path) || group.files[1]);
    if (!dup || !dup.path) return;

    setMergeModalGroup(group);
    setPrimaryPath(prim.path);
    setDuplicatePath(dup.path);
    setAppendContent(group.type !== 'exact-content');
  };

  // Execute Merge
  const handleExecuteMerge = async () => {
    if (!primaryPath || !duplicatePath || primaryPath === duplicatePath) return;

    // Reset modals FIRST to prevent rendering during parent state transition
    setMergeModalGroup(null);
    if (compareGroup) setCompareGroup(null);

    // Yield to allow modal unmount
    await new Promise((resolve) => setTimeout(resolve, 40));

    try {
      const primaryFile = (rawFiles || []).find((f) => f && f.path === primaryPath);
      const dupFile = (rawFiles || []).find((f) => f && f.path === duplicatePath);

      const updated = mergeDuplicateNotes(rawFiles || [], primaryPath, duplicatePath, {
        mergeTags,
        appendContent,
        redirectLinks,
      });

      onUpdateRawFiles(
        updated,
        `Merged "${dupFile?.name || duplicatePath}" into "${primaryFile?.name || primaryPath}"`
      );
    } catch (err) {
      console.error('Merge error:', err);
      showToast('Failed to merge notes.');
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (file: VaultFile, group: DuplicateGroup) => {
    if (!file || !group) return;
    const alternative = (group.files || []).find((f) => f && f.path !== file.path);
    setDeleteFileItem({ file, group });
    setRedirectOnDeletePath(alternative?.path || '');
  };

  // Execute Delete
  const handleExecuteDelete = async () => {
    if (!deleteFileItem || !deleteFileItem.file) return;

    const { file } = deleteFileItem;
    // Reset modals FIRST
    setDeleteFileItem(null);
    if (compareGroup) setCompareGroup(null);

    // Yield to allow modal unmount
    await new Promise((resolve) => setTimeout(resolve, 40));

    try {
      const updated = deleteDuplicateNote(
        rawFiles || [],
        file.path,
        redirectOnDeletePath ? redirectOnDeletePath : undefined
      );

      onUpdateRawFiles(
        updated,
        `Deleted duplicate note "${file.name}" from ${file.folder}`
      );
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to delete duplicate note.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionNotice && (
        <div
          id="duplicate-action-toast"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#1A1A1A] text-[#FCFCF9] text-xs font-medium rounded-xl shadow-lg border border-[#333330] animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Header & Metrics Dashboard */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E1] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-[#E5E5E1]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#F0F0ED] text-[#1A1A1A] border border-[#E5E5E1]">
                <Copy className="w-3.5 h-3.5 text-[#5A5A57]" />
                Duplicate & Collision Auditor
              </span>
              <span className="text-xs text-[#8C8C88] font-mono">
                {(groups || []).length} group{(groups || []).length === 1 ? '' : 's'} identified
              </span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#1A1A1A] tracking-tight">
              Duplicate Notes & Name Collisions
            </h2>
            <p className="text-xs text-[#5A5A57] mt-1 max-w-2xl leading-relaxed">
              Detects identical note copies across folders and same-title name collisions that cause ambiguous Obsidian
              wikilink resolution. Merge content, combine tags, or clean duplicates safely.
            </p>
          </div>

          {/* Quick Batch Actions */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {stats.exactCount > 0 && (
              <button
                id="btn-bulk-merge-exact-groups"
                type="button"
                disabled={isCleaning || batchProgress.isActive}
                onClick={handleBulkMergeExactGroups}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#333330] disabled:opacity-50 disabled:cursor-not-allowed text-[#FCFCF9] text-xs font-semibold shadow-xs transition-all cursor-pointer"
                title="Merge tags and combine links for all exact matches in non-blocking batches"
              >
                <GitMerge className="w-4 h-4 text-amber-300" />
                <span>Bulk Merge Exact Groups ({stats.exactCount})</span>
              </button>
            )}

            {stats.exactClonesCount > 0 && (
              <button
                id="btn-batch-clean-exact-duplicates"
                type="button"
                disabled={isCleaning || batchProgress.isActive}
                onClick={handleBatchCleanExact}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#166534] hover:bg-[#14532D] disabled:opacity-50 disabled:cursor-not-allowed text-[#FFFFFF] text-xs font-semibold shadow-xs transition-all cursor-pointer"
                title="Safely remove all redundant clones while redirecting wikilinks"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>
                  {isCleaning && batchProgress.isActive
                    ? 'Processing...'
                    : `Auto-Clean All Exact Clones (${stats.exactClonesCount})`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Diagnostic Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-xl bg-[#F7F7F4] border border-[#E5E5E1]/80">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C88] block mb-1">
              Total Groups
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-serif font-bold text-[#1A1A1A]">{stats.totalGroups}</span>
              <span className="text-xs text-[#5A5A57] font-mono">({stats.totalDuplicateNotes} notes)</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#065F46] block mb-1">
              Exact Content Clones
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-serif font-bold text-[#065F46]">{stats.exactCount}</span>
              <span className="text-xs text-[#047857] font-mono">100% match</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#92400E] block mb-1">
              Name Collisions
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-serif font-bold text-[#92400E]">{stats.sameNameCount}</span>
              <span className="text-xs text-[#B45309] font-mono">diff folders</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F0F4FF] border border-[#C7D2FE]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#3730A3] block mb-1">
              Potential Savings
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-serif font-bold text-[#3730A3]">
                {stats.potentialBytesSaved > 1024
                  ? `${(stats.potentialBytesSaved / 1024).toFixed(1)} KB`
                  : `${stats.potentialBytesSaved} B`}
              </span>
              <span className="text-xs text-[#4338CA] font-mono">recoverable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F0F0ED] rounded-xl border border-[#E5E5E1] w-full sm:w-auto overflow-x-auto">
          <button
            id="filter-duplicates-all"
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-[#FFFFFF] text-[#1A1A1A] font-semibold shadow-xs'
                : 'text-[#5A5A57] hover:text-[#1A1A1A]'
            }`}
          >
            All Duplicates ({(groups || []).length})
          </button>
          <button
            id="filter-duplicates-exact"
            type="button"
            onClick={() => setFilterType('exact-content')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'exact-content'
                ? 'bg-[#FFFFFF] text-[#065F46] font-semibold shadow-xs'
                : 'text-[#5A5A57] hover:text-[#065F46]'
            }`}
          >
            Exact Clones ({stats.exactCount})
          </button>
          <button
            id="filter-duplicates-same-name"
            type="button"
            onClick={() => setFilterType('same-name')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'same-name'
                ? 'bg-[#FFFFFF] text-[#92400E] font-semibold shadow-xs'
                : 'text-[#5A5A57] hover:text-[#92400E]'
            }`}
          >
            Name Collisions ({stats.sameNameCount})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C88]" />
          <input
            id="search-duplicates-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, folders, tags..."
            className="w-full bg-[#FFFFFF] border border-[#E5E5E1] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#1A1A1A] placeholder-[#8C8C88] focus:outline-none focus:border-[#1A1A1A] shadow-xs"
          />
        </div>
      </div>

      {/* Duplicate Groups List */}
      {filteredGroups.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E5E5E1] rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center mx-auto mb-3.5">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-serif font-bold text-[#1A1A1A] mb-1">No Duplicates Found</h3>
          <p className="text-xs text-[#5A5A57] max-w-md mx-auto">
            {searchQuery
              ? `No duplicate groups match the query "${searchQuery}".`
              : 'Your Obsidian vault is completely free of identical clone notes and cross-folder name collisions!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const isExpanded = expandedGroupIds.has(group.id);
            const isExact = group.type === 'exact-content';

            return (
              <div
                key={group.id}
                id={`duplicate-group-${group.id}`}
                className="bg-[#FFFFFF] border border-[#E5E5E1] rounded-2xl overflow-hidden shadow-xs transition-all hover:border-[#D1D1CB]"
              >
                {/* Group Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#FCFCF9]/70 border-b border-[#E5E5E1]">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isExact
                          ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                          : 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'
                      }`}
                    >
                      {isExact ? <Copy className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-[#1A1A1A]">{group.title || 'Duplicate Group'}</h3>
                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                            isExact
                              ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                              : 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                          }`}
                        >
                          {isExact ? 'Exact Content Match' : 'Name Collision'}
                        </span>
                        <span className="text-[11px] text-[#8C8C88] font-mono">
                          {(group.files || []).length} notes
                        </span>
                      </div>
                      <p className="text-xs text-[#5A5A57] mt-0.5">{group.matchDetail}</p>
                    </div>
                  </div>

                  {/* Group Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      id={`btn-compare-${group.id}`}
                      type="button"
                      onClick={() => handleOpenCompare(group)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F7F7F4] border border-[#E5E5E1] text-[#1A1A1A] text-xs font-medium transition-all cursor-pointer shadow-xs"
                      title="Compare notes side by side"
                    >
                      <GitCompare className="w-3.5 h-3.5 text-[#5A5A57]" />
                      <span>Compare Diff</span>
                    </button>

                    <button
                      id={`btn-merge-group-${group.id}`}
                      type="button"
                      onClick={() => handleOpenMerge(group)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#333330] text-[#FCFCF9] text-xs font-medium transition-all cursor-pointer shadow-xs"
                      title="Merge notes in this group"
                    >
                      <GitMerge className="w-3.5 h-3.5 text-amber-300" />
                      <span>Merge Notes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleGroupExpand(group.id)}
                      className="p-1.5 rounded-lg hover:bg-[#F0F0ED] text-[#5A5A57] transition-colors cursor-pointer"
                      title={isExpanded ? 'Collapse files list' : 'Expand files list'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Group Files List */}
                {isExpanded && (
                  <div className="divide-y divide-[#E5E5E1]/70">
                    {(group.files || []).map((file, idx) => {
                      if (!file) return null;
                      const fileId = file.id || file.path || `file-${idx}`;
                      const safeId = fileId.replace(/[^a-zA-Z0-9]/g, '-');
                      const backlinksCount = Array.isArray(file.backlinks) ? file.backlinks.length : 0;
                      const tagsList = Array.isArray(file.tags) ? file.tags : [];

                      return (
                        <div
                          key={fileId}
                          id={`file-duplicate-row-${safeId}`}
                          className="p-4 hover:bg-[#F7F7F4]/50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-[#F0F0ED] text-[#5A5A57] flex items-center justify-center shrink-0 mt-0.5">
                              <FileText className="w-3.5 h-3.5" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-[#1A1A1A] truncate">{file.name || file.path}</span>
                                {idx === 0 && (
                                  <span className="text-[10px] font-mono bg-[#E0E7FF] text-[#3730A3] border border-[#C7D2FE] px-1.5 py-0.2 rounded-md">
                                    Default Primary
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-[#5A5A57] mt-1 flex-wrap font-sans">
                                <span className="flex items-center gap-1 text-[#8C8C88]">
                                  <Folder className="w-3 h-3" />
                                  <span className="font-mono text-[#1A1A1A]">{file.folder === '/' ? 'Root' : file.folder || 'Root'}</span>
                                </span>
                                <span>•</span>
                                <span>{file.wordCount || 0} words</span>
                                <span>•</span>
                                <span>{file.size || 0} bytes</span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-[#4338CA]">
                                  <Link2 className="w-3.5 h-3.5" />
                                  {backlinksCount} backlinks
                                </span>
                              </div>

                              {/* Tags list */}
                              {tagsList.length > 0 && (
                                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                  {tagsList.map((t) => (
                                    <span
                                      key={t}
                                      className="text-[10px] font-mono bg-[#F0F0ED] text-[#5A5A57] px-1.5 py-0.2 rounded-md border border-[#E5E5E1]"
                                    >
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* File Action Controls */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {onSelectFile && (
                              <button
                                type="button"
                                onClick={() => onSelectFile(file)}
                                className="px-2.5 py-1 text-xs text-[#5A5A57] hover:text-[#1A1A1A] hover:bg-[#F0F0ED] rounded-lg transition-colors cursor-pointer"
                              >
                                Inspect
                              </button>
                            )}

                            <button
                              id={`btn-merge-into-primary-${safeId}`}
                              type="button"
                              onClick={() => handleOpenMerge(group, (group.files || []).find((f) => f && f.path !== file?.path) || null, file)}
                              className="px-2.5 py-1 text-xs font-medium text-[#1A1A1A] bg-[#FFFFFF] hover:bg-[#F7F7F4] border border-[#E5E5E1] rounded-lg transition-colors cursor-pointer shadow-xs"
                            >
                              Merge into Other
                            </button>

                            <button
                              id={`btn-delete-duplicate-${safeId}`}
                              type="button"
                              onClick={() => handleOpenDelete(file, group)}
                              className="p-1.5 text-xs text-[#DC2626] hover:bg-[#FEF2F2] border border-transparent hover:border-[#FEE2E2] rounded-lg transition-colors cursor-pointer"
                              title="Delete this duplicate file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Side-by-Side Comparison Diff Modal */}
      {compareGroup && compareFileA && compareFileB && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1A]/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] border border-[#E5E5E1] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E5E5E1] flex items-center justify-between bg-[#FCFCF9]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] text-[#FCFCF9] flex items-center justify-center">
                  <GitCompare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#1A1A1A]">
                    Side-by-Side Note Diff Comparison
                  </h3>
                  <p className="text-xs text-[#5A5A57]">{compareGroup.title}</p>
                </div>
              </div>

              <button
                id="btn-close-compare-modal"
                type="button"
                onClick={() => setCompareGroup(null)}
                className="p-1.5 rounded-lg hover:bg-[#F0F0ED] text-[#5A5A57] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Note Selector Pickers (if group has 3+ files) */}
            {compareGroup.files && compareGroup.files.length > 2 && (
              <div className="px-5 py-2.5 bg-[#F7F7F4] border-b border-[#E5E5E1] flex items-center justify-between text-xs gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#5A5A57]">Left File:</span>
                  <select
                    value={compareFileA?.path || ''}
                    onChange={(e) => {
                      const found = (compareGroup.files || []).find((f) => f && f.path === e.target.value);
                      if (found) setCompareFileA(found);
                    }}
                    className="bg-[#FFFFFF] border border-[#E5E5E1] rounded-lg px-2 py-1 text-xs text-[#1A1A1A]"
                  >
                    {(compareGroup.files || []).map((f) => (
                      <option key={f.path} value={f.path}>
                        {f.folder}/{f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#5A5A57]">Right File:</span>
                  <select
                    value={compareFileB?.path || ''}
                    onChange={(e) => {
                      const found = (compareGroup.files || []).find((f) => f && f.path === e.target.value);
                      if (found) setCompareFileB(found);
                    }}
                    className="bg-[#FFFFFF] border border-[#E5E5E1] rounded-lg px-2 py-1 text-xs text-[#1A1A1A]"
                  >
                    {(compareGroup.files || []).map((f) => (
                      <option key={f.path} value={f.path}>
                        {f.folder}/{f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Split Comparison Body */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E5E5E1] flex-1 overflow-y-auto min-h-0">
              {/* Left Panel */}
              <div className="p-5 flex flex-col bg-[#FFFFFF]">
                <div className="mb-4 pb-3 border-b border-[#E5E5E1]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1A1A1A] truncate">{compareFileA?.name || compareFileA?.path}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-[#F0F0ED] text-[#5A5A57] rounded-md">
                      {compareFileA?.size || 0} bytes
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#8C8C88] font-mono mt-1">
                    <Folder className="w-3 h-3" />
                    <span>{compareFileA?.folder || '/'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#5A5A57] mt-2">
                    <span>{compareFileA?.wordCount || 0} words</span>
                    <span>•</span>
                    <span>{compareFileA?.backlinks?.length || 0} backlinks</span>
                    <span>•</span>
                    <span>{compareFileA?.outgoingLinks?.length || 0} outgoing links</span>
                  </div>
                  {compareFileA?.tags && compareFileA.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {compareFileA.tags.map((t) => (
                        <span key={t} className="text-[10px] font-mono bg-[#F0F0ED] text-[#5A5A57] px-1.5 py-0.2 rounded-md">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 bg-[#F7F7F4] border border-[#E5E5E1] rounded-xl p-4 overflow-y-auto font-mono text-xs text-[#1A1A1A] leading-relaxed whitespace-pre-wrap select-text">
                  {compareFileA?.content || <span className="text-[#8C8C88] italic">(Empty file content)</span>}
                </div>

                <div className="mt-4 flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenMerge(compareGroup, compareFileA, compareFileB)}
                    className="flex-1 py-1.5 px-3 bg-[#1A1A1A] hover:bg-[#333330] text-[#FCFCF9] text-xs font-medium rounded-lg text-center cursor-pointer shadow-xs"
                  >
                    Keep as Primary (Merge Right into Left)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(compareFileA, compareGroup)}
                    className="py-1.5 px-3 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] text-xs font-medium rounded-lg cursor-pointer"
                    title="Delete Left File"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Panel */}
              <div className="p-5 flex flex-col bg-[#FFFFFF]">
                <div className="mb-4 pb-3 border-b border-[#E5E5E1]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1A1A1A] truncate">{compareFileB?.name || compareFileB?.path}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-[#F0F0ED] text-[#5A5A57] rounded-md">
                      {compareFileB?.size || 0} bytes
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#8C8C88] font-mono mt-1">
                    <Folder className="w-3 h-3" />
                    <span>{compareFileB?.folder || '/'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#5A5A57] mt-2">
                    <span>{compareFileB?.wordCount || 0} words</span>
                    <span>•</span>
                    <span>{compareFileB?.backlinks?.length || 0} backlinks</span>
                    <span>•</span>
                    <span>{compareFileB?.outgoingLinks?.length || 0} outgoing links</span>
                  </div>
                  {compareFileB?.tags && compareFileB.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {compareFileB.tags.map((t) => (
                        <span key={t} className="text-[10px] font-mono bg-[#F0F0ED] text-[#5A5A57] px-1.5 py-0.2 rounded-md">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 bg-[#F7F7F4] border border-[#E5E5E1] rounded-xl p-4 overflow-y-auto font-mono text-xs text-[#1A1A1A] leading-relaxed whitespace-pre-wrap select-text">
                  {compareFileB?.content || <span className="text-[#8C8C88] italic">(Empty file content)</span>}
                </div>

                <div className="mt-4 flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenMerge(compareGroup, compareFileB, compareFileA)}
                    className="flex-1 py-1.5 px-3 bg-[#1A1A1A] hover:bg-[#333330] text-[#FCFCF9] text-xs font-medium rounded-lg text-center cursor-pointer shadow-xs"
                  >
                    Keep as Primary (Merge Left into Right)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(compareFileB, compareGroup)}
                    className="py-1.5 px-3 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] text-xs font-medium rounded-lg cursor-pointer"
                    title="Delete Right File"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge Options Modal */}
      {mergeModalGroup && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1A]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] border border-[#E5E5E1] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E5E5E1] flex items-center justify-between bg-[#FCFCF9]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] text-[#FCFCF9] flex items-center justify-center">
                  <GitMerge className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1A1A1A]">Merge Duplicate Note</h3>
                  <p className="text-xs text-[#5A5A57]">Combine files and update links safely</p>
                </div>
              </div>

              <button
                id="btn-close-merge-modal"
                type="button"
                onClick={() => setMergeModalGroup(null)}
                className="p-1.5 rounded-lg hover:bg-[#F0F0ED] text-[#5A5A57] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Primary Target Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  1. Keep this Note as Primary:
                </label>
                <select
                  value={primaryPath}
                  onChange={(e) => {
                    setPrimaryPath(e.target.value);
                    if (e.target.value === duplicatePath) {
                      const alt = mergeModalGroup.files.find((f) => f.path !== e.target.value);
                      if (alt) setDuplicatePath(alt.path);
                    }
                  }}
                  className="w-full bg-[#FFFFFF] border border-[#E5E5E1] rounded-xl px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                >
                  {(mergeModalGroup.files || []).map((f) => (
                    <option key={f.path} value={f.path}>
                      {f.path} ({f.wordCount || 0} words, {f.backlinks?.length || 0} backlinks)
                    </option>
                  ))}
                </select>
              </div>

              {/* Duplicate Note to Merge In Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  2. Note to Merge & Remove:
                </label>
                <select
                  value={duplicatePath}
                  onChange={(e) => setDuplicatePath(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#E5E5E1] rounded-xl px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                >
                  {(mergeModalGroup.files || [])
                    .filter((f) => f && f.path !== primaryPath)
                    .map((f) => (
                      <option key={f.path} value={f.path}>
                        {f.path} ({f.wordCount || 0} words)
                      </option>
                    ))}
                </select>
              </div>

              {/* Merge Options Checkboxes */}
              <div className="p-4 rounded-xl bg-[#F7F7F4] border border-[#E5E5E1] space-y-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8C8C88] block">
                  Merge Strategy
                </span>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mergeTags}
                    onChange={(e) => setMergeTags(e.target.checked)}
                    className="mt-0.5 rounded border-[#E5E5E1] text-[#1A1A1A] focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-medium text-[#1A1A1A] block">Combine Tags & Metadata</span>
                    <span className="text-[11px] text-[#5A5A57]">
                      Merges unique tags from duplicate into the primary note's YAML frontmatter.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={appendContent}
                    onChange={(e) => setAppendContent(e.target.checked)}
                    className="mt-0.5 rounded border-[#E5E5E1] text-[#1A1A1A] focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-medium text-[#1A1A1A] block">Append Non-Duplicate Content</span>
                    <span className="text-[11px] text-[#5A5A57]">
                      If bodies differ, appends unique content under a clean section header.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={redirectLinks}
                    onChange={(e) => setRedirectLinks(e.target.checked)}
                    className="mt-0.5 rounded border-[#E5E5E1] text-[#1A1A1A] focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-medium text-[#1A1A1A] block">Redirect Wikilinks across Vault</span>
                    <span className="text-[11px] text-[#5A5A57]">
                      Updates any `[[note]]` wikilinks pointing to the merged duplicate to point to the primary note.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-5 border-t border-[#E5E5E1] bg-[#FCFCF9] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMergeModalGroup(null)}
                className="px-3.5 py-2 text-xs font-medium text-[#5A5A57] hover:text-[#1A1A1A] hover:bg-[#F0F0ED] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-execute-merge"
                type="button"
                onClick={handleExecuteMerge}
                className="px-4 py-2 text-xs font-semibold text-[#FCFCF9] bg-[#1A1A1A] hover:bg-[#333330] rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Confirm & Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteFileItem && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1A]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] border border-[#E5E5E1] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E5E5E1] flex items-center justify-between bg-[#FCFCF9]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1A1A1A]">Delete Duplicate Note</h3>
                  <p className="text-xs text-[#5A5A57]">Permanently remove duplicate file</p>
                </div>
              </div>

              <button
                id="btn-close-delete-modal"
                type="button"
                onClick={() => setDeleteFileItem(null)}
                className="p-1.5 rounded-lg hover:bg-[#F0F0ED] text-[#5A5A57] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-[#1A1A1A]">
                Are you sure you want to delete <strong className="font-mono text-[#B91C1C]">{deleteFileItem.file?.name || 'this note'}</strong> from <strong className="font-mono">{deleteFileItem.file?.folder || '/'}</strong>?
              </p>

              {(deleteFileItem.file?.backlinks?.length || 0) > 0 && (
                <div className="p-3.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A]">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#92400E] mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>This note has {deleteFileItem.file?.backlinks?.length || 0} incoming backlinks!</span>
                  </div>
                  <p className="text-[11px] text-[#78350F] mb-2">
                    Redirect backlinks to the preserved note to avoid creating broken links:
                  </p>
                  <select
                    value={redirectOnDeletePath}
                    onChange={(e) => setRedirectOnDeletePath(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#FDE68A] rounded-lg px-2.5 py-1.5 text-xs text-[#1A1A1A]"
                  >
                    <option value="">Do not redirect (leave broken)</option>
                    {(deleteFileItem.group?.files || [])
                      .filter((f) => f && f.path !== deleteFileItem.file?.path)
                      .map((f) => (
                        <option key={f.path} value={f.path}>
                          Redirect to: {f.path}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-[#E5E5E1] bg-[#FCFCF9] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteFileItem(null)}
                className="px-3.5 py-2 text-xs font-medium text-[#5A5A57] hover:text-[#1A1A1A] hover:bg-[#F0F0ED] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-execute-delete"
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#DC2626] hover:bg-[#B91C1C] rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batched Execution Loading Modal */}
      {batchProgress.isActive && (
        <div
          id="duplicate-batch-loading-modal"
          className="fixed inset-0 z-50 bg-[#1A1A1A]/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-[#FFFFFF] border border-[#E5E5E1] rounded-2xl w-full max-w-md shadow-2xl p-6 overflow-hidden space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#166534] text-[#FFFFFF] flex items-center justify-center shrink-0 shadow-xs">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-200" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1A1A1A] truncate">{batchProgress.title}</h3>
                  <span className="text-xs font-mono font-bold text-[#166534]">
                    {batchProgress.percentage}%
                  </span>
                </div>
                <p className="text-[11px] text-[#5A5A57] mt-0.5">
                  Processing in non-blocking background batches
                </p>
              </div>
            </div>

            {/* Progress Track */}
            <div className="space-y-1.5">
              <div className="w-full h-2.5 bg-[#F0F0ED] rounded-full overflow-hidden border border-[#E5E5E1]/60">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(4, batchProgress.percentage)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#8C8C88] font-mono">
                <span className="capitalize">
                  Phase: {batchProgress.phase.replace('-', ' ')}
                </span>
                {batchProgress.total > 0 && (
                  <span>
                    {batchProgress.current} / {batchProgress.total} items
                  </span>
                )}
              </div>
            </div>

            {/* Message and Status */}
            <div className="p-3 bg-[#F7F7F4] border border-[#E5E5E1] rounded-xl flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-[#5A5A57] shrink-0" />
              <span className="text-xs text-[#1A1A1A] font-medium leading-tight truncate">
                {batchProgress.message || 'Processing background incremental batch...'}
              </span>
            </div>

            <p className="text-[10px] text-center text-[#8C8C88]">
              Safely updating markdown notes, removing redundant copies, and maintaining wikilink integrity.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
