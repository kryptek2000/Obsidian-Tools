import { RawFileEntry } from './vaultParser';

const TEXT_EXTENSIONS = new Set([
  'md',
  'canvas',
  'txt',
  'json',
  'csv',
  'yaml',
  'yml',
  'css',
  'js',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'html',
  'xml',
  'svg',
]);

function shouldSkipPath(pathOrName: string): boolean {
  const parts = pathOrName.replace(/\\/g, '/').split('/');
  for (const part of parts) {
    // Only skip actual OS junk / version control / trash — NEVER skip .obsidian
    if (
      part === '.git' ||
      part === '.trash' ||
      part === '.DS_Store' ||
      part === 'node_modules' ||
      part === 'Thumbs.db' ||
      part === '.idea' ||
      part === '.vscode' ||
      part.startsWith('._')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Recursively scans a FileSystemDirectoryHandle (Modern Chrome/Edge/Opera API)
 */
export async function readDirectoryHandle(
  dirHandle: any,
  currentPath: string = ''
): Promise<RawFileEntry[]> {
  const entries: RawFileEntry[] = [];

  for await (const entry of dirHandle.values()) {
    const relativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

    if (shouldSkipPath(entry.name) || shouldSkipPath(relativePath)) {
      continue;
    }

    if (entry.kind === 'file') {
      const file = await entry.getFile();
      const ext = entry.name.includes('.') ? entry.name.split('.').pop()!.toLowerCase() : '';
      const isObsidianConfig = relativePath.startsWith('.obsidian/') || relativePath === '.obsidian' || relativePath.includes('/.obsidian/');
      const isTextFile = TEXT_EXTENSIONS.has(ext);

      if (isTextFile) {
        const text = await file.text();
        entries.push({
          path: relativePath,
          name: entry.name,
          content: text,
          isBinary: false,
          isConfigOrPlugin: isObsidianConfig,
          size: file.size,
          lastModified: file.lastModified,
        });
      } else {
        // Binary attachments, fonts, plugins, wasm, images, pdfs, audio
        const buffer = await file.arrayBuffer();
        entries.push({
          path: relativePath,
          name: entry.name,
          content: '',
          binaryData: new Uint8Array(buffer),
          isBinary: true,
          isConfigOrPlugin: isObsidianConfig,
          size: file.size,
          lastModified: file.lastModified,
        });
      }
    } else if (entry.kind === 'directory') {
      const subEntries = await readDirectoryHandle(entry, relativePath);
      entries.push(...subEntries);
    }
  }

  return entries;
}

/**
 * Handles browser FileList from input[type=file] webkitdirectory or drag-and-drop
 */
export async function readFileList(files: FileList | File[]): Promise<RawFileEntry[]> {
  const fileArray = Array.from(files);
  const entries: RawFileEntry[] = [];

  for (const file of fileArray) {
    const webkitPath = (file as any).webkitRelativePath || file.name;
    const pathParts = webkitPath.replace(/\\/g, '/').split('/');
    // Remove root folder name if uploaded via webkitdirectory to keep relative vault structure
    const relativePath = pathParts.length > 1 ? pathParts.slice(1).join('/') : file.name;

    if (shouldSkipPath(relativePath) || shouldSkipPath(file.name)) {
      continue;
    }

    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
    const isObsidianConfig = relativePath.startsWith('.obsidian/') || relativePath.includes('/.obsidian/');
    const isTextFile = TEXT_EXTENSIONS.has(ext);

    if (isTextFile) {
      const text = await file.text();
      entries.push({
        path: relativePath,
        name: file.name,
        content: text,
        isBinary: false,
        isConfigOrPlugin: isObsidianConfig,
        size: file.size,
        lastModified: file.lastModified,
      });
    } else {
      const buffer = await file.arrayBuffer();
      entries.push({
        path: relativePath,
        name: file.name,
        content: '',
        binaryData: new Uint8Array(buffer),
        isBinary: true,
        isConfigOrPlugin: isObsidianConfig,
        size: file.size,
        lastModified: file.lastModified,
      });
    }
  }

  return entries;
}
