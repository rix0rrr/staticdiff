//////////////////////////////////////////////////////////////////////
// Manifest

export interface FileSetManifest {
  readonly name: string;
  readonly files: File[];
}

export interface File {
  readonly uid: string;
  readonly displayName: string;
  readonly location: URL;
  readonly hash: string;
}

//////////////////////////////////////////////////////////////////////
// Representation of a directory tree

export type DirectoryTreeEntry = 
  | { readonly type: 'dir'; readonly entries: Record<string, DirectoryTreeEntry> }
  | { readonly type: 'file' } & File;

export type DirectoryTree = Extract<DirectoryTreeEntry, { type: 'dir' }>;

export function emptyDirectory(): DirectoryTree {
  return { type: 'dir', entries: {} };
}

//////////////////////////////////////////////////////////////////////
// Diff of a directory tree

export type FileDiffStatus = 'added' | 'removed' | 'modified';

export type DiffTree = DiffDirectory | DiffFile;

export interface DiffDirectory {
  readonly type: 'dir';
  readonly entryName: string
  readonly children: DiffTree[];
}

export interface DiffFile {
  readonly type: 'file'; 
  readonly uid: string;
  /**
   * The file name
   * 
   * The directory-local filename if in a hierarchical structure, or the 
   * full relative file name if in a flat list.
   */
  readonly entryName: string;
  readonly leftLocation?: URL;
  readonly rightLocation?: URL;
  readonly status: FileDiffStatus;
}