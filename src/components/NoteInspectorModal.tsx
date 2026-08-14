import React, { useState } from 'react';
import {
  X,
  FileText,
  AlertTriangle,
  Folder,
  Tag,
  Edit3,
  Check,
  ExternalLink,
} from 'lucide-react';
import { VaultFile } from '../types';

interface NoteInspectorModalProps {
  note: VaultFile | null;
  allFiles: VaultFile[];
  onClose: () => void;
  onNavigateToNote: (targetName: string) => void;
  onUpdateNoteContent: (fileId: string, newContent: string) => void;
}

export const NoteInspectorModal: React.FC<NoteInspectorModalProps> = ({
  note,
  allFiles,
  onClose,
  onNavigateToNote,
  onUpdateNoteContent,
}) => {
  if (!note) return null;

  const [activeSideTab, setActiveSideTab] = useState<'backlinks' | 'outgoing' | 'frontmatter'>('backlinks');
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState(note.content);

  // Sync state if note changes
  React.useEffect(() => {
    setEditableContent(note.content);
    setIsEditing(false);
  }, [note]);

  const handleSave = () => {
    onUpdateNoteContent(note.id, editableContent);
    setIsEditing(false);
  };

  // Render Markdown with clickable [[wikilinks]]
  const renderInteractiveMarkdown = (rawContent: string) => {
    // Strip frontmatter for body rendering
    let body = rawContent;
    const fmMatch = rawContent.match(/^---[\s\S]*?---\r?\n?/);
    if (fmMatch) {
      body = rawContent.slice(fmMatch[0].length);
    }

    const lines = body.split('\n');

    return (
      <div className="space-y-3 font-serif text-base text-[#1A1A1A] leading-relaxed">
        {lines.map((line, lIdx) => {
          // Check for headings
          if (line.startsWith('# ')) {
            return (
              <h1 key={lIdx} className="text-2xl font-bold font-serif text-[#1A1A1A] pt-4 pb-1 border-b border-[#E5E5E1]">
                {renderLineContent(line.slice(2))}
              </h1>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2 key={lIdx} className="text-xl font-bold font-serif text-[#1A1A1A] pt-3 pb-0.5">
                {renderLineContent(line.slice(3))}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <h3 key={lIdx} className="text-lg font-bold font-serif text-[#1A1A1A] pt-2">
                {renderLineContent(line.slice(4))}
              </h3>
            );
          }
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            return (
              <li key={lIdx} className="ml-4 list-disc text-[#333330] font-sans text-sm">
                {renderLineContent(line.trim().slice(2))}
              </li>
            );
          }
          if (line.trim() === '') {
            return <div key={lIdx} className="h-2" />;
          }

          return <p key={lIdx}>{renderLineContent(line)}</p>;
        })}
      </div>
    );
  };

  // Helper to replace [[wikilinks]] with interactive clickable spans
  const renderLineContent = (text: string) => {
    const parts: React.ReactNode[] = [];
    const wikiRegex = /(!?)\[\[([^\]]+)\]\]/g;
    let lastIndex = 0;
    let match;

    while ((match = wikiRegex.exec(text)) !== null) {
      const startIndex = match.index;
      if (startIndex > lastIndex) {
        parts.push(text.substring(lastIndex, startIndex));
      }

      const isEmbed = match[1] === '!';
      const rawTarget = match[2];
      const targetBase = rawTarget.split('|')[0].split('#')[0].trim();
      const alias = rawTarget.includes('|') ? rawTarget.split('|')[1].trim() : targetBase;

      // Check if target exists
      const targetLower = targetBase.toLowerCase();
      const targetFile = allFiles.find(
        (f) =>
          f.baseName.toLowerCase() === targetLower ||
          f.id.toLowerCase() === targetLower ||
          f.name.toLowerCase() === targetLower
      );

      const isBroken = !targetFile;

      parts.push(
        <button
          key={`${startIndex}-${rawTarget}`}
          type="button"
          onClick={() => onNavigateToNote(targetBase)}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded font-sans text-xs cursor-pointer transition-all ${
            isBroken
              ? 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] hover:bg-[#FEE2E2]'
              : 'bg-[#F0F0ED] text-[#1A1A1A] border border-[#E5E5E1] hover:bg-[#E5E5E1] underline underline-offset-2'
          }`}
          title={isBroken ? `Broken link: Note "${targetBase}" does not exist` : `Go to "${targetBase}"`}
        >
          {isEmbed && <span className="opacity-70">!</span>}
          <span>[[{alias}]]</span>
          {isBroken && <AlertTriangle className="w-3 h-3 text-[#DC2626] inline ml-0.5" />}
        </button>
      );

      lastIndex = startIndex + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-5xl h-[88vh] bg-[#FCFCF9] border border-[#E5E5E1] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E1] bg-[#FFFFFF]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-[#F7F7F4] border border-[#E5E5E1] text-[#1A1A1A] shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-serif font-bold text-[#1A1A1A] truncate">{note.baseName}</h3>
                <span className="text-xs font-mono text-[#8C8C88]">{note.extension}</span>
              </div>
              <p className="text-[11px] text-[#5A5A57] font-mono truncate">{note.path}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                isEditing
                  ? 'bg-[#1A1A1A] text-[#FCFCF9]'
                  : 'bg-[#F7F7F4] hover:bg-[#E5E5E1] text-[#1A1A1A] border border-[#E5E5E1]'
              }`}
            >
              {isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              <span>{isEditing ? 'Done' : 'Edit / Fix'}</span>
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={handleSave}
                className="px-3.5 py-1.5 rounded-md bg-[#1A1A1A] hover:bg-[#333330] text-[#FCFCF9] text-xs font-semibold cursor-pointer shadow-xs"
              >
                Save Changes
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-[#8C8C88] hover:text-[#1A1A1A] hover:bg-[#F7F7F4] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body (2 Columns) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden bg-[#FCFCF9]">
          {/* Left / Main: Note Reader or Editor */}
          <div className="lg:col-span-2 p-6 sm:p-8 overflow-y-auto border-b lg:border-b-0 lg:border-r border-[#E5E5E1] space-y-4 bg-[#FCFCF9]">
            {/* Metadata Tags Pill Bar */}
            {note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-3 border-b border-[#E5E5E1]">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#F0F0ED] border border-[#E5E5E1] text-[#1A1A1A]"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    <span>#{tag}</span>
                  </span>
                ))}
              </div>
            )}

            {isEditing ? (
              <textarea
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                className="w-full h-[460px] bg-[#FFFFFF] border border-[#E5E5E1] rounded-xl p-4 font-mono text-xs text-[#1A1A1A] leading-relaxed focus:outline-none focus:border-[#1A1A1A] resize-none shadow-xs"
              />
            ) : (
              <div className="max-w-none">
                {renderInteractiveMarkdown(note.content)}
              </div>
            )}
          </div>

          {/* Right Panel: Backlinks & Connections Inspector */}
          <div className="lg:col-span-1 flex flex-col bg-[#F7F7F4] overflow-hidden">
            {/* Inspector Subtabs */}
            <div className="flex items-center border-b border-[#E5E5E1] p-2 gap-1 bg-[#FFFFFF]">
              <button
                type="button"
                onClick={() => setActiveSideTab('backlinks')}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  activeSideTab === 'backlinks'
                    ? 'bg-[#1A1A1A] text-[#FCFCF9] font-bold shadow-xs'
                    : 'text-[#5A5A57] hover:text-[#1A1A1A]'
                }`}
              >
                Backlinks ({note.backlinks.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSideTab('outgoing')}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  activeSideTab === 'outgoing'
                    ? 'bg-[#1A1A1A] text-[#FCFCF9] font-bold shadow-xs'
                    : 'text-[#5A5A57] hover:text-[#1A1A1A]'
                }`}
              >
                Outgoing ({note.outgoingLinks.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSideTab('frontmatter')}
                className={`py-1.5 px-2.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  activeSideTab === 'frontmatter'
                    ? 'bg-[#1A1A1A] text-[#FCFCF9] font-bold shadow-xs'
                    : 'text-[#5A5A57] hover:text-[#1A1A1A]'
                }`}
              >
                YAML
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {activeSideTab === 'backlinks' && (
                <div>
                  <div className="text-[10px] font-semibold text-[#8C8C88] mb-2 uppercase tracking-wider">
                    Linked Mentions ({note.backlinks.length})
                  </div>
                  {note.backlinks.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] text-center text-xs text-[#8C8C88]">
                      No incoming backlinks. This note is unreferenced by other notes.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {note.backlinks.map((bl, idx) => (
                        <div
                          key={`${bl.sourceId}-${idx}`}
                          onClick={() => onNavigateToNote(bl.sourceTitle)}
                          className="p-3.5 rounded-lg bg-[#FFFFFF] hover:bg-[#FDFDFD] border border-[#E5E5E1] hover:border-[#1A1A1A] transition-all cursor-pointer shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-xs font-semibold font-serif text-[#1A1A1A]">
                            <span>{bl.sourceTitle}</span>
                            <span className="font-mono text-[10px] text-[#8C8C88]">Line {bl.line}</span>
                          </div>
                          <code className="text-[11px] text-[#5A5A57] font-mono mt-1 block truncate">
                            {bl.snippet}
                          </code>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSideTab === 'outgoing' && (
                <div>
                  <div className="text-[10px] font-semibold text-[#8C8C88] mb-2 uppercase tracking-wider">
                    Outgoing Links ({note.outgoingLinks.length})
                  </div>
                  {note.outgoingLinks.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] text-center text-xs text-[#8C8C88]">
                      Zero outgoing links. This is a sink note.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {note.outgoingLinks.map((ol, idx) => (
                        <div
                          key={`${ol.target}-${idx}`}
                          onClick={() => onNavigateToNote(ol.target)}
                          className={`p-3.5 rounded-lg border transition-all cursor-pointer shadow-2xs ${
                            ol.isBroken
                              ? 'bg-[#FEF2F2] border-[#FECACA] hover:border-[#DC2626]'
                              : 'bg-[#FFFFFF] border-[#E5E5E1] hover:border-[#1A1A1A]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className={ol.isBroken ? 'text-[#991B1B]' : 'text-[#1A1A1A]'}>
                              [[{ol.target}]]
                            </span>
                            {ol.isBroken ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
                                Missing
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#166534] font-medium">Resolved</span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#8C8C88] font-mono mt-1 block">
                            Line {ol.line} • {ol.isEmbed ? 'Embed' : 'Link'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSideTab === 'frontmatter' && (
                <div className="space-y-3">
                  <div className="text-[10px] font-semibold text-[#8C8C88] uppercase tracking-wider">
                    YAML Metadata
                  </div>
                  {note.frontmatter ? (
                    <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] space-y-2 text-xs font-mono text-[#1A1A1A] shadow-xs">
                      {Object.entries(note.frontmatter).map(([key, val]) => (
                        <div key={key} className="border-b border-[#E5E5E1] pb-1.5 last:border-0 last:pb-0">
                          <span className="text-[#78350F] font-semibold">{key}: </span>
                          <span className="text-[#1A1A1A]">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] text-center text-xs text-[#8C8C88]">
                      No frontmatter block in this note.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
