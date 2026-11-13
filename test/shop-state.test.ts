/**
 * 米游社商店状态与兑换参数回归测试。
 * @since Beta v0.13.1
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildShopExchangeParams,
  getShopGoodsLimits,
  getShopGoodsStatus,
  getShopResponseError,
  parseShopTime,
} from "../src/utils/community/shop.js";
import { getShopStatusText, isShopBatchSoldOut } from "../src/utils/community/shopDisplay.js";

const accountCookie: TGApp.App.Account.Cookie = {
  account_id: "398265412",
  cookie_token: "cookie-token",
  ltoken: "ltoken",
  ltuid: "398265412",
  mid: "mid",
  stoken: "stoken",
  stuid: "398265412",
};

/**
 * 创建商店商品测试数据。
 * @since Beta v0.13.1
 * @param overrides - 覆盖字段
 * @returns 商品测试数据
 */
function createGoods(overrides: Partial<TGApp.BBS.Shop.Goods> = {}): TGApp.BBS.Shop.Goods {
  return {
    goods_id: "2026110412132",
    goods_name: "测试挂件",
    icon: "https://example.com/icon.png",
    price: 100,
    point_sn: "myb",
    type: 2,
    game: "bbs",
    game_biz: "bbs_cn",
    goods_detail: "<p>详情</p>",
    total: 10,
    unlimit: false,
    next_num: 0,
    next_time: 0,
    status: "online",
    start: 0,
    end: 0,
    sale_start_time: 0,
    now_time: 0,
    account_cycle_type: "not_limit",
    account_cycle_limit: 0,
    account_exchange_num: 0,
    role_cycle_type: "not_limit",
    role_cycle_limit: 0,
    role_exchange_num: 0,
    bbs_detail: [],
    rules: [],
    ...overrides,
  };
}

describe("shop goods status", () => {
  it("parses numeric and string timestamps in seconds or milliseconds", () => {
    expect(parseShopTime(1_800_000_000)).toBe(1_800_000_000_000);
    expect(parseShopTime("1800000000")).toBe(1_800_000_000_000);
    expect(parseShopTime("2030-01-01T00:00:00.000Z")).toBe(Date.parse("2030-01-01T00:00:00.000Z"));
  });

  it("treats a zero current stock with a future batch as upcoming", () => {
    const goods = createGoods({ total: 0, next_num: 20, next_time: 1_900_000_000 });
    expect(getShopGoodsStatus(goods, 1_800_000_000_000)).toBe("upcoming");
  });

  it("does not treat a zero next_time as a future stock plan", () => {
    const goods = createGoods({ total: 0, next_num: 0, next_time: 0 });
    expect(getShopGoodsStatus(goods, 1_800_000_000_000)).toBe("sold-out");
  });

  it("honors the detail sale time and permits zero-stock unlimited BBS goods", () => {
    const goods = createGoods({
      total: 0,
      unlimit: true,
      start: "1793764800",
      sale_start_time: "1793765700",
      end: "1797955200",
    });
    expect(getShopGoodsStatus(goods, 1_793_765_000_000)).toBe("upcoming");
    expect(getShopGoodsStatus(goods, 1_794_369_929_000)).toBe("available");
  });

  it("applies time windows and rejects unknown statuses", () => {
    const upcoming = createGoods({ start: "2030-01-01T00:00:00.000Z" });
    expect(getShopGoodsStatus(upcoming, Date.parse("2029-12-31T00:00:00.000Z"))).toBe("upcoming");

    const ended = createGoods({ end: "2029-01-01T00:00:00.000Z" });
    expect(getShopGoodsStatus(ended, Date.parse("2030-01-01T00:00:00.000Z"))).toBe("ended");

    const unknown = createGoods({ status: "paused" });
    expect(getShopGoodsStatus(unknown)).toBe("unavailable");
    expect(getShopGoodsStatus(createGoods({ status: undefined }))).toBe("unavailable");
  });

  it("reports the smallest account or role limit remaining", () => {
    const goods = createGoods({
      account_cycle_type: "month",
      account_cycle_limit: 3,
      account_exchange_num: 1,
      role_cycle_type: "forever",
      role_cycle_limit: 2,
      role_exchange_num: 2,
    });
    expect(getShopGoodsLimits(goods)).toEqual([
      { scope: "account", type: "month", limit: 3, used: 1, remaining: 2 },
      { scope: "role", type: "forever", limit: 2, used: 2, remaining: 0 },
    ]);
    expect(getShopGoodsStatus(goods)).toBe("limit-reached");
  });
});

