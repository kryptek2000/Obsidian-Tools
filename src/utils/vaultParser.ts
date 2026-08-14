import * as yaml from 'js-yaml';
import {
  VaultFile,
  OutgoingLink,
  Backlink,
  VaultAuditSummary,
  BrokenLinkItem,
  FrontmatterIssueItem,
  UnusedAttachmentItem,
  TagAuditItem,
  GraphNode,
  GraphLink,
  DuplicateGroup,
} from '../types';

// Regex patterns for Obsidian syntax
const WIKILINK_REGEX = /(!?)\[\[([^\]]+)\]\]/g;
const MARKDOWN_LINK_REGEX = /(!?)\[([^\]]*)\]\(([^)]+)\)/g;
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const INLINE_TAG_REGEX = /(?:^|\s)(#([a-zA-Z0-9_\-\/]+))(?=[\s,.;:!?]|$)/g;

export interface RawFileEntry {
  path: string;
  name: string;
  content: string;
  binaryData?: Uint8Array | ArrayBuffer;
  isBinary?: boolean;
  isConfigOrPlugin?: boolean;
  size?: number;
  lastModified?: number;
}

/**
 * Normalizes a target string from a wikilink or markdown link
 */
export function normalizeTargetName(rawTarget: string): { targetBase: string; heading?: string; alias?: string } {
  let target = rawTarget.trim();
  let alias: string | undefined;
  let heading: string | undefined;

  // Handle pipe for alias: [[target|alias]]
  if (target.includes('|')) {
    const parts = target.split('|');
    target = parts[0].trim();
    alias = parts.slice(1).join('|').trim();
  }

  // Handle heading or block: [[target#heading]] or [[#heading]]
  if (target.includes('#')) {
    const parts = target.split('#');
    target = parts[0].trim();
    heading = parts.slice(1).join('#').trim();
  }

  // Remove .md extension if present
  if (target.toLowerCase().endsWith('.md')) {
    target = target.slice(0, -3);
  }

  // If path contains folders, extract base name or clean path
  const targetBase = target;

  return { targetBase, heading, alias };
}

/**
 * Parse a single markdown file content
 */
export function parseMarkdownFile(file: RawFileEntry): Omit<VaultFile, 'backlinks' | 'unresolvedLinks' | 'isOrphan' | 'isSink' | 'isSource'> {
  const path = file.path.replace(/\\/g, '/');
  const pathParts = path.split('/');
  const name = pathParts[pathParts.length - 1];
  const folder = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '/';
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : 'md';
  const isConfigOrPlugin = file.isConfigOrPlugin || path.startsWith('.obsidian/') || path.includes('/.obsidian/');
  const isAttachment = isConfigOrPlugin || !['md', 'canvas'].includes(ext);
  const baseName = ext === 'md' ? name.slice(0, -3) : name;

  if (isAttachment) {
    return {
      id: path,
      name,
      baseName,
      path,
      content: '',
      folder,
      extension: ext,
      isAttachment: true,
      size: file.size || (file.content ? file.content.length : 0),
      wordCount: 0,
      frontmatter: null,
      rawFrontmatter: null,
      hasFrontmatterError: false,
      outgoingLinks: [],
      tags: [],
      lastModified: file.lastModified,
    };
  }

  // Parse frontmatter
  let frontmatter: Record<string, any> | null = null;
  let rawFrontmatter: string | null = null;
  let hasFrontmatterError = false;
  let frontmatterErrorMsg: string | undefined;
  let bodyContent = file.content;

  const fmMatch = file.content.match(FRONTMATTER_REGEX);
  if (fmMatch) {
    rawFrontmatter = fmMatch[1];
    bodyContent = file.content.slice(fmMatch[0].length);
    try {
      const parsed = yaml.load(rawFrontmatter);
      if (parsed && typeof parsed === 'object') {
        frontmatter = parsed as Record<string, any>;
      }
    } catch (err: any) {
      hasFrontmatterError = true;
      frontmatterErrorMsg = err.message || 'Invalid YAML frontmatter';
    }
  }

  // Extract Tags (from frontmatter and inline body)
  const tagsSet = new Set<string>();

  if (frontmatter) {
    // tags or tag property in YAML
    const fmTags = frontmatter.tags || frontmatter.tag;
    if (Array.isArray(fmTags)) {
      fmTags.forEach((t) => {
        if (typeof t === 'string') {
          tagsSet.add(t.startsWith('#') ? t.slice(1).trim() : t.trim());
        }
      });
    } else if (typeof fmTags === 'string') {
      fmTags.split(/[,\s]+/).forEach((t) => {
        const clean = t.replace(/^#/, '').trim();
        if (clean) tagsSet.add(clean);
      });
    }
  }

  // Inline tags in body
  const lines = bodyContent.split('\n');
  let inCodeBlock = false;

  lines.forEach((line) => {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (inCodeBlock) return;

    let match;
    const lineTagRegex = new RegExp(INLINE_TAG_REGEX);
    while ((match = lineTagRegex.exec(line)) !== null) {
      const tagContent = match[2];
      // Avoid pure number hashes like #1 or markdown headings
      if (tagContent && !/^\d+$/.test(tagContent)) {
        tagsSet.add(tagContent);
      }
    }
  });

  // Extract Outgoing Links
  const outgoingLinks: OutgoingLink[] = [];
  const fullLines = file.content.split('\n');

  fullLines.forEach((lineText, lineIdx) => {
    // 1. Wikilinks [[target]] and ![[embed]]
    let match;
    const wikiRegex = new RegExp(WIKILINK_REGEX);
    while ((match = wikiRegex.exec(lineText)) !== null) {
      const isEmbed = match[1] === '!';
      const rawTarget = match[2];
      const { targetBase, heading, alias } = normalizeTargetName(rawTarget);

      // Skip empty or self-heading only links
      if (!targetBase && heading) {
        continue; // link to heading within same note
      }

      if (targetBase) {
        outgoingLinks.push({
          target: targetBase,
          normalizedTarget: targetBase.toLowerCase(),
          alias,
          heading,
          line: lineIdx + 1,
          raw: match[0],
          isEmbed,
          isBroken: false, // will resolve against vault
        });
      }
    }

    // 2. Markdown Links [title](path)
    const mdRegex = new RegExp(MARKDOWN_LINK_REGEX);
    while ((match = mdRegex.exec(lineText)) !== null) {
      const isEmbed = match[1] === '!';
      const rawTarget = match[3];

      // Exclude external web links (http, https, mailto, etc.)
      if (/^https?:\/\//i.test(rawTarget) || /^mailto:/i.test(rawTarget)) {
        continue;
      }

      const { targetBase, heading } = normalizeTargetName(rawTarget);
      if (targetBase) {
        outgoingLinks.push({
          target: targetBase,
          normalizedTarget: targetBase.toLowerCase(),
          alias: match[2],
          heading,
          line: lineIdx + 1,
          raw: match[0],
          isEmbed,
          isBroken: false,
        });
      }
    }
  });

  // Word count (ignoring frontmatter)
  const cleanBodyForWords = bodyContent.replace(/[#*`_~[\]()]/g, ' ');
  const words = cleanBodyForWords.trim().split(/\s+/).filter(Boolean);

  return {
    id: path,
    name,
    baseName,
    path,
    content: file.content,
    folder,
    extension: ext,
    isAttachment: false,
    size: file.size || file.content.length,
    wordCount: words.length,
    frontmatter,
    rawFrontmatter,
    hasFrontmatterError,
    frontmatterErrorMsg,
    outgoingLinks,
    tags: Array.from(tagsSet).sort(),
    lastModified: file.lastModified,
  };
}

/**
 * Calculates Levenshtein distance for fuzzy search suggestions
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Full Vault Analysis Engine
 */
export function analyzeVault(rawFiles: RawFileEntry[], vaultName: string = 'My Obsidian Vault'): VaultAuditSummary {
  // Step 1: Parse all files & extract Obsidian config/plugin metadata
  const parsedFiles: Map<string, VaultFile> = new Map();
  const fileLookupByBaseName: Map<string, VaultFile[]> = new Map();
  const fileLookupByPath: Map<string, VaultFile> = new Map();
  const fileLookupByName: Map<string, VaultFile[]> = new Map();

  let hasObsidianConfig = false;
  const communityPluginsSet = new Set<string>();
  const corePluginsSet = new Set<string>();
  let themeName: string | undefined;
  const cssSnippetsSet = new Set<string>();
  let configFilesCount = 0;

  rawFiles.forEach((rf) => {
    const cleanPath = rf.path.replace(/\\/g, '/');
    const isObsidian = rf.isConfigOrPlugin || cleanPath.startsWith('.obsidian/') || cleanPath.includes('/.obsidian/');

    if (isObsidian) {
      hasObsidianConfig = true;
      configFilesCount++;

      // Check community plugins JSON
      if (cleanPath.endsWith('.obsidian/community-plugins.json') && rf.content) {
        try {
          const plugins = JSON.parse(rf.content);
          if (Array.isArray(plugins)) {
            plugins.forEach((p) => typeof p === 'string' && communityPluginsSet.add(p));
          }
        } catch {}
      }

      // Check core plugins JSON
      if (cleanPath.endsWith('.obsidian/core-plugins.json') && rf.content) {
        try {
          const plugins = JSON.parse(rf.content);
          if (Array.isArray(plugins)) {
            plugins.forEach((p) => typeof p === 'string' && corePluginsSet.add(p));
          } else if (plugins && typeof plugins === 'object') {
            Object.keys(plugins).forEach((p) => plugins[p] && corePluginsSet.add(p));
          }
        } catch {}
      }

      // Check appearance.json for theme and snippets
      if (cleanPath.endsWith('.obsidian/appearance.json') && rf.content) {
        try {
          const appConfig = JSON.parse(rf.content);
          if (appConfig.cssTheme) themeName = appConfig.cssTheme;
          if (Array.isArray(appConfig.enabledCssSnippets)) {
            appConfig.enabledCssSnippets.forEach((s: string) => cssSnippetsSet.add(s));
          }
        } catch {}
      }

      // Detect plugins installed in .obsidian/plugins/<plugin-id>/
      const pluginDirMatch = cleanPath.match(/\.obsidian\/plugins\/([^\/]+)/);
      if (pluginDirMatch && pluginDirMatch[1]) {
        communityPluginsSet.add(pluginDirMatch[1]);
      }

      // Detect CSS snippets in .obsidian/snippets/<snippet-name>.css
      const snippetMatch = cleanPath.match(/\.obsidian\/snippets\/([^\/]+)\.css$/);
      if (snippetMatch && snippetMatch[1]) {
        cssSnippetsSet.add(snippetMatch[1]);
      }
    }

    const parsed = parseMarkdownFile(rf);
    const vaultFile: VaultFile = {
      ...parsed,
      backlinks: [],
      unresolvedLinks: [],
      isOrphan: false,
      isSink: false,
      isSource: false,
    };

    parsedFiles.set(vaultFile.id, vaultFile);
    fileLookupByPath.set(vaultFile.id.toLowerCase(), vaultFile);

    // Only index non-obsidian notes/attachments for wikilink resolution
    if (!isObsidian) {
      // Group by baseName (case-insensitive)
      const baseKey = vaultFile.baseName.toLowerCase();
      if (!fileLookupByBaseName.has(baseKey)) {
        fileLookupByBaseName.set(baseKey, []);
      }
      fileLookupByBaseName.get(baseKey)!.push(vaultFile);

      // Group by full fileName
      const nameKey = vaultFile.name.toLowerCase();
      if (!fileLookupByName.has(nameKey)) {
        fileLookupByName.set(nameKey, []);
      }
      fileLookupByName.get(nameKey)!.push(vaultFile);
    }
  });

  const allNotesList = Array.from(parsedFiles.values()).filter((f) => !f.isAttachment && !f.id.startsWith('.obsidian/'));
  const allAttachmentsList = Array.from(parsedFiles.values()).filter((f) => f.isAttachment && !f.id.startsWith('.obsidian/'));

  // Helper to resolve link target
  const resolveTarget = (targetStr: string): VaultFile | null => {
    const cleanTarget = targetStr.trim().replace(/\\/g, '/');
    const lower = cleanTarget.toLowerCase();

    // 1. Direct path match
    if (fileLookupByPath.has(lower)) {
      return fileLookupByPath.get(lower)!;
    }
    if (fileLookupByPath.has(lower + '.md')) {
      return fileLookupByPath.get(lower + '.md')!;
    }

    // 2. BaseName match
    const baseTarget = cleanTarget.split('/').pop() || cleanTarget;
    const lowerBase = baseTarget.toLowerCase();
    if (fileLookupByBaseName.has(lowerBase)) {
      return fileLookupByBaseName.get(lowerBase)![0];
    }

    // 3. Name with extension match
    if (fileLookupByName.has(lowerBase)) {
      return fileLookupByName.get(lowerBase)![0];
    }

    return null;
  };

  const brokenLinkItems: BrokenLinkItem[] = [];
  const incomingEmbedsSet = new Set<string>();

  // Step 2: Resolve all outgoing links & register backlinks
  parsedFiles.forEach((file) => {
    if (file.isAttachment) return;

    file.outgoingLinks.forEach((link) => {
      const resolved = resolveTarget(link.target);

      if (resolved) {
        link.isBroken = false;
        link.resolvedPath = resolved.id;

        if (link.isEmbed) {
          incomingEmbedsSet.add(resolved.id.toLowerCase());
        }

        // Register backlink on resolved target
        resolved.backlinks.push({
          sourceId: file.id,
          sourceTitle: file.baseName,
          line: link.line,
          snippet: link.raw,
          isEmbed: link.isEmbed,
        });
      } else {
        link.isBroken = true;
        file.unresolvedLinks.push(link.target);

        // Find closest fuzzy match suggestion
        let bestMatch: string | undefined;
        let lowestDist = Infinity;

        const candidateList = link.isEmbed ? allAttachmentsList : allNotesList;
        for (const candidate of candidateList) {
          const dist = levenshteinDistance(link.target.toLowerCase(), candidate.baseName.toLowerCase());
          if (dist < lowestDist && dist <= 3) {
            lowestDist = dist;
            bestMatch = candidate.baseName;
          }
        }

        brokenLinkItems.push({
          sourceId: file.id,
          sourceTitle: file.baseName,
          target: link.target,
          isEmbed: link.isEmbed,
          line: link.line,
          raw: link.raw,
          suggestedFix: bestMatch,
        });
      }
    });
  });

  // Step 3: Compute orphan status, frontmatter issues, and unused attachments
  const orphanedItems: VaultFile[] = [];
  const frontmatterIssueItems: FrontmatterIssueItem[] = [];
  const unusedAttachmentItems: UnusedAttachmentItem[] = [];
  const tagFrequency: Record<string, number> = {};
  const folderDistribution: Record<string, number> = {};
  let untaggedNotesCount = 0;
  let totalWords = 0;
  let totalLinks = 0;

  parsedFiles.forEach((file) => {
    // Folder distribution
    const folderKey = file.folder === '/' ? 'Root' : file.folder;
    folderDistribution[folderKey] = (folderDistribution[folderKey] || 0) + 1;

    if (file.isAttachment) {
      // Check if attachment is used
      if (!incomingEmbedsSet.has(file.id.toLowerCase())) {
        unusedAttachmentItems.push({
          id: file.id,
          name: file.name,
          folder: file.folder,
          size: file.size,
        });
      }
      return;
    }

    totalWords += file.wordCount;
    totalLinks += file.outgoingLinks.length;

    // Tags frequency
    if (file.tags.length === 0) {
      untaggedNotesCount++;
    } else {
      file.tags.forEach((tag) => {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
      });
    }

    // Graph connection types
    const inDegree = file.backlinks.length;
    const outDegree = file.outgoingLinks.filter((l) => !l.isBroken).length;

    if (inDegree === 0 && outDegree === 0) {
      file.isOrphan = true;
      orphanedItems.push(file);
    } else if (inDegree > 0 && outDegree === 0) {
      file.isSink = true;
    } else if (inDegree === 0 && outDegree > 0) {
      file.isSource = true;
    }

    // Frontmatter Diagnostics
    if (file.hasFrontmatterError) {
      frontmatterIssueItems.push({
        fileId: file.id,
        fileName: file.name,
        reason: file.frontmatterErrorMsg || 'YAML Syntax Error',
        severity: 'error',
      });
    } else if (!file.frontmatter) {
      frontmatterIssueItems.push({
        fileId: file.id,
        fileName: file.name,
        reason: 'Missing Frontmatter metadata block',
        severity: 'warning',
      });
    } else {
      // Check for empty frontmatter or missing title/tags/date
      const keys = Object.keys(file.frontmatter);
      if (keys.length === 0) {
        frontmatterIssueItems.push({
          fileId: file.id,
          fileName: file.name,
          reason: 'Empty Frontmatter block (--- ---)',
          severity: 'warning',
        });
      }
    }
  });

  // Step 4: Tag Audit (detect casing mismatches, e.g. #react vs #React, or plural #notes vs #note)
  const tagAuditItems: TagAuditItem[] = [];
  const tagCasingMap: Map<string, string[]> = new Map();

  allNotesList.forEach((note) => {
    note.tags.forEach((tag) => {
      const lower = tag.toLowerCase();
      if (!tagCasingMap.has(lower)) {
        tagCasingMap.set(lower, []);
      }
      if (!tagCasingMap.get(lower)!.includes(tag)) {
        tagCasingMap.get(lower)!.push(tag);
      }
    });
  });

  Object.entries(tagFrequency).forEach(([tag, count]) => {
    const notesWithTag = allNotesList.filter((n) => n.tags.includes(tag)).map((n) => n.baseName);
    const lower = tag.toLowerCase();
    const casingVariants = tagCasingMap.get(lower)?.filter((v) => v !== tag) || [];

    tagAuditItems.push({
      tag,
      count,
      notes: notesWithTag,
      potentialDuplicates: casingVariants.length > 0 ? casingVariants : undefined,
    });
  });

  tagAuditItems.sort((a, b) => b.count - a.count);

  // Step 4.5: Duplicate Detection (Identical content and Identical base names)
  const duplicateGroups: DuplicateGroup[] = [];

  // A. Exact content matches
  const contentMap = new Map<string, VaultFile[]>();
  allNotesList.forEach((note) => {
    // Strip YAML frontmatter
    const body = note.content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
    // Normalize extra line spaces
    const normalized = body.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
    if (normalized.length >= 15) {
      if (!contentMap.has(normalized)) {
        contentMap.set(normalized, []);
      }
      contentMap.get(normalized)!.push(note);
    }
  });

  const exactContentFilesSet = new Set<string>();
  let groupCounter = 0;

  contentMap.forEach((groupFiles) => {
    if (groupFiles.length >= 2) {
      groupCounter++;
      groupFiles.forEach((f) => exactContentFilesSet.add(f.id));
      const sizes = groupFiles.map((f) => f.size);
      const minSize = Math.min(...sizes);
      const maxSize = Math.max(...sizes);
      duplicateGroups.push({
        id: `exact-${groupCounter}-${groupFiles[0].baseName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        type: 'exact-content',
        title: `Exact Content: "${groupFiles[0].baseName}"`,
        files: groupFiles,
        matchDetail: `Identical body content across ${groupFiles.length} notes (~${groupFiles[0].wordCount} words)`,
        sizeDifference: maxSize - minSize,
        wordCount: groupFiles[0].wordCount,
      });
    }
  });

  // B. Same base name collisions (cross-folder name duplicates)
  const nameMap = new Map<string, VaultFile[]>();
  allNotesList.forEach((note) => {
    const key = note.baseName.toLowerCase().trim();
    if (!nameMap.has(key)) {
      nameMap.set(key, []);
    }
    nameMap.get(key)!.push(note);
  });

  nameMap.forEach((groupFiles, key) => {
    if (groupFiles.length >= 2) {
      // Check if all of them are already in exact content group
      const allExact = groupFiles.every((f) => exactContentFilesSet.has(f.id));
      if (!allExact) {
        groupCounter++;
        const sizes = groupFiles.map((f) => f.size);
        const minSize = Math.min(...sizes);
        const maxSize = Math.max(...sizes);
        duplicateGroups.push({
          id: `name-${groupCounter}-${key.replace(/[^a-z0-9]/g, '-')}`,
          type: 'same-name',
          title: `Name Collision: "${groupFiles[0].baseName}"`,
          files: groupFiles,
          matchDetail: `Same note title in ${groupFiles.length} separate folders (${groupFiles.map((f) => f.folder === '/' ? 'Root' : f.folder).join(', ')})`,
          sizeDifference: maxSize - minSize,
          wordCount: Math.max(...groupFiles.map((f) => f.wordCount)),
        });
      }
    }
  });

  // Sort: Exact content matches first, then largest groups
  duplicateGroups.sort((a, b) => {
    if (a.type === 'exact-content' && b.type !== 'exact-content') return -1;
    if (b.type === 'exact-content' && a.type !== 'exact-content') return 1;
    return b.files.length - a.files.length;
  });

  const duplicateNotesCount = duplicateGroups.reduce((acc, g) => acc + g.files.length, 0);

  // Step 5: Compute Health Score (0 - 100)
  const totalNotes = allNotesList.length;
  const brokenLinksCount = brokenLinkItems.filter((i) => !i.isEmbed).length;
  const brokenAttachmentsCount = brokenLinkItems.filter((i) => i.isEmbed).length;
  const orphanedNotesCount = orphanedItems.length;
  const frontmatterIssuesCount = frontmatterIssueItems.length;

  let score = 100;
  if (totalNotes > 0) {
    // Broken link penalty: up to -35 points
    const brokenRatio = (brokenLinksCount + brokenAttachmentsCount) / Math.max(1, totalLinks || 1);
    score -= Math.min(35, Math.round(brokenRatio * 50));

    // Orphan note penalty: up to -25 points
    const orphanRatio = orphanedNotesCount / totalNotes;
    score -= Math.min(25, Math.round(orphanRatio * 40));

    // Untagged note penalty: up to -15 points
    const untaggedRatio = untaggedNotesCount / totalNotes;
    score -= Math.min(15, Math.round(untaggedRatio * 20));

    // Frontmatter error penalty: up to -15 points
    const fmErrorCount = frontmatterIssueItems.filter((f) => f.severity === 'error').length;
    score -= Math.min(15, fmErrorCount * 5);

    // Unused attachment penalty: up to -10 points
    if (allAttachmentsList.length > 0) {
      const unusedAttachRatio = unusedAttachmentItems.length / allAttachmentsList.length;
      score -= Math.min(10, Math.round(unusedAttachRatio * 15));
    }
  }

  score = Math.max(0, Math.min(100, score));

  // Determine Grade
  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A+';
  if (score >= 95) grade = 'A+';
  else if (score >= 88) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 45) grade = 'D';
  else grade = 'F';

  const avgLinksPerNote = totalNotes > 0 ? Number((totalLinks / totalNotes).toFixed(1)) : 0;

  return {
    vaultName,
    totalNotes,
    totalAttachments: allAttachmentsList.length,
    totalFolders: Object.keys(folderDistribution).length,
    totalWords,
    totalLinks,
    brokenLinksCount,
    brokenAttachmentsCount,
    orphanedNotesCount,
    untaggedNotesCount,
    frontmatterIssuesCount,
    unusedAttachmentsCount: unusedAttachmentItems.length,
    duplicateGroupsCount: duplicateGroups.length,
    duplicateNotesCount,
    uniqueTagsCount: Object.keys(tagFrequency).length,
    avgLinksPerNote,
    healthScore: score,
    grade,
    tagFrequency,
    folderDistribution,
    brokenLinkItems,
    orphanedItems,
    frontmatterIssueItems,
    unusedAttachmentItems,
    tagAuditItems,
    duplicateGroups,
    parsedFiles: Array.from(parsedFiles.values()),
    obsidianSettings: hasObsidianConfig
      ? {
          hasObsidianConfig: true,
          communityPlugins: Array.from(communityPluginsSet).sort(),
          corePlugins: Array.from(corePluginsSet).sort(),
          themeName,
          cssSnippets: Array.from(cssSnippetsSet).sort(),
          configFilesCount,
        }
      : undefined,
  };
}

/**
 * Builds D3 Graph Data from parsed vault files
 */
export function buildGraphData(files: VaultFile[]): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodesMap = new Map<string, GraphNode>();
  const links: GraphLink[] = [];

  const notesAndAttachments = files;

  // Create nodes
  notesAndAttachments.forEach((f) => {
    nodesMap.set(f.id, {
      id: f.id,
      name: f.baseName || f.name,
      folder: f.folder,
      degree: f.backlinks.length + f.outgoingLinks.length,
      inDegree: f.backlinks.length,
      outDegree: f.outgoingLinks.length,
      isOrphan: f.isOrphan,
      hasBrokenLinks: f.outgoingLinks.some((l) => l.isBroken),
      isAttachment: f.isAttachment,
      tags: f.tags,
    });
  });

  // Create links
  notesAndAttachments.forEach((f) => {
    if (f.isAttachment) return;
    f.outgoingLinks.forEach((link) => {
      if (link.resolvedPath && nodesMap.has(link.resolvedPath)) {
        links.push({
          source: f.id,
          target: link.resolvedPath,
          isBroken: false,
          isEmbed: link.isEmbed,
        });
      }
    });
  });

  return {
    nodes: Array.from(nodesMap.values()),
    links,
  };
}
