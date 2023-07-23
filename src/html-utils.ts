////////////////////////////////////////////////////////////////////////
// HTML Elements

export const div = (props: Props, ...children: Children) => createElement("div", props, ...children);
export const ul = (props: Props, ...children: Children) => createElement("ul", props, ...children);
export const li = (props: Props, ...children: Children) => createElement("li", props, ...children);
export const i = (props: Props, ...children: Children) => createElement("i", props, ...children);
export const span = (props: Props, ...children: Children) => createElement("span", props, ...children);
export const header = (props: Props, ...children: Children) =>
  createElement("header", props, ...children);
export const p = (props: Props, ...children: Children) => createElement("p", props, ...children);
export const section = (props: Props, ...children: Children) =>
  createElement("section", props, ...children);
export const button = (props: Props, ...children: Children) =>
  createElement("button", props, ...children);

//////////////////////////////////////////////////////////////////////
// Copy/pasted from someone who built their own jQuery

//type, [props], [...children]
export function createElement(type: string | Function, props: any, ...children: Children) {
  if (typeof type === "function") {
    return type(props);
  } else {
    const el = document.createElement(type);
    if (props && typeof props === "object") {
      setProps(el, props);
    }
    if (children) {
      appendChildren(el, children);
    }
    return el;
  }
}

export type Props = Record<string, any> | null;
export type Children = Array<HTMLElement | string>;

function setProps(el: HTMLElement, props: Props) {
  const eventRegex = /^on([a-z]+)$/i;
  for (let propName in props) {
    if (!propName) continue;

    if (propName === "style") {
      setStyle(el, props[propName]);
    } else if (propName === "className") {
      setClass(el, props[propName]);
    } else if (eventRegex.test(propName)) {
      const eventToListen = propName.replace(eventRegex, "$1").toLowerCase();
      el.addEventListener(eventToListen, props[propName]);
    } else {
      el.setAttribute(propName, props[propName]);
    }
  }
}
function appendChildren(parent: HTMLElement, children: Children) {
  for (let child of children) {
    if (!child) continue;
    switch (typeof child) {
      case "string":
        const el = document.createTextNode(child);
        parent.appendChild(el);
        break;
      default:
        parent.appendChild(child);
        break;
    }
  }
}
function setStyle(el: HTMLElement, style: string | Record<string, string>) {
  if (typeof style == "string") {
    el.setAttribute("style", style);
  } else {
    Object.assign(el.style, style);
  }
}
function setClass(el: HTMLElement, className: string) {
  className.split(/\s+/).forEach(element => {
    if (element) {
      el.classList.add(element);
    }
  });
}
