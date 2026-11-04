/**
 * 国服兑换码请求与批量执行回归测试
 * @since Beta v0.13.0
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import redeemCode from "../src/request/redeemReq.js";
import { parseRedeemCodes, redeemCodes } from "../src/utils/game/redeemCode.js";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@utils/network/TGHttps.js", () => ({ default: { get } }));

const role: TGApp.Sqlite.Account.Game = {
  uid: "123",
  gameBiz: "hk4e_cn",
  gameUid: "123456789",
  isChosen: 1,
  isOfficial: 1,
  level: "60",
  nickname: "旅行者",
  region: "cn_gf01",
  regionName: "天空岛",
  updated: "",
};
const cookie: TGApp.App.Account.Cookie = {
  account_id: "123",
  cookie_token: "test-token",
  ltuid: "123",
  ltoken: "test-ltoken",
  stuid: "123",
  stoken: "test-stoken",
  mid: "test-mid",
};
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("parseRedeemCodes", () => {
  it("支持中文兑换码与逗号、空白分隔，并忽略大小写去重", () => {
    expect(parseRedeemCodes(" abc,DEF，abc\n中文兑换码\t jkl  ")).toEqual([
      "ABC",
      "DEF",
      "中文兑换码",
      "JKL",
    ]);
    expect(parseRedeemCodes(" ,，\n\t ")).toEqual([]);
  });
});

describe("redeemCodes", () => {
  it("逐码回报、去重并至少间隔 5500ms；单码业务失败继续", async () => {
    vi.useFakeTimers();
    const redeem = vi.fn(async (code: string) => ({
      retcode: code === "EXPIRED" ? -2001 : 0,
      message: code,
    }));
    const onResult = vi.fn();
    const run = redeemCodes(["OK", "ok", "EXPIRED", "中文码"], redeem, onResult);
    await vi.advanceTimersByTimeAsync(0);
    expect(redeem).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5499);
    expect(redeem).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(redeem).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5500);
    expect((await run).map(({ retcode }) => retcode)).toEqual([0, -2001, 0]);
  });

  it.each([-1071, -1033, -1035, -2016])("业务码 %i 停止后续且不重试", async (retcode) => {
    const redeem = vi.fn(async () => ({ retcode, message: "失败" }));
    expect((await redeemCodes(["ONE", "TWO"], redeem)).map((result) => result.retcode)).toEqual([
      retcode,
      -2,
    ]);
    expect(redeem).toHaveBeenCalledTimes(1);
  });

  it("网络异常隐藏外部错误、标为未知并停止发送", async () => {
    const redeem = vi.fn(async () => {
      throw new Error("secret-cookie");
    });
    const results = await redeemCodes(["ONE", "TWO"], redeem);
    expect(results.map((result) => result.retcode)).toEqual([-1, -2]);
    expect(JSON.stringify(results)).not.toContain("secret-cookie");
    expect(redeem).toHaveBeenCalledTimes(1);
  });

  it("拒绝空列表、非法码和超额列表，不发请求", async () => {
    const redeem = vi.fn();
    for (const codes of [[], ["<script>"], Array.from({ length: 21 }, (_, i) => `CODE${i}`)]) {
      await expect(redeemCodes(codes, redeem)).rejects.toThrow();
    }
    expect(redeem).not.toHaveBeenCalled();
  });

  it("全局锁阻止其他兑换入口并在结束后释放", async () => {
    let release: ((value: { retcode: number; message: string }) => void) | undefined;
    const first = redeemCodes(
      ["ONE"],
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    await expect(redeemCodes(["TWO"], vi.fn())).rejects.toThrow("已有兑换任务");
    release?.({ retcode: 0, message: "成功" });
    await first;
    expect(await redeemCodes(["TWO"], async () => ({ retcode: 0, message: "成功" }))).toHaveLength(
      1,
    );
  });
});

describe("redeemCode", () => {
  it("绝区零国服使用对应接口和角色参数", async () => {
    get.mockResolvedValue({ data: { retcode: 0 } });
    await redeemCode("ZZZCODE", { ...role, gameBiz: "nap_cn", region: "prod_gf_cn" }, cookie);
    expect(get).toHaveBeenCalledWith(
      "https://public-operation-nap.mihoyo.com/common/apicdkey/api/webExchangeCdkey",
      expect.objectContaining({
        query: expect.objectContaining({
          game_biz: "nap_cn",
          region: "prod_gf_cn",
          uid: role.gameUid,
        }),
      }),
    );
    await expect(
      redeemCode("ZZZCODE", { ...role, gameBiz: "nap_cn", region: "cn_gf01" }, cookie),
    ).rejects.toThrow();
  });

  it("使用国服地址、当前 UID 与完整凭据，禁止重定向且不回传外部消息", async () => {
    get.mockResolvedValue({ data: { retcode: 0, message: "secret" } });
    expect(await redeemCode("中文码", role, cookie)).toEqual({
      retcode: 0,
      message: "兑换成功，请到游戏邮件领取奖励",
    });
    expect(get).toHaveBeenCalledWith(
      "https://hk4e-api.mihoyo.com/common/apicdkey/api/webExchangeCdkey",
      {
        headers: {
          Cookie: expect.stringContaining("account_id=123;"),
          Referer: "https://webstatic.mihoyo.com/",
        },
        query: {
          cdkey: "中文码",
          game_biz: "hk4e_cn",
          region: "cn_gf01",
          uid: "123456789",
          lang: "zh-cn",
          t: expect.any(String),
        },
        maxRedirections: 0,
        timeout: 20000,
      },
    );
    const config = get.mock.calls[0][1];
    for (const [key, value] of Object.entries(cookie))
      expect(config.headers.Cookie).toContain(`${key}=${value};`);
  });

  it("支持世界树，映射冷却错误并校验响应业务码", async () => {
    get.mockResolvedValueOnce({ data: { retcode: -2016, message: "secret" } });
    expect((await redeemCode("CODE", { ...role, region: "cn_qd01" }, cookie)).message).toContain(
      "兑换冷却",
    );
    get.mockResolvedValueOnce({ data: { retcode: "0" } });
    await expect(redeemCode("CODE", role, cookie)).rejects.toThrow("兑换响应无效");
  });

  it("请求前拒绝非国服角色、错账号和缺失凭据", async () => {
    await expect(redeemCode("CODE", { ...role, gameBiz: "hk4e_global" }, cookie)).rejects.toThrow();
    await expect(redeemCode("CODE", role, { ...cookie, account_id: "456" })).rejects.toThrow();
    await expect(redeemCode("CODE", role, { ...cookie, cookie_token: "" })).rejects.toThrow();
    await expect(redeemCode("CODE", role, { ...cookie, ltuid: "456" })).rejects.toThrow();
    expect(get).not.toHaveBeenCalled();
  });
});
