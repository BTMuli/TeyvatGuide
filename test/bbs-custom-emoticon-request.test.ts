/**
 * 米游社收藏表情请求契约回归测试
 * @since Beta v0.13.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  getRequestHeader: vi.fn(),
}));

vi.mock("@utils/network/TGHttps.js", () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock("@utils/network/getRequestHeader.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/network/getRequestHeader.js")>()),
  getRequestHeader: mocks.getRequestHeader,
}));

import customEmoticonReq from "../src/request/customEmoticonReq.js";

const cookie = {
  account_id: "account-id",
  cookie_token: "cookie-token",
  ltoken: "ltoken-value",
  ltuid: "100000001",
  mid: "mid-value",
  stoken: "stoken-value",
  stuid: "100000001",
};
const authCookie = { mid: cookie.mid, stoken: cookie.stoken, stuid: cookie.stuid };
const responseData: TGApp.BBS.CustomEmoticon.ListRes = {
  list: [
    {
      id: "one",
      name: "",
      icon: "https://example.com/emoticons/one.webp",
      sort_order: 0,
      static_icon: "",
      updated_at: "1676082106125",
      img_ext: { width: 64, height: 48, file_size: 1234 },
      status: "STATUS_ONLINE",
      type: "EmoticonTypeCustom",
    },
  ],
};

beforeEach(() => {
  mocks.get.mockReset();
  mocks.post.mockReset();
  mocks.getRequestHeader.mockReset();
  mocks.getRequestHeader.mockReturnValue({ "x-test-header": "test" });
  mocks.get.mockResolvedValue({ data: { retcode: 0, message: "ok", data: responseData } });
  mocks.post.mockResolvedValue({ data: { retcode: 0, message: "ok", data: null } });
});

describe("customEmoticonReq.list", () => {
  it("requests the official endpoint with the minimal signed mobile headers and signal", async () => {
    const controller = new AbortController();

    await expect(customEmoticonReq.list(cookie, controller.signal)).resolves.toEqual([
      {
        id: "one",
        url: "https://example.com/emoticons/one.webp",
        size: { width: 64, height: 48, file_size: 1234 },
        is_available: true,
      },
    ]);
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(authCookie, "GET", {}, "K2", true);
    expect(mocks.getRequestHeader.mock.calls[0]?.[0]).not.toHaveProperty("ltoken");
    expect(mocks.getRequestHeader.mock.calls[0]?.[0]).not.toHaveProperty("ltuid");
    expect(mocks.getRequestHeader.mock.calls[0]?.[0]).not.toHaveProperty("account_id");
    expect(mocks.getRequestHeader.mock.calls[0]?.[0]).not.toHaveProperty("cookie_token");
    expect(mocks.get).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/misc/api/customEmoticonList",
      {
        headers: { "x-test-header": "test", "x-rpc-client_type": "2" },
        signal: controller.signal,
      },
    );
    expect(mocks.get.mock.calls[0]?.[1]).not.toHaveProperty("query");
    expect(mocks.get.mock.calls[0]?.[1]).not.toHaveProperty("body");
  });

  it("rejects missing native credentials before making a request", async () => {
    for (const invalidCookie of [
      { ...cookie, stoken: "" },
      { ...cookie, mid: "" },
      { ...cookie, stuid: "" },
      { ...cookie, ltuid: "" },
    ]) {
      await expect(customEmoticonReq.list(invalidCookie)).rejects.toThrow("登录凭据不完整");
    }
    expect(mocks.getRequestHeader).not.toHaveBeenCalled();
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("rejects credentials whose stuid does not match ltuid", async () => {
    await expect(customEmoticonReq.list({ ...cookie, stuid: "100000002" })).rejects.toThrow(
      "UID 不一致",
    );
    expect(mocks.getRequestHeader).not.toHaveBeenCalled();
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("maps the login failure to a Chinese refresh prompt", async () => {
    mocks.get.mockResolvedValueOnce({
      data: { retcode: -100, message: "not login", data: null },
    });

    await expect(customEmoticonReq.list(cookie)).rejects.toThrow(
      "登录状态无效，请重新登录米游社账号",
    );
  });
});

describe("customEmoticonReq.add", () => {
  const image = {
    url: "https://example.com/emoticons/new.gif",
    width: 500,
    height: 491,
    fileSize: 81194,
  };
  const body = {
    img_url: image.url,
    img_ext: { width: image.width, height: image.height, file_size: image.fileSize },
  };

  it("posts the signed image payload to the official endpoint", async () => {
    const controller = new AbortController();

    await expect(customEmoticonReq.add(cookie, image, controller.signal)).resolves.toBeUndefined();
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      authCookie,
      "POST",
      JSON.stringify(body),
      "K2",
      true,
    );
    expect(mocks.post).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/misc/api/addCustomEmoticon",
      {
        headers: {
          "Content-Type": "application/json",
          "x-rpc-client_type": "2",
          "x-test-header": "test",
        },
        body,
        signal: controller.signal,
      },
    );
  });

  it("rejects missing native credentials before making a request", async () => {
    await expect(customEmoticonReq.add({ ...cookie, mid: "" }, image)).rejects.toThrow(
      "登录凭据不完整",
    );
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("maps a login failure and preserves the server message", async () => {
    mocks.post.mockResolvedValueOnce({
      data: { retcode: -100, message: "not login", data: null },
    });
    await expect(customEmoticonReq.add(cookie, image)).rejects.toThrow(
      "添加收藏表情失败：登录状态无效，请重新登录米游社账号",
    );

    mocks.post.mockResolvedValueOnce({
      data: { retcode: 1034, message: "需要验证", data: null },
    });
    await expect(customEmoticonReq.add(cookie, image)).rejects.toThrow(
      "添加收藏表情失败：需要验证",
    );
  });
});

describe("customEmoticonReq.remove", () => {
  it("posts the trimmed ids array to the official endpoint", async () => {
    const controller = new AbortController();
    const body = { ids: ["one"] };

    await expect(
      customEmoticonReq.remove(cookie, " one ", controller.signal),
    ).resolves.toBeUndefined();
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      authCookie,
      "POST",
      JSON.stringify(body),
      "K2",
      true,
    );
    expect(mocks.post).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/misc/api/removeCustomEmoticon",
      {
        headers: {
          "Content-Type": "application/json",
          "x-rpc-client_type": "2",
          "x-test-header": "test",
        },
        body,
        signal: controller.signal,
      },
    );
  });

  it("rejects an empty id before making a request", async () => {
    await expect(customEmoticonReq.remove(cookie, " ")).rejects.toThrow("收藏表情 ID 无效");
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("maps a login failure for deletion", async () => {
    mocks.post.mockResolvedValueOnce({
      data: { retcode: -100, message: "not login", data: null },
    });
    await expect(customEmoticonReq.remove(cookie, "one")).rejects.toThrow(
      "删除收藏表情失败：登录状态无效，请重新登录米游社账号",
    );
  });
});
