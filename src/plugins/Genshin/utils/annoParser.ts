/**
 * @file plugins Genshin utils annoParser.ts
 * @description 原神游戏内公告解析工具
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.1
 */

/**
 * @description 解析游戏内公告数据
 * @since Alpha v0.1.1
 * @param {string} data 游戏内公告数据
 * @returns {string} 解析后的数据
 */
export function parseAnnoContent (data: string): string {
  const htmlBase = new DOMParser().parseFromString(data, "text/html");
  // 遍历所有 span 标签
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
  // 遍历所有 p 标签
  htmlBase.querySelectorAll("p").forEach((p) => {
    // 如果没有子元素
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
  // 遍历所有 a 标签
  htmlBase.querySelectorAll("a").forEach((a) => {
    const span = htmlBase.createElement("i");
    span.classList.add("mdi", "mdi-link-variant", "anno-link-icon");
    // 添加到 a 标签中
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

/**
 * @description 转义正则表达式
 * @since Alpha v0.1.1
 * @param {string} data 内容
 * @returns {string} 转义后的内容
 */
export function decodeRegExp (data: string): string {
  let res = data;
  if (res.length === 0) return res;
  res = res.replace(/&amp;/g, "&");
  res = res.replace(/&lt;/g, "<");
  res = res.replace(/&gt;/g, ">");
  res = res.replace(/&nbsp;/g, " ");
  res = res.replace(/&#39;/g, "'");
  res = res.replace(/&quot;/g, "\"");
  res = res.replace(/&apos;/g, "'");
  return res;
}
