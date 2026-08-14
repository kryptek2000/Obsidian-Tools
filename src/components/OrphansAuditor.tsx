import React, { useState } from 'react';
import {
  FileQuestion,
  Search,
  ExternalLink,
  Folder,
  FileText,
  Sparkles,
  Link,
  ArrowUpRight,
  ArrowDownLeft,
  Wand2,
  FolderTree,
  Tags,
} from 'lucide-react';
import { VaultFile } from '../types';

interface OrphansAuditorProps {
  files: VaultFile[];
  onSelectNote: (note: VaultFile) => void;
  onAutoGenerateMOC?: () => void;
  onAutoTagOrphans?: () => void;
}

export const OrphansAuditor: React.FC<OrphansAuditorProps> = ({
  files,
  onSelectNote,
  onAutoGenerateMOC,
  onAutoTagOrphans,
}) => {
  const [subTab, setSubTab] = useState<'orphans' | 'sinks' | 'sources'>('orphans');
  const [search, setSearch] = useState('');

  const notesOnly = files.filter((f) => !f.isAttachment);

  // Pure orphans: 0 in and 0 out
  const orphanNotes = notesOnly.filter((f) => f.isOrphan);
  // Sinks: in > 0, out = 0 (Dead-end notes)
  const sinkNotes = notesOnly.filter((f) => f.isSink);
  // Sources: in = 0, out > 0 (Root or unreferenced starter notes)
  const sourceNotes = notesOnly.filter((f) => f.isSource);

  const currentList =
    subTab === 'orphans' ? orphanNotes : subTab === 'sinks' ? sinkNotes : sourceNotes;

  const filteredList = currentList.filter((note) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        note.baseName.toLowerCase().includes(q) ||
        note.folder.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Info & Sub-navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C8C88]">
              Graph Topology Audit
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E]">
              {orphanNotes.length} orphans
            </span>
          </div>
          <h3 className="text-xl font-serif font-bold text-[#1A1A1A]">
            Disconnected & Dead-End Notes
          </h3>
          <p className="text-xs text-[#5A5A57] mt-0.5 font-sans">
            Identify isolated island notes and terminal dead-ends to reinforce your knowledge network.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onAutoGenerateMOC && orphanNotes.length > 0 && (
            <button
              type="button"
              onClick={onAutoGenerateMOC}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#333330] text-[#FCFCF9] text-xs font-semibold shadow-xs cursor-pointer transition-all"
            >
              <FolderTree className="w-3.5 h-3.5 text-amber-300" />
              <span>Auto-Generate MOC Index ({orphanNotes.length} notes)</span>
            </button>
          )}

          {onAutoTagOrphans && orphanNotes.length > 0 && (
            <button
              type="button"
              onClick={onAutoTagOrphans}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F7F7F4] hover:bg-[#E5E5E1] border border-[#E5E5E1] text-[#1A1A1A] text-xs font-medium cursor-pointer transition-all shadow-xs"
            >
              <Tags className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Auto-Tag Orphans</span>
            </button>
          )}
        </div>
      </div>

      {/* Subtabs & Search Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C88]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search note..."
              className="w-full bg-[#FFFFFF] border border-[#E5E5E1] rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-[#1A1A1A] placeholder:text-[#8C8C88] focus:outline-none focus:border-[#1A1A1A] shadow-xs"
            />
          </div>

          {/* Subtabs */}
          <div className="flex items-center bg-[#F7F7F4] p-1 rounded-lg border border-[#E5E5E1]">
            <button
              type="button"
              onClick={() => setSubTab('orphans')}
              className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                subTab === 'orphans'
                  ? 'bg-[#FFFFFF] text-[#1A1A1A] font-bold shadow-xs'
                  : 'text-[#5A5A57] hover:text-[#1A1A1A] font-medium'
              }`}
            >
              Orphans ({orphanNotes.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('sinks')}
              className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                subTab === 'sinks'
                  ? 'bg-[#FFFFFF] text-[#1A1A1A] font-bold shadow-xs'
                  : 'text-[#5A5A57] hover:text-[#1A1A1A] font-medium'
              }`}
            >
              Dead-Ends ({sinkNotes.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('sources')}
              className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                subTab === 'sources'
                  ? 'bg-[#FFFFFF] text-[#1A1A1A] font-bold shadow-xs'
                  : 'text-[#5A5A57] hover:text-[#1A1A1A] font-medium'
              }`}
            >
              Unreferenced ({sourceNotes.length})
            </button>
          </div>
        </div>
      </div>

      {/* Educational Notice Banner */}
      <div className="p-4 rounded-xl bg-[#F7F7F4] border border-[#E5E5E1] text-xs text-[#5A5A57] flex items-start gap-3 shadow-xs">
        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed font-sans">
          {subTab === 'orphans' && (
            <span>
              <strong className="font-semibold text-[#1A1A1A]">Orphan Notes:</strong> These notes have 0 backlinks and 0 outgoing links. You can click <strong>"Auto-Generate MOC Index"</strong> above to instantly generate an organized Map of Content (`00 - Knowledge Index & MOC.md`) linking all of them together!
            </span>
          )}
          {subTab === 'sinks' && (
            <span>
              <strong className="font-semibold text-[#1A1A1A]">Dead-End (Sink) Notes:</strong> Other notes link to these, but they have 0 outgoing links of their own. Consider adding forward links or related concept links to continue the associative trail.
            </span>
          )}
          {subTab === 'sources' && (
            <span>
              <strong className="font-semibold text-[#1A1A1A]">Unreferenced Notes:</strong> These notes link to other ideas, but no other notes link back to them. Consider referencing them in your daily notes or topic MOCs.
            </span>
          )}
        </div>
      </div>

      {/* Notes Grid / List */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] shadow-xs">
          <FileText className="w-10 h-10 text-[#8C8C88] mx-auto mb-2" />
          <h4 className="text-base font-serif font-bold text-[#1A1A1A]">No notes in this category</h4>
          <p className="text-xs text-[#5A5A57] mt-1 font-sans">Your vault has great connectivity in this dimension!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((note) => {
            const previewSnippet = note.content
              .replace(/^---[\s\S]*?---\s*/, '')
              .replace(/[#*`_~[\]]/g, '')
              .slice(0, 140)
              .trim();

            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note)}
                className="p-5 rounded-xl bg-[#FFFFFF] hover:bg-[#FDFDFD] border border-[#E5E5E1] hover:border-[#1A1A1A] transition-all cursor-pointer flex flex-col justify-between space-y-3 shadow-xs group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-[#1A1A1A] group-hover:underline truncate font-serif">
                        {note.baseName}
                      </h4>
                      <div className="text-[11px] text-[#8C8C88] flex items-center gap-1.5 mt-0.5">
                        <Folder className="w-3 h-3" />
                        <span className="truncate">{note.folder}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono">
                      {subTab === 'sinks' ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-[#3730A3] flex items-center gap-1">
                          <ArrowDownLeft className="w-3 h-3" /> {note.backlinks.length} in
                        </span>
                      ) : subTab === 'sources' ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#F0F9FF] border border-[#BAE6FD] text-[#0369A1] flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3" /> {note.outgoingLinks.length} out
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E]">
                          0 links
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#5A5A57] mt-3 line-clamp-2 leading-relaxed font-sans">
                    {previewSnippet || '(Empty note body)'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#E5E5E1] text-[11px] text-[#8C8C88]">
                  <span>{note.wordCount} words</span>
                  <span className="text-[#1A1A1A] group-hover:underline flex items-center gap-1 font-semibold">
                    <span>Inspect note</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
