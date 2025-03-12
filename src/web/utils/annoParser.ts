/**
 * @file web/utils/annoParser.ts
 * @description 解析游戏内公告数据
 * @since Beta v0.7.0
 */

import TpText from "@comp/viewPost/tp-text.vue";
import { h, render } from "vue";

import { decodeRegExp } from "@/utils/toolFunc.js";

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
 * @since Beta v0.7.0
 * @param {string} data 游戏内公告数据
 * @returns {string} 解析后的数据
 */
function handleAnnoContent(data: string): string {
  const htmlBase = new DOMParser().parseFromString(decodeRegExp(data), "text/html");
  htmlBase.querySelectorAll("table").forEach(handleAnnoTable);
  return htmlBase.body.innerHTML;
}

/**
 * @description 解析公告内容，转换为结构化数据
 * @since Beta v0.5.3
 * @param {TGApp.BBS.Announcement.ContentItem} anno - 公告内容
 * @returns {TGApp.BBS.SctPost.Base[]} 结构化数据
 */
function parseAnnoContent(anno: TGApp.BBS.Announcement.ContentItem): Array<TGApp.BBS.SctPost.Base> {
  const parser = new DOMParser();
  const first = handleAnnoContent(anno.content);
  const doc = parser.parseFromString(first, "text/html");
  const children: Array<TGApp.BBS.SctPost.Base> = [];
  if (anno.banner !== "") children.push({ insert: { image: anno.banner } });
  doc.body.childNodes.forEach((child) => children.push(...parseAnnoNode(child)));
  return children;
}

/**
 * @description 解析公告节点
 * @since Beta v0.7.0
 * @param {Node} node - 节点
 * @param {Record<string, string>} attr - 属性
 * @returns {TGApp.BBS.SctPost.Base} 结构化数据
 */
