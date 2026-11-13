/**
 * 米游社头像框与评论装扮的展示文案。
 * @since Beta v0.13.1
 */

/**
 * 将剩余秒数格式化为官方装扮选择器的展示文本。
 * @since Beta v0.13.1
 * @param seconds - 剩余秒数
 * @returns 剩余时间文本
 */
function formatRemainTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(seconds / 60 / 60);
  const days = Math.floor(seconds / 60 / 60 / 24);
  if (days) return `${days}天${Math.floor((seconds / 60 / 60) % 24)}小时`;
  if (hours) return `${hours}小时`;
  if (minutes) return `${minutes}分钟`;
  return "小于1分钟";
}

/**
 * 判断头像框或评论装扮是否为限时装扮。
 * @since Beta v0.13.1
 * @param item - 头像框或评论装扮
 * @returns 是否为限时装扮
 */
export function isDecorationLimited(
  item: TGApp.BBS.CommunitySettings.Pendant | TGApp.BBS.CommunitySettings.CommentDecoration,
): boolean {
  return Boolean(item.expired_time);
}

/**
 * 获取头像框的限时说明。
 * @since Beta v0.13.1
 * @param pendant - 头像框
 * @returns 剩余时间或限时说明
 */
export function getPendantLimitText(pendant: TGApp.BBS.CommunitySettings.Pendant): string {
  if (pendant.remain_time !== undefined && pendant.remain_time > 0) {
    return `剩余 ${formatRemainTime(pendant.remain_time)}`;
  }
  return "限时头像框";
}

/**
 * 获取评论装扮的限时说明。
 * @since Beta v0.13.1
 * @param decoration - 评论装扮
 * @returns 剩余时间或限时说明
 */
export function getCommentLimitText(
  decoration: TGApp.BBS.CommunitySettings.CommentDecoration,
): string {
  if (decoration.remain_time !== undefined && decoration.remain_time > 0) {
    return "剩余 " + formatRemainTime(decoration.remain_time);
  }
  return "限时评论装扮";
}

/**
 * 生成装扮项的获取方法提示。
 * @since Beta v0.13.1
 * @param item - 头像框或评论装扮
 * @returns 用于悬停提示的获取方法文本
 * @remarks 优先使用扩展获取方法字段；官方描述只在包含获取语义时作为获取方法展示
 */
export function getDecorationObtainMethod(
  item: TGApp.BBS.CommunitySettings.Pendant | TGApp.BBS.CommunitySettings.CommentDecoration,
): string {
  const obtainMethod = item.obtainMethod?.trim();
  if (obtainMethod) return "获取方法：" + obtainMethod;
  const description = item.description?.trim();
  if (description && /(获得|获取|参与|参加|领取|购买|兑换|赠送|活动|任务|签到)/.test(description)) {
    return "获取方法：" + description;
  }
  return "暂无获取方法";
}

/**
 * 将接口返回的评论气泡背景色转换为 CSS 颜色。
 * @since Beta v0.13.1
 * @param color - 十六进制颜色，接口不带 #
 * @returns CSS 颜色，格式无效时返回 undefined
 */
export function getCommentBackground(color?: string): string | undefined {
  if (typeof color !== "string") return undefined;
  const normalized = color.trim();
  return /^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(normalized)
    ? `#${normalized}`
    : undefined;
}

/**
 * 判断头像框是否为当前使用中的头像框。
 * @since Beta v0.13.1
 * @param pendant - 头像框
 * @param serverUrl - 已保存的头像框链接
 * @returns 是否为使用中的头像框
 */
export function isPendantInUse(
  pendant: TGApp.BBS.CommunitySettings.Pendant | null,
  serverUrl: string,
): boolean {
  return pendant !== null && serverUrl !== "" && pendant.url === serverUrl;
}

/**
 * 判断评论装扮是否为当前使用中的装扮。
 * @since Beta v0.13.1
 * @param decoration - 评论装扮
 * @param serverId - 已保存的评论装扮 ID
 * @returns 是否为使用中的装扮
 */
export function isCommentInUse(
  decoration: TGApp.BBS.CommunitySettings.CommentDecoration | null,
  serverId: string | null,
): boolean {
  return decoration !== null && decoration.id === serverId;
}
