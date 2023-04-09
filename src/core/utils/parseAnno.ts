/**
 * @file core utils parseAnno.ts
 * @description 解析游戏内公告数据
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { decodeRegExp } from "./tools";

/**
 * @description 解析游戏内公告数据
 * @since Alpha v0.1.2
 * @param {string} data 游戏内公告数据
 * @returns {string} 解析后的数据
 */
export function parseAnnoContent (data: string): string {
  const htmlBase = new DOMParser().parseFromString(data, "text/html");
  htmlBase.querySelectorAll("span").forEach((span) => {
    if (span.style.fontSize) {
      span.style.fontSize = "";
    }
    if (span.children.length === 0) {
      return (span.innerHTML = decodeRegExp(span.innerHTML));
    } else {
      span.querySelectorAll("*").forEach((child) => {
        if (child.children.length === 0) {
          return (child.innerHTML = decodeRegExp(child.innerHTML));
        }
      });
    }
  });
  htmlBase.querySelectorAll("p").forEach((p) => {
    if (p.children.length === 0) {
      return (p.innerHTML = decodeRegExp(p.innerHTML));
    } else {
      p.querySelectorAll("*").forEach((child) => {
        if (child.children.length === 0) {
          return (child.innerHTML = decodeRegExp(child.innerHTML));
        }
      });
    }
  });
  htmlBase.querySelectorAll("a").forEach((a) => {
    const span = htmlBase.createElement("i");
    span.classList.add("mdi", "mdi-link-variant", "anno-link-icon");
    a.prepend(span);
    if (a.href.startsWith("javascript:miHoYoGameJSSDK.openInBrowser")) {
      a.href = a.href.replace("javascript:miHoYoGameJSSDK.openInBrowser('", "").replace("');", "");
      a.target = "_blank";
    } else if (a.href.startsWith("javascript:miHoYoGameJSSDK.openInWebview")) {
      a.href = a.href.replace("javascript:miHoYoGameJSSDK.openInWebview('", "").replace("');", "");
      a.target = "_blank";
    }
  });
  return htmlBase.body.innerHTML;
}
