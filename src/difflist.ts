import { div } from "./html-utils";
import { PromiseQ } from "./promiseq";
import { DiffFile } from "./types";
import * as Diff from 'diff';

export class DiffList {
  private readonly fileList: DiffFile[] = [];
  private readonly contentsCache: Record<string, string> = {};
  // Never more than 2 fetches at the same time
  private readonly fetches = new PromiseQ(2);

  /** Element list, for scrolling purposes */
  private readonly elements: Record<string, FilePane> = {};

  private pendingScroll?: string;

  constructor(private readonly container: HTMLElement) {}

  public setFiles(fileList: DiffFile[]) {
    this.fileList.splice(0, this.fileList.length);
    this.fileList.push(...fileList);

    this.container.innerHTML = '';

    for (const file of fileList) {
      const pane = new FilePane({
        name: file.entryName,
      });
      this.container.appendChild(pane.el);

      (async () => {
        try {
          const [leftContents, rightContents] = await Promise.all([
            this.fetches.do(async () => file.leftLocation ? fetchText(file.leftLocation) : ''),
            this.fetches.do(async () => file.rightLocation ? fetchText(file.rightLocation) : ''),
          ]);

          const diffs = Diff.diffLines(leftContents, rightContents);
          for (const d of diffs) {
            pane.addSegment(d.value.replace(/\n$/, ''),
              d.added ? 'added' :
              d.removed ? 'removed' : 
              'same');
          }

          this.elements[file.uid] = pane;
          if (file.uid === this.pendingScroll) {
            this.resolveScroll(file.uid);
          }
        } catch (e: any) {
          pane.el.appendChild(div({ className: 'box-red flashbox' }, e.message));
        }
      })();
    }
  }

  /**
   * Scroll to a given file's UID
   * 
   * (Only if all preceding files have been loaded already, otherwise the contents
   * will just scroll out of the screen)
   */
  public scrollTo(uid: string) {

    if (this.elements[uid]) {
      this.resolveScroll(uid);
    } else {
      // FIXME: If waiting, show a dialog
      this.pendingScroll = uid;
    }
  }

  private resolveScroll(uid: string) {
    this.elements[uid].el.scrollIntoView();
    this.elements[uid].el.style.animation = 'bump 200ms alternate ease-out 2';
    this.elements[uid].el.addEventListener('animationend', () => {
      this.elements[uid].el.style.animation = '';
    });
    this.pendingScroll = undefined;
  }
}

async function fetchText(url: URL) {
  const response = await fetch(url);
  // FIXME: Check response for text, do not download if not text (or size too large)
  return await response.text();
}

interface FilePaneProps {
  name: string;
}

class FilePane {
  public readonly el: HTMLElement;
  private readonly segmentContainer: HTMLElement;
  private init = true;

  constructor(props: FilePaneProps) {
    this.segmentContainer = div({ className: 'font-mono text-sm whitespace-pre bg-white py-1 overflow-x-auto' }, '(loading...)');
    this.el = div(
      { className: 'border border-black rounded shadow-md mx-4 mb-4 overflow-hidden' },
      div({ className: 'bg-gray-200 border-b border-gray-300 px-4 py-1 font-bold' }, props.name),
      this.segmentContainer,
    );
  }

  public addSegment(value: string, style: 'added' | 'removed' | 'same') {
    if (this.init) {
      this.segmentContainer.innerHTML = '';
      this.init = false;
    }

    let bgStyle = '';
    let prefix = '  ';
    switch (style) {
      case 'added':
        bgStyle = 'bg-green-200';
        prefix = '+ ';
        break;
      case 'removed':
        bgStyle = 'bg-red-200';
        prefix = '- ';
    }

    value = prefix + value.replace(/\n/g, `\n${prefix}`);

    this.segmentContainer.appendChild(div({
      className: `${bgStyle} px-2`,
    }, value));
  }
}