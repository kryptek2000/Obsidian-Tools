import React, { useState } from 'react';
import {
  Folder,
  FileText,
  Image,
  FileCode,
  Search,
  ExternalLink,
  AlertTriangle,
  FileQuestion,
  CheckCircle,
} from 'lucide-react';
import { VaultFile } from '../types';

interface FileListAuditorProps {
  files: VaultFile[];
  onSelectNote: (note: VaultFile) => void;
}

export const FileListAuditor: React.FC<FileListAuditorProps> = ({ files, onSelectNote }) => {
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'issues' | 'orphans' | 'attachments'>('all');

  const folders = Array.from(new Set(files.map((f) => f.folder))).sort();

  const filteredFiles = files.filter((file) => {
    if (selectedFolder !== 'all' && file.folder !== selectedFolder) return false;

    if (filterMode === 'issues') {
      const hasBroken = file.outgoingLinks.some((l) => l.isBroken);
      if (!hasBroken && !file.hasFrontmatterError) return false;
    } else if (filterMode === 'orphans') {
      if (!file.isOrphan) return false;
    } else if (filterMode === 'attachments') {
      if (!file.isAttachment) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        file.name.toLowerCase().includes(q) ||
        file.folder.toLowerCase().includes(q) ||
        file.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return true;
  });

  const getFileIcon = (file: VaultFile) => {
    if (file.isAttachment) {
      return <Image className="w-4 h-4 text-[#0369A1]" />;
    }
    if (file.extension === 'canvas') {
      return <FileCode className="w-4 h-4 text-[#D97706]" />;
    }
    return <FileText className="w-4 h-4 text-[#1A1A1A]" />;
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C8C88]">
              Vault Inventory
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#F0F0ED] border border-[#E5E5E1] text-[#1A1A1A]">
              {filteredFiles.length} of {files.length}
            </span>
          </div>
          <h3 className="text-xl font-serif font-bold text-[#1A1A1A]">
            Vault Files Explorer
          </h3>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search */}
          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C88]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search file name..."
              className="w-full bg-[#F7F7F4] border border-[#E5E5E1] rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-[#1A1A1A] placeholder:text-[#8C8C88] focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>

          {/* Folder Filter */}
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="bg-[#F7F7F4] border border-[#E5E5E1] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
          >
            <option value="all">All Folders ({folders.length})</option>
            {folders.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          {/* Mode filter */}
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
            className="bg-[#F7F7F4] border border-[#E5E5E1] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
          >
            <option value="all">All Files</option>
            <option value="issues">Only Files with Issues</option>
            <option value="orphans">Only Orphans</option>
            <option value="attachments">Only Attachments</option>
          </select>
        </div>
      </div>

      {/* Files Table */}
      <div className="rounded-xl border border-[#E5E5E1] bg-[#FFFFFF] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1A1A1A]">
            <thead className="bg-[#F7F7F4] text-[10px] font-semibold text-[#8C8C88] uppercase tracking-[0.15em] border-b border-[#E5E5E1]">
              <tr>
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4">Folder</th>
                <th className="py-3 px-4">Backlinks</th>
                <th className="py-3 px-4">Outgoing</th>
                <th className="py-3 px-4">Words / Size</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E1]">
              {filteredFiles.map((file) => {
                const hasBroken = file.outgoingLinks.some((l) => l.isBroken);
                return (
                  <tr
                    key={file.id}
                    onClick={() => !file.isAttachment && onSelectNote(file)}
                    className={`hover:bg-[#F7F7F4] transition-all group ${
                      !file.isAttachment ? 'cursor-pointer' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-serif font-medium text-[#1A1A1A]">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file)}
                        <span className="truncate max-w-xs group-hover:underline">{file.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#8C8C88] font-mono text-[11px] truncate max-w-[160px]">
                      {file.folder}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#5A5A57]">
                      {file.isAttachment ? '-' : file.backlinks.length}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#5A5A57]">
                      {file.isAttachment ? '-' : file.outgoingLinks.length}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#8C8C88] text-[11px]">
                      {file.isAttachment
                        ? `${(file.size / 1024).toFixed(1)} KB`
                        : `${file.wordCount} words`}
                    </td>
                    <td className="py-3.5 px-4">
                      {hasBroken ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
                          <AlertTriangle className="w-2.5 h-2.5" /> Broken Link
                        </span>
                      ) : file.isOrphan ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                          <FileQuestion className="w-2.5 h-2.5" /> Orphan
                        </span>
                      ) : file.hasFrontmatterError ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EEF2FF] text-[#3730A3] border border-[#C7D2FE]">
                          YAML Error
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0]">
                          <CheckCircle className="w-2.5 h-2.5" /> Healthy
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!file.isAttachment && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectNote(file);
                          }}
                          className="p-1 rounded text-[#8C8C88] hover:text-[#1A1A1A] hover:bg-[#E5E5E1] cursor-pointer transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
