/**
 * 通行证 V2 换票请求和响应回归测试。
 * @since Beta v0.13.2
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { post } = vi.hoisted(() => ({
  post: vi.fn<(url: string, config: TGApp.App.Response.ReqConfParams) => Promise<unknown>>(),
}));

vi.mock("@utils/network/TGHttps.js", () => ({ default: { post } }));

import passportReq from "../src/request/passportReq.js";

const cookie: TGApp.App.Account.Cookie = {
  account_id_v2: "100000001",
  cookie_token_v2: "",
  ltoken_v2: "",
  ltuid_v2: "100000001",
  mid: "test-mid",
  stoken: "test-stoken=",
  stuid: "100000001",
};

describe("Passport V2 token exchange", () => {
  beforeEach(() => {
    post.mockReset();
    vi.stubGlobal("localStorage", {
      getItem: () =>
        JSON.stringify({
          deviceInfo: {
            device_id: "test-device",
            device_fp: "0123456789012",
            device_name: "test",
            product: "TEST",
          },
        }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    { target: 2, field: "ltoken_v2", exchange: passportReq.lToken.get },
    { target: 4, field: "cookie_token_v2", exchange: passportReq.cookieToken },
  ])(
    "exchanges a stoken for $field using a signed V2 request",
    async ({ target, field, exchange }) => {
      post.mockResolvedValue({
        data: {
          retcode: 0,
          message: "OK",
          data: {
            token: { token: "exchanged-token", token_type: target },
            user_info: { aid: 100000001 },
            expire_in_seconds: 3600,
          },
        },
      });

      const response = await exchange(cookie);
      expect(response).toMatchObject({ retcode: 0, data: { [field]: "exchanged-token" } });
      if (target === 4) expect(response.data).toHaveProperty("uid", "100000001");

      const request = post.mock.lastCall;
      assert.ok(request);
      const [url, { body, headers, query }] = request;
      assert.ok(headers && typeof body === "string");
      expect(url).toBe("https://passport-api.mihoyo.com/account/ma-cn-session/app/exchange");
      expect(query).toBeUndefined();
      expect(headers.cookie).toBeUndefined();
      expect(headers).toMatchObject({
        "content-type": "application/json",
        "x-rpc-client_type": "2",
        "x-rpc-game_biz": "bbs_cn",
        "x-rpc-sdk_version": "2.44.0",
      });
      expect(JSON.parse(body)).toEqual({
        dst_token_type: target,
        src_token: { token: cookie.stoken, token_type: 1 },
        mid: cookie.mid,
      });
      expect(body).toContain("\\u003d");
      expect(headers.DS).toMatch(/^\d+,[A-Za-z0-9]{6},[a-f0-9]{32}$/);
      const [time, nonce, digest] = headers.DS.split(",");
      const signature = [
        "salt=JwYDpKvLj6MrMqqYU6jTKF17KNO2PXoS",
        "t=" + time,
        "r=" + nonce,
        "b=" + body,
        "q=",
      ].join("&");
      expect(digest).toBe(createHash("md5").update(signature).digest("hex"));
    },
  );

  it("preserves the service error and does not retry token exchange", async () => {
    const response = { retcode: -100, message: "登录状态失效", data: null };
    post.mockResolvedValue({ data: response });

    await expect(passportReq.lToken.get(cookie)).resolves.toEqual(response);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("rejects a successful response with no usable token", async () => {
    post.mockResolvedValue({ data: { retcode: 0, message: "OK", data: { token: { token: "" } } } });

    await expect(passportReq.cookieToken(cookie)).rejects.toThrow("缺少有效凭证");
  });

  it("rejects missing exchange credentials before sending a request", async () => {
    await expect(passportReq.cookieToken({ ...cookie, mid: "" })).rejects.toThrow("mid 缺失");
    expect(post).not.toHaveBeenCalled();
  });
});
