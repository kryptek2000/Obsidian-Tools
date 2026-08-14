import React, { useState } from 'react';
import {
  FileCode,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Code,
  Info,
  Wand2,
  Sparkles,
} from 'lucide-react';
import { FrontmatterIssueItem, VaultFile } from '../types';

interface FrontmatterAuditorProps {
  issues: FrontmatterIssueItem[];
  files: VaultFile[];
  onSelectNote: (note: VaultFile) => void;
  onAutoRepairAllFrontmatter?: () => void;
  onRepairSingleNote?: (fileId: string) => void;
}

export const FrontmatterAuditor: React.FC<FrontmatterAuditorProps> = ({
  issues,
  files,
  onSelectNote,
  onAutoRepairAllFrontmatter,
  onRepairSingleNote,
}) => {
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const errorIssues = issues.filter((i) => i.severity === 'error');
  const warningIssues = issues.filter((i) => i.severity === 'warning');

  const standardTemplate = `---
title: Note Title
date: ${new Date().toISOString().split('T')[0]}
tags:
  - pkm
  - evergreen
status: active
aliases: []
---`;

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(standardTemplate);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C8C88]">
              Schema & Metadata Lint
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-[#3730A3]">
              {issues.length} flagged
            </span>
          </div>
          <h3 className="text-xl font-serif font-bold text-[#1A1A1A]">
            YAML Frontmatter & Properties Diagnostics
          </h3>
          <p className="text-xs text-[#5A5A57] mt-0.5 font-sans">
            Validates Obsidian YAML metadata blocks for syntax errors, Dataview compatibility, and schema completeness.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onAutoRepairAllFrontmatter && issues.length > 0 && (
            <button
              type="button"
              onClick={onAutoRepairAllFrontmatter}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#333330] text-[#FCFCF9] text-xs font-semibold shadow-xs cursor-pointer transition-all"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Auto-Repair All Frontmatter ({issues.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyTemplate}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#F7F7F4] hover:bg-[#E5E5E1] border border-[#E5E5E1] text-[#1A1A1A] text-xs font-medium cursor-pointer transition-all shrink-0 shadow-xs"
          >
            {copiedTemplate ? <Check className="w-3.5 h-3.5 text-[#166534]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedTemplate ? 'Copied Template!' : 'Copy YAML Schema'}</span>
          </button>
        </div>
      </div>

      {/* Issues Section */}
      {issues.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-serif font-bold text-[#1A1A1A] mb-1">
            All Frontmatter Blocks Are Valid
          </h4>
          <p className="text-xs text-[#5A5A57] max-w-sm mx-auto font-sans">
            Every note in this vault has a clean, parseable YAML metadata block.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Syntax Errors First */}
          {errorIssues.map((item, idx) => {
            const file = files.find((f) => f.id === item.fileId);
            return (
              <div
                key={`err-${item.fileId}-${idx}`}
                className="p-4 rounded-xl bg-[#FFFFFF] border border-[#FECACA] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-1.5 rounded-lg bg-[#FEF2F2] text-[#991B1B] mt-0.5 shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-[#1A1A1A] truncate font-serif">
                        {item.fileName}
                      </h4>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#991B1B] font-mono border border-[#FECACA]">
                        Syntax Error
                      </span>
                    </div>
                    <p className="text-xs text-[#991B1B] font-mono mt-1 break-all bg-[#FEF2F2] p-2 rounded border border-[#FECACA]">
                      {item.reason}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onRepairSingleNote && (
                    <button
                      type="button"
                      onClick={() => onRepairSingleNote(item.fileId)}
                      className="px-3 py-1.5 rounded-md bg-[#166534] hover:bg-[#14532D] text-[#FFFFFF] text-xs font-semibold shrink-0 cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>Auto-Fix YAML</span>
                    </button>
                  )}

                  {file && (
                    <button
                      type="button"
                      onClick={() => onSelectNote(file)}
                      className="px-3 py-1.5 rounded-md bg-[#1A1A1A] hover:bg-[#333330] text-[#FCFCF9] text-xs font-semibold shrink-0 cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                    >
                      <span>Inspect</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Warnings (Missing Frontmatter, etc) */}
          {warningIssues.map((item, idx) => {
            const file = files.find((f) => f.id === item.fileId);
            return (
              <div
                key={`warn-${item.fileId}-${idx}`}
                className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-1.5 rounded-lg bg-[#F7F7F4] text-[#8C8C88] mt-0.5 shrink-0">
                    <Info className="w-4 h-4 text-[#1A1A1A]" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-[#1A1A1A] truncate font-serif">
                      {item.fileName}
                    </h4>
                    <p className="text-[11px] text-[#5A5A57] mt-0.5 font-sans">{item.reason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onRepairSingleNote && (
                    <button
                      type="button"
                      onClick={() => onRepairSingleNote(item.fileId)}
                      className="px-3 py-1.5 rounded-md bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] text-xs font-semibold shrink-0 cursor-pointer transition-all flex items-center gap-1"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>Auto-Add YAML</span>
                    </button>
                  )}

                  {file && (
                    <button
                      type="button"
                      onClick={() => onSelectNote(file)}
                      className="px-3 py-1 rounded-md bg-[#F7F7F4] hover:bg-[#E5E5E1] text-[#1A1A1A] text-xs font-medium shrink-0 cursor-pointer transition-all flex items-center gap-1 border border-[#E5E5E1]"
                    >
                      <span>Inspect</span>
                      <ExternalLink className="w-3 h-3" />
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
