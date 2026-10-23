/**
 * 米游社回复 UID 卡片回归测试。
 * @since Beta v0.13.0
 */

import { describe, expect, it } from "vitest";

import {
  createGameUidInfo,
  getGameUidInfos,
  getGameUidPreviewText,
  validateGameUidCookie,
  validateGameUidInfo,
} from "../src/utils/bbsGameUid.js";
import { buildReplyDocument, validateReplySendNodes } from "../src/utils/bbsReplyDocument.js";

const info: TGApp.BBS.GameUid.Info = {
  game_biz: "hk4e_cn",
  game_name: "原神",
  game_uid: "100000001",
  level: 60,
  nickname: "旅行者",
  region_name: "天空岛",
};
const customEmoticon = {
  id: "custom-1",
  url: "https://example.com/custom.webp",
  size: { width: 128, height: 128, file_size: 1024 },
  is_available: true,
  hash: "custom-hash",
};
const gameRoles: Array<TGApp.BBS.Game.Account> = [
  {
    game_biz: "hk4e_cn",
    game_uid: "100000001",
    is_chosen: true,
    is_official: true,
    level: "60",
    nickname: "旅行者",
    region: "cn_gf01",
    region_name: "天空岛",
  },
  {
    game_biz: "hk4e_global",
    game_uid: "800000001",
    is_chosen: false,
    is_official: true,
    level: "60",
    nickname: "Traveler",
    region: "os_asia",
    region_name: "Asia",
  },
  {
    game_biz: "hkrpg_cn",
    game_uid: "100000002",
    is_chosen: true,
    is_official: true,
    level: "70",
    nickname: "开拓者",
    region: "prod_gf_cn",
    region_name: "星穹列车",
  },
];
const games: Array<Pick<TGApp.BBS.Game.Item, "id" | "name" | "op_name" | "en_name">> = [
  { id: 2, name: "原神", op_name: "ys", en_name: "hk4e" },
  { id: 6, name: "崩坏：星穹铁道", op_name: "sr", en_name: "hkrpg" },
];

describe("bbsGameUid", () => {
  it("maps a bound game role to the APK UID card fields", () => {
    const account: TGApp.BBS.Game.Account = {
      game_biz: info.game_biz,
      game_uid: info.game_uid,
      is_chosen: true,
      is_official: true,
      level: String(info.level),
      nickname: info.nickname,
      region: "cn_gf01",
      region_name: info.region_name,
    };

    expect(createGameUidInfo(account, info.game_name)).toEqual(info);
  });

  it("accepts only the six APK game_user_info fields", () => {
    expect(validateGameUidInfo({ ...info })).toEqual(info);
    expect(() => validateGameUidInfo({ ...info, level: "60" })).toThrow();
    expect(() => validateGameUidInfo({ ...info, unknown: true })).toThrow();
    expect(() => validateGameUidInfo({ ...info, game_uid: "0" })).toThrow();
  });

  it("rejects credentials that mix account_id and ltuid", () => {
    const cookie = {
      account_id: "100000001",
      cookie_token: "cookie-token",
      ltoken: "ltoken",
      ltuid: "100000001",
      mid: "",
      stoken: "",
      stuid: "",
    };

    expect(validateGameUidCookie(cookie)).toMatchObject(cookie);
    expect(() => validateGameUidCookie({ ...cookie, account_id: "100000002" })).toThrow();
  });
});

describe("UID cards for the current community", () => {
  it("keeps only the selected game's roles across servers", () => {
    const cards = getGameUidInfos(gameRoles, games, 2);

    expect(cards.map((card) => card.game_uid)).toEqual(["100000001", "800000001"]);
    expect(cards.every((card) => card.game_name === "原神")).toBe(true);
  });

  it("switches the result to the newly selected community", () => {
    expect(getGameUidInfos(gameRoles, games, 6)).toEqual([
      {
        game_biz: "hkrpg_cn",
        game_name: "崩坏：星穹铁道",
        game_uid: "100000002",
        level: 70,
        nickname: "开拓者",
        region_name: "星穹列车",
      },
    ]);
  });

  it("supports the game operation name without accepting partial prefixes", () => {
    const role = gameRoles[0];
    const selectedGame = [{ id: 2, name: "原神", op_name: "hk4e", en_name: "ys" }];

    expect(
      getGameUidInfos([role, { ...role, game_biz: "hk4eother_cn" }], selectedGame, 2),
    ).toHaveLength(1);
  });

  it("does not fall back to other games when the community is unknown or has no roles", () => {
    expect(getGameUidInfos(gameRoles, games, 99)).toEqual([]);
    expect(getGameUidInfos(gameRoles, [], 2)).toEqual([]);
    expect(getGameUidInfos([], games, 2)).toEqual([]);
    expect(getGameUidInfos(gameRoles.slice(0, 2), games, 6)).toEqual([]);
  });

  it("skips malformed role information without hiding valid matching roles", () => {
    expect(
      getGameUidInfos([{ ...gameRoles[0], level: "invalid" }, gameRoles[0]], games, 2),
    ).toEqual([info]);
  });
});

describe("reply UID card document", () => {
  it("builds a UID-only document with empty plain text and a local preview", () => {
    const document = buildReplyDocument("", [], [], undefined, info);

    expect(document.content).toBe("");
    expect(document.preview).toBe(getGameUidPreviewText(info));
    expect(document.structuredContent).toEqual([
      {
        insert: {
          game_user_info: info,
        },
      },
      { insert: "\n" },
    ]);
  });

  it("keeps text, UID, favorite emoticon, and image nodes together", () => {
    const document = buildReplyDocument(
      "你好",
      [],
      [{ url: "https://example.com/image.png", width: 640, height: 480 }],
      customEmoticon,
      info,
    );

    expect(document.content).toBe("你好\n[自定义表情]");
    expect(document.structuredContent).toEqual([
      { insert: "你好\n" },
      { insert: { game_user_info: info } },
      { insert: "\n" },
      { insert: { custom_emoticon: customEmoticon, backup_text: "[自定义表情]" } },
      { insert: "\n" },
      {
        insert: { image: "https://example.com/image.png" },
        attributes: { width: 640, height: 480 },
      },
      { insert: "\n" },
    ]);
  });

  it("keeps the APK card fields and rejects extra node fields", () => {
    expect(validateReplySendNodes([{ insert: { game_user_info: info } }])).toEqual([
      { insert: { game_user_info: info } },
    ]);
    expect(() =>
      validateReplySendNodes([{ insert: { game_user_info: { ...info, level: 60.5 } } }]),
    ).toThrow();
    expect(() =>
      validateReplySendNodes([{ insert: { game_user_info: info, backup_text: "wrong" } }]),
    ).toThrow();
  });
});
