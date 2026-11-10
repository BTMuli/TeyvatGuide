/**
 * 米游社通知入口提醒工具。
 * @since Beta v0.13.1
 */

/**
 * 按官网规则，根据接收范围选择数字提醒或红点。
 * @since Beta v0.13.0
 * @param category - 通知分类
 * @param counts - 接口返回的分类及关注用户提醒数
 * @param settings - 消息接收设置，尚未获取时仅显示红点
 * @returns 通知入口提醒，数字不代表列表逐条未读总数
 */
export function getNotificationBadge(
  category: TGApp.BBS.Notification.Category,
  counts: TGApp.BBS.Notification.UnreadRes["count"],
  settings?: TGApp.BBS.Notification.Settings,
): TGApp.BBS.Notification.Badge {
  const total = counts[category] ?? 0;
  const scope = category === "comment" ? settings?.upvote : settings?.[category];
  const count =
    scope === true || scope === "All"
      ? total
      : scope === "Follow"
        ? (counts[`${category}_focus`] ?? 0)
        : 0;
  const dot = count === 0 && total > 0;
  const label =
    count > 0
      ? scope === "Follow"
        ? `${count} 条来自关注用户的新提醒`
        : `${count} 条新提醒`
      : dot
        ? "有新消息"
        : "";
  return { count, dot, label };
}

/**
 * 判断通知条目是否需要单独渲染“原内容”引用块。
 * @since Beta v0.13.1
 * @remarks
 * 点赞通知的原内容就是被点赞的帖子或评论本身，正文已经呈现时再次引用会重复展示同一内容，
 * 只在正文没有可显示内容时才回退到引用块。回复、提及等通知的原内容是被回复或被提及的内容，
 * 与正文不同，需要独立显示。
 * @param category - 通知分类
 * @param origin - 通知关联的原内容
 * @param hasBody - 正文是否已有可显示内容，含内容已删除的提示
 * @returns 是否需要渲染引用块
 */
export function shouldRenderNotificationOrigin(
  category: TGApp.BBS.Notification.Category,
  origin: TGApp.BBS.Notification.Origin | null,
  hasBody: boolean,
): boolean {
  if (origin === null) return false;
  const hasImage = (origin.image?.image_url.trim() ?? "") !== "";
  const originVisible =
    origin.is_deleted || origin.origin_is_missing || origin.text.trim() !== "" || hasImage;
  if (!originVisible) return false;
  return category !== "comment" || !hasBody;
}

/**
 * 清除已打开分类的全部入口提醒，同时保留其他分类。
 * @since Beta v0.13.0
 * @param counts - 当前分类及关注用户提醒数
 * @param category - 已清除的通知分类
 * @returns 清除该分类普通与关注提醒后的新对象
 */
export function clearNotificationBadge(
  counts: TGApp.BBS.Notification.UnreadRes["count"],
  category: TGApp.BBS.Notification.Category,
): TGApp.BBS.Notification.UnreadRes["count"] {
  return { ...counts, [category]: 0, [`${category}_focus`]: 0 };
}
