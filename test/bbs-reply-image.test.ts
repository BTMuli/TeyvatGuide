/**
 * 回复图片本地校验与资源释放回归测试
 * @since Beta v0.13.0
 */
import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prepareReplyImage } from "../src/utils/bbsReplyImage.js";

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const images: Array<FakeImage> = [];

/**
 * 模拟浏览器图片解码边界
 * @since Beta v0.13.0
 */
class FakeImage {
  naturalWidth = 320;
  naturalHeight = 240;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";

  constructor() {
    images.push(this);
  }
}

beforeEach(() => {
  images.length = 0;
  vi.stubGlobal("Image", FakeImage);
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fixture-image");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/**
 * 等待异步文件读取进入图片解码阶段
 * @since Beta v0.13.0
 * @returns 当前图片边界对象
 */
async function decodingImage(): Promise<FakeImage> {
  await vi.waitFor(() => expect(images).toHaveLength(1));
  return images[0];
}

describe("prepareReplyImage", () => {
  it("hashes original bytes and returns decoded dimensions without changing the file", async () => {
    const file = new File([png], "fixture.png", { type: "image/png" });
    const pending = prepareReplyImage(file);
    const image = await decodingImage();
    image.onload?.();

    const prepared = await pending;
    expect(prepared).toEqual({
      bytes: await file.arrayBuffer(),
      md5: createHash("md5").update(png).digest("hex"),
      ext: "png",
      contentType: "image/png",
      size: png.length,
      width: 320,
      height: 240,
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fixture-image");
    expect(image.onload).toBeNull();
    expect(image.onerror).toBeNull();
    expect(image.src).toBe("");
  });

  it.each([
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], type: "image/gif", ext: "gif" },
    { bytes: [0xff, 0xd8, 0xff], type: "image/jpeg", ext: "jpg" },
    {
      bytes: [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
      type: "image/webp",
      ext: "webp",
    },
  ])("detects $type from file bytes", async ({ bytes, type, ext }) => {
    const pending = prepareReplyImage(new File([Uint8Array.from(bytes)], "fixture", { type }));
    const image = await decodingImage();
    image.onload?.();
    await expect(pending).resolves.toMatchObject({ contentType: type, ext });
  });

  it("rejects empty, unsupported and mismatched files before creating an image URL", async () => {
    await expect(prepareReplyImage(new File([], "empty.png"))).rejects.toThrow("非空");
    await expect(prepareReplyImage(new File(["<svg/>"], "fixture.svg"))).rejects.toThrow("PNG");
    await expect(
      prepareReplyImage(new File([png], "fixture.gif", { type: "image/gif" })),
    ).rejects.toThrow("不一致");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("releases the object URL on decoding failure", async () => {
    const pending = prepareReplyImage(new File([png], "fixture.png"));
    const rejection = expect(pending).rejects.toThrow("未损坏");
    const image = await decodingImage();
    image.onerror?.();
    await rejection;
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
  });

  it("rejects oversized files before reading bytes", async () => {
    const file = new File([png], "fixture.png");
    vi.spyOn(file, "size", "get").mockReturnValue(20 * 1024 * 1024 + 1);
    const read = vi.spyOn(file, "arrayBuffer");
    await expect(prepareReplyImage(file)).rejects.toThrow("20 MiB");
    expect(read).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("rejects invalid decoded dimensions and releases the object URL", async () => {
    const pending = prepareReplyImage(new File([png], "fixture.png"));
    const rejection = expect(pending).rejects.toThrow("图片尺寸");
    const image = await decodingImage();
    image.naturalWidth = 0;
    image.onload?.();
    await rejection;
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
  });

  it("cancels local decoding and removes event handlers", async () => {
    const controller = new AbortController();
    const pending = prepareReplyImage(new File([png], "fixture.png"), controller.signal);
    const rejection = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    const image = await decodingImage();
    controller.abort();
    await rejection;
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
    expect(image.onload).toBeNull();
    expect(image.onerror).toBeNull();
  });

  it("does not read a file when already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const file = new File([png], "fixture.png");
    const read = vi.spyOn(file, "arrayBuffer");
    await expect(prepareReplyImage(file, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(read).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("releases local image resources when decoding times out", async () => {
    vi.useFakeTimers();
    const pending = prepareReplyImage(new File([png], "fixture.png"));
    const rejection = expect(pending).rejects.toThrow("读取图片超时");
    const image = await decodingImage();
    await vi.advanceTimersByTimeAsync(15000);
    await rejection;
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
    expect(image.onload).toBeNull();
    expect(image.onerror).toBeNull();
  });
});
