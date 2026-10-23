/**
 * 米游社回复资源请求契约回归测试。
 * @since Beta v0.13.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  getRequestHeader: vi.fn(),
  prepareReplyImage: vi.fn(),
}));

vi.mock("@utils/network/TGHttps.js", () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock("@utils/network/getRequestHeader.js", () => ({ getRequestHeader: mocks.getRequestHeader }));
vi.mock("@utils/bbs/replyImage.js", () => ({ prepareReplyImage: mocks.prepareReplyImage }));

import replyAssetReq, {
  replyAssetCapabilities,
  resolveMention,
  uploadCustomAvatarImage,
  uploadImage,
} from "../src/request/replyAssetReq.js";

const cookie = {
  account_id: "account-id-must-not-be-sent",
  cookie_token: "cookie-token-must-not-be-sent",
  ltoken: "ltoken-value",
  ltuid: "100000001",
  mid: "mid-value",
  stoken: "stoken-value",
  stuid: "100000001",
};
const authCookie = { ltoken: cookie.ltoken, ltuid: cookie.ltuid };
const customAuthCookie = { stuid: cookie.stuid, stoken: cookie.stoken, mid: cookie.mid };
const imageBytes = Uint8Array.from([1, 2, 3, 4]);
const preparedImage: TGApp.BBS.ReplyAsset.PreparedImage = {
  bytes: imageBytes.buffer,
  md5: "a".repeat(32),
  ext: "gif",
  contentType: "image/gif",
  size: imageBytes.byteLength,
  width: 320,
  height: 240,
};

/**
 * 测试用账号存储
 * @since Beta v0.13.0
 */
type TestStorage = Pick<Storage, "getItem"> & {
  setStored: (value: string | null) => void;
};

/**
 * 测试用窗口事件接口
 * @since Beta v0.13.0
 */
type TestWindow = {
  localStorage: TestStorage;
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  dispatchEvent: (event: Event) => boolean;
};

/**
 * 回复图片请求测试环境
 * @since Beta v0.13.0
 */
type TestEnvironment = {
  storage: TestStorage;
  browserWindow: TestWindow;
  emitStorage: () => void;
  removedListeners: ReturnType<typeof vi.fn>;
};

/**
 * 创建序列化的本地账号状态
 * @since Beta v0.13.0
 * @param uid - 账号 UID
 * @param ltoken - ltoken
 * @param ltuid - ltuid
 * @returns 序列化的账号状态
 */
function serializedAccount(
  uid: string = cookie.ltuid,
  ltoken: string = cookie.ltoken,
  ltuid: string = cookie.ltuid,
): string {
  return JSON.stringify({
    uid,
    cookie: {
      ltoken,
      ltuid,
      mid: cookie.mid,
      stoken: cookie.stoken,
      stuid: cookie.stuid,
    },
  });
}

/**
 * 将策略对象编码为 OSS 使用的 Base64
 * @since Beta v0.13.0
 * @param value - 策略对象
 * @returns Base64 策略
 */
function encodePolicy(value: Record<string, unknown>): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * 创建有效的测试策略
 * @since Beta v0.13.0
 * @param maxSize - 允许的最大字节数
 * @returns Base64 策略
 */
function validPolicy(maxSize: number = imageBytes.byteLength): string {
  return encodePolicy({
    expiration: new Date(Date.now() + 60_000).toISOString(),
    conditions: [["content-length-range", 0, maxSize]],
  });
}

/**
 * 创建签名接口响应
 * @since Beta v0.13.0
 * @param overrides - OSS 参数覆盖项
 * @returns 签名接口响应
 */
