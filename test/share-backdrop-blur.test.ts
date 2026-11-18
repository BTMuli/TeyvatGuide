/**
 * 分享图毛玻璃回归测试。
 * @since Beta v0.13.2
 */

import { describe, expect, it, vi } from "vitest";

import { drawShareBackdropBlur } from "../src/utils/share/backdropBlur.js";

describe("分享图毛玻璃", () => {
  it("优先使用可用的 Canvas 滤镜", () => {
    const sample = { canvas: <HTMLCanvasElement>{ width: 40, height: 32 }, getImageData: vi.fn() };
    const drawImage = vi.fn();
    const ctx = { filter: "none", drawImage, putImageData: vi.fn() };

    drawShareBackdropBlur(ctx, sample, 4);

    expect(ctx.filter).toBe("blur(4px)");
    expect(drawImage).toHaveBeenCalledWith(sample.canvas, 0, 0);
    expect(sample.getImageData).not.toHaveBeenCalled();
  });

  it("缺少 Canvas 滤镜时软化水平和垂直边缘", () => {
    const width = 40;
    const height = 32;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        data.set([x < 20 ? 0 : 255, y < 16 ? 0 : 255, 0, 255], (y * width + x) * 4);
      }
    }
    const image: ImageData = { width, height, data, colorSpace: "srgb" };
    const sample = {
      canvas: <HTMLCanvasElement>{ width, height },
      getImageData: vi.fn(() => image),
    };
    const putImageData = vi.fn();
    const ctx = { drawImage: vi.fn(), putImageData };

    drawShareBackdropBlur(ctx, sample, 4);

    expect(putImageData).toHaveBeenCalledWith(image, 0, 0);
    const xEdge = (8 * width + 19) * 4;
    const yEdge = (15 * width + 8) * 4;
    expect(data[xEdge]).toBeGreaterThan(0);
    expect(data[xEdge]).toBeLessThan(data[xEdge + 4]);
    expect(data[yEdge + 1]).toBeGreaterThan(0);
    expect(data[yEdge + 1]).toBeLessThan(data[yEdge + width * 4 + 1]);
    expect(data[xEdge + 3]).toBe(255);
    expect(data.slice(-4)).toEqual(Uint8ClampedArray.of(255, 255, 0, 255));
  });

  it("滤镜赋值不生效时模糊透明边缘，避免透明像素串色", () => {
    const width = 12;
    const height = 1;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let x = 0; x < width; x += 1) {
      data.set(x < 6 ? [255, 0, 0, 255] : [0, 0, 255, 0], x * 4);
    }
    const image: ImageData = { width, height, data, colorSpace: "srgb" };
    const sample = {
      canvas: <HTMLCanvasElement>{ width, height },
      getImageData: vi.fn(() => image),
    };
    const putImageData = vi.fn();
    const ctx = { drawImage: vi.fn(), putImageData };
    Object.defineProperty(ctx, "filter", { get: () => "none", set: vi.fn() });

    drawShareBackdropBlur(ctx, sample, 2);

    expect(putImageData).toHaveBeenCalledWith(image, 0, 0);
    const [red, green, blue, alpha] = data.slice(24, 28);
    expect([red, green, blue]).toEqual([255, 0, 0]);
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThan(255);
  });
});
