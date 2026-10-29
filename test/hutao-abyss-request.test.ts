/**
 * 胡桃云深渊上传数据转换回归测试
 * @since Beta v0.13.0
 */

import { describe, expect, it, vi } from "vitest";

import HutaoAbyss from "../src/plugins/Hutao/request/abyssReq.js";

vi.mock("@store/app.js", () => ({
  default: (): { useProxy: boolean } => ({ useProxy: false }),
}));

/**
 * 深渊上传所需的排行字段。
 * @since Beta v0.13.0
 */
type RequiredRankKey =
  "defeatRank" | "energySkillRank" | "normalSkillRank" | "damageRank" | "takeDamageRank";

const requiredRankKeys: Array<RequiredRankKey> = [
  "defeatRank",
  "energySkillRank",
  "normalSkillRank",
  "damageRank",
  "takeDamageRank",
];

/**
 * 创建深渊上传转换测试数据。
 * @since Beta v0.13.0
 * @returns 完整的本地深渊数据
 */
function createAbyssData(): TGApp.Sqlite.Abyss.TableTrans {
  const rank = { id: 10000001, value: 5, star: 5 };
  return {
    uid: "100000001",
    id: 25,
    startTime: "2026-01-01T00:00:00.000Z",
    endTime: "2026-01-15T00:00:00.000Z",
    totalBattleTimes: 12,
    totalWinTimes: 10,
    maxFloor: "12-3",
    totalStar: 36,
    isUnlock: 1,
    revealRank: [rank],
    defeatRank: [rank],
    damageRank: [rank],
    takeDamageRank: [rank],
    normalSkillRank: [rank],
    energySkillRank: [rank],
    floors: [],
    skippedFloor: null,
    updated: "2026-01-15T00:00:00.000Z",
  };
}

describe("胡桃云深渊上传数据转换", () => {
  it("将完整排行数据转换为上传记录", () => {
    const data = createAbyssData();

    expect(HutaoAbyss.utils.hasCompleteRankData(data)).toBe(true);
    expect(HutaoAbyss.utils.transData(data)).toEqual({
      Uid: "100000001",
      Identity: "TeyvatGuide",
      SpiralAbyss: {
        ScheduleId: 25,
        TotalBattleTimes: 12,
        TotalWinTimes: 10,
        Defeat: { AvatarId: 10000001, Value: 5 },
        EnergySkill: { AvatarId: 10000001, Value: 5 },
        NormalSkill: { AvatarId: 10000001, Value: 5 },
        Damage: { AvatarId: 10000001, Value: 5 },
        TakeDamage: { AvatarId: 10000001, Value: 5 },
        Floors: [],
      },
      Avatars: [],
      ReservedUserName: "",
    });
  });

  it.each(requiredRankKeys)("将空的 %s 排行判定为不可上传", (rankKey: RequiredRankKey) => {
    const data = createAbyssData();
    data[rankKey] = [];

    expect(HutaoAbyss.utils.hasCompleteRankData(data)).toBe(false);
  });
});
