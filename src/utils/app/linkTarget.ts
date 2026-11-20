/**
 * 提取应用链接中包裹的目标地址。
 * @since Beta v0.13.2
 */

/**
 * 解析米游社和 uniwebview 网页包装链接。
 * @since Beta v0.13.2
 * @param url - 待解析的链接
 * @returns 内层链接，其他链接返回 undefined
 */
export function getEmbeddedLinkTarget(url: URL): string | undefined {
  if (url.protocol === "uniwebview:") {
    const host = url.hostname.toLowerCase();
    if (host === "open_url" || host === "load_url") {
      const inner = url.searchParams.get("url");
      if (inner?.trim()) return inner;
    }
  }
  if (url.protocol !== "mihoyobbs:") return undefined;
  if (url.hostname === "webview" && url.search.startsWith("?link=")) {
    return decodeURIComponent(url.search.slice("?link=".length));
  }
  if (url.hostname === "openURL" && url.search.startsWith("?url=")) {
    return decodeURIComponent(url.search.slice("?url=".length));
  }
  return undefined;
}
