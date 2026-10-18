/**
 * 米游社回复资源请求契约回归测试。
 * @since Beta v0.12.6
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  getRequestHeader: vi.fn(),
}));

vi.mock("@utils/TGHttps.js", () => ({ default: { post: mocks.post } }));
vi.mock("@utils/getRequestHeader.js", () => ({ getRequestHeader: mocks.getRequestHeader }));

import replyAssetReq, {
  replyAssetCapabilities,
  resolveMention,
  uploadImage,
} from "../src/request/replyAssetReq.js";

const cookie = {
  account_id: "account-id-must-not-be-sent",
  cookie_token: "cookie-token-must-not-be-sent",
  ltoken: "ltoken-value",
  ltuid: "100000001",
};
const authCookie = { ltoken: cookie.ltoken, ltuid: cookie.ltuid };

beforeEach(() => {
  mocks.post.mockReset();
  mocks.getRequestHeader.mockReset();
  mocks.getRequestHeader.mockReturnValue({ "x-test-header": "test" });
});

describe("replyAssetReq capabilities", () => {
  it("exposes mention resolution and keeps image upload disabled", () => {
    expect(replyAssetCapabilities).toEqual({ imageUpload: false, mention: true });
    expect(replyAssetReq).toEqual({ resolveMention, uploadImage });
  });
});

describe("resolveMention", () => {
  it("sends the official lookup body and minimal authenticated cookie", async () => {
    mocks.post.mockResolvedValueOnce({
      data: {
        retcode: 0,
        message: "ok",
        data: { nickname_uid_info: { Alice: 123456789 } },
      },
    });
    const controller = new AbortController();

    await expect(resolveMention(" Alice ", cookie, 2, controller.signal)).resolves.toEqual({
      uid: 123456789,
      nickname: "Alice",
    });
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      authCookie,
      "POST",
      { gids: "2", nickname_list: ["Alice"] },
      "K2",
      true,
    );
    expect(mocks.post).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/user/wapi/getUIDByNickname",
      {
        headers: {
          "x-test-header": "test",
          "x-rpc-client_type": "2",
          "Content-Type": "application/json",
        },
        body: { gids: "2", nickname_list: ["Alice"] },
        signal: controller.signal,
      },
    );
  });

  it("rejects business and malformed responses without exposing cookie values", async () => {
    mocks.post.mockResolvedValueOnce({
      data: { retcode: -1, message: "invalid nickname", data: null },
    });
    await expect(resolveMention("Alice", cookie, 2)).rejects.toThrow("invalid nickname");

    mocks.post.mockResolvedValueOnce({ data: { retcode: 0, message: "ok", data: {} } });
    await expect(resolveMention("Alice", cookie, 2)).rejects.toThrow("nickname_uid_info");
    const requestConfig = mocks.post.mock.calls[0]?.[1];
    expect(JSON.stringify(requestConfig)).not.toContain(cookie.cookie_token);
    expect(JSON.stringify(requestConfig)).not.toContain(cookie.account_id);
  });

  it("rejects invalid input before making an HTTP request", async () => {
    const requests = [
      () => resolveMention("  ", cookie, 2),
      () => resolveMention("Alice", cookie, 0),
      () => resolveMention("Alice", cookie, 1.5),
      () => resolveMention("Alice", { ltoken: "", ltuid: cookie.ltuid }, 2),
      () => resolveMention("Alice", { ltoken: cookie.ltoken }, 2),
    ];

    for (const request of requests) await expect(request()).rejects.toThrow();
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.getRequestHeader).not.toHaveBeenCalled();
  });

  it("propagates transport cancellation", async () => {
    const controller = new AbortController();
    const cancellation = new Error("aborted");
    mocks.post.mockRejectedValueOnce(cancellation);

    await expect(resolveMention("Alice", cookie, 2, controller.signal)).rejects.toBe(cancellation);
    expect(mocks.post.mock.calls[0]?.[1].signal).toBe(controller.signal);
  });
});

describe("uploadImage", () => {
  it("fails closed without making an HTTP request", async () => {
    const file = new File(["image"], "avatar.png", { type: "image/png" });

    await expect(uploadImage(file, cookie, 2)).rejects.toThrow("图片上传暂不可用");
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("rejects an already cancelled upload before the capability error", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      uploadImage(
        new File(["image"], "avatar.png", { type: "image/png" }),
        cookie,
        2,
        controller.signal,
      ),
    ).rejects.toThrow("请求已取消");
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
