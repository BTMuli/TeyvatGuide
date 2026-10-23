/**
 * 自定义头像裁切位置、静态输出与资源释放回归测试。
 * @since Beta v0.13.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ prepareReplyImage: vi.fn() }));

vi.mock("@utils/bbsReplyImage.js", () => ({ prepareReplyImage: mocks.prepareReplyImage }));

import { prepareCustomAvatar } from "../src/utils/bbsAvatarImage.js";

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]);
const drawImage = vi.fn();
const bitmap = { width: 1200, height: 800, close: vi.fn() };
const context = { drawImage, imageSmoothingQuality: "low" };
const canvas = {
  width: 0,
  height: 0,
  getContext: vi.fn((): typeof context | null => context),
  toBlob: vi.fn((callback: BlobCallback) => callback(new Blob([png], { type: "image/png" }))),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prepareReplyImage.mockResolvedValue({ width: 1200, height: 800 });
  bitmap.width = 1200;
  bitmap.height = 800;
  canvas.getContext.mockReturnValue(context);
  canvas.toBlob.mockImplementation((callback: BlobCallback) => {
    callback(new Blob([png], { type: "image/png" }));
  });
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
  vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("prepareCustomAvatar", () => {
  it("crops the center of a landscape image to a square PNG capped at 512px", async () => {
    const file = new File(["original"], "旅行者.webp", { type: "image/webp" });
    const output = await prepareCustomAvatar(file);

    expect(mocks.prepareReplyImage).toHaveBeenCalledWith(file, undefined);
    expect(drawImage).toHaveBeenCalledWith(bitmap, 200, 0, 800, 800, 0, 0, 512, 512);
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(512);
    expect(output.name).toBe("旅行者.png");
    expect(output.type).toBe("image/png");
    expect(new Uint8Array(await output.arrayBuffer())).toEqual(png);
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it("crops the center of a portrait image without enlarging a small avatar", async () => {
    bitmap.width = 200;
    bitmap.height = 400;
    await prepareCustomAvatar(new File(["original"], "avatar.jpg"));

    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 100, 200, 200, 0, 0, 200, 200);
    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(200);
  });

  it("crops a landscape image at a manually selected horizontal position", async () => {
    const file = new File(["original"], "avatar.png", { type: "image/png" });
    await prepareCustomAvatar(file, { crop: { x: 0.25, y: 0.75 } });

    expect(drawImage).toHaveBeenCalledWith(bitmap, 100, 0, 800, 800, 0, 0, 512, 512);
  });

  it("crops a portrait image at a manually selected vertical position", async () => {
    bitmap.width = 200;
    bitmap.height = 400;
    await prepareCustomAvatar(new File(["original"], "avatar.png"), {
      crop: { x: 0.2, y: 0.75 },
    });

    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 150, 200, 200, 0, 0, 200, 200);
  });

  it("clamps manual crop positions to the image bounds", async () => {
    bitmap.width = 200;
    bitmap.height = 400;
    await prepareCustomAvatar(new File(["original"], "avatar.png"), {
      crop: { x: -2, y: 3 },
    });

    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 200, 200, 200, 0, 0, 200, 200);
  });

  it("rejects invalid input through the shared image validation before bitmap decoding", async () => {
    mocks.prepareReplyImage.mockRejectedValueOnce(new Error("图片类型与文件内容不一致"));
    await expect(prepareCustomAvatar(new File(["invalid"], "avatar.png"))).rejects.toThrow(
      "图片类型与文件内容不一致",
    );
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it("releases the decoded bitmap when a canvas context cannot be created", async () => {
    canvas.getContext.mockReturnValueOnce(null);
    await expect(prepareCustomAvatar(new File(["original"], "avatar.png"))).rejects.toThrow(
      "无法处理头像图片",
    );
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it("releases the decoded bitmap when PNG encoding fails", async () => {
    canvas.toBlob.mockImplementationOnce((callback: BlobCallback) => callback(null));
    await expect(prepareCustomAvatar(new File(["original"], "avatar.png"))).rejects.toThrow(
      "无法生成头像图片",
    );
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it("releases the bitmap and discards output when cancelled during encoding", async () => {
    const controller = new AbortController();
    canvas.toBlob.mockImplementationOnce((callback: BlobCallback) => {
      controller.abort();
      callback(new Blob([png], { type: "image/png" }));
    });
    const file = new File(["original"], "avatar.png");
    await expect(prepareCustomAvatar(file, { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(mocks.prepareReplyImage).toHaveBeenCalledWith(file, controller.signal);
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
});
