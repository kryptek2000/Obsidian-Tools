import React, { useState } from 'react';
import {
  Tags,
  Search,
  AlertCircle,
  FileText,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Wand2,
  Tag,
  Check,
} from 'lucide-react';
import { VaultFile, TagAuditItem } from '../types';

interface TagsAuditorProps {
  tagAuditItems: TagAuditItem[];
  files: VaultFile[];
  onSelectNote: (note: VaultFile) => void;
  onStandardizeCasings?: () => void;
  onAutoTagUntagged?: () => void;
  onRenameTag?: (oldTag: string, newTag: string) => void;
}

export const TagsAuditor: React.FC<TagsAuditorProps> = ({
  tagAuditItems,
  files,
  onSelectNote,
  onStandardizeCasings,
  onAutoTagUntagged,
  onRenameTag,
}) => {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(
    tagAuditItems.length > 0 ? tagAuditItems[0].tag : null
  );
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const notesOnly = files.filter((f) => !f.isAttachment);
  const untaggedNotes = notesOnly.filter((f) => f.tags.length === 0);

  // Filter tags
  const filteredTags = tagAuditItems.filter((t) => {
    if (search.trim()) {
      return t.tag.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  // Duplicate casing warnings
  const inconsistentTags = tagAuditItems.filter(
    (t) => t.potentialDuplicates && t.potentialDuplicates.length > 0
  );

  // Selected tag notes
  const activeTagItem = tagAuditItems.find((t) => t.tag === selectedTag);
  const notesForActiveTag = selectedTag
    ? notesOnly.filter((n) => n.tags.includes(selectedTag))
    : [];

  const handleStartRename = () => {
    if (selectedTag && selectedTag !== '__untagged__') {
      setNewTagName(selectedTag);
      setIsRenaming(true);
    }
  };

  const handleSaveRename = () => {
    if (selectedTag && newTagName.trim() && onRenameTag) {
      onRenameTag(selectedTag, newTagName.trim());
      setIsRenaming(false);
      setSelectedTag(newTagName.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C8C88]">
              Taxonomy Architecture
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#F0F0ED] border border-[#E5E5E1] text-[#1A1A1A]">
              {tagAuditItems.length} tags
            </span>
          </div>
          <h3 className="text-xl font-serif font-bold text-[#1A1A1A]">
            Tags Taxonomy & Consistency Audit
          </h3>
          <p className="text-xs text-[#5A5A57] mt-0.5 font-sans">
            Audit tag frequencies, fix case discrepancies, and locate untagged files.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onStandardizeCasings && inconsistentTags.length > 0 && (
            <button
              type="button"
              onClick={onStandardizeCasings}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#333330] text-[#FCFCF9] text-xs font-semibold shadow-xs cursor-pointer transition-all"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Standardize Tag Casings ({inconsistentTags.length})</span>
            </button>
          )}

          {onAutoTagUntagged && untaggedNotes.length > 0 && (
            <button
              type="button"
              onClick={onAutoTagUntagged}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#F7F7F4] hover:bg-[#E5E5E1] border border-[#E5E5E1] text-[#1A1A1A] text-xs font-medium cursor-pointer transition-all shadow-xs"
            >
              <Tag className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Auto-Tag Untagged ({untaggedNotes.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Casing / Inconsistency Alert */}
      {inconsistentTags.length > 0 && (
        <div className="p-4 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#92400E]">
              <AlertCircle className="w-4 h-4" />
              <span>Tag Casing Inconsistencies Detected</span>
            </div>
            <p className="text-xs text-[#78350F] leading-relaxed font-sans">
              These tags have multiple case variations across notes. Standardizing them to lowercase prevents fragmented search queries:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {inconsistentTags.map((item) => (
                <div
                  key={item.tag}
                  className="px-2.5 py-1 rounded-md bg-[#FFFFFF] border border-[#FDE68A] text-xs font-mono text-[#92400E] shadow-2xs"
                >
                  <span>#{item.tag}</span>
                  <span className="text-[#8C8C88] mx-1.5">vs</span>
                  <span className="text-[#1A1A1A] font-bold">#{item.potentialDuplicates?.join(', #')}</span>
                </div>
              ))}
            </div>
          </div>

          {onStandardizeCasings && (
            <button
              type="button"
              onClick={onStandardizeCasings}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#92400E] hover:bg-[#78350F] text-[#FFFFFF] text-xs font-semibold cursor-pointer shadow-xs transition-all shrink-0"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Auto-Standardize All</span>
            </button>
          )}
        </div>
      )}

      {/* 2-Column Tag Layout: Left Tag List / Right Tag Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Tag Cloud & List */}
        <div className="md:col-span-1 p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-semibold text-[#8C8C88] uppercase tracking-[0.2em]">
            <span>Tags ({filteredTags.length})</span>
            <span>Usage</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C88]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tags..."
              className="w-full bg-[#F7F7F4] border border-[#E5E5E1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#1A1A1A] placeholder:text-[#8C8C88] focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>

          <div className="space-y-1 max-h-[440px] overflow-y-auto pr-1">
            {filteredTags.map((item) => (
              <button
                key={item.tag}
                type="button"
                onClick={() => {
                  setSelectedTag(item.tag);
                  setIsRenaming(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                  selectedTag === item.tag
                    ? 'bg-[#1A1A1A] text-[#FCFCF9] font-medium shadow-xs'
                    : 'text-[#1A1A1A] hover:bg-[#F7F7F4] border border-transparent'
                }`}
              >
                <span className="truncate font-mono">#{item.tag}</span>
                <span
                  className={`font-mono text-[11px] shrink-0 ml-2 ${
                    selectedTag === item.tag ? 'text-[#D6D6D2]' : 'text-[#8C8C88]'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            ))}
          </div>

          {/* Untagged Button */}
          {untaggedNotes.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedTag('__untagged__');
                setIsRenaming(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs border transition-all cursor-pointer ${
                selectedTag === '__untagged__'
                  ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] font-bold shadow-xs'
                  : 'bg-[#F7F7F4] text-[#5A5A57] border-[#E5E5E1] hover:text-[#1A1A1A]'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-[#92400E]" />
                <span>Untagged Notes</span>
              </span>
              <span className="font-mono text-[#92400E] font-bold">{untaggedNotes.length}</span>
            </button>
          )}
        </div>

        {/* Right: Notes with Active Tag */}
        <div className="md:col-span-2 p-5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E5E5E1] pb-3 flex-wrap gap-2">
            <div>
              {isRenaming ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="bg-[#F7F7F4] border border-[#1A1A1A] rounded-md px-2.5 py-1 text-xs font-mono text-[#1A1A1A] focus:outline-none"
                    placeholder="new-tag-name"
                  />
                  <button
                    type="button"
                    onClick={handleSaveRename}
                    className="px-2.5 py-1 rounded-md bg-[#166534] hover:bg-[#14532D] text-[#FFFFFF] text-xs font-semibold cursor-pointer"
                  >
                    Rename Everywhere
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRenaming(false)}
                    className="px-2 py-1 text-xs text-[#8C8C88] hover:text-[#1A1A1A] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <h4 className="text-base font-serif font-bold text-[#1A1A1A] flex items-center gap-2">
                  {selectedTag === '__untagged__' ? (
                    <span className="text-[#92400E]">Untagged Notes ({untaggedNotes.length})</span>
                  ) : (
                    <>
                      <span className="font-mono text-[#1A1A1A]">#{selectedTag}</span>
                      <span className="text-xs text-[#8C8C88] font-sans font-normal">
                        ({notesForActiveTag.length} notes)
                      </span>
                    </>
                  )}
                </h4>
              )}
            </div>

            {selectedTag && selectedTag !== '__untagged__' && onRenameTag && !isRenaming && (
              <button
                type="button"
                onClick={handleStartRename}
                className="text-xs text-[#5A5A57] hover:text-[#1A1A1A] hover:underline cursor-pointer flex items-center gap-1 font-medium"
              >
                <Tag className="w-3 h-3" />
                <span>Rename tag #{selectedTag} across vault</span>
              </button>
            )}
          </div>

          {/* Notes List */}
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {(selectedTag === '__untagged__' ? untaggedNotes : notesForActiveTag).map((note) => (
              <div
                key={note.id}
                onClick={() => onSelectNote(note)}
                className="p-3.5 rounded-lg bg-[#F7F7F4] hover:bg-[#F0F0ED] border border-[#E5E5E1] hover:border-[#1A1A1A] transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-2xs"
              >
                <div className="min-w-0">
                  <h5 className="text-xs font-semibold text-[#1A1A1A] truncate group-hover:underline font-serif">
                    {note.baseName}
                  </h5>
                  <p className="text-[11px] text-[#8C8C88] truncate mt-0.5 font-sans">{note.folder}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-mono text-[#8C8C88]">
                    {note.wordCount} words
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#5A5A57] group-hover:text-[#1A1A1A]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
