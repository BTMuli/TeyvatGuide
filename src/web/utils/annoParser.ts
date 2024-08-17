/**
 * @file web/utils/annoParser.ts
 * @description 解析游戏内公告数据
 * @since Beta v0.5.3
 */

import { h, render } from "vue";

import TpText from "../../components/post/tp-text.vue";

import { decodeRegExp } from "./tools.js";

/**
 * @description 预处理p
 * @since Beta v0.5.2
 * @param {HTMLParagraphElement} p p 元素
 * @returns {HTMLParagraphElement} 解析后的 p 元素
 */
function handleAnnoP(p: HTMLParagraphElement): HTMLParagraphElement {
  if (p.children.length === 0) {
    p.innerHTML = decodeRegExp(p.innerHTML);
  } else {
    p.querySelectorAll("*").forEach((child) => {
      child.innerHTML = decodeRegExp(child.innerHTML);
      child.querySelectorAll("span").forEach((span) => handleAnnoSpan(span));
    });
  }
  return p;
}

/**
 * @description 预处理 span
 * @since Beta v0.4.4
 * @param {HTMLSpanElement} span span 元素
 * @returns {HTMLSpanElement} 解析后的 span 元素
 */
function handleAnnoSpan(span: HTMLSpanElement): HTMLSpanElement {
  if (span.style.fontSize) {
    span.style.fontSize = "";
  }
  if (span.children.length === 0) {
    span.innerHTML = decodeRegExp(span.innerHTML);
  } else {
    span.querySelectorAll("*").forEach((child) => {
      if (child.children.length === 0) {
        child.innerHTML = decodeRegExp(child.innerHTML);
      }
      if (child.tagName === "T") {
        child.outerHTML = child.innerHTML;
      }
    });
  }
  return span;
}

/**
 * @description 预处理table
 * @since Beta v0.4.7
 * @param {HTMLTableElement} table table 元素
 * @returns {HTMLTableElement} 解析后的 table 元素
 */
function handleAnnoTable(table: HTMLTableElement): HTMLTableElement {
  table.style.borderColor = "var(--common-shadow-2)";
  table.querySelectorAll("colgroup").forEach((colgroup) => colgroup.remove());
  table.querySelectorAll("td").forEach((td) => {
    if (td.style.backgroundColor) td.style.backgroundColor = "var(--box-bg-1)";
    td.style.textAlign = "center";
  });
  return table;
}

/**
 * @description 预处理公告内容
 * @since Beta v0.4.4
 * @param {string} data 游戏内公告数据
 * @returns {string} 解析后的数据
 */
export function handleAnnoContent(data: string): string {
  const htmlBase = new DOMParser().parseFromString(data, "text/html");
  htmlBase.querySelectorAll("p").forEach((p) => handleAnnoP(p));
  htmlBase.querySelectorAll("span").forEach((span) => handleAnnoSpan(span));
  htmlBase.querySelectorAll("table").forEach((table) => handleAnnoTable(table));
  return htmlBase.body.innerHTML;
}

/**
 * @description 解析公告内容，转换为结构化数据
 * @since Beta v0.5.3
 * @param {TGApp.BBS.Announcement.ContentItem} anno - 公告内容
 * @returns {TGApp.Plugins.Mys.SctPost.Base[]} 结构化数据
 */
export function parseAnnoContent(
  anno: TGApp.BBS.Announcement.ContentItem,
): TGApp.Plugins.Mys.SctPost.Base[] {
  const parser = new DOMParser();
  const first = handleAnnoContent(anno.content);
  const doc = parser.parseFromString(first, "text/html");
  const children: TGApp.Plugins.Mys.SctPost.Base[] = [];
  if (anno.banner !== "") children.push({ insert: { image: anno.banner } });
  doc.body.childNodes.forEach((child) => {
    children.push(...parseAnnoNode(child));
  });
  return children;
}

/**
 * @description 解析公告节点
 * @since Beta v0.5.3
 * @param {Node} node - 节点
 * @param {Record<string, string>} attr - 属性
 * @returns {TGApp.Plugins.Mys.SctPost.Base} 结构化数据
 */
