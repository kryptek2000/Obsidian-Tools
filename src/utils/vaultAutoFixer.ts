import JSZip from 'jszip';
import { RawFileEntry } from './vaultParser';
import { VaultFile, BrokenLinkItem, TagAuditItem, FrontmatterIssueItem, DuplicateGroup } from '../types';

export interface AutoFixReport {
  brokenLinksFixed: number;
  stubsCreated: number;
  orphansLinked: number;
  tagsStandardized: number;
  untaggedNotesFixed: number;
  frontmatterRepaired: number;
  modifiedFilesCount: number;
  newFilesCount: number;
  actionsTaken: string[];
}

export interface AutoFixOptions {
  fixBrokenWithFuzzy: boolean;
  createMissingStubs: boolean;
  generateOrphanMOC: boolean;
  standardizeTagCasings: boolean;
  autoTagUntaggedNotes: boolean;
  repairFrontmatter: boolean;
  preserveSourceFormatting?: boolean;
}

export const DEFAULT_AUTO_FIX_OPTIONS: AutoFixOptions = {
  fixBrokenWithFuzzy: true,
  createMissingStubs: true,
  generateOrphanMOC: true,
  standardizeTagCasings: true,
  autoTagUntaggedNotes: true,
  repairFrontmatter: true,
  preserveSourceFormatting: true,
};

/**
 * Safely escapes special regular expression characters in a string
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detects whether the file uses CRLF or LF line endings to preserve source formatting
 */
