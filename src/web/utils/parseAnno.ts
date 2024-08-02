/**
 * @file web/utils/parseAnno.ts
 * @description 解析游戏内公告数据
 * @since Beta v0.5.2
 */

import { saveImgLocal } from "../../utils/TGShare.js";
import { isColorSimilar } from "../../utils/toolFunc.js";

import { decodeRegExp } from "./tools.js";

/**
 * @description 解析 a
 * @since Beta v0.5.0
 * @param {HTMLAnchorElement} a a 元素
 * @returns {HTMLAnchorElement} 解析后的 a 元素
 */
function parseAnnoA(a: HTMLAnchorElement): HTMLAnchorElement {
  const regex = /javascript:miHoYoGameJSSDK.openIn(Browser|Webview)\('(.+)'\);/;
  if (regex.test(a.getAttribute("href") ?? "")) {
    const href = a.getAttribute("href")?.match(regex);
    if (href) {
      a.setAttribute("href", href[2]);
      a.target = "_blank";
      a.title = href[2];
    }
  }
  return a;
}

/**
 * @description 解析 p
 * @since Beta v0.5.2
 * @param {HTMLParagraphElement} p p 元素
 * @returns {HTMLParagraphElement} 解析后的 p 元素
 */
function parseAnnoP(p: HTMLParagraphElement): HTMLParagraphElement {
  if (p.children.length === 0) {
    p.innerHTML = decodeRegExp(p.innerHTML);
  } else {
    p.querySelectorAll("*").forEach((child) => {
      child.innerHTML = decodeRegExp(child.innerHTML);
      child.querySelectorAll("span").forEach((span) => parseAnnoSpan(span));
    });
  }
  return p;
}

/**
 * @description 解析 span
 * @since Beta v0.4.4
 * @param {HTMLSpanElement} span span 元素
 * @returns {HTMLSpanElement} 解析后的 span 元素
 */
function parseAnnoSpan(span: HTMLSpanElement): HTMLSpanElement {
  if (span.style.fontSize) {
    span.style.fontSize = "";
  }
  if (span.style.color) {
    if (isColorSimilar("#000000", span.style.color)) {
      span.style.color = "var(--app-page-content)";
    }
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
 * @description 解析 table
 * @since Beta v0.4.7
 * @param {HTMLTableElement} table table 元素
 * @returns {HTMLTableElement} 解析后的 table 元素
 */
function parseAnnoTable(table: HTMLTableElement): HTMLTableElement {
  table.style.borderColor = "var(--common-shadow-2)";
  table.querySelectorAll("colgroup").forEach((colgroup) => colgroup.remove());
  table.querySelectorAll("td").forEach((td) => {
    if (td.style.backgroundColor) td.style.backgroundColor = "var(--box-bg-1)";
    td.style.textAlign = "center";
  });
  return table;
}

/**
 * @description 解析游戏内公告数据
 * @since Beta v0.4.4
 * @todo 需要完善
 * @param {string} data 游戏内公告数据
 * @returns {Promise<string>} 解析后的数据
 */
export async function parseAnnoContent(data: string): Promise<string> {
  const htmlBase = new DOMParser().parseFromString(data, "text/html");
  htmlBase.querySelectorAll("a").forEach((a) => parseAnnoA(a));
  const imgList = Array.from(htmlBase.querySelectorAll("img"));
  for (const img of imgList) {
    img.style.maxWidth = "100%";
    img.style.borderRadius = "10px";
    img.style.margin = "10px 0";
    const src = img.getAttribute("src");
    if (src) {
      img.setAttribute("src", await saveImgLocal(src));
    }
  }
  htmlBase.querySelectorAll("p").forEach((p) => parseAnnoP(p));
  htmlBase.querySelectorAll("span").forEach((span) => parseAnnoSpan(span));
  htmlBase.querySelectorAll("table").forEach((table) => parseAnnoTable(table));
  return htmlBase.body.innerHTML;
}
