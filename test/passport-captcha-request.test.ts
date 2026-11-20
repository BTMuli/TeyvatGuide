/**
 * 通行证短信登录请求契约回归测试。
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

const phone = "13800000000";
const captcha = "123456";
const actionType = "login";
const aigis = "test-session;test-verification";
const deviceInfo = { device_id: "test-device", device_fp: "0123456789012" };
const encryptedField = expect.stringMatching(/^[A-Za-z0-9+/]{171}=$/);

/**
 * 验证最近一次发送的请求使用实际请求体生成 DS。
 * @since Beta v0.13.2
 * @param endpoint - 预期的通行证接口路径
 * @returns 已发送的请求头和解析后的请求体
 */
function expectSignedRequest(endpoint: string): { headers: Record<string, string>; body: unknown } {
  const request = post.mock.lastCall;
  assert.ok(request);
  const [url, { headers, body }] = request;
  assert.ok(headers && typeof body === "string");
  expect(url).toBe("https://passport-api.mihoyo.com/" + endpoint);
  expect(headers).toMatchObject({
    accept: "application/json",
    "content-type": "application/json",
    "x-rpc-app_id": "bll8iq97cem8",
    "x-rpc-client_type": "2",
    "x-rpc-device_id": deviceInfo.device_id,
    "x-rpc-device_fp": deviceInfo.device_fp,
    "x-rpc-game_biz": "bbs_cn",
    "x-rpc-sys_version": "12",
    "x-rpc-sdk_version": "2.44.0",
    "x-rpc-account_version": "2.44.0",
    "x-rpc-lifecycle_id": expect.stringMatching(/^[a-f0-9-]{36}$/),
  });
  expect(headers.DS).toMatch(/^\d+,[A-Za-z0-9]{6},[a-f0-9]{32}$/);
  const [time, nonce, digest] = headers.DS.split(",");
  const signatureInput = [
    "salt=JwYDpKvLj6MrMqqYU6jTKF17KNO2PXoS",
    "t=" + time,
    "r=" + nonce,
    "b=" + body,
    "q=",
  ].join("&");
  expect(digest).toBe(createHash("md5").update(signatureInput).digest("hex"));
  expect(body).toContain("\\u003d");
  return { headers, body: JSON.parse(body) };
}

describe("passportReq.captcha", () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ data: { retcode: 0 } });
    vi.stubGlobal("localStorage", {
      getItem: () =>
        JSON.stringify({ deviceInfo: { ...deviceInfo, device_name: "test", product: "TEST" } }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("signs the encrypted SMS request and sends Aigis only for verification retries", async () => {
    const endpoint = "account/ma-cn-verifier/verifier/createLoginCaptcha";
    await passportReq.captcha.create(phone);
    const initial = expectSignedRequest(endpoint);
    expect(initial.body).toEqual({ area_code: encryptedField, mobile: encryptedField });
    expect(initial.headers["x-rpc-aigis"]).toBeUndefined();

    await passportReq.captcha.create(phone, aigis);
    const retry = expectSignedRequest(endpoint);
    expect(retry.headers["x-rpc-aigis"]).toBe(aigis);
    expect(retry.headers["x-rpc-lifecycle_id"]).toBe(initial.headers["x-rpc-lifecycle_id"]);
  });

  it("signs the submitted code and forwards the SMS action type and verification data", async () => {
    await passportReq.captcha.login(phone, captcha, actionType, aigis);

    const request = expectSignedRequest("account/ma-cn-passport/app/loginByMobileCaptcha");
    expect(request.body).toEqual({
      area_code: encryptedField,
      mobile: encryptedField,
      action_type: actionType,
      captcha,
    });
    expect(request.headers["x-rpc-aigis"]).toBe(aigis);
  });
});
