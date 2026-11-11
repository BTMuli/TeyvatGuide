/**
 * 米游社商店请求回归测试。
 * @since Beta v0.13.1
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@utils/network/TGHttps.js", () => ({
  default: { get: mocks.get, post: mocks.post },
}));

import shopReq from "../src/request/shopReq.js";

const cookie: TGApp.App.Account.Cookie = {
  account_id: "398265412",
  cookie_token: "cookie-token",
  ltoken: "ltoken",
  ltuid: "398265412",
  mid: "mid",
  stoken: "stoken",
  stuid: "398265412",
};

beforeEach(() => {
  mocks.get.mockReset();
  mocks.post.mockReset();
});

describe("shop request headers and query", () => {
  it("uses the web cookie contract for balance without DS signing", async () => {
    const response: TGApp.BBS.Shop.PointResp = {
      retcode: 0,
      message: "OK",
      data: { points: 1200 },
    };
    mocks.get.mockResolvedValueOnce({ data: response });

    await expect(shopReq.point(cookie)).resolves.toEqual(response);
    expect(mocks.get).toHaveBeenCalledWith(
      "https://bbs-api.mihoyo.com/common/homutreasure/v1/web/user/point",
      {
        headers: expect.objectContaining({
          "x-rpc-client_type": "4",
          "x-rpc-app_version": "2.102.0",
          Origin: "https://www.miyoushe.com",
          Referer: "https://webstatic.mihoyo.com/app/community-shop/index.html",
          Cookie: "account_id=398265412; cookie_token=cookie-token; ltoken=ltoken; ltuid=398265412",
        }),
        query: { app_id: 1, point_sn: "myb" },
      },
    );
    const headers = <Record<string, string>>mocks.get.mock.calls[0]?.[1].headers;
    expect(headers).not.toHaveProperty("ds");
    expect(headers).not.toHaveProperty("DS");
    expect(headers).not.toHaveProperty("x-requested-with");
  });

  it("preserves the interface-driven categories and sends the all filter as an empty string", async () => {
    const response: TGApp.BBS.Shop.GoodsListResp = {
      retcode: 0,
      message: "OK",
      data: {
        list: [],
        total: 0,
        games: [
          { key: "all", name: "全部商品" },
          { key: "hk4e", name: "原神" },
        ],
      },
    };
    mocks.get.mockResolvedValueOnce({ data: response });

    const actual = await shopReq.goods(cookie, "all", 2, 20);
    expect(actual.data.games).toEqual(response.data.games);
    expect(mocks.get.mock.calls[0]?.[1].query).toEqual({
      app_id: 1,
      point_sn: "myb",
      page: 2,
      page_size: 20,
      game: "",
    });
  });

  it("fills the selected category on list items without changing all-category items", async () => {
    const item = {
      goods_id: "goods-1",
      goods_name: "测试",
      icon: "",
      price: 10,
      total: 1,
      type: 2,
    };
    mocks.get.mockResolvedValue({
      data: { retcode: 0, message: "OK", data: { list: [item], total: 1 } },
    });
    const filtered = await shopReq.goods(cookie, "future-game");
    expect(filtered.data.list[0]?.game).toBe("future-game");
    expect(filtered.data.games).toBeUndefined();
    const all = await shopReq.goods(cookie);
    expect(all.data.list[0]?.game).toBeUndefined();
  });

  it("preserves business errors with null data", async () => {
    const failure = { retcode: 1034, message: "需要验证", data: null };
    mocks.get.mockResolvedValueOnce({ data: failure });
    await expect(shopReq.goods(cookie)).resolves.toEqual(failure);
  });

  it("requests detail and record data with the shared app and point parameters", async () => {
    const detail: TGApp.BBS.Shop.GoodsDetailResp = {
      retcode: 0,
      message: "OK",
      data: {
        goods_id: "goods-1",
        goods_name: "测试",
        icon: "",
        price: 10,
        point_sn: "myb",
        type: 2,
        game: "bbs",
        game_biz: "bbs",
        total: 1,
        next_num: 0,
        account_cycle_type: "not_limit",
        account_cycle_limit: 0,
        account_exchange_num: 0,
        role_cycle_type: "not_limit",
        role_cycle_limit: 0,
        role_exchange_num: 0,
      },
    };
    const records: TGApp.BBS.Shop.RecordResp = {
      retcode: 0,
      message: "OK",
      data: { list: [] },
    };
    mocks.get.mockResolvedValueOnce({ data: detail }).mockResolvedValueOnce({ data: records });

    await shopReq.detail(cookie, "goods-1");
    await shopReq.records(cookie, 3, 10);
    expect(mocks.get.mock.calls[0]?.[1].query).toEqual({
      app_id: 1,
      point_sn: "myb",
      goods_id: "goods-1",
    });
    expect(mocks.get.mock.calls[1]?.[1].query).toEqual({
      app_id: 1,
      point_sn: "myb",
      page: 3,
      page_size: 10,
    });
  });
});

describe("shop exchange request", () => {
  it("puts app_id and point_sn in the JSON body", async () => {
    const response: TGApp.BBS.Shop.ExchangeResp = {
      retcode: 0,
      message: "OK",
      data: { order_sn: "order-1" },
    };
    mocks.post.mockResolvedValueOnce({ data: response });
    const params: TGApp.BBS.Shop.ExchangeParams = {
      app_id: 1,
      point_sn: "myb",
      goods_id: "goods-1",
      exchange_num: 1,
      uid: "398265412",
      game_biz: "bbs",
      address_id: 0,
    };

    await expect(shopReq.exchange(cookie, params)).resolves.toEqual(response);
    expect(mocks.post).toHaveBeenCalledWith(
      "https://bbs-api.mihoyo.com/common/homushop/v1/web/goods/exchange",
      {
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: params,
      },
    );
  });
});
