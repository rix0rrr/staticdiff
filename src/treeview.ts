import { Children, Props, div, header, i, section, span } from "./html-utils";
import { DiffDirectory, DiffFile, DiffTree, FileDiffStatus } from "./types";

type SelectHandler = (x: DiffFile) => void;

export interface TreeViewOptions {
  readonly onSelect?: SelectHandler;
}

/**
 * A reimplementation of a TreeView.
 * 
 * Because I'm silly.
 */
export class TreeView {
  public onSelect?: SelectHandler;

  constructor(private readonly container: HTMLElement, options: TreeViewOptions = {}) {
    this.onSelect = options.onSelect;
  }

  public setDiff(diff: DiffDirectory) {
    this.container.innerHTML = '';
    const tree = section(
      { className: "container" },
      ...this.nodesFromEntries(diff.children),
    );
    this.container.appendChild(tree);
  }

  private nodesFromEntries(entries: DiffTree[]): HTMLElement[] {
    return entries.map(e => {
      switch (e.type) {
        case 'file': return this.nodeFromFile(e);
        case 'dir': return this.nodeFromDir(e);
      }
    });
  }

  private nodeFromDir(e: DiffDirectory) {
    return Folder(
      { name: e.entryName, open: true },
      ...this.nodesFromEntries(e.children),
    );
  }

  private nodeFromFile(e: DiffFile) {
    return File({
      name: e.entryName,
      status: e.status,
      onClick: () => this.onSelect?.(e),
    });
  }
}

//////////////////////////////////////////////////////////////////////
// File & Folder

interface FileProps {
  name: string;
  status: FileDiffStatus;
  onClick?: () => void;
}

const File = ({ name, status, onClick }: FileProps) => {
  let icon = 'fa-file';
  let color = 'text-gray-700';
  switch (status) {
    case 'added':
      icon = 'fa-file-circle-plus';
      color = 'text-green-700';
      break;
    case 'removed':
      icon = 'fa-file-circle-minus';
      color = 'text-red-700';
      break;
  }

  return div(
    { className: 'clickable entry', onClick },
    i({ className: `icon fa-regular ${icon} ${color}` }),
    span(null, name)
  );
};

/* Folder */

function changeOpened(event: Event) {
  const folderHeader = (event.target as HTMLElement).classList.contains("folder-header")
    ? event.target as HTMLElement
    : (event.target as HTMLElement).parentElement as HTMLElement;
  const opened = folderHeader.getAttribute("opened") == "true";
  const newOpened = !opened;

  const oldClass = folderClass(opened);
  const newClass = folderClass(newOpened);

  let icons = folderHeader.querySelectorAll('i');
  icons.forEach(icon => {
    icon.classList.remove(oldClass);
    icon.classList.add(newClass);
  });

  try {
    const sibling = folderHeader.nextElementSibling as HTMLElement;
    if (newOpened) {
      sibling.classList.remove("hidden");
    } else {
      sibling.classList.add("hidden");
    }
  } catch (e) {
    console.warn(`No sibling of elem ${folderHeader} found ...`);
  }

  folderHeader.setAttribute("opened", `${newOpened}`);
  event.preventDefault();
}

const Folder = (props: Props, ...children: Children) => {
  const open = (props ?? {}).open || false;
  const folderName = (props ?? {}).name || "unknown";

  return div({},
    header(
      {
        onClick: changeOpened,
        className: "clickable entry folder-header",
        open: open
      },
      i({ className: `icon fa-regular ${folderClass(open)} text-amber-600` }),
      span(null, folderName)
    ),
    div({ className: `px-2 ${open ? "" : "hidden"}` }, ...children)
  );
};

function folderClass(open: boolean) {
  return open ? 'fa-folder-open' : 'fa-folder-closed';
}
