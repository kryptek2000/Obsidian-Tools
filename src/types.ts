export interface OutgoingLink {
  target: string;
  normalizedTarget: string;
  alias?: string;
  heading?: string;
  line: number;
  raw: string;
  isEmbed: boolean; // ![[note]] or ![[image.png]]
  isBroken: boolean;
  resolvedPath?: string;
}

export interface Backlink {
  sourceId: string;
  sourceTitle: string;
  line: number;
  snippet: string;
  isEmbed: boolean;
}

export interface VaultFile {
  id: string; // Relative path, e.g. "Work/Project Alpha.md"
  name: string; // e.g. "Project Alpha.md"
  baseName: string; // e.g. "Project Alpha"
  path: string;
  content: string;
  folder: string;
  extension: string;
  isAttachment: boolean;
  size: number;
  wordCount: number;
  frontmatter: Record<string, any> | null;
  rawFrontmatter: string | null;
  hasFrontmatterError: boolean;
  frontmatterErrorMsg?: string;
  outgoingLinks: OutgoingLink[];
  backlinks: Backlink[];
  tags: string[];
  unresolvedLinks: string[];
  isOrphan: boolean; // 0 incoming & 0 outgoing
  isSink: boolean; // has incoming, 0 outgoing
  isSource: boolean; // has outgoing, 0 incoming
  lastModified?: number;
}

export interface BrokenLinkItem {
  sourceId: string;
  sourceTitle: string;
  target: string;
  isEmbed: boolean;
  line: number;
  raw: string;
  suggestedFix?: string;
}

export interface FrontmatterIssueItem {
  fileId: string;
  fileName: string;
  reason: string;
  severity: 'error' | 'warning';
}

export interface UnusedAttachmentItem {
  id: string;
  name: string;
  folder: string;
  size: number;
}

export interface TagAuditItem {
  tag: string;
  count: number;
  notes: string[];
  potentialDuplicates?: string[]; // e.g. "productivity" vs "Productivity" or "tag" vs "tags"
}

export interface DuplicateGroup {
  id: string;
  type: 'exact-content' | 'same-name';
  title: string;
  files: VaultFile[];
  matchDetail: string;
  sizeDifference: number; // difference in bytes between min and max
  wordCount: number;
}

export interface ObsidianSettingsSummary {
  hasObsidianConfig: boolean;
  communityPlugins: string[];
  corePlugins: string[];
  themeName?: string;
  cssSnippets: string[];
  configFilesCount: number;
}

export interface VaultAuditSummary {
  vaultName: string;
  totalNotes: number;
  totalAttachments: number;
  totalFolders: number;
  totalWords: number;
  totalLinks: number;
  brokenLinksCount: number;
  brokenAttachmentsCount: number;
  orphanedNotesCount: number;
  untaggedNotesCount: number;
  frontmatterIssuesCount: number;
  unusedAttachmentsCount: number;
  duplicateGroupsCount: number;
  duplicateNotesCount: number;
  uniqueTagsCount: number;
  avgLinksPerNote: number;
  healthScore: number; // 0 - 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  tagFrequency: Record<string, number>;
  folderDistribution: Record<string, number>;
  brokenLinkItems: BrokenLinkItem[];
  orphanedItems: VaultFile[];
  frontmatterIssueItems: FrontmatterIssueItem[];
  unusedAttachmentItems: UnusedAttachmentItem[];
  tagAuditItems: TagAuditItem[];
  duplicateGroups: DuplicateGroup[];
  parsedFiles: VaultFile[];
  obsidianSettings?: ObsidianSettingsSummary;
}

export interface GraphNode {
  id: string;
  name: string;
  folder: string;
  degree: number;
  inDegree: number;
  outDegree: number;
  isOrphan: boolean;
  hasBrokenLinks: boolean;
  isAttachment: boolean;
  tags: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  isBroken: boolean;
  isEmbed: boolean;
}

export type ActiveTab =
  | 'overview'
  | 'graph'
  | 'broken-links'
  | 'orphans'
  | 'duplicates'
  | 'tags'
  | 'frontmatter'
  | 'files'
  | 'ai-insights';