function parseAnnoNode(node: Node, attr?: Record<string, string>): Array<TGApp.BBS.SctPost.Base> {
  let defaultRes: TGApp.BBS.SctPost.Base = {
    insert: {
      tag: node.nodeName,
      text: node.textContent,
      type: node.nodeType,
      func: "parseAnnoNode",
    },
  };
  if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) return [defaultRes];
  if (node.nodeType === Node.TEXT_NODE) {
    return [{ insert: node.textContent ?? "", attributes: attr }];
  }
  const element = <HTMLElement>node;
  defaultRes = {
    insert: {
      tag: element.tagName,
      text: element.textContent,
      style: element.style.cssText,
      html: element.innerHTML,
      outerHtml: element.outerHTML,
      func: "parseAnnoNode",
    },
  };
  console.log(defaultRes);
  if (element.tagName === "P") {
    element.innerHTML = decodeRegExp(element.innerHTML);
    return [parseAnnoParagraph(element, attr)];
  }
  if (element.tagName === "OL" || element.tagName === "LI" || element.tagName === "UL") {
    const res: Array<TGApp.BBS.SctPost.Base> = [];
    Array.from(element.children).forEach((child) => res.push(...parseAnnoNode(child, attr)));
    for (const comp of res) {
      if (comp.children) {
        for (const child of comp.children) {
          if (child.insert !== "" && child.insert !== "\n") child.insert = ` ${child.insert}`;
        }
        continue;
      }
      if (comp.insert !== "" && comp.insert !== "\n") comp.insert = ` ${comp.insert}`;
    }
    return res;
  }
  if (element.tagName === "DETAILS") return [parseAnnoDetails(element)];
  if (element.tagName === "TABLE") return [parseAnnoTable(element)];
  if (element.tagName === "DIV") {
    if (element.childNodes.length > 1) {
      const res: Array<TGApp.BBS.SctPost.Base> = [];
      element.childNodes.forEach((child) => res.push(...parseAnnoNode(child, attr)));
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
  if (element.tagName === "SPAN") return [parseAnnoSpan(element, attr)];
  if (element.tagName === "STRONG") {
    const res: Array<TGApp.BBS.SctPost.Base> = [];
    element.childNodes.forEach((child) => res.push(...parseAnnoNode(child, { bold: "true" })));
    return res;
  }
  if (element.tagName === "T") {
    const res: Array<TGApp.BBS.SctPost.Base> = [];
    element.childNodes.forEach((child) => res.push(...parseAnnoNode(child, attr)));
    return res;
  }
  return [defaultRes];
}

/**
 * @description 解析公告段落
 * @since Beta v0.7.0
 * @param {HTMLElement} p - 段落元素
 * @param {Record<string, string>} attr - 属性
 * @returns {TGApp.BBS.SctPost.Base} 结构化数据
 */
function parseAnnoParagraph(p: HTMLElement, attr?: Record<string, string>): TGApp.BBS.SctPost.Base {
  const defaultRes = {
    insert: {
      tag: p.tagName,
      text: p.textContent,
      style: p.style.cssText,
      html: p.innerHTML,
      outerHtml: p.outerHTML,
      childrenLength: p.childNodes.length,
      func: "parseAnnoParagraph",
    },
  };
  console.log(defaultRes);
  if (p.childNodes.length === 0) {
    return { insert: p.innerHTML === "" ? "\n" : (p.textContent ?? "") };
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
      return { insert: "", children: [parseAnnoSpan(span, attr), { insert: "\n" }] };
    }
    const child = <HTMLElement>p.childNodes[0];
    if (child.tagName === "SPAN") {
      return { insert: "", children: [parseAnnoSpan(child, attr), { insert: "\n" }] };
    }
    if (child.tagName === "IMG") return parseAnnoImage(child);
    if (child.tagName === "A") {
      return { insert: "", children: [parseAnnoAnchor(child)], attributes: { align: "center" } };
    }
    if (child.tagName === "STRONG") {
      const res = parseAnnoNode(child, { bold: "true" });
      return { insert: "", children: [...res, { insert: "\n" }] };
    }
    if (child.tagName === "T") return { insert: "", children: parseAnnoNode(child) };
    return defaultRes;
  }
  const res: TGApp.BBS.SctPost.Base = { insert: "", children: [] };
  p.childNodes.forEach((child) => {
    let childRes: TGApp.BBS.SctPost.Base;
    if (child.nodeType === Node.TEXT_NODE) {
      childRes = { insert: child.textContent ?? "" };
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const element = <HTMLElement>child;
      if (element.tagName === "SPAN") childRes = parseAnnoSpan(element);
      else if (element.tagName === "BR") childRes = { insert: "\n" };
      else if (element.tagName === "A") childRes = parseAnnoAnchor(element);
      else if (element.tagName === "STRONG") {
        const resS = parseAnnoNode(element, { bold: "true" });
        if (resS.length > 1) childRes = { insert: element.outerHTML };
        else childRes = resS[0];
      } else if (element.tagName === "T") {
        console.log(element.outerHTML);
        element.innerHTML = element.outerHTML;
        const resE = parseAnnoNode(element);
        if (resE.length > 1) childRes = { insert: element.outerHTML };
        else childRes = resE[0];
      } else if (element.tagName === "IMG") childRes = parseAnnoImage(element);
      else throw new Error(`Unknown node type: ${element.tagName}`);
    } else throw new Error(`Unknown node type: ${child.nodeType}`);
    res.children!.push(childRes);
  });
  res.children?.push({ insert: "\n" });
  return res;
}

/**
 * @description 解析公告 span
 * @since Beta v0.7.0
 * @param {HTMLElement} span - span 元素
 * @param {Record<string, string>} attr - 属性
 * @returns {TGApp.BBS.SctPost.Base} 结构化数据
 */
