/**
 * 七圣召唤战绩请求回归测试。
 * @since Beta v0.14.1
 */

import recordReq from "@req/recordReq.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, getRequestHeader } = vi.hoisted(() => ({
  get: vi.fn(),
  getRequestHeader: vi.fn(() => ({ ds: "test-ds" })),
}));

vi.mock("@utils/network/TGHttps.js", () => ({ default: { get } }));
vi.mock("@utils/network/getRequestHeader.js", () => ({ getRequestHeader }));

const cookie: TGApp.App.Account.Cookie = {
  account_id_v2: "100000001",
  cookie_token_v2: "test-cookie-token",
  ltoken_v2: "test-ltoken",
  ltuid_v2: "100000001",
  mid: "test-mid",
  stoken: "test-stoken",
  stuid: "100000001",
};
const role: TGApp.Sqlite.Account.Game = {
  uid: "100000001",
  gameBiz: "hk4e_cn",
  gameUid: "500000001",
  region: "cn_qd01",
  nickname: "旅行者",
  regionName: "世界树",
  isChosen: 1,
  isOfficial: 0,
  level: "60",
  updated: "",
};
const baseUrl = "https://api-takumi-record.mihoyo.com/game_record/app/genshin/api/gcg/";

beforeEach(() => {
  get.mockReset();
  getRequestHeader.mockClear();
});

describe("七圣召唤战绩请求", () => {
  it("用当前账号签名并请求指定档期的胜冠之试", async () => {
    const result = { basic: { win_cnt: 0 }, deck_list: [], honor_character: [] };
    get.mockResolvedValueOnce({ data: { retcode: 0, message: "OK", data: result } });

    await expect(
      recordReq.gcg(cookie, role, "challenge/record", { schedule_id: 90 }),
    ).resolves.toEqual(result);

    const query = { schedule_id: 90, role_id: role.gameUid, server: role.region };
    expect(getRequestHeader).toHaveBeenCalledWith(
      {
        account_id_v2: "100000001",
        account_mid_v2: "test-mid",
        cookie_token_v2: "test-cookie-token",
        ltmid_v2: "test-mid",
        ltoken_v2: "test-ltoken",
        ltuid_v2: "100000001",
      },
      "GET",
      query,
    );
    expect(get).toHaveBeenCalledWith(`${baseUrl}challenge/record`, {
      headers: { ds: "test-ds" },
      query,
    });
  });

  it("保留卡牌筛选和翻页参数", async () => {
    const pagination = {
      need_stats: true,
      limit: 50,
      need_avatar: false,
      need_action: true,
      offset: 50,
    };
    const result = { card_list: [], is_last: true, next_offset: 0 };
    get.mockResolvedValueOnce({ data: { retcode: 0, message: "OK", data: result } });

    await expect(recordReq.gcg(cookie, role, "cardList", pagination)).resolves.toEqual(result);

    expect(get).toHaveBeenCalledWith(`${baseUrl}cardList`, {
      headers: { ds: "test-ds" },
      query: { ...pagination, role_id: role.gameUid, server: role.region },
    });
  });

  it.each([
    [10001, "Please login", "请重新登录米游社后刷新"],
    [10307, "", "版本更新期间，七圣召唤数据维护中"],
    [10102, "战绩未公开", "[10102] 战绩未公开"],
    [0, "OK", "米游社未返回七圣召唤数据"],
  ])("将响应码 %s 转为页面可显示的错误", async (retcode, message, expected) => {
    get.mockResolvedValueOnce({ data: { retcode, message, data: null } });

    await expect(recordReq.gcg(cookie, role, "basicInfo")).rejects.toThrow(expected);
  });
});