function parseAnnoNode(
  node: Node,
  attr?: Record<string, string>,
): TGApp.Plugins.Mys.SctPost.Base[] {
  let defaultRes: TGApp.Plugins.Mys.SctPost.Base = {
    insert: {
      tag: node.nodeName,
      text: node.textContent,
      type: node.nodeType,
    },
  };
  if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) {
    return [defaultRes];
  }
  if (node.nodeType === Node.TEXT_NODE) {
    return [{ insert: node.textContent, attributes: attr }];
  }
  const element = <HTMLElement>node;
  defaultRes = {
    insert: {
      tag: element.tagName,
      text: element.textContent,
      style: element.style.cssText,
      html: element.innerHTML,
      outerHtml: element.outerHTML,
    },
  };
  if (element.tagName === "P") {
    element.innerHTML = decodeRegExp(element.innerHTML);
    return [parseAnnoParagraph(element, attr)];
  }
  if (element.tagName === "OL" || element.tagName === "LI" || element.tagName === "UL") {
    const res: TGApp.Plugins.Mys.SctPost.Base[] = [];
    Array.from(element.children).forEach((child) => {
      res.push(...parseAnnoNode(child, attr));
    });
    return res;
  }
  if (element.tagName === "DETAILS") {
    return [parseAnnoDetails(element)];
  }
  if (element.tagName === "TABLE") {
    return [parseAnnoTable(element)];
  }
  if (element.tagName === "DIV") {
    if (element.childNodes.length > 1) {
      const res: TGApp.Plugins.Mys.SctPost.Base[] = [];
      element.childNodes.forEach((child) => {
        res.push(...parseAnnoNode(child, attr));
      });
      return res;
    }
    if (element.childNodes.length === 0) return [defaultRes];
    const child = element.childNodes[0];
    if (child.nodeType !== Node.ELEMENT_NODE) return [defaultRes];
    return parseAnnoNode(child, attr);
  }
  if (element.tagName === "SUMMARY") {
    const p = document.createElement("p");
    p.innerHTML = element.innerHTML;
    return [parseAnnoParagraph(p, attr)];
  }
  if (element.tagName === "SPAN") {
    return [parseAnnoSpan(element, attr)];
  }
  if (element.tagName === "STRONG") {
    const res: TGApp.Plugins.Mys.SctPost.Base[] = [];
    element.childNodes.forEach((child) => {
      res.push(...parseAnnoNode(child, { bold: "true" }));
    });
    return res;
  }
  if (element.tagName === "T") {
    const res: TGApp.Plugins.Mys.SctPost.Base[] = [];
    element.childNodes.forEach((child) => {
      res.push(...parseAnnoNode(child, attr));
    });
    return res;
  }
  return [defaultRes];
}

/**
 * @description 解析公告段落
 * @since Beta v0.5.3
 * @param {HTMLElement} p - 段落元素
 * @param {Record<string, string>} attr - 属性
 * @returns {TGApp.Plugins.Mys.SctPost.Base} 结构化数据
 */