function parseAnnoSpan(span: HTMLElement, attr?: Record<string, string>): TGApp.BBS.SctPost.Base {
  const defaultRes = {
    insert: {
      tag: span.tagName,
      text: span.textContent,
      style: span.style?.cssText,
      html: span.innerHTML,
      outerHtml: span.outerHTML,
      childrenLength: span.childNodes.length,
      func: "parseAnnoSpan",
    },
  };
  let spanAttrs: Record<string, string> | undefined = attr;
  if (!spanAttrs) spanAttrs = {};
  if (span.style.color !== "") spanAttrs.color = span.style.color;
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
    const parse = decodeRegExp(span.innerHTML);
    if (parse.includes("</t>")) {
      const dom = new DOMParser().parseFromString(parse, "text/html");
      return { insert: dom.body.textContent ?? "", attributes: spanAttrs };
    }
    return { insert: parse, attributes: spanAttrs };
  }
  return { insert: span.textContent ?? "", attributes: spanAttrs };
}

/**
 * @description 解析公告图片
 * @since Beta v0.7.0
 * @param {HTMLElement} img - 图片元素
 * @returns {TGApp.BBS.SctPost.Base} 结构化数据
 */
function parseAnnoImage(img: HTMLElement): TGApp.BBS.SctPost.Base {
  if (img.tagName !== "IMG") {
    return {
      insert: {
        tag: img.tagName,
        text: img.textContent,
        style: img.style.cssText,
        html: img.innerHTML,
        outerHtml: img.outerHTML,
        func: "parseAnnoImage",
      },
    };
  }
  const image = <HTMLImageElement>img;
  return { insert: { image: image.src } };
}

/**
 * @description 解析公告锚点
 * @since Beta v0.7.0
 * @param {HTMLElement} a - 锚点元素
 * @returns {TGApp.BBS.SctPost.Base} 结构化数据
 */
function parseAnnoAnchor(a: HTMLElement): TGApp.BBS.SctPost.Base {
  if (a.tagName !== "A") {
    return {
      insert: {
        tag: a.tagName,
        text: a.textContent,
        style: a.style.cssText,
        html: a.innerHTML,
        outerHtml: a.outerHTML,
        func: "parseAnnoAnchor",
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
  return { insert: anchor.textContent ?? "", attributes: { link: link } };
}

/**
 * @description 解析公告详情
 * @since Beta v0.7.0
 * @param {HTMLElement} details - 详情元素
 * @returns {TGApp.BBS.SctPost.Base} 结构化数据
 */
function parseAnnoDetails(details: HTMLElement): TGApp.BBS.SctPost.Base {
  const defaultRes = {
    insert: {
      tag: details.tagName,
      text: details.textContent,
      style: details.style.cssText,
      html: details.innerHTML,
      outerHtml: details.outerHTML,
      func: "parseAnnoDetails",
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
      fold: { title: JSON.stringify(summaryNode), content: JSON.stringify(contentNode) },
    },
  };
}

/**
 * @description 解析公告表格
 * @since Beta v0.7.0
 * @param {HTMLElement} table - 表格元素
 * @returns {TGApp.BBS.SctPost.Base} 结构化数据
 */
function parseAnnoTable(table: HTMLElement): TGApp.BBS.SctPost.Base {
  const defaultRes = {
    insert: {
      tag: table.tagName,
      text: table.textContent,
      style: table.style.cssText,
      html: table.innerHTML,
      outerHtml: table.outerHTML,
      func: "parseAnnoTable",
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
              if (cellChild.attributes && JSON.stringify(cellChild.attributes) === "{}") {
                delete cellChild.attributes;
              }
              const cellSpan = document.createElement("span");
              // @ts-expect-error No overload matches this call
              render(h(TpText, { data: cellChild }), cellSpan);
              span.appendChild(cellSpan);
            }
          }
        }
        td.replaceChild(span, td.childNodes[index]);
      });
    });
  });
  return { insert: { table: table.outerHTML } };
}

export default parseAnnoContent;
