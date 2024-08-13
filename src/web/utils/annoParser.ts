/**
 * @file web/utils/annoParser.ts
 * @description 解析游戏内公告数据
 * @since Beta v0.5.3
 */

import { decodeRegExp } from "./tools.js";

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
  const doc = parser.parseFromString(anno.content, "text/html");
  const children: TGApp.Plugins.Mys.SctPost.Base[] = [];
  const bannerNode: TGApp.Plugins.Mys.SctPost.Base = {
    insert: {
      image: anno.banner,
    },
  };
  children.push(bannerNode);
  doc.body.childNodes.forEach((child) => {
    children.push(...parseAnnoNode(child));
  });
  return children;
}

/**
 * @description 解析公告节点
 * @since Beta v0.5.3
 * @param {Node} node - 节点
 * @returns {TGApp.Plugins.Mys.SctPost.Base} 结构化数据
 */
function parseAnnoNode(node: Node): TGApp.Plugins.Mys.SctPost.Base[] {
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
    return [{ insert: node.textContent }];
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
    return [parseAnnoParagraph(element)];
  }
  if (element.tagName === "OL" || element.tagName === "LI" || element.tagName === "UL") {
    const res: TGApp.Plugins.Mys.SctPost.Base[] = [];
    Array.from(element.children).forEach((child) => {
      res.push(...parseAnnoNode(child));
    });
    return res;
  }
  if (element.tagName === "DETAILS") {
    return [parseAnnoDetails(element)];
  }
  // todo table解析
  if (element.tagName === "TABLE") {
    return [defaultRes];
  }
  if (element.tagName === "DIV") {
    if (element.childNodes.length > 1) {
      const res: TGApp.Plugins.Mys.SctPost.Base[] = [];
      element.childNodes.forEach((child) => {
        res.push(...parseAnnoNode(child));
      });
      return res;
    }
    if (element.childNodes.length === 0) return [defaultRes];
    const child = element.childNodes[0];
    if (child.nodeType !== Node.ELEMENT_NODE) return [defaultRes];
    return parseAnnoNode(child);
  }
  if (element.tagName === "SUMMARY") {
    const p = document.createElement("p");
    p.innerHTML = element.innerHTML;
    return [parseAnnoParagraph(p)];
  }
  if (element.tagName === "SPAN") {
    return [parseAnnoSpan(element)];
  }
  return [defaultRes];
}

/**
 * @description 解析公告段落
 * @since Beta v0.5.3
 * @param {HTMLElement} p - 段落元素
 * @returns {TGApp.Plugins.Mys.SctPost.Base} 结构化数据
 */
function parseAnnoParagraph(p: HTMLElement): TGApp.Plugins.Mys.SctPost.Base {
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
        children: [parseAnnoSpan(span)],
      };
    }
    const child = <HTMLElement>p.childNodes[0];
    if (child.tagName === "SPAN") {
      return {
        insert: "",
        children: [parseAnnoSpan(child)],
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
      return {
        insert: child.innerHTML,
        attributes: { bold: true },
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
 * @returns {TGApp.Plugins.Mys.SctPost.Base} 结构化数据
 */
function parseAnnoSpan(span: HTMLElement): TGApp.Plugins.Mys.SctPost.Base {
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
    let spanAttrs: Record<string, string> | null = {};
    if (span.style.color !== "") {
      spanAttrs.color = span.style.color;
    } else {
      spanAttrs = null;
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
