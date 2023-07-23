import { DiffList } from './difflist';
import { div } from './html-utils';
import { TreeView } from './treeview';
import { FileSetManifest, File, DirectoryTreeEntry, DiffDirectory, DirectoryTree, emptyDirectory, DiffFile, DiffTree } from './types';

async function main() {
  window.addEventListener('hashchange', () => {
    // We could put in effort here to restore the page to its initial state...
    // Or we could just reload it. Fortunately `replaceState` doesn't trigger this.
    window.location.reload();
  });

  const hash = new URLSearchParams(window.location.hash.substring(1));

  const l = hash.get('l');
  const r = hash.get('r');

  if (!l && !r) {
    document.getElementById('difflist')?.appendChild(
      div({ className: 'box-blue flashbox' },
      'To use this tool, append #l=/path/to/dir1&r=/path/to/dir2 to the URL. These directories should contain a MANIFEST file.'));
    return;
  }

  if (!l) {
    throw new Error('Missing hash parameter: l. Add #l=... to the URL');
  }
  if (!r) {
    throw new Error('Missing hash parameter: r. Add #r=... to the URL');
  }

  const manifestFile = hash.get('manifest') ?? 'MANIFEST';

  const [lmanifest, rmanifest] = await Promise.all([
    loadManifest(manifestFile, l, hash.get('lname') ?? undefined),
    loadManifest(manifestFile, r, hash.get('rname') ?? undefined),
  ]);

  setText('lname', lmanifest.name);
  setText('rname', rmanifest.name);
  document.title = `${lmanifest.name} vs. ${rmanifest.name} - StaticDiff`;

  const tree = new TreeView(getEl('explorer'));

  const diff = diffFileSets(lmanifest, rmanifest);
  tree.setDiff(diff);

  const list = new DiffList(getEl('difflist'));
  list.setFiles(flattenDiff(diff));

  const selected = hash.get('selected');
  if (selected) {
    list.scrollTo(selected);
  }

  tree.onSelect = (file) => {
    hash.set('selected', file.uid);
    history.replaceState(null, '', `#${hash.toString()}`);
    list.scrollTo(file.uid);
  };
}

export async function loadManifest(manifestFile: string, identifier: string, name?: string): Promise<FileSetManifest> {
  const response = await fetch(`${identifier}/${manifestFile}`);
  const bodyText = await response.text();
  const relFilesAndHashes = bodyText.split('\n');

  return {
    name: name ? name : identifier.split('/').slice(-1)[0],
    files: relFilesAndHashes.flatMap((relFileAndHash) => {
      relFileAndHash = relFileAndHash.trim();
      if (!relFileAndHash) { return []; }

      let [hash, relFile] = relFileAndHash.split(/\s+/);
      relFile = relFile.replace(/^\.\//, '');

      if (relFile === manifestFile) {
        return [];
      }
      if (!relFile) {
        throw new Error(`Missing hash in ${identifier}/${manifestFile}: ${relFileAndHash}`);
      }

      return [{
        displayName: relFile,
        uid: encodeURIComponent(relFile),
        hash,
        location: new URL(relFile, response.url),
      } satisfies File];
    }),
  };
}

function parseDirectoryTree(files: File[]): DirectoryTree {
  const ret: DirectoryTree = {
    type: 'dir',
    entries: {},
  };
  
  for (const file of files) {
    const parts = file.displayName.split('/');
    if (parts[0] === '.' && parts.length > 1) {
      parts.shift();
    }

    let dir = ret;
    while (parts.length > 1) {
      const nextDir = parts.shift()!;
      if (!dir.entries[nextDir]) {
        dir.entries[nextDir] = {
          type: 'dir',
          entries: {},
        };
      }
      const next = dir.entries[nextDir];
      if (next.type !== 'dir') {
        throw new Error(`Conflict between file and directory while adding ${file.displayName}`);
      }
      dir = next;
    }
    dir.entries[parts[0]!] = {
      type: 'file',
      ...file,
    };
  }
  return ret;
}

function diffFileSets(left: FileSetManifest, right: FileSetManifest): DiffDirectory {
  const leftTree = parseDirectoryTree(left.files);
  const rightTree = parseDirectoryTree(right.files);

  return diffDirectories(leftTree, rightTree);
}

function diffDirectories(left: DirectoryTree, right: DirectoryTree): DiffDirectory {
  const fileNames = Array.from(new Set([...Array.from(Object.keys(left.entries)), ...Array.from(Object.keys(right.entries))]));

  const ret: DiffDirectory = {
    type: 'dir',
    entryName: '<root>',
    children: [],
  };
  for (const file of fileNames) {
    const leftFile = left.entries[file];
    const rightFile = right.entries[file];

    if (leftFile && (!rightFile || leftFile.type !== rightFile.type)) {
      // Removed
      if (leftFile.type === 'file') {
        ret.children.push({
          type: 'file',
          status: 'removed',
          entryName: file,
          uid: leftFile.uid,
          leftLocation: leftFile.location,
        });
      } else if (leftFile.type === 'dir') {
        ret.children.push({
          ...diffDirectories(leftFile, emptyDirectory()),
          entryName: file,
        });
      }
    }
    if (rightFile && (!leftFile || leftFile.type !== rightFile.type)) {
      // Added
      if (rightFile.type === 'file') {
        ret.children.push({
          type: 'file',
          status: 'added',
          entryName: file,
          uid: rightFile.uid,
          rightLocation: rightFile.location,
        });
      } else if (rightFile.type === 'dir') {
        ret.children.push({
          ...diffDirectories(emptyDirectory(), rightFile),
          entryName: file,
        });
      }
    }
    if (leftFile && rightFile && leftFile.type === 'file' && rightFile.type === 'file') {
      // Modified
      if (leftFile.hash !== rightFile.hash) {
        ret.children.push({
          type: 'file',
          status: 'modified',
          entryName: file,
          uid: leftFile.uid,
          leftLocation:  leftFile.location,
          rightLocation: rightFile.location,
        });
      }
    }
    if (leftFile && rightFile && leftFile.type === 'dir' && rightFile.type === 'dir') {
      // Recurse
      const deepDiff = diffDirectories(leftFile, rightFile);
      if (deepDiff.children.length > 0) {
        ret.children.push({
          ...deepDiff,
          entryName: file,
        });
      }
    }
  }
  
  // Sort by name
  ret.children.sort((a, b) => a.entryName.localeCompare(b.entryName));
  return ret;
}

function flattenDiff(dir: DiffDirectory): DiffFile[] {
  const ret: DiffFile[] = [];
  for (const child of dir.children) {
    recurse(child, []);
  }
  return ret;

  function recurse(x: DiffTree, parents: string[]) {
    switch (x.type) {
      case 'file':
        ret.push({
          ...x,
          entryName: [...parents, x.entryName].join('/'),
        });
        return;
      case 'dir':
        for (const child of x.children) {
          recurse(child, [...parents, x.entryName]);
        }
    }
  }
}

main().catch((e) => {
  const div = document.getElementById('error-message');
  div?.classList.remove('hidden');
  (div as HTMLElement).innerText = `Error: ${e.message}\n${e.stack}`;
});


function setText(id: string, text: string) {
  const el = document.getElementById(id);
  if (el) {
    el.innerText = text;
  }
}

function getEl(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing element: #${id}`);
  }
  return el;
}