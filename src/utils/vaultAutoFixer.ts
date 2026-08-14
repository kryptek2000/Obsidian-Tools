import JSZip from 'jszip';
import { RawFileEntry } from './vaultParser';
import { VaultFile, BrokenLinkItem, TagAuditItem, FrontmatterIssueItem } from '../types';

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
  const escapedOld = oldTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 1. Wikilinks: [[oldTarget]] or [[oldTarget|Alias]] or [[oldTarget#Heading]] or ![[oldTarget]]
  const wikiPattern = new RegExp(`(!?\\[\\[)${escapedOld}(#[^\\]|]+)?(\\|[^\\]]+)?(\\]\\])`, 'g');
  let updated = content.replace(wikiPattern, (_match, prefix, heading, alias, closing) => {
    return `${prefix}${newTarget}${heading || ''}${alias || ''}${closing}`;
  });

  // 2. Markdown links: [alias](oldTarget.md) or [alias](oldTarget) or ![alt](oldTarget.png)
  const mdPattern = new RegExp(`(!?\\[[^\\]]*\\]\\()${escapedOld}(\\.md)?(#[^)]+)?(\\))`, 'g');
  updated = updated.replace(mdPattern, (_match, prefix, mdExt, heading, closing) => {
    const ext = mdExt ? '.md' : '';
    return `${prefix}${newTarget}${ext}${heading || ''}${closing}`;
  });

  return updated;
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
          const tagRegex = new RegExp(`(?<=[\\[\\s,"]|^|#)${lower}(?=[\\],\\s"]|$)`, 'gi');
          replacedLine = replacedLine.replace(tagRegex, (matched) => {
            if (matched !== canonical) {
              fmModified = true;
              return canonical;
            }
            return matched;
          });
        });
        return replacedLine;
      }

      // If inside a YAML tag list (e.g. "  - React")
      if (inTagsList) {
        if (/^\s*-\s+/.test(line)) {
          let replacedLine = line;
          casingMap.forEach((canonical, lower) => {
            const listTagRegex = new RegExp(`(?<=^\\s*-\\s*(?:#|"))?${lower}(?="?\\s*$)`, 'gi');
            if (new RegExp(`^\\s*-\\s*(?:#|")?${lower}["\\s]*$`, 'i').test(line)) {
              replacedLine = line.replace(new RegExp(`${lower}`, 'i'), canonical);
              if (replacedLine !== line) {
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
    const inlineTagRegex = new RegExp(`(^|[\\s(\\[{])#(${lower})(?=[\\s,.;:!?)\\]}]|$)`, 'gi');
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
