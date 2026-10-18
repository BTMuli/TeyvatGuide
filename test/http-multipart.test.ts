/**
 * TGHttps multipart 请求回归测试。
 * @since Beta v0.12.6
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  loggerWarn: vi.fn(async () => undefined),
  useProxy: false,
}));

vi.mock("@store/app.js", () => ({ default: () => ({ useProxy: mocks.useProxy }) }));
vi.mock("@tauri-apps/plugin-http", () => ({ fetch: mocks.fetch }));
vi.mock("@utils/TGLogger.js", () => ({ default: { Warn: mocks.loggerWarn } }));

import TGHttps from "../src/utils/TGHttps.js";

/**
 * 创建成功响应替身。
 * @since Beta v0.12.6
 * @returns 可被 TGHttps 消费的成功响应
 */
function createResponse(): Response {
  return new Response(JSON.stringify({ ok: true }), { status: 200, statusText: "OK" });
}

/**
 * 判断字节数组是否包含目标序列。
 * @since Beta v0.12.6
 * @param bytes - 待搜索的字节数组
 * @param needle - 目标字节序列
 * @returns 是否包含目标序列
 */
function containsBytes(bytes: Uint8Array, needle: Array<number>): boolean {
  for (let offset = 0; offset <= bytes.length - needle.length; offset++) {
    let matches = true;
    for (let index = 0; index < needle.length; index++) {
      if (bytes[offset + index] !== needle[index]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.fetch.mockImplementation(() => Promise.resolve(createResponse()));
  mocks.loggerWarn.mockClear();
  mocks.useProxy = false;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TGHttps multipart requests", () => {
  it("passes FormData through and preserves standard multipart encoding", async () => {
    const form = new FormData();
    const bytes = [0, 255, 42, 10];
    form.append("caption", "hello");
    form.append("asset", new File([new Uint8Array(bytes)], "picture.bin", { type: "image/png" }));

    await TGHttps.post("https://example.com/upload", {
      body: form,
      headers: { Accept: "application/json", Cookie: "" },
      maxRedirections: 0,
    });

    const [url, init] = <[string, RequestInit & { maxRedirections?: number }]>(
      mocks.fetch.mock.calls[0]
    );
    expect(url).toBe("https://example.com/upload");
    expect(init.body).toBe(form);
    expect(init.maxRedirections).toBe(0);
    expect(init.headers).toBeInstanceOf(Headers);
    const requestHeaders = <Headers>init.headers;
    expect(requestHeaders.get("content-type")).toBeNull();
    expect(requestHeaders.has("cookie")).toBe(true);
    expect(requestHeaders.get("cookie")).toBe("");

    const request = new Request(url, init);
    const contentType = request.headers.get("content-type");
    expect(contentType).toMatch(/^multipart\/form-data; boundary=.+/);
    const encoded = new Uint8Array(await request.arrayBuffer());
    const encodedText = new TextDecoder().decode(encoded);
    expect(encodedText).toContain('name="caption"');
    expect(encodedText).toContain("hello");
    expect(encodedText).toContain('name="asset"');
    expect(encodedText).toContain('filename="picture.bin"');
    expect(containsBytes(encoded, bytes)).toBe(true);
  });

  it("keeps JSON body serialization unchanged", async () => {
    const body = { message: "hello", count: 2 };

    await TGHttps.post("https://example.com/json", {
      body,
      headers: { "Content-Type": "application/json" },
    });

    const [, init] = <[string, RequestInit]>mocks.fetch.mock.calls[0];
    expect(init.body).toBe(JSON.stringify(body));
  });

  it.each(["Content-Type", "content-type", "CONTENT-TYPE"])(
    "rejects an explicit FormData %s header",
    async (headerName) => {
      const form = new FormData();

      await expect(
        TGHttps.post("https://example.com/upload", {
          body: form,
          headers: { [headerName]: "multipart/form-data" },
        }),
      ).rejects.toThrow("FormData 请求不得显式设置 Content-Type");
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );

  it("does not add maxRedirections when it is not configured", async () => {
    await TGHttps.get("https://example.com/redirect");

    const [, init] = <[string, RequestInit & { maxRedirections?: number }]>(
      mocks.fetch.mock.calls[0]
    );
    expect(init).not.toHaveProperty("maxRedirections");
  });
});

describe("TGHttps transport controls", () => {
  it("keeps direct and system proxy modes distinct", async () => {
    await TGHttps.get("https://example.com/direct");
    const directInit = <
      RequestInit & {
        proxy?: unknown;
      }
    >mocks.fetch.mock.calls[0]?.[1];
    expect(directInit.proxy).toEqual({ all: { url: "http://127.0.0.1:1", noProxy: "*" } });

    mocks.useProxy = true;
    await TGHttps.get("https://example.com/system");
    const systemInit = <RequestInit & { proxy?: unknown }>mocks.fetch.mock.calls[1]?.[1];
    expect(systemInit).not.toHaveProperty("proxy");
  });

  it("propagates user cancellation", async () => {
    mocks.fetch.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise<never>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          });
        }),
    );
    const controller = new AbortController();
    const request = TGHttps.get("https://example.com/cancel", {
      signal: controller.signal,
      timeout: 1000,
    });
    const rejection = expect(request).rejects.toMatchObject({ message: "aborted" });

    controller.abort();

    await rejection;
  });

  it("cancels on timeout and logs the timeout", async () => {
    vi.useFakeTimers();
    mocks.fetch.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise<never>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          });
        }),
    );

    const request = TGHttps.get("https://example.com/timeout", { timeout: 10 });
    const rejection = expect(request).rejects.toMatchObject({ message: "aborted" });
    await vi.advanceTimersByTimeAsync(10);

    await rejection;
    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      "[TGHttps] 请求超时，已取消请求: GET https://example.com/timeout",
    );
  });
});
