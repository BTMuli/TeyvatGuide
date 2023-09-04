/**
 * @file web utils parseAnno.ts
 * @description 解析游戏内公告数据
 * @todo 需要完善
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

import { decodeRegExp } from "./tools";
import { saveImgLocal } from "../../utils/TGShare";

/**
 * @description 解析游戏内公告数据
 * @since Alpha v0.2.0
 * @param {string} data 游戏内公告数据
 * @returns {Promise<string>} 解析后的数据
 */
export async function parseAnnoContent(data: string): Promise<string> {
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
  htmlBase.querySelectorAll("table").forEach((table) => {
    table.style.borderColor = "#546d8b";
  });
  return htmlBase.body.innerHTML;
}
