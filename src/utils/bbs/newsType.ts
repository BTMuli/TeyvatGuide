/**
 * 米游社资讯类型解析。
 * @since Beta v0.13.2
 */

import bbsEnum from "@enum/bbs.js";

/**
 * 解析路由、组件或持久化状态中的资讯类型。
 * @since Beta v0.13.2
 * @param value - 待解析的资讯类型
 * @returns 有效的资讯类型，无法解析时返回 undefined
 */
export function resolveNewsType(value: unknown): TGApp.BBS.Post.NewsTypeEnum | undefined {
  if (typeof value === "number") {
    return bbsEnum.post.newsTypeList.find((item) => item === value);
  }
  if (typeof value !== "string" || value.length === 0) return undefined;
  const numeric = bbsEnum.post.newsTypeList.find((item) => item.toString() === value);
  if (numeric !== undefined) return numeric;
  switch (value) {
    case "notice":
      return bbsEnum.post.newsType.NOTICE;
    case "activity":
      return bbsEnum.post.newsType.ACTIVITY;
    case "news":
      return bbsEnum.post.newsType.NEWS;
    default:
      return undefined;
  }
}