function signedResponse(overrides: Record<string, unknown> = {}): {
  data: Record<string, unknown>;
} {
  const ossOverrides =
    typeof overrides.oss === "object" && overrides.oss !== null && !Array.isArray(overrides.oss)
      ? overrides.oss
      : {};
  const baseOss: TGApp.BBS.ReplyAsset.OssConfig = {
    host: "https://plat-sh-community-prod-upload-ugc.oss-cn-shanghai.aliyuncs.com/",
    name: "avatar.gif",
    dir: "upload/",
    callback: "fake-callback",
    callback_var: { "x:extra": '{"upload_source":"UPLOAD_SOURCE_COMMUNITY"}' },
    extra_form_data: [
      { key: "x-oss-forbid-overwrite", value: "true" },
      { key: "x-oss-forbid-overwrite", value: "false" },
      { key: "x-oss-object-acl", value: "default" },
    ],
    accessid: "fake-accessid",
    policy: validPolicy(),
    signature: "fake-signature",
    x_oss_content_type: "image/gif",
    object_acl: "default",
    content_disposition: "",
  };
  const signedData: TGApp.BBS.ReplyAsset.UploadParamsRes = { type: "oss", oss: baseOss };
  return {
    data: {
      retcode: 0,
      data: {
        ...signedData,
        file_name: "ignored-top-level-file-name",
        max_file_size: 20480,
        expire: 30,
        params: { host: "https://evil.example/", name: "ignored" },
        ...overrides,
        oss: { ...baseOss, ...ossOverrides },
      },
    },
  };
}

/**
 * 创建官方头像签名接口响应
 * @since Beta v0.13.0
 * @returns 官方 UploadPreBean 形状的响应
 */
function customAvatarSignedResponse(): { data: Record<string, unknown> } {
  const legacy = <Record<string, unknown>>signedResponse().data.data;
  const oss = <Record<string, unknown>>legacy.oss;
  const callbackVar = <Record<string, unknown>>oss.callback_var;
  return {
    data: {
      retcode: 0,
      message: "ok",
      data: {
        type: "oss",
        file_name: "avatar.gif",
        params: {
          ...oss,
          callback_var: { extra: callbackVar["x:extra"] },
          extra_form_data: (<Array<Record<string, unknown>>>oss.extra_form_data).filter(
            (entry) => entry.key !== "x-oss-object-acl",
          ),
        },
      },
    },
  };
}

/**
 * 创建 OSS 成功响应
 * @since Beta v0.13.0
 * @param url - 返回 URL
 * @param object - 返回对象键
 * @returns OSS 响应
 */
function ossResponse(
  url: string = "https://upload-bbs.miyoushe.com/upload/avatar.gif",
  object: string = "upload/avatar.gif",
): { data: Record<string, unknown> } {
  const result: TGApp.BBS.ReplyAsset.UploadRes = { object, url };
  const response: TGApp.BBS.ReplyAsset.UploadResp = { retcode: 0, data: result };
  return { data: { ...response, msg: "success", data: { ...result, secret_url: "" } } };
}

/**
 * 创建内存账号存储与窗口事件边界
 * @since Beta v0.13.0
 * @returns 测试环境
 */
function installEnvironment(): TestEnvironment {
  let stored: string | null = serializedAccount();
  const storage: TestStorage = {
    getItem: vi.fn(() => stored),
    setStored(value) {
      stored = value;
    },
  };
  const target = new EventTarget();
  const removedListeners = vi.fn();
  const browserWindow: TestWindow = {
    localStorage: storage,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: (type, listener) => {
      removedListeners(type, listener);
      target.removeEventListener(type, listener);
    },
    dispatchEvent: target.dispatchEvent.bind(target),
  };
  vi.stubGlobal("window", browserWindow);
  return {
    storage,
    browserWindow,
    emitStorage: () => browserWindow.dispatchEvent(new Event("storage")),
    removedListeners,
  };
}

let environment: TestEnvironment;