describe("shop goods display status", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("includes the quantity permitted by stock and remaining limits in the available status", () => {
    expect(getShopStatusText(createGoods({ total: 5 }))).toBe("可兑换 5");
    expect(
      getShopStatusText(
        createGoods({
          total: 5,
          account_cycle_type: "forever",
          account_cycle_limit: 3,
          account_exchange_num: 1,
        }),
      ),
    ).toBe("可兑换 2");
    expect(getShopStatusText(createGoods({ total: 0, unlimit: true }))).toBe("可兑换 ∞");
  });

  it.each<Partial<TGApp.BBS.Shop.Goods>>([
    { total: 0, next_num: 5, next_time: 1_900_000_000 },
    { total: 0, next_num: 0, next_time: 1_900_000_000 },
    { total: 0, status: "not_in_sell" },
    { total: 0, start: 1_900_000_000 },
    { total: 0, sale_start_time: "1900000000" },
  ])("keeps upcoming zero-stock goods in color with only the upcoming status: %j", (overrides) => {
    vi.useFakeTimers();
    vi.setSystemTime(1_800_000_000_000);
    const goods = createGoods(overrides);

    expect(getShopGoodsStatus(goods)).toBe("upcoming");
    expect(getShopStatusText(goods)).toBe("待开售");
    expect(isShopBatchSoldOut(goods)).toBe(false);
  });

  it("applies the sold-out presentation only after the last batch is exhausted", () => {
    const goods = createGoods({ total: 0, next_num: 0, next_time: 0 });

    expect(getShopGoodsStatus(goods)).toBe("sold-out");
    expect(getShopStatusText(goods)).toBe("已售罄");
    expect(isShopBatchSoldOut(goods)).toBe(true);
  });

  it.each<Partial<TGApp.BBS.Shop.Goods>>([
    { total: 0, unlimit: true },
    { total: 0, end: 1_700_000_000 },
    { total: 0, account_cycle_type: "forever", account_cycle_limit: 1, account_exchange_num: 1 },
    { total: 0, status: "paused" },
  ])("does not label other zero-stock states as sold out: %j", (overrides) => {
    vi.useFakeTimers();
    vi.setSystemTime(1_800_000_000_000);

    expect(isShopBatchSoldOut(createGoods(overrides))).toBe(false);
  });
});

describe("shop business errors", () => {
  it("preserves the server message for restrictions such as a point account ban", () => {
    const message = "米游币账户已封禁";
    expect(getShopResponseError({ retcode: -1, message })).toBe(`[-1] ${message}`);
    expect(getShopResponseError({ retcode: 0, message: "OK" })).toBeUndefined();
  });

  it("identifies both observed login failure codes", () => {
    for (const retcode of [-2007, -10000]) {
      expect(getShopResponseError({ retcode, message: "未登录" })).toContain("重新登录");
    }
  });

  it("directs risk control failures to the official verification flow", () => {
    for (const retcode of [1028, 1034]) {
      expect(getShopResponseError({ retcode, message: "验证" })).toContain("前往官方商店");
    }
  });
});

describe("shop exchange params", () => {
  it("builds the BBS branch with account ID and no region", () => {
    const params = buildShopExchangeParams(createGoods(), accountCookie);
    expect(params).toEqual({
      app_id: 1,
      point_sn: "myb",
      goods_id: "2026110412132",
      exchange_num: 1,
      uid: "398265412",
      game_biz: "bbs",
      address_id: 0,
    });
  });

  it("builds the game branch from the selected role", () => {
    const role: TGApp.BBS.Shop.Role = {
      game_biz: "hk4e_cn",
      game_uid: "100000001",
      is_chosen: true,
      is_official: true,
      level: "60",
      nickname: "旅行者",
      region: "cn_gf01",
      region_name: "天空岛",
    };
    const params = buildShopExchangeParams(
      createGoods({ game: "hk4e", game_biz: "hk4e_cn" }),
      accountCookie,
      role,
      2,
    );
    expect(params).toMatchObject({
      exchange_num: 2,
      uid: "100000001",
      game_biz: "hk4e_cn",
      region: "cn_gf01",
    });
  });

  it("rejects mixed account cookies and mismatched roles", () => {
    expect(() =>
      buildShopExchangeParams(createGoods(), { ...accountCookie, ltuid: "998" }),
    ).toThrow("账号 ID 不一致");
    const role: TGApp.BBS.Shop.Role = {
      game_biz: "nap_cn",
      game_uid: "100000001",
      is_chosen: true,
      is_official: true,
      level: "60",
      nickname: "代理人",
      region: "cn_gf01",
      region_name: "天空岛",
    };
    expect(() =>
      buildShopExchangeParams(
        createGoods({ game: "hk4e", game_biz: "hk4e_cn" }),
        accountCookie,
        role,
      ),
    ).toThrow("发放业务不匹配");
  });
});