function parseAnnoParagraph(
  p: HTMLElement,
  attr?: Record<string, string>,
): TGApp.Plugins.Mys.SctPost.Base {
  const defaultRes = {
    insert: {
      tag: p.tagName,
      text: p.textContent,
      style: p.style.cssText,
      html: p.innerHTML,
      outerHtml: p.outerHTML,
      childrenLength: p.childNodes.length,
    },
  };
  if (p.childNodes.length === 0) {
    return {
      insert: p.innerHTML === "" ? "\n" : p.textContent,
    };
  }
  if (p.childNodes.length === 1) {
    if (
      p.childNodes[0].nodeType !== Node.ELEMENT_NODE &&
      p.childNodes[0].nodeType !== Node.TEXT_NODE
    ) {
      return defaultRes;
    }
    if (p.childNodes[0].nodeType === Node.TEXT_NODE) {
      const span = document.createElement("span");
      span.innerHTML = p.innerHTML;
      return {
        insert: "",
        children: [parseAnnoSpan(span, attr)],
      };
    }
    const child = <HTMLElement>p.childNodes[0];
    if (child.tagName === "SPAN") {
      return {
        insert: "",
        children: [parseAnnoSpan(child, attr)],
      };
    }
    if (child.tagName === "IMG") {
      return parseAnnoImage(child);
    }
    if (child.tagName === "A") {
      return {
        insert: "",
        children: [parseAnnoAnchor(child)],
        attributes: { align: "center" },
      };
    }
    if (child.tagName === "STRONG") {
      const res = parseAnnoNode(child, { bold: "true" });
      return {
        insert: "",
        children: res,
      };
    }
    return defaultRes;
  }
  const res: TGApp.Plugins.Mys.SctPost.Base = {
    insert: "",
    children: [],
  };
  p.childNodes.forEach((child) => {
    let childRes: TGApp.Plugins.Mys.SctPost.Base;
    if (child.nodeType === Node.TEXT_NODE) {
      childRes = { insert: child.textContent };
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const element = <HTMLElement>child;
      if (element.tagName === "SPAN") {
        childRes = parseAnnoSpan(element);
      } else if (element.tagName === "BR") {
        childRes = { insert: "\n" };
      } else if (element.tagName === "A") {
        childRes = parseAnnoAnchor(element);
      } else if (element.tagName === "STRONG") {
        childRes = {
          insert: element.innerHTML,
          attributes: { bold: true },
        };
      } else if (element.tagName === "T") {
        element.innerHTML = element.outerHTML;
        const resE = parseAnnoNode(element);
        if (resE.length > 1) {
          childRes = { insert: element.outerHTML };
        } else {
          childRes = resE[0];
        }
      } else if (element.tagName === "IMG") {
        childRes = parseAnnoImage(element);
      } else {
        throw new Error(`Unknown node type: ${element.tagName}`);
      }
    } else {
      throw new Error(`Unknown node type: ${child.nodeType}`);
    }
    res.children!.push(childRes);
  });
  return res;
}

/**
 * @description 解析公告 span
 * @since Beta v0.5.3
 * @param {HTMLElement} span - span 元素
 * @param {Record<string, string>} attr - 属性
 * @returns {TGApp.Plugins.Mys.SctPost.Base} 结构化数据
 */
function parseAnnoSpan(
  span: HTMLElement,
  attr?: Record<string, string>,
): TGApp.Plugins.Mys.SctPost.Base {
  const defaultRes = {
    insert: {
      tag: span.tagName,
      text: span.textContent,
      style: span.style.cssText,
      html: span.innerHTML,
      outerHtml: span.outerHTML,
      childrenLength: span.childNodes.length,
    },
  };
  if (span.childNodes.length === 0) {
    console.error(span.innerHTML);
    return {
      insert: span.innerHTML === "" ? "\n" : decodeRegExp(span.innerHTML),
      attributes: attr,
    };
  }
  if (span.childNodes.length === 1) {
    if (
      span.childNodes[0].nodeType !== Node.TEXT_NODE &&
      span.childNodes[0].nodeType !== Node.ELEMENT_NODE
    ) {
      return defaultRes;
    }
    if (span.childNodes[0].nodeType === Node.ELEMENT_NODE) {
      const res = parseAnnoNode(span.childNodes[0]);
      if (res.length > 1) return defaultRes;
      return res[0];
    }
    let spanAttrs: Record<string, string> | undefined = attr;
    if (!spanAttrs) spanAttrs = {};
    if (span.style.color !== "") {
      spanAttrs.color = span.style.color;
    }
    const parse = decodeRegExp(span.innerHTML);
    if (parse.includes("</t>")) {
      const dom = new DOMParser().parseFromString(parse, "text/html");
      return {
        insert: dom.body.textContent,
        attributes: spanAttrs,
      };
    }
    return {
      insert: parse,
      attributes: spanAttrs,
    };
  }
  return defaultRes;
}

/**
 * @description 解析公告图片
 * @since Beta v0.5.3
 * @param {HTMLElement} img - 图片元素
 * @returns {TGApp.Plugins.Mys.SctPost.Base} 结构化数据
 */
function parseAnnoImage(img: HTMLElement): TGApp.Plugins.Mys.SctPost.Base {
  if (img.tagName !== "IMG") {
    return {
      insert: {
        tag: img.tagName,
        text: img.textContent,
        style: img.style.cssText,
        html: img.innerHTML,
        outerHtml: img.outerHTML,
      },
    };
  }
  const image = <HTMLImageElement>img;
  return {
    insert: {
      image: image.src,
    },
  };
}