export function detectLineEnding(content: string): '\r\n' | '\n' {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

/**
 * Replaces all occurrences of a broken wikilink or markdown link with a new target,
 * preserving alias, heading, embed status, and surrounding formatting.
 */
export function replaceLinkInContent(content: string, oldTarget: string, newTarget: string): string {
  if (!content || typeof content !== 'string') return content || '';
  if (!oldTarget || typeof oldTarget !== 'string' || !newTarget || typeof newTarget !== 'string') return content;
  const trimmedOld = oldTarget.trim();
  const trimmedNew = newTarget.trim();
  if (trimmedOld === trimmedNew) return content;

  // Ultra-fast substring presence check before regex parsing
  if (!content.includes(trimmedOld)) {
    return content;
  }

  try {
    const escapedOld = escapeRegex(trimmedOld);

    // 1. Wikilinks: [[oldTarget]] or [[oldTarget|Alias]] or [[oldTarget#Heading]] or ![[oldTarget]]
    const wikiPattern = new RegExp(`(!?\\[\\[)${escapedOld}(#[^\\]|]+)?(\\|[^\\]]+)?(\\]\\])`, 'g');
    let updated = content.replace(wikiPattern, (_match, prefix, heading, alias, closing) => {
      return `${prefix}${trimmedNew}${heading || ''}${alias || ''}${closing}`;
    });

    // 2. Markdown links: [alias](oldTarget.md) or [alias](oldTarget) or ![alt](oldTarget.png)
    const mdPattern = new RegExp(`(!?\\[[^\\]]*\\]\\()${escapedOld}(\\.md)?(#[^)]+)?(\\))`, 'g');
    updated = updated.replace(mdPattern, (_match, prefix, mdExt, heading, closing) => {
      const ext = mdExt ? '.md' : '';
      return `${prefix}${trimmedNew}${ext}${heading || ''}${closing}`;
    });

    return updated;
  } catch (err) {
    console.error('Error replacing link in content:', err);
    return content;
  }
}

/**
 * Standardizes tag casing while strictly preserving:
 * 1. Code blocks (fenced ```...``` and inline `...`)
 * 2. Frontmatter custom keys, comments, indentation, and structure
 * 3. Exact line endings (CRLF vs LF)
 */
export function standardizeTagsInContent(
  content: string,
  casingMap: Map<string, string>
): { updatedContent: string; changed: boolean } {
  let changed = false;
  let updated = content;
  const le = detectLineEnding(content);

  // 1. Frontmatter tag standardization (surgical, non-destructive)
  const fmMatch = updated.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fmMatch) {
    const rawFm = fmMatch[1];
    const lines = rawFm.split(/\r?\n/);
    let inTagsList = false;
    let fmModified = false;

    const newLines = lines.map((line) => {
      // Check if line begins tags: property
      if (/^tags?\s*:/i.test(line)) {
        inTagsList = true;
        // Check inline bracket array: tags: [React, PKM] or tags: React
        let replacedLine = line;
        casingMap.forEach((canonical, lower) => {
          const escaped = escapeRegex(lower);
          const tagRegex = new RegExp(`(^|[\\[\\s,"]|#)(${escaped})([\\],\\s"']|$)`, 'gi');
          replacedLine = replacedLine.replace(tagRegex, (_m, p1, matched, p3) => {
            if (matched !== canonical) {
              fmModified = true;
              return `${p1}${canonical}${p3}`;
            }
            return _m;
          });
        });
        return replacedLine;
      }

      // If inside a YAML tag list (e.g. "  - React" or "  - #React" or "  - \"React\"")
      if (inTagsList) {
        if (/^\s*-\s+/.test(line)) {
          let replacedLine = line;
          casingMap.forEach((canonical, lower) => {
            const escaped = escapeRegex(lower);
            const listTagPattern = new RegExp(`(^\\s*-\\s*["'#]?)${escaped}(["']?\\s*$)`, 'i');
            if (listTagPattern.test(replacedLine)) {
              const prev = replacedLine;
              replacedLine = replacedLine.replace(listTagPattern, `$1${canonical}$2`);
              if (replacedLine !== prev) {
                fmModified = true;
              }
            }
          });
          return replacedLine;
        } else if (/^\S/.test(line)) {
          // Exited tag list
          inTagsList = false;
        }
      }

      return line;
    });

    if (fmModified) {
      const fullMatchedHeader = fmMatch[0];
      const newFmBlock = `---${le}${newLines.join(le)}${le}---${le}`;
      updated = newFmBlock + updated.slice(fullMatchedHeader.length);
      changed = true;
    }
  }

  // 2. Inline body tags: protect code blocks and inline code
  // Mask code blocks temporarily
  const codeBlocks: string[] = [];
  const placeholderPrefix = `__CODE_BLOCK_PROTECTED_${Date.now()}_`;
  
  // Protect fenced code blocks (```...```)
  let bodyWithPlaceholders = updated.replace(/```[\s\S]*?```/g, (match) => {
    const idx = codeBlocks.length;
    codeBlocks.push(match);
    return `${placeholderPrefix}${idx}__`;
  });

  // Protect inline code (`...`)
  bodyWithPlaceholders = bodyWithPlaceholders.replace(/`[^`\n]+`/g, (match) => {
    const idx = codeBlocks.length;
    codeBlocks.push(match);
    return `${placeholderPrefix}${idx}__`;
  });

  // Replace inline tags outside code
  let bodyChanged = false;
  casingMap.forEach((canonical, lower) => {
    const escaped = escapeRegex(lower);
    const inlineTagRegex = new RegExp(`(^|[\\s(\\[{])#(${escaped})(?=[\\s,.;:!?)\\]}]|$)`, 'gi');
    const beforeReplace = bodyWithPlaceholders;
    bodyWithPlaceholders = bodyWithPlaceholders.replace(inlineTagRegex, (match, prefix, capturedTag) => {
      if (capturedTag !== canonical) {
        bodyChanged = true;
        return `${prefix}#${canonical}`;
      }
      return match;
    });
    if (beforeReplace !== bodyWithPlaceholders) {
      bodyChanged = true;
    }
  });

  // Restore code blocks
  if (codeBlocks.length > 0) {
    codeBlocks.forEach((code, idx) => {
      bodyWithPlaceholders = bodyWithPlaceholders.replace(`${placeholderPrefix}${idx}__`, () => code);
    });
  }

  if (bodyChanged) {
    updated = bodyWithPlaceholders;
    changed = true;
  }

  return { updatedContent: updated, changed };
}

/**
 * Repairs or adds frontmatter while strictly preserving:
 * - Existing keys, comments, formatting, and indentation
 * - Original line endings (CRLF vs LF)
 * - Exact body content without destructive trimming
 */
export function repairOrAddFrontmatter(
  content: string,
  noteTitle: string,
  defaultTags: string[] = ['note']
): { updatedContent: string; changed: boolean } {
  const le = detectLineEnding(content);
  const dateStr = new Date().toISOString().split('T')[0];
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

  if (!fmMatch) {
    // Add fresh frontmatter preserving exact body
    const frontmatterHeader = `---${le}title: ${noteTitle}${le}date: ${dateStr}${le}tags:${le}${defaultTags
      .map((t) => `  - ${t}`)
      .join(le)}${le}status: active${le}---${le}${le}`;
    return { updatedContent: frontmatterHeader + content, changed: true };
  }

  const rawFm = fmMatch[1];
  const fullHeader = fmMatch[0];
  const body = content.slice(fullHeader.length);

  // If frontmatter is completely empty (--- ---)
  if (!rawFm.trim()) {
    const frontmatterHeader = `---${le}title: ${noteTitle}${le}date: ${dateStr}${le}tags:${le}${defaultTags
      .map((t) => `  - ${t}`)
      .join(le)}${le}status: active${le}---${le}${le}`;
    return { updatedContent: frontmatterHeader + body, changed: true };
  }

  // If frontmatter exists, surgically check if tags are missing
  const lines = rawFm.split(/\r?\n/);
  const hasTagsKey = lines.some((l) => /^tags?\s*:/i.test(l));

  if (!hasTagsKey && defaultTags.length > 0) {
    // Insert tags property right before the end of frontmatter
    const updatedFmLines = [...lines, `tags:`, ...defaultTags.map((t) => `  - ${t}`)];
    const newHeader = `---${le}${updatedFmLines.join(le)}${le}---${le}`;
    return { updatedContent: newHeader + body, changed: true };
  }

  return { updatedContent: content, changed: false };
}

/**
 * Infers a tag based on the folder path (e.g. "01 - Projects/App.md" -> "project")
 */
export function inferFolderTag(folder: string): string {
  const clean = folder.toLowerCase().replace(/^[0-9\s-_]+/, '').trim();
  if (clean.includes('project')) return 'project';
  if (clean.includes('daily') || clean.includes('journal')) return 'journal';
  if (clean.includes('resource') || clean.includes('book')) return 'resource';
  if (clean.includes('area')) return 'area';
  if (clean.includes('archive')) return 'archive';
  if (clean.includes('concept') || clean.includes('note') || clean.includes('zettel')) return 'evergreen';
  if (clean && clean !== '/') {
    const slug = clean.split('/')[0].replace(/[^a-z0-9]/g, '-');
    if (slug) return slug;
  }
  return 'evergreen';
}

/**
 * Execute master Auto-Fix on the entire vault with detailed summary reporting.
 * Strictly guarantees:
 * - 100% preservation of .obsidian folder (community plugins, configs, hotkeys, themes)
 * - 100% preservation of binary files & attachments
 * - 100% preservation of untouched markdown files and formatting
 */
export function executeMasterAutoFix(
  rawFiles: RawFileEntry[],
  parsedFiles: VaultFile[],
  brokenLinks: BrokenLinkItem[],
  orphans: VaultFile[],
  tagAudits: TagAuditItem[],
  frontmatterIssues: FrontmatterIssueItem[],
  options: AutoFixOptions = DEFAULT_AUTO_FIX_OPTIONS
): { updatedRawFiles: RawFileEntry[]; report: AutoFixReport } {
  // Preserve all files in Map
  const fileMap = new Map<string, RawFileEntry>();
  rawFiles.forEach((f) => fileMap.set(f.path, { ...f }));

  const report: AutoFixReport = {
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

  const modifiedFilePaths = new Set<string>();

  // 1. Fix Broken Links with Fuzzy Matches
  if (options.fixBrokenWithFuzzy) {
    const fuzzyFixes = brokenLinks.filter((b) => !b.isEmbed && b.suggestedFix);
    fuzzyFixes.forEach((item) => {
      const file = fileMap.get(item.sourceId);
      if (file && item.suggestedFix && !file.isConfigOrPlugin && !file.isBinary) {
        const newContent = replaceLinkInContent(file.content, item.target, item.suggestedFix);
        if (newContent !== file.content) {
          file.content = newContent;
          file.size = newContent.length;
          file.lastModified = Date.now();
          modifiedFilePaths.add(file.path);
          report.brokenLinksFixed++;
          report.actionsTaken.push(`Replaced broken link [[${item.target}]] with [[${item.suggestedFix}]] in "${item.sourceTitle}"`);
        }
      }
    });
  }

  // 2. Create missing stubs for remaining broken note links
  if (options.createMissingStubs) {
    const targetsToStub = new Set<string>();
    brokenLinks.forEach((b) => {
      if (!b.isEmbed) {
        if (!options.fixBrokenWithFuzzy || !b.suggestedFix) {
          targetsToStub.add(b.target);
        }
      }
    });

    targetsToStub.forEach((targetName) => {
      const cleanName = targetName.trim();
      const stubPath = `02 - Notes/${cleanName}.md`;

      // Check if file already exists in map
      if (!fileMap.has(stubPath) && !fileMap.has(`${cleanName}.md`)) {
        const dateStr = new Date().toISOString().split('T')[0];
        const stubContent = `---
title: ${cleanName}
date: ${dateStr}
tags:
  - stub
  - seedling
status: seedling
---

# ${cleanName}

> *Auto-generated stub note to resolve missing wikilink references in the vault.*

## References & Backlinks
This note was automatically initialized to provide a central node for incoming references.
`;
        fileMap.set(stubPath, {
          path: stubPath,
          name: `${cleanName}.md`,
          content: stubContent,
          isBinary: false,
          isConfigOrPlugin: false,
          size: stubContent.length,
          lastModified: Date.now(),
        });
        report.stubsCreated++;
        report.newFilesCount++;
        report.actionsTaken.push(`Created stub note: "${stubPath}"`);
      }
    });
  }

  // 3. Standardize Tag Casings (e.g. #React -> #react, #PKM -> #pkm)
  if (options.standardizeTagCasings) {
    const casingMap = new Map<string, string>();
    tagAudits.forEach((t) => {
      if (t.potentialDuplicates && t.potentialDuplicates.length > 0) {
        const canonical = t.tag.toLowerCase();
        casingMap.set(t.tag.toLowerCase(), canonical);
        t.potentialDuplicates.forEach((v) => casingMap.set(v.toLowerCase(), canonical));
      }
    });

    if (casingMap.size > 0) {
      fileMap.forEach((file) => {
        // Only modify markdown notes, never .obsidian or binary files
        if (file.name.endsWith('.md') && !file.isConfigOrPlugin && !file.isBinary) {
          const { updatedContent, changed } = standardizeTagsInContent(file.content, casingMap);
          if (changed) {
            file.content = updatedContent;
            file.size = updatedContent.length;
            file.lastModified = Date.now();
            modifiedFilePaths.add(file.path);
            report.tagsStandardized++;
          }
        }
      });
      if (report.tagsStandardized > 0) {
        report.actionsTaken.push(`Standardized ${casingMap.size} tag case variations across ${report.tagsStandardized} notes`);
      }
    }
  }

  // 4. Auto-Tag Untagged Notes
  if (options.autoTagUntaggedNotes) {
    const untaggedNotes = parsedFiles.filter(
      (f) => !f.isAttachment && !f.id.startsWith('.obsidian/') && f.tags.length === 0
    );
    untaggedNotes.forEach((note) => {
      const file = fileMap.get(note.id);
      if (file && !file.isConfigOrPlugin && !file.isBinary) {
        const folderTag = inferFolderTag(note.folder);
        const { updatedContent, changed } = repairOrAddFrontmatter(file.content, note.baseName, [folderTag]);
        if (changed) {
          file.content = updatedContent;
          file.size = updatedContent.length;
          file.lastModified = Date.now();
          modifiedFilePaths.add(file.path);
          report.untaggedNotesFixed++;
          report.actionsTaken.push(`Added tag #${folderTag} to untagged note "${note.baseName}"`);
        }
      }
    });
  }

  // 5. Repair Frontmatter YAML
  if (options.repairFrontmatter) {
    frontmatterIssues.forEach((issue) => {
      const file = fileMap.get(issue.fileId);
      if (file && !file.isConfigOrPlugin && !file.isBinary) {
        const baseName = file.name.replace(/\.md$/, '');
        const folderTag = inferFolderTag(file.path);
        const { updatedContent, changed } = repairOrAddFrontmatter(file.content, baseName, [folderTag]);
        if (changed) {
          file.content = updatedContent;
          file.size = updatedContent.length;
          file.lastModified = Date.now();
          modifiedFilePaths.add(file.path);
          report.frontmatterRepaired++;
          report.actionsTaken.push(`Repaired YAML frontmatter in "${file.name}"`);
        }
      }
    });
  }

  // 6. Generate Orphan MOC Index Note
  if (options.generateOrphanMOC && orphans.length > 0) {
    const mocPath = `00 - Knowledge Index & MOC.md`;
    const dateStr = new Date().toISOString().split('T')[0];

    // Group orphans by folder
    const folderGroups = new Map<string, VaultFile[]>();
    orphans.forEach((o) => {
      if (o.id.startsWith('.obsidian/')) return;
      const folderKey = o.folder === '/' ? 'Root Directory' : o.folder;
      if (!folderGroups.has(folderKey)) {
        folderGroups.set(folderKey, []);
      }
      folderGroups.get(folderKey)!.push(o);
    });

    let mocContent = `---
title: Knowledge Index & Map of Content (MOC)
date: ${dateStr}
tags:
  - moc
  - index
  - hub
status: active
---

# 🗺️ Knowledge Index & Map of Content (MOC)

> *Central navigation hub systematically connecting vault notes and integrating orphan topics into the graph network.*

## 📚 Topics & Notes Index

`;

    folderGroups.forEach((notesInFolder, folderName) => {
      mocContent += `### 📁 ${folderName}\n`;
      notesInFolder.forEach((n) => {
        const tagLine = n.tags.length > 0 ? ` (${n.tags.map((t) => `#${t}`).join(' ')})` : '';
        mocContent += `- [[${n.baseName}]]${tagLine}\n`;
      });
      mocContent += `\n`;
    });

    mocContent += `---
*Created automatically by Obsidian Vault Health Auto-Fixer.*
`;

    const isNew = !fileMap.has(mocPath);
    fileMap.set(mocPath, {
      path: mocPath,
      name: `00 - Knowledge Index & MOC.md`,
      content: mocContent,
      isBinary: false,
      isConfigOrPlugin: false,
      size: mocContent.length,
      lastModified: Date.now(),
    });

    if (isNew) {
      report.newFilesCount++;
    } else {
      modifiedFilePaths.add(mocPath);
    }
    report.orphansLinked = orphans.length;
    report.actionsTaken.push(`Created MOC index connecting all ${orphans.length} orphan notes into the vault hierarchy`);
  }

  report.modifiedFilesCount = modifiedFilePaths.size;

  return {
    updatedRawFiles: Array.from(fileMap.values()),
    report,
  };
}

/**
 * Downloads all vault files as a clean, complete .ZIP archive ready for Obsidian.
 * Guarantees .obsidian configuration, community plugins, themes, and binary files are preserved.
 */
export async function exportVaultAsZip(
  files: RawFileEntry[],
  vaultName: string = 'Obsidian-Vault-Repaired'
): Promise<void> {
  const zip = new JSZip();

  files.forEach((file) => {
    // Normalize path to prevent leading slashes
    const cleanPath = file.path.replace(/^\/+/, '');
    if (file.isBinary && file.binaryData) {
      zip.file(cleanPath, file.binaryData);
    } else {
      zip.file(cleanPath, file.content || '');
    }
  });

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = vaultName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_') || 'Vault';
  a.download = `${safeName}-Repaired.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Safely extracts all tags from a note's frontmatter and body.
 */
export function extractTagsFromContent(content: string): Set<string> {
  const tags = new Set<string>();
  if (!content || typeof content !== 'string') return tags;

  try {
    // 1. Inline tags (#tag)
    const inlineMatches = content.matchAll(/(?:^|[\s(\[{])#([a-zA-Z0-9_\-\/]+)/g);
    for (const match of inlineMatches) {
      const t = match[1];
      if (t && !/^\d+$/.test(t)) {
        tags.add(t);
      }
    }

    // 2. YAML frontmatter tags
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (fmMatch && fmMatch[1]) {
      const fmText = fmMatch[1];
      // Inline tags: [a, b]
      const inlineFmMatch = fmText.match(/tags?:\s*\[(.*?)\]/i);
      if (inlineFmMatch) {
        inlineFmMatch[1].split(',').forEach((raw) => {
          const clean = raw.trim().replace(/^['"#]+|['"]+$/g, '');
          if (clean && !/^\d+$/.test(clean)) tags.add(clean);
        });
      }
      // Multiline list tags: - tag
      const listMatches = fmText.matchAll(/^\s*-\s+["'#]?([a-zA-Z0-9_\-\/]+)["']?/gm);
      for (const lm of listMatches) {
        const clean = lm[1]?.trim();
        if (clean && !/^\d+$/.test(clean)) tags.add(clean);
      }
    }
  } catch (err) {
    console.error('Error extracting tags from note content:', err);
  }

  return tags;
}

/**
 * Safely merges a set of tags into a markdown file's frontmatter without corrupting YAML formatting.
 */
export function mergeTagsIntoNoteContent(
  content: string,
  tagsToAdd: Set<string> | string[],
  noteTitle: string = 'Note'
): string {
  const tagsArray = Array.from(tagsToAdd).filter(Boolean);
  if (!tagsArray.length) return content || '';
  if (!content) content = '';

  const le = detectLineEnding(content);
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

  if (!fmMatch) {
    // Add new frontmatter header with these tags
    const dateStr = new Date().toISOString().split('T')[0];
    return `---${le}title: ${noteTitle}${le}date: ${dateStr}${le}tags:${le}${tagsArray
      .map((t) => `  - ${t}`)
      .join(le)}${le}status: active${le}---${le}${le}${content}`;
  }

  const rawFm = fmMatch[1];
  const fullHeader = fmMatch[0];
  const body = content.slice(fullHeader.length);

  const existingTags = extractTagsFromContent(fullHeader);
  const newUniqueTags = tagsArray.filter((t) => !existingTags.has(t));
  if (newUniqueTags.length === 0) return content; // nothing new to add

  const fmLines = rawFm.split(/\r?\n/);
  const tagsLineIndex = fmLines.findIndex((l) => /^tags?\s*:/i.test(l));

  if (tagsLineIndex === -1) {
    // tags property doesn't exist yet in frontmatter, insert at end of frontmatter
    const updatedFmLines = [...fmLines, `tags:`, ...newUniqueTags.map((t) => `  - ${t}`)];
    return `---${le}${updatedFmLines.join(le)}${le}---${le}${body}`;
  }

  const targetTagLine = fmLines[tagsLineIndex];
  if (targetTagLine.includes('[')) {
    // inline array tags: [a, b]
    const currentBracketContent = targetTagLine.replace(/^tags?\s*:\s*\[/i, '').replace(/\]\s*$/, '');
    const currentItems = currentBracketContent
      .split(',')
      .map((t) => t.trim().replace(/^['"#]+|['"]+$/g, ''))
      .filter(Boolean);
    const combined = Array.from(new Set([...currentItems, ...newUniqueTags]));
    fmLines[tagsLineIndex] = `tags: [${combined.join(', ')}]`;
    return `---${le}${fmLines.join(le)}${le}---${le}${body}`;
  } else {
    // multiline list tags
    let insertIndex = tagsLineIndex + 1;
    while (insertIndex < fmLines.length && /^\s*-\s+/.test(fmLines[insertIndex])) {
      insertIndex++;
    }
    const newItemsToInsert = newUniqueTags.map((t) => `  - ${t}`);
    fmLines.splice(insertIndex, 0, ...newItemsToInsert);
    return `---${le}${fmLines.join(le)}${le}---${le}${body}`;
  }
}

/**
 * Deletes a duplicate file from rawFiles and optionally redirects backlinks pointing to it
 */
export function deleteDuplicateNote(
  rawFiles: RawFileEntry[],
  filePathToDelete: string,
  targetPathForBacklinks?: string
): RawFileEntry[] {
  if (!rawFiles || rawFiles.length === 0 || !filePathToDelete) return rawFiles || [];

  const fileToDelete = rawFiles.find((f) => f && f.path === filePathToDelete);
  if (!fileToDelete) return rawFiles;

  const targetFile = targetPathForBacklinks ? rawFiles.find((f) => f && f.path === targetPathForBacklinks) : null;
  const oldBaseName = fileToDelete.name ? fileToDelete.name.replace(/\.md$/i, '') : '';
  const newBaseName = targetFile && targetFile.name ? targetFile.name.replace(/\.md$/i, '') : null;

  return rawFiles
    .filter((f) => f && f.path !== filePathToDelete)
    .map((file) => {
      if (!file || file.isBinary || file.isConfigOrPlugin || !newBaseName || !targetFile || !oldBaseName) {
        return file;
      }
      // Replace references to old base name if redirecting
      const updatedContent = replaceLinkInContent(file.content, oldBaseName, newBaseName);
      if (updatedContent !== file.content) {
        return {
          ...file,
          content: updatedContent,
          size: updatedContent.length,
          lastModified: Date.now(),
        };
      }
      return file;
    });
}

/**
 * Merges a duplicate note into a primary note with options to combine tags, append body content, and redirect backlinks
 */
export function mergeDuplicateNotes(
  rawFiles: RawFileEntry[],
  primaryPath: string,
  duplicatePath: string,
  options: {
    mergeTags: boolean;
    appendContent: boolean;
    redirectLinks: boolean;
  }
): RawFileEntry[] {
  if (!rawFiles || rawFiles.length === 0 || !primaryPath || !duplicatePath || primaryPath === duplicatePath) {
    return rawFiles || [];
  }

  const primaryEntry = rawFiles.find((f) => f && f.path === primaryPath);
  const duplicateEntry = rawFiles.find((f) => f && f.path === duplicatePath);

  if (!primaryEntry || !duplicateEntry) return rawFiles;

  let updatedPrimaryContent = primaryEntry.content || '';
  const primaryLineEnding = detectLineEnding(updatedPrimaryContent);

  // 1. Merge tags safely
  if (options.mergeTags && duplicateEntry.content) {
    const dupTags = extractTagsFromContent(duplicateEntry.content);
    if (dupTags.size > 0) {
      const primaryBase = primaryEntry.name ? primaryEntry.name.replace(/\.md$/i, '') : 'Primary Note';
      updatedPrimaryContent = mergeTagsIntoNoteContent(updatedPrimaryContent, dupTags, primaryBase);
    }
  }

  // 2. Append content if selected and bodies are not identical
  if (options.appendContent && duplicateEntry.content) {
    const primaryBody = (primaryEntry.content || '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
    const dupBody = duplicateEntry.content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();

    if (primaryBody !== dupBody && dupBody.length > 0 && !primaryBody.includes(dupBody)) {
      const dupBaseName = (duplicateEntry.name || 'Duplicate Note').replace(/\.md$/i, '');
      const appendBlock = `${primaryLineEnding}${primaryLineEnding}---${primaryLineEnding}## 📑 Merged Content from \`${dupBaseName}\`${primaryLineEnding}${primaryLineEnding}${dupBody}${primaryLineEnding}`;
      updatedPrimaryContent += appendBlock;
    }
  }

  const oldBaseName = (duplicateEntry.name || '').replace(/\.md$/i, '');
  const newBaseName = (primaryEntry.name || '').replace(/\.md$/i, '');

  const oldPathNoExt = duplicateEntry.path.replace(/\.md$/i, '');
  const newPathNoExt = primaryEntry.path.replace(/\.md$/i, '');

  return rawFiles
    .filter((f) => f && f.path !== duplicatePath)
    .map((file) => {
      if (!file) return file;
      if (file.path === primaryPath) {
        return {
          ...file,
          content: updatedPrimaryContent,
          size: updatedPrimaryContent.length,
          lastModified: Date.now(),
        };
      }
      if (options.redirectLinks && !file.isBinary && !file.isConfigOrPlugin && file.content) {
        let updated = file.content;
        if (oldBaseName && newBaseName && oldBaseName !== newBaseName) {
          updated = replaceLinkInContent(updated, oldBaseName, newBaseName);
        }
        if (oldPathNoExt && newPathNoExt && oldPathNoExt !== newPathNoExt && oldPathNoExt !== oldBaseName) {
          updated = replaceLinkInContent(updated, oldPathNoExt, newPathNoExt);
        }
        if (updated !== file.content) {
          return {
            ...file,
            content: updated,
            size: updated.length,
            lastModified: Date.now(),
          };
        }
      }
      return file;
    });
}

