/**
 * 米游社通知入口提醒工具。
 * @since Beta v0.13.0
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