/**
 * @description 解析公告锚点
 * @since Beta v0.5.3
 * @param {HTMLElement} a - 锚点元素
 * @returns {TGApp.Plugins.Mys.SctPost.Base} 结构化数据
 */
function parseAnnoAnchor(a: HTMLElement): TGApp.Plugins.Mys.SctPost.Base {
  if (a.tagName !== "A") {
    return {
      insert: {
        tag: a.tagName,
        text: a.textContent,
        style: a.style.cssText,
        html: a.innerHTML,
        outerHtml: a.outerHTML,
      },
    };
  }
  const anchor = <HTMLAnchorElement>a;
  const regex = /javascript:miHoYoGameJSSDK.openIn(Browser|Webview)\('(.+)('|%27)\);/;
  let link = anchor.href;
  if (anchor.href.match(regex)) {
    const res = anchor.href.match(regex);
    if (res !== null && res.length > 2) link = res[2];
  }
  return {
    insert: anchor.textContent,
    attributes: {
      link: link,
    },
  };
}

/**
 * @description 解析公告详情
 * @since Beta v0.5.3
 * @param {HTMLElement} details - 详情元素
 * @returns {TGApp.Plugins.Mys.SctPost.Base} 结构化数据
 */
function parseAnnoDetails(details: HTMLElement): TGApp.Plugins.Mys.SctPost.Base {
  const defaultRes = {
    insert: {
      tag: details.tagName,
      text: details.textContent,
      style: details.style.cssText,
      html: details.innerHTML,
      outerHtml: details.outerHTML,
    },
  };
  if (details.tagName !== "DETAILS") return defaultRes;
  if (details.childNodes.length !== 2) return defaultRes;
  if (details.childNodes[0].nodeType !== Node.ELEMENT_NODE) return defaultRes;
  if (details.childNodes[1].nodeType !== Node.ELEMENT_NODE) return defaultRes;
  const summary = <HTMLElement>details.childNodes[0];
  const content = <HTMLElement>details.childNodes[1];
  if (summary.tagName !== "SUMMARY") return defaultRes;
  if (content.tagName !== "DIV") return defaultRes;
  const summaryNode = parseAnnoNode(summary);
  const contentNode = parseAnnoNode(content);
  return {
    insert: {
      backup_text: "",
      fold: {
        title: JSON.stringify(summaryNode),
        content: JSON.stringify(contentNode),
      },
    },
  };
}

/**
 * @description 解析公告表格
 * @since Beta v0.5.3
 * @param {HTMLElement} table - 表格元素
 * @returns {TGApp.Plugins.Mys.SctPost.Base} 结构化数据
 */
function parseAnnoTable(table: HTMLElement): TGApp.Plugins.Mys.SctPost.Base {
  const defaultRes = {
    insert: {
      tag: table.tagName,
      text: table.textContent,
      style: table.style.cssText,
      html: table.innerHTML,
      outerHtml: table.outerHTML,
    },
  };
  if (table.tagName !== "TABLE") return defaultRes;
  if (table.childNodes.length === 0) return defaultRes;
  const tableBody = table.querySelector("tbody");
  if (tableBody === null) return defaultRes;
  tableBody.childNodes.forEach((tr) => {
    tr.childNodes.forEach((td) => {
      td.childNodes.forEach((child, index) => {
        const cellParsed = parseAnnoNode(child);
        const span = document.createElement("div");
        span.style.lineHeight = "2";
        for (const cell of cellParsed) {
          if (cell.children && cell.children.length > 0) {
            for (const cellChild of cell.children) {
              if (cellChild.attributes && JSON.stringify(cellChild.attributes === "{}")) {
                delete cellChild.attributes;
              }
              const cellSpan = document.createElement("span");
              render(h(TpText, { data: cellChild }), cellSpan);
              span.appendChild(cellSpan);
            }
          }
        }
        td.replaceChild(span, td.childNodes[index]);
      });
    });
  });
  return {
    insert: {
      table: table.outerHTML,
    },
  };
}