beforeEach(() => {
  mocks.get.mockReset();
  mocks.post.mockReset();
  mocks.getRequestHeader.mockReset();
  mocks.prepareReplyImage.mockReset();
  mocks.getRequestHeader.mockReturnValue({ "x-test-header": "test" });
  mocks.prepareReplyImage.mockResolvedValue(preparedImage);
  environment = installEnvironment();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("replyAssetReq capabilities", () => {
  it("exposes mention resolution and image upload", () => {
    expect(replyAssetCapabilities).toEqual({ imageUpload: true, mention: true });
    expect(replyAssetReq).toEqual({ resolveMention, uploadImage });
  });
});

describe("resolveMention", () => {
  it("sends the official lookup body and minimal authenticated cookie", async () => {
    const response: TGApp.BBS.ReplyAsset.MentionResp = {
      retcode: 0,
      message: "ok",
      data: { nickname_uid_info: { Alice: 123456789 } },
    };
    mocks.post.mockResolvedValueOnce({ data: response });
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
      () => resolveMention("Alice", <TGApp.App.Account.LoginCookie>{ ltoken: cookie.ltoken }, 2),
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

describe("uploadCustomAvatarImage", () => {
  it("uses the official USER_AVATAR upload source key", async () => {
    mocks.get.mockResolvedValueOnce(customAvatarSignedResponse());
    mocks.post.mockResolvedValueOnce(ossResponse());
    const file = new File([imageBytes], "selected-name.gif", { type: "image/gif" });
    const expectedQuery = {
      md5: preparedImage.md5,
      ext: "gif",
      support_content_type: 1,
      upload_source: "8",
    };

    await expect(uploadCustomAvatarImage(file, cookie)).resolves.toEqual({
      url: "https://upload-bbs.miyoushe.com/upload/avatar.gif",
      width: 320,
      height: 240,
    });
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      customAuthCookie,
      "GET",
      expectedQuery,
      "K2",
      true,
    );
    expect(mocks.get).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/apihub/sapi/getUploadParams",
      {
        headers: { "x-test-header": "test", "x-rpc-client_type": "2" },
        query: expectedQuery,
        maxRedirections: 0,
        signal: expect.any(AbortSignal),
      },
    );
    expect(mocks.post.mock.calls[0]?.[1]).toMatchObject({
      headers: { Cookie: "" },
      maxRedirections: 0,
      signal: expect.any(AbortSignal),
    });
  });

  it("keeps generic upload errors free of reply-specific wording", async () => {
    mocks.get.mockRejectedValueOnce({ status: 503, message: "secret response" });
    const file = new File([imageBytes], "avatar.gif", { type: "image/gif" });

    await expect(uploadCustomAvatarImage(file, cookie)).rejects.toMatchObject({
      message: "米游社图片上传参数获取失败",
      cause: { status: 503 },
    });
  });

  it.each([
    { field: "host", value: "https://example.com/" },
    { field: "dir", value: "upload/../private/" },
    { field: "x_oss_content_type", value: "image/png" },
  ])("rejects invalid avatar upload parameters before OSS: $field", async ({ field, value }) => {
    const response = customAvatarSignedResponse();
    const data = <Record<string, unknown>>response.data.data;
    const params = <Record<string, unknown>>data.params;
    params[field] = value;
    mocks.get.mockResolvedValueOnce(response);

    await expect(
      uploadCustomAvatarImage(new File([imageBytes], "avatar.gif", { type: "image/gif" }), cookie),
    ).rejects.toThrow();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("aborts when native avatar credentials change during preparation", async () => {
    let resolvePrepare: (value: TGApp.BBS.ReplyAsset.PreparedImage) => void = () => undefined;
    mocks.prepareReplyImage.mockReturnValueOnce(
      new Promise<TGApp.BBS.ReplyAsset.PreparedImage>((resolve) => {
        resolvePrepare = resolve;
      }),
    );
    const pending = uploadCustomAvatarImage(
      new File([imageBytes], "avatar.gif", { type: "image/gif" }),
      cookie,
    );
    environment.storage.setStored(
      JSON.stringify({
        uid: cookie.ltuid,
        cookie: {
          ltoken: cookie.ltoken,
          ltuid: cookie.ltuid,
          mid: "different-mid",
          stoken: cookie.stoken,
          stuid: cookie.stuid,
        },
      }),
    );
    environment.emitStorage();
    resolvePrepare(preparedImage);

    await expect(pending).rejects.toThrow("当前账号已切换");
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
  });
});

describe("uploadImage", () => {
  it("sends the signed JSON body and ordered OSS form with original bytes", async () => {
    mocks.post.mockResolvedValueOnce(signedResponse()).mockResolvedValueOnce(ossResponse());
    const file = new File([imageBytes], "selected-name.gif", { type: "image/gif" });
    const controller = new AbortController();
    const expectedBody = {
      md5: preparedImage.md5,
      ext: "gif",
      biz: "community",
      support_content_type: true,
      support_extra_form_data: true,
      extra: { upload_source: "UPLOAD_SOURCE_COMMUNITY" },
    };
    const expectedBodyJson = JSON.stringify(expectedBody);

    await expect(uploadImage(file, cookie, 2, controller.signal)).resolves.toEqual({
      url: "https://upload-bbs.miyoushe.com/upload/avatar.gif",
      width: 320,
      height: 240,
    });
    expect(mocks.prepareReplyImage).toHaveBeenCalledWith(file, expect.any(AbortSignal));
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      authCookie,
      "POST",
      expectedBodyJson,
      "K2",
      true,
    );
    const signConfig = mocks.post.mock.calls[0]?.[1];
    expect(signConfig).toMatchObject({
      body: expectedBodyJson,
      maxRedirections: 0,
      signal: expect.any(AbortSignal),
    });
    const ossConfig = mocks.post.mock.calls[1]?.[1];
    expect(mocks.post.mock.calls[1]?.[0]).toBe(
      "https://plat-sh-community-prod-upload-ugc.oss-cn-shanghai.aliyuncs.com/",
    );
    expect(ossConfig).toMatchObject({
      headers: { Cookie: "" },
      maxRedirections: 0,
      signal: expect.any(AbortSignal),
    });
    expect(JSON.stringify(ossConfig.headers)).not.toContain(cookie.ltoken);
    expect(JSON.stringify(ossConfig.headers)).not.toContain(cookie.ltuid);

    const entries = Array.from((<FormData>ossConfig.body).entries());
    expect(entries.map(([key]) => key)).toEqual([
      "name",
      "key",
      "callback",
      "success_action_status",
      "x:extra",
      "x-oss-content-type",
      "x-oss-forbid-overwrite",
      "x-oss-forbid-overwrite",
      "x-oss-object-acl",
      "OSSAccessKeyId",
      "policy",
      "signature",
      "x-oss-object-acl",
      "file",
    ]);
    expect(entries[4]?.[1]).toBe('{"upload_source":"UPLOAD_SOURCE_COMMUNITY"}');
    expect(entries[6]?.[1]).toBe("true");
    expect(entries[7]?.[1]).toBe("false");
    expect(entries[8]?.[1]).toBe("default");
    const uploadedFile = entries[13]?.[1];
    expect(uploadedFile).toBeInstanceOf(Blob);
    expect((<File>uploadedFile).name).toBe(file.name);
    expect((<Blob>uploadedFile).type).toBe("image/gif");
    expect(await (<Blob>uploadedFile).arrayBuffer()).toEqual(imageBytes.buffer);
  });

  it("rejects malformed hosts, unknown storage types, and unsafe response URLs", async () => {
    const file = new File([imageBytes], "avatar.gif", { type: "image/gif" });
    const badHosts = [
      "http://plat-sh-community-prod-upload-ugc.oss-cn-shanghai.aliyuncs.com/",
      "https://plat-sh-community-prod-upload-ugc.oss-cn-shanghai.aliyuncs.com.evil/",
      "https://plat-sh-community-prod-upload-ugc.oss-cn-shanghai.aliyuncs.com:443/",
      "https://user@plat-sh-community-prod-upload-ugc.oss-cn-shanghai.aliyuncs.com/",
      "https://plat-sh-community-prod-upload-ugc.oss-cn-shanghai.aliyuncs.com/upload/",
      "https://plat-sh-community-prod-upload-ugc.oss-cn-shanghai.aliyuncs.com/?x=1",
    ];
    for (const host of badHosts) {
      mocks.post.mockReset();
      mocks.post.mockResolvedValueOnce(signedResponse({ oss: { host } }));
      await expect(uploadImage(file, cookie, 2)).rejects.toThrow("参数无效");
      expect(mocks.post).toHaveBeenCalledOnce();
    }

    mocks.post.mockReset();
    mocks.post.mockResolvedValueOnce({
      data: { retcode: 0, data: { type: "s3", oss: {} } },
    });
    await expect(uploadImage(file, cookie, 2)).rejects.toThrow("参数无效");
    expect(mocks.post).toHaveBeenCalledOnce();

    const badUrls = [
      "http://upload-bbs.miyoushe.com/upload/avatar.gif",
      "https://upload-bbs.miyoushe.com.evil/upload/avatar.gif",
      "https://upload-bbs.miyoushe.com:443/upload/avatar.gif",
      "https://user@upload-bbs.miyoushe.com/upload/avatar.gif",
      "https://upload-bbs.miyoushe.com/upload/avatar.gif?x=1",
      "https://upload-bbs.miyoushe.com/upload/avatar.gif#hash",
      "https://upload-bbs.miyoushe.com/other/avatar.gif",
    ];
    for (const url of badUrls) {
      mocks.post.mockReset();
      mocks.post.mockResolvedValueOnce(signedResponse()).mockResolvedValueOnce(ossResponse(url));
      await expect(uploadImage(file, cookie, 2)).rejects.toThrow("图片上传失败");
      expect(mocks.post).toHaveBeenCalledTimes(2);
    }

    mocks.post.mockReset();
    mocks.post
      .mockResolvedValueOnce(signedResponse())
      .mockResolvedValueOnce(ossResponse(undefined, "other/avatar.gif"));
    await expect(uploadImage(file, cookie, 2)).rejects.toThrow("图片上传失败");
  });

  it("rejects expired or over-size policies and nonzero response codes", async () => {
    const file = new File([imageBytes], "avatar.gif", { type: "image/gif" });
    mocks.post.mockResolvedValueOnce(
      signedResponse({
        oss: {
          policy: encodePolicy({
            expiration: new Date(Date.now() - 1_000).toISOString(),
            conditions: [["content-length-range", 0, imageBytes.byteLength]],
          }),
        },
      }),
    );
    await expect(uploadImage(file, cookie, 2)).rejects.toThrow("策略已过期");
    expect(mocks.post).toHaveBeenCalledOnce();

    mocks.post.mockReset();
    mocks.post.mockResolvedValueOnce(signedResponse({ oss: { policy: validPolicy(2) } }));
    await expect(uploadImage(file, cookie, 2)).rejects.toThrow("超出米游社上传策略范围");
    expect(mocks.post).toHaveBeenCalledOnce();

    mocks.post.mockReset();
    mocks.post.mockResolvedValueOnce({ data: { retcode: -1, message: "secret response" } });
    await expect(uploadImage(file, cookie, 2)).rejects.toThrow("参数获取失败");
    expect(mocks.post).toHaveBeenCalledOnce();
  });

  it.each([
    { name: "missing callback", oss: { callback: undefined } },
    { name: "missing access key", oss: { accessid: undefined } },
    { name: "missing policy", oss: { policy: undefined } },
    { name: "missing signature", oss: { signature: undefined } },
    { name: "MIME mismatch", oss: { x_oss_content_type: "image/png" } },
    { name: "callback field collision", oss: { callback_var: { file: "bad" } } },
    { name: "extra field collision", oss: { extra_form_data: [{ key: "file", value: "bad" }] } },
    {
      name: "ACL collision",
      oss: { extra_form_data: [{ key: "x-oss-object-acl", value: "public" }] },
    },
    { name: "invalid policy encoding", oss: { policy: "not-base64" } },
  ])("rejects $name without sending OSS data", async ({ oss }) => {
    const file = new File([imageBytes], "avatar.gif", { type: "image/gif" });
    mocks.post.mockResolvedValueOnce(signedResponse({ oss }));

    await expect(uploadImage(file, cookie, 2)).rejects.toThrow();
    expect(mocks.post).toHaveBeenCalledOnce();
  });

  it("keeps only HTTP status from a failed request without leaking response details", async () => {
    const file = new File([imageBytes], "avatar.gif", { type: "image/gif" });
    mocks.post.mockRejectedValueOnce({
      message: "raw signature secret",
      data: "raw response secret",
      status: 503,
    });
    const pending = uploadImage(file, cookie, 2);
    await expect(pending).rejects.toMatchObject({
      message: "米游社图片上传参数获取失败",
      cause: { status: 503 },
    });
    await expect(pending).rejects.not.toThrow("raw signature secret");
    expect(mocks.post).toHaveBeenCalledOnce();
  });

  it("propagates cancellation and cleans up the storage listener", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      uploadImage(
        new File([imageBytes], "avatar.gif", { type: "image/gif" }),
        cookie,
        2,
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(mocks.prepareReplyImage).not.toHaveBeenCalled();

    mocks.post.mockResolvedValueOnce(signedResponse()).mockResolvedValueOnce(ossResponse());
    await uploadImage(new File([imageBytes], "avatar.gif", { type: "image/gif" }), cookie, 2);
    expect(environment.removedListeners).toHaveBeenCalledWith("storage", expect.any(Function));
  });

  it.each(["ticket", "OSS"])("stops after cancellation during %s", async (stage) => {
    const controller = new AbortController();
    if (stage === "OSS") mocks.post.mockResolvedValueOnce(signedResponse());
    mocks.post.mockImplementationOnce(async () => {
      controller.abort();
      return stage === "OSS" ? ossResponse() : signedResponse();
    });

    await expect(
      uploadImage(
        new File([imageBytes], "avatar.gif", { type: "image/gif" }),
        cookie,
        2,
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(mocks.post).toHaveBeenCalledTimes(stage === "OSS" ? 2 : 1);
  });

  it("blocks a switch after asynchronous preparation and aborts the internal signal", async () => {
    let resolvePrepare: (value: TGApp.BBS.ReplyAsset.PreparedImage) => void = () => undefined;
    mocks.prepareReplyImage.mockReturnValueOnce(
      new Promise<TGApp.BBS.ReplyAsset.PreparedImage>((resolve) => {
        resolvePrepare = resolve;
      }),
    );
    const pending = uploadImage(
      new File([imageBytes], "avatar.gif", { type: "image/gif" }),
      cookie,
      2,
    );
    environment.storage.setStored(serializedAccount("100000002", "other-token", "100000002"));
    environment.emitStorage();
    resolvePrepare(preparedImage);

    await expect(pending).rejects.toThrow("当前账号已切换");
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.prepareReplyImage.mock.calls[0]?.[1].aborted).toBe(true);
  });

  it("checks the account after signing and after OSS response", async () => {
    mocks.post.mockImplementationOnce(async () => {
      environment.storage.setStored(serializedAccount("100000002", "other-token", "100000002"));
      return signedResponse();
    });
    await expect(
      uploadImage(new File([imageBytes], "avatar.gif", { type: "image/gif" }), cookie, 2),
    ).rejects.toThrow("当前账号已切换");
    expect(mocks.post).toHaveBeenCalledOnce();

    environment.storage.setStored(serializedAccount());
    mocks.post.mockReset();
    mocks.post.mockResolvedValueOnce(signedResponse()).mockImplementationOnce(async () => {
      environment.storage.setStored(serializedAccount("100000002", "other-token", "100000002"));
      return ossResponse();
    });
    await expect(
      uploadImage(new File([imageBytes], "avatar.gif", { type: "image/gif" }), cookie, 2),
    ).rejects.toThrow("当前账号已切换");
    expect(mocks.post).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid input before preparing or sending", async () => {
    const file = new File([imageBytes], "avatar.gif", { type: "image/gif" });
    const controller = new AbortController();
    const requests = [
      () => uploadImage(file, { ltoken: "", ltuid: cookie.ltuid }, 2),
      () => uploadImage(file, cookie, 0),
      () => uploadImage(file, cookie, 1.5),
      () => uploadImage(new File([imageBytes], "", { type: "image/gif" }), cookie, 2),
    ];
    controller.abort();
    requests.push(() => uploadImage(file, cookie, 2, controller.signal));

    for (const request of requests) await expect(request()).rejects.toThrow();
    expect(mocks.prepareReplyImage).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
