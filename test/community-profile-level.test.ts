/**
 * 个人主页分区等级选择回归测试。
 * @since Beta v0.12.6
 */

import { describe, expect, it } from "vitest";

import {
  getCommunityProfileLevel,
  getCommunityProfileLevelColor,
} from "../src/utils/communityProfileLevel.js";

/**
 * 构造等级选择测试所需的最小用户信息。
 * @since Beta v0.12.6
 * @param levelExps - 各分区等级经验
 * @param levelExp - 当前请求返回的等级经验
 * @returns 包含等级字段的用户信息
 */
function createUserInfo(
  levelExps: Array<TGApp.BBS.User.LevelExp>,
  levelExp: TGApp.BBS.User.LevelExp,
): Pick<TGApp.BBS.User.Info, "level_exps" | "level_exp"> {
  return {
    level_exps: levelExps,
    level_exp: levelExp,
  };
}

describe("getCommunityProfileLevel", () => {
  it("selects the level entry matching the current game", () => {
    const userInfo = createUserInfo(
      [
        { game_id: 2, level: 8, exp: 80 },
        { game_id: 6, level: 12, exp: 120 },
      ],
      { game_id: 2, level: 8, exp: 80 },
    );

    expect(getCommunityProfileLevel(userInfo, 6)).toMatchObject({ game_id: 6, level: 12 });
  });

  it("does not use a different game's level as a fallback", () => {
    const userInfo = createUserInfo([], { game_id: 2, level: 8, exp: 80 });

    expect(getCommunityProfileLevel(userInfo, 6, 6)).toBeUndefined();
  });

  it("uses an unlabelled level only when the response was requested for that game", () => {
    const userInfo = createUserInfo([], { level: 9, exp: 90 });

    expect(getCommunityProfileLevel(userInfo, 6, 6)).toMatchObject({ level: 9, exp: 90 });
    expect(getCommunityProfileLevel(userInfo, 6)).toBeUndefined();
  });

  it("returns the expected level colors without a level fallback", () => {
    expect(getCommunityProfileLevelColor(undefined)).toBe("var(--tgc-od-green)");
    expect(getCommunityProfileLevelColor(4)).toBe("var(--tgc-od-green)");
    expect(getCommunityProfileLevelColor(8)).toBe("var(--tgc-od-blue)");
    expect(getCommunityProfileLevelColor(12)).toBe("var(--tgc-od-purple)");
    expect(getCommunityProfileLevelColor(13)).toBe("var(--tgc-od-orange)");
  });
});