export interface BatchProgressCallback {
  (progress: {
    phase: 'analyzing' | 'deleting' | 'updating-links' | 'completed';
    current: number;
    total: number;
    message: string;
    percentage: number;
  }): void;
}

/**
 * Automatically cleans all exact duplicate notes in smaller batched increments
 * yielding to the browser event loop to prevent UI thread freezing.
 */
export async function batchResolveExactDuplicatesAsync(
  rawFiles: RawFileEntry[],
  duplicateGroups: DuplicateGroup[],
  onProgress?: BatchProgressCallback,
  batchChunkSize: number = 6
): Promise<{ updatedRawFiles: RawFileEntry[]; resolvedCount: number }> {
  if (!rawFiles || rawFiles.length === 0 || !duplicateGroups || duplicateGroups.length === 0) {
    onProgress?.({
      phase: 'completed',
      current: 0,
      total: 0,
      message: 'No duplicate groups to process.',
      percentage: 100,
    });
    return { updatedRawFiles: rawFiles || [], resolvedCount: 0 };
  }

  const exactGroups = duplicateGroups.filter((g) => g && g.type === 'exact-content');
  if (exactGroups.length === 0) {
    onProgress?.({
      phase: 'completed',
      current: 0,
      total: 0,
      message: 'No exact content duplicate groups found.',
      percentage: 100,
    });
    return { updatedRawFiles: rawFiles, resolvedCount: 0 };
  }

  onProgress?.({
    phase: 'analyzing',
    current: 0,
    total: exactGroups.length,
    message: `Analyzing ${exactGroups.length} exact duplicate groups...`,
    percentage: 10,
  });

  // Yield to allow UI update
  await new Promise((resolve) => setTimeout(resolve, 20));

  const pathsToDelete = new Set<string>();
  const pathsToKeep = new Set<string>();
  const linkRedirectMap = new Map<string, string>(); // oldBaseName -> newBaseName

  // Step 1: Analyze groups in chunks
  for (let i = 0; i < exactGroups.length; i += batchChunkSize) {
    const chunk = exactGroups.slice(i, i + batchChunkSize);

    chunk.forEach((group) => {
      if (!group || !group.files || group.files.length < 2) return;

      const validGroupFiles = group.files.filter(
        (f) => f && f.path && rawFiles.some((rf) => rf && rf.path === f.path)
      );
      if (validGroupFiles.length < 2) return;

      // Sort to find best primary note (highest backlinks, shallowest directory depth)
      const sorted = [...validGroupFiles].sort((a, b) => {
        const aDepth = (a.path || '').split('/').length;
        const bDepth = (b.path || '').split('/').length;
        const aBacklinks = a.backlinks ? a.backlinks.length : 0;
        const bBacklinks = b.backlinks ? b.backlinks.length : 0;
        if (bBacklinks !== aBacklinks) {
          return bBacklinks - aBacklinks;
        }
        return aDepth - bDepth;
      });

      const primaryFile = sorted.find((f) => f && f.path && !pathsToDelete.has(f.path)) || sorted[0];
      if (!primaryFile || !primaryFile.path) return;

      pathsToKeep.add(primaryFile.path);

      const duplicates = sorted.filter((f) => f && f.path && f.path !== primaryFile.path && !pathsToKeep.has(f.path));
      duplicates.forEach((d) => {
        if (!d || !d.path) return;
        pathsToDelete.add(d.path);
        if (d.baseName && primaryFile.baseName && d.baseName !== primaryFile.baseName) {
          linkRedirectMap.set(d.baseName, primaryFile.baseName);
        }
      });
    });

    const progressPct = Math.min(40, 10 + Math.round(((i + chunk.length) / exactGroups.length) * 30));
    onProgress?.({
      phase: 'analyzing',
      current: Math.min(exactGroups.length, i + chunk.length),
      total: exactGroups.length,
      message: `Identified ${pathsToDelete.size} redundant clone notes to clean...`,
      percentage: progressPct,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  if (pathsToDelete.size === 0) {
    onProgress?.({
      phase: 'completed',
      current: 0,
      total: 0,
      message: 'All files are already unique.',
      percentage: 100,
    });
    return { updatedRawFiles: rawFiles, resolvedCount: 0 };
  }

  // Step 2: Batched deletion filtering
  onProgress?.({
    phase: 'deleting',
    current: pathsToDelete.size,
    total: pathsToDelete.size,
    message: `Removing ${pathsToDelete.size} redundant duplicate files...`,
    percentage: 50,
  });

  await new Promise((resolve) => setTimeout(resolve, 20));

  let updatedRawFiles = rawFiles.filter((f) => f && !pathsToDelete.has(f.path));

  // Step 3: Link redirection across vault in chunks if needed
  if (linkRedirectMap.size > 0) {
    const totalFiles = updatedRawFiles.length;
    const fileBatchSize = 30;
    const resultingFiles: RawFileEntry[] = [];

    for (let i = 0; i < totalFiles; i += fileBatchSize) {
      const fileSlice = updatedRawFiles.slice(i, i + fileBatchSize);

      for (const file of fileSlice) {
        if (!file || file.isBinary || file.isConfigOrPlugin || !file.content) {
          resultingFiles.push(file);
          continue;
        }

        let newContent = file.content;
        linkRedirectMap.forEach((newTarget, oldTarget) => {
          if (oldTarget && newTarget && oldTarget !== newTarget) {
            newContent = replaceLinkInContent(newContent, oldTarget, newTarget);
          }
        });

        if (newContent !== file.content) {
          resultingFiles.push({
            ...file,
            content: newContent,
            size: newContent.length,
            lastModified: Date.now(),
          });
        } else {
          resultingFiles.push(file);
        }
      }

      const processedCount = Math.min(totalFiles, i + fileBatchSize);
      const linkPct = 50 + Math.round((processedCount / totalFiles) * 45);

      onProgress?.({
        phase: 'updating-links',
        current: processedCount,
        total: totalFiles,
        message: `Rewriting incoming wikilinks (${processedCount}/${totalFiles} files checked)...`,
        percentage: linkPct,
      });

      // Yield thread
      await new Promise((resolve) => setTimeout(resolve, 15));
    }

    updatedRawFiles = resultingFiles;
  }

  onProgress?.({
    phase: 'completed',
    current: pathsToDelete.size,
    total: pathsToDelete.size,
    message: `Successfully resolved ${pathsToDelete.size} duplicate clone files!`,
    percentage: 100,
  });

  // Yield to allow UI to render the completion state
  await new Promise((resolve) => setTimeout(resolve, 30));

  return { updatedRawFiles, resolvedCount: pathsToDelete.size };
}

/**
 * Bulk merges selected duplicate groups in batched incremental steps
 */
export async function batchMergeDuplicateGroupsAsync(
  rawFiles: RawFileEntry[],
  groupsToMerge: DuplicateGroup[],
  options: {
    mergeTags: boolean;
    appendContent: boolean;
    redirectLinks: boolean;
  },
  onProgress?: BatchProgressCallback,
  batchChunkSize: number = 8
): Promise<{ updatedRawFiles: RawFileEntry[]; resolvedCount: number; mergedGroupCount: number }> {
  if (!rawFiles || rawFiles.length === 0 || !groupsToMerge || groupsToMerge.length === 0) {
    onProgress?.({
      phase: 'completed',
      current: 0,
      total: 0,
      message: 'No groups selected for bulk merge.',
      percentage: 100,
    });
    return { updatedRawFiles: rawFiles || [], resolvedCount: 0, mergedGroupCount: 0 };
  }

  // Fast in-memory index
  const fileMap = new Map<string, RawFileEntry>();
  rawFiles.forEach((f) => {
    if (f && f.path) {
      fileMap.set(f.path, { ...f });
    }
  });

  const pathsToDelete = new Set<string>();
  const linkRedirectMap = new Map<string, string>(); // oldTarget -> newTarget
  let totalResolvedFiles = 0;
  let mergedGroupCount = 0;
  const totalGroups = groupsToMerge.length;

  // Step 1: Merge content and collect deletions in non-blocking batches
  for (let i = 0; i < totalGroups; i += batchChunkSize) {
    const chunk = groupsToMerge.slice(i, i + batchChunkSize);

    for (const group of chunk) {
      if (!group || !group.files || group.files.length < 2) continue;

      // Filter to files currently in fileMap and not marked for deletion
      const availableFiles = group.files.filter((f) => f && f.path && fileMap.has(f.path) && !pathsToDelete.has(f.path));
      if (availableFiles.length < 2) continue;

      // Primary file is the first available file
      const primaryFileMeta = availableFiles[0];
      const primaryEntry = fileMap.get(primaryFileMeta.path);
      if (!primaryEntry) continue;

      const dupFilesMeta = availableFiles.slice(1);
      let updatedPrimaryContent = primaryEntry.content || '';
      const primaryLineEnding = detectLineEnding(updatedPrimaryContent);
      const primaryBaseName = (primaryFileMeta.name || primaryEntry.name || '').replace(/\.md$/i, '');
      const primaryPathNoExt = primaryFileMeta.path.replace(/\.md$/i, '');

      for (const dupMeta of dupFilesMeta) {
        if (!dupMeta || !dupMeta.path || dupMeta.path === primaryFileMeta.path || pathsToDelete.has(dupMeta.path)) {
          continue;
        }

        const dupEntry = fileMap.get(dupMeta.path);
        if (!dupEntry) continue;

        // 1. Merge tags
        if (options.mergeTags && dupEntry.content) {
          const dupTags = extractTagsFromContent(dupEntry.content);
          if (dupTags.size > 0) {
            updatedPrimaryContent = mergeTagsIntoNoteContent(updatedPrimaryContent, dupTags, primaryBaseName);
          }
        }

        // 2. Append content if bodies differ and not exact content match
        if (options.appendContent && group.type !== 'exact-content' && dupEntry.content) {
          const primaryBody = updatedPrimaryContent.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
          const dupBody = dupEntry.content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();

          if (primaryBody !== dupBody && dupBody.length > 0 && !primaryBody.includes(dupBody)) {
            const dupBaseName = (dupMeta.name || dupEntry.name || 'Duplicate Note').replace(/\.md$/i, '');
            const appendBlock = `${primaryLineEnding}${primaryLineEnding}---${primaryLineEnding}## 📑 Merged Content from \`${dupBaseName}\`${primaryLineEnding}${primaryLineEnding}${dupBody}${primaryLineEnding}`;
            updatedPrimaryContent += appendBlock;
          }
        }

        // 3. Link redirect mapping
        const dupBaseName = (dupMeta.name || dupEntry.name || '').replace(/\.md$/i, '');
        const dupPathNoExt = dupMeta.path.replace(/\.md$/i, '');

        if (dupBaseName && primaryBaseName && dupBaseName !== primaryBaseName) {
          linkRedirectMap.set(dupBaseName, primaryBaseName);
        }
        if (dupPathNoExt && primaryPathNoExt && dupPathNoExt !== primaryPathNoExt && dupPathNoExt !== dupBaseName) {
          linkRedirectMap.set(dupPathNoExt, primaryPathNoExt);
        }

        // Mark duplicate file for deletion
        pathsToDelete.add(dupMeta.path);
        totalResolvedFiles++;
      }

      // Save updated primary content
      primaryEntry.content = updatedPrimaryContent;
      primaryEntry.size = updatedPrimaryContent.length;
      primaryEntry.lastModified = Date.now();
      mergedGroupCount++;
    }

    const currentProgress = Math.min(totalGroups, i + chunk.length);
    const pct = Math.min(50, Math.round((currentProgress / totalGroups) * 50));

    onProgress?.({
      phase: 'analyzing',
      current: currentProgress,
      total: totalGroups,
      message: `Merging duplicate note metadata (${currentProgress}/${totalGroups} groups)...`,
      percentage: pct,
    });

    // Yield control to event loop
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // Step 2: Delete duplicate files from map
  onProgress?.({
    phase: 'deleting',
    current: pathsToDelete.size,
    total: pathsToDelete.size,
    message: `Removing ${pathsToDelete.size} merged duplicate files...`,
    percentage: 55,
  });

  pathsToDelete.forEach((path) => {
    fileMap.delete(path);
  });

  await new Promise((resolve) => setTimeout(resolve, 15));

  // Step 3: Link redirection across vault in chunks if needed
  if (options.redirectLinks && linkRedirectMap.size > 0) {
    const remainingFiles = Array.from(fileMap.values());
    const totalFiles = remainingFiles.length;
    const fileBatchSize = 30;

    for (let i = 0; i < totalFiles; i += fileBatchSize) {
      const fileSlice = remainingFiles.slice(i, i + fileBatchSize);

      for (const file of fileSlice) {
        if (!file || file.isBinary || file.isConfigOrPlugin || !file.content) {
          continue;
        }

        let newContent = file.content;
        linkRedirectMap.forEach((newTarget, oldTarget) => {
          if (oldTarget && newTarget && oldTarget !== newTarget) {
            newContent = replaceLinkInContent(newContent, oldTarget, newTarget);
          }
        });

        if (newContent !== file.content) {
          file.content = newContent;
          file.size = newContent.length;
          file.lastModified = Date.now();
        }
      }

      const processedCount = Math.min(totalFiles, i + fileBatchSize);
      const linkPct = 55 + Math.round((processedCount / totalFiles) * 40);

      onProgress?.({
        phase: 'updating-links',
        current: processedCount,
        total: totalFiles,
        message: `Redirecting wikilinks across vault (${processedCount}/${totalFiles} files checked)...`,
        percentage: linkPct,
      });

      // Yield control
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
  }

  onProgress?.({
    phase: 'completed',
    current: totalGroups,
    total: totalGroups,
    message: `Successfully merged ${mergedGroupCount} duplicate groups (${totalResolvedFiles} files resolved)!`,
    percentage: 100,
  });

  // Yield to allow UI to render the completion state
  await new Promise((resolve) => setTimeout(resolve, 30));

  return {
    updatedRawFiles: Array.from(fileMap.values()),
    resolvedCount: totalResolvedFiles,
    mergedGroupCount,
  };
}

/**
 * Automatically cleans all exact duplicate notes by keeping the primary one (synchronous version)
 */
export function batchResolveExactDuplicates(
  rawFiles: RawFileEntry[],
  duplicateGroups: DuplicateGroup[]
): { updatedRawFiles: RawFileEntry[]; resolvedCount: number } {
  if (!rawFiles || rawFiles.length === 0 || !duplicateGroups || duplicateGroups.length === 0) {
    return { updatedRawFiles: rawFiles || [], resolvedCount: 0 };
  }

  const exactGroups = duplicateGroups.filter((g) => g && g.type === 'exact-content');
  if (exactGroups.length === 0) return { updatedRawFiles: rawFiles, resolvedCount: 0 };

  const pathsToDelete = new Set<string>();
  const pathsToKeep = new Set<string>();
  const linkRedirectMap = new Map<string, string>(); // oldBaseName -> newBaseName

  exactGroups.forEach((group) => {
    if (!group || !group.files || group.files.length < 2) return;

    // Filter only files that currently exist in rawFiles
    const validGroupFiles = group.files.filter((f) => f && f.path && rawFiles.some((rf) => rf && rf.path === f.path));
    if (validGroupFiles.length < 2) return;

    // Sort to find best primary note (highest backlinks, shallowest directory depth)
    const sorted = [...validGroupFiles].sort((a, b) => {
      const aDepth = (a.path || '').split('/').length;
      const bDepth = (b.path || '').split('/').length;
      const aBacklinks = a.backlinks ? a.backlinks.length : 0;
      const bBacklinks = b.backlinks ? b.backlinks.length : 0;
      if (bBacklinks !== aBacklinks) {
        return bBacklinks - aBacklinks;
      }
      return aDepth - bDepth;
    });

    const primaryFile = sorted.find((f) => f && f.path && !pathsToDelete.has(f.path)) || sorted[0];
    if (!primaryFile || !primaryFile.path) return;

    pathsToKeep.add(primaryFile.path);

    const duplicates = sorted.filter((f) => f && f.path && f.path !== primaryFile.path && !pathsToKeep.has(f.path));
    duplicates.forEach((d) => {
      if (!d || !d.path) return;
      pathsToDelete.add(d.path);
      if (d.baseName && primaryFile.baseName && d.baseName !== primaryFile.baseName) {
        linkRedirectMap.set(d.baseName, primaryFile.baseName);
      }
    });
  });

  if (pathsToDelete.size === 0) {
    return { updatedRawFiles: rawFiles, resolvedCount: 0 };
  }

  let updatedRawFiles = rawFiles.filter((f) => f && !pathsToDelete.has(f.path));

  // If any deleted files had different names, redirect incoming wikilinks in remaining files
  if (linkRedirectMap.size > 0) {
    updatedRawFiles = updatedRawFiles.map((file) => {
      if (!file || file.isBinary || file.isConfigOrPlugin || !file.content) return file;
      let newContent = file.content;
      linkRedirectMap.forEach((newTarget, oldTarget) => {
        if (oldTarget && newTarget && oldTarget !== newTarget) {
          newContent = replaceLinkInContent(newContent, oldTarget, newTarget);
        }
      });
      if (newContent !== file.content) {
        return {
          ...file,
          content: newContent,
          size: newContent.length,
          lastModified: Date.now(),
        };
      }
      return file;
    });
  }

  return { updatedRawFiles, resolvedCount: pathsToDelete.size };
}

