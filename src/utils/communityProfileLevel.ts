/**
 * 个人主页分区等级选择工具。
 * @since Beta v0.13.0
 */

/**
 * 从用户信息中选择指定分区的等级经验。
 * @since Beta v0.13.0
 * @param userInfo - 用户信息
 * @param gid - 当前分区 ID
 * @param requestedGid - 请求明确指定的分区 ID
 * @returns 当前分区的等级经验，无法确认时返回 undefined
 */
export function getCommunityProfileLevel(
  userInfo: Pick<TGApp.BBS.User.Info, "level_exps" | "level_exp">,
  gid: number,
  requestedGid?: number,
): TGApp.BBS.User.LevelExp | undefined {
  const matchingLevel = userInfo.level_exps.find((level) => level.game_id === gid);
  if (matchingLevel !== undefined) return matchingLevel;
  if (userInfo.level_exp.game_id === gid) return userInfo.level_exp;
  if (
    requestedGid === gid &&
    userInfo.level_exps.length === 0 &&
    userInfo.level_exp.game_id === undefined
  ) {
    return userInfo.level_exp;
  }
  return undefined;
}

/**
 * 获取个人主页等级徽章颜色。
 * @since Beta v0.13.0
 * @param level - 用户等级
 * @returns 等级徽章颜色 token
 */
export function getCommunityProfileLevelColor(level: number | undefined): string {
  if (level === undefined || level < 5) return "var(--tgc-od-green)";
  if (level < 9) return "var(--tgc-od-blue)";
  if (level < 13) return "var(--tgc-od-purple)";
  return "var(--tgc-od-orange)";
}
