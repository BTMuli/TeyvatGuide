/**
 * 分享图保存与剪贴板回归测试。
 * @since Beta v0.13.2
 */

import type { Options } from "html2canvas";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  platform: vi.fn(),
  save: vi.fn(),
  writeImage: vi.fn<(image: ArrayBuffer) => Promise<void>>(),
  writeFile: vi.fn(async () => undefined),
  info: vi.fn(async () => undefined),
  error: vi.fn(async () => undefined),
  cancel: vi.fn(),
  success: vi.fn(),
  size: vi.fn((bytes: number) => `${bytes} B`),
}));

vi.mock("@comp/func/snackbar.js", () => ({
  default: { cancel: mocks.cancel, success: mocks.success },
}));
vi.mock("@tauri-apps/api", () => ({
  path: {
    downloadDir: vi.fn(async () => "C:/Downloads"),
    sep: vi.fn(() => "/"),
  },
}));
vi.mock("@tauri-apps/api/path", () => ({ sep: () => "/" }));
vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({ writeImage: mocks.writeImage }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: mocks.save }));
vi.mock("@tauri-apps/plugin-fs", () => ({ writeFile: mocks.writeFile }));
vi.mock("@tauri-apps/plugin-os", () => ({ platform: mocks.platform }));
vi.mock("html2canvas", () => ({ default: mocks.capture }));
vi.mock("modern-screenshot", () => ({ domToBlob: vi.fn() }));
vi.mock("modern-screenshot/worker?url&no-inline", () => ({ default: "worker" }));
vi.mock("pinia", () => ({ storeToRefs: () => ({ shareDefaultFile: { value: 10 } }) }));
vi.mock("@mdi/font/fonts/materialdesignicons-webfont.woff2?url", () => ({ default: "mdi" }));
vi.mock("@store/app.js", () => ({ default: vi.fn() }));
vi.mock("@/assets/fonts/HYWenHei-55W.ttf?url", () => ({ default: "genshin-light" }));
vi.mock("@/assets/fonts/JetBrainsMono-Bold.ttf?url", () => ({ default: "jetbrains-bold" }));
vi.mock("@/assets/fonts/JetBrainsMono-Regular.ttf?url", () => ({ default: "jetbrains" }));
vi.mock("@/assets/fonts/zh-cn.ttf?url", () => ({ default: "genshin" }));
vi.mock("../src/utils/share/backdropBlur.js", () => ({}));
vi.mock("../src/utils/share/backdropWorker?worker", () => ({ default: "worker" }));
vi.mock("../src/utils/network/TGHttps.js", () => ({ default: {} }));
vi.mock("../src/utils/system/TGLogger.js", () => ({
  default: { Info: mocks.info, Error: mocks.error },
}));
vi.mock("../src/utils/display/fmtUtil.js", () => ({ default: { size: mocks.size } }));

import { copyToClipboard, generateShareImg, saveBufferFile } from "../src/utils/share/TGShare.js";

beforeEach(() => {
  mocks.capture.mockReset();
  mocks.platform.mockReturnValue("windows");
  mocks.save.mockReset();
  mocks.writeImage.mockReset();
  mocks.writeFile.mockClear();
  mocks.info.mockClear();
  mocks.error.mockClear();
  mocks.cancel.mockClear();
  mocks.success.mockClear();
  mocks.size.mockClear();
  mocks.save.mockResolvedValue("C:/Pictures/chosen.png");
});

afterEach(() => vi.unstubAllGlobals());

describe("分享图文件名", () => {
  it("为没有后缀的默认 PNG 文件名追加后缀", async () => {
    await saveBufferFile(new Uint8Array([1, 2]).buffer, "share");

    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: "C:/Downloads/share.png" }),
    );
  });

  it("保留已有的 PNG 后缀，避免重复扩展名", async () => {
    await saveBufferFile(new Uint8Array([1, 2]).buffer, "share.png");

    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: "C:/Downloads/share.png" }),
    );
  });

  it("大小写不敏感地识别目标后缀并保留多点文件名", async () => {
    await saveBufferFile(new Uint8Array([1]).buffer, "clip.v2.PNG");

    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: "C:/Downloads/clip.v2.PNG" }),
    );
  });

  it.each([
    ["clip.v2", "C:/Downloads/clip.v2.png"],
    ["share.jpg", "C:/Downloads/share.jpg.png"],
  ])("为多点或其他扩展名的文件名追加目标后缀: %s", async (filename, defaultPath) => {
    await saveBufferFile(new Uint8Array([2]).buffer, filename);

    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ defaultPath }));
  });

  it.each([
    ["image", "jpg", "image.jpg"],
    ["image.jpg", "jpg"],
    ["clip", "webm", "clip.webm"],
    ["clip.webm", "webm"],
  ])("处理显式 %s 格式的文件名", async (filename, format, expectedFilename = filename) => {
    await saveBufferFile(new Uint8Array([3]).buffer, filename, format);

    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: `C:/Downloads/${expectedFilename}` }),
    );
  });

  it("取消对话框时不写入文件", async () => {
    mocks.save.mockResolvedValueOnce(null);

    await saveBufferFile(new Uint8Array([4]).buffer, "cancelled");

    expect(mocks.writeFile).not.toHaveBeenCalled();
    expect(mocks.cancel).toHaveBeenCalledWith("未选择保存路径");
  });

  it("按对话框选择的路径写入原始字节", async () => {
    const bytes = new Uint8Array([9, 8, 7]);
    mocks.save.mockResolvedValueOnce("C:/Pictures/result.png");

    await saveBufferFile(bytes.buffer, "selected");

    expect(mocks.writeFile).toHaveBeenCalledWith("C:/Pictures/result.png", bytes);
  });
});

describe("分享图画布尺寸与 macOS 剪贴板", () => {
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR1sAAAAASUVORK5CYII=";
  const pngBytes = Uint8Array.fromBase64(png);
  const element = <HTMLElement>{ clientWidth: 1, clientHeight: 1, style: {} };

  beforeEach(() => {
    mocks.platform.mockReturnValue("macos");
    mocks.capture.mockResolvedValue({ toDataURL: () => `data:image/png;base64,${png}` });
    vi.stubGlobal("document", { createElement: vi.fn(() => ({})) });
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => null) });
  });

  it.each([
    {
      label: "忽略底部操作栏",
      scrollable: false,
      cloneHeight: 366.25,
      scrollHeight: 366,
      height: 397,
    },
    { label: "包含滚动区内容", scrollable: true, cloneHeight: 366, scrollHeight: 540, height: 570 },
  ])(
    "按克隆后的内容计算画布高度：$label",
    async ({ scrollable, cloneHeight, scrollHeight, height }) => {
      const panel = <HTMLElement>{
        clientWidth: 718,
        clientHeight: 426,
        scrollHeight: 601,
        style: { maxHeight: "400px" },
      };
      const clonedPanel = <HTMLElement>{
        getBoundingClientRect: () => ({ height: cloneHeight }),
        scrollHeight,
      };
      mocks.capture.mockImplementationOnce(
        async (_element: HTMLElement, options: Partial<Options>) => {
          options.onclone?.(document, clonedPanel);
          return { toDataURL: () => `data:image/png;base64,${png}` };
        },
      );
      mocks.writeImage.mockResolvedValueOnce();

      await generateShareImg("share", panel, 1.5, scrollable);

      expect(mocks.capture).toHaveBeenCalledWith(
        panel,
        expect.objectContaining({ width: 748, height, y: -15, scale: 1.5 }),
      );
      expect(mocks.capture.mock.calls[0][1]).not.toHaveProperty("canvas");
      expect(panel.style.maxHeight).toBe("400px");
      expect(mocks.writeImage).toHaveBeenCalledExactlyOnceWith(pngBytes.buffer);
    },
  );

  it("等待原生写入完成后才报告复制成功", async () => {
    const write = Promise.withResolvers<void>();
    mocks.writeImage.mockReturnValueOnce(write.promise);

    const share = generateShareImg("share", element);
    await vi.waitFor(() =>
      expect(mocks.writeImage).toHaveBeenCalledExactlyOnceWith(pngBytes.buffer),
    );
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();

    write.resolve();
    await share;

    expect(mocks.success).toHaveBeenCalledWith(expect.stringContaining("复制到剪贴板"));
  });

  it("原生写入失败时将原始 PNG 保存为文件", async () => {
    mocks.writeImage.mockRejectedValueOnce(new Error("clipboard unavailable"));

    await generateShareImg("share", element);

    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("复制到剪贴板失败"));
    expect(mocks.success).not.toHaveBeenCalledWith(expect.stringContaining("复制到剪贴板"));
    expect(mocks.writeFile).toHaveBeenCalledExactlyOnceWith("C:/Pictures/chosen.png", pngBytes);
  });

  it("将帖子原图转成 PNG 后写入原生剪贴板", async () => {
    const bitmap = { width: 1, height: 1, close: vi.fn() };
    const drawImage = vi.fn();
    const createImageBitmap = vi.fn(async () => bitmap);
    vi.stubGlobal("createImageBitmap", createImageBitmap);
    vi.stubGlobal("document", {
      createElement: () => ({
        getContext: () => ({ drawImage }),
        toBlob: (callback: BlobCallback) => callback(new Blob([pngBytes], { type: "image/png" })),
      }),
    });
    mocks.writeImage.mockResolvedValueOnce();
    const jpeg = Uint8Array.of(0xff, 0xd8, 0xff, 0xe0);

    await copyToClipboard(jpeg.buffer);

    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0);
    expect(mocks.writeImage).toHaveBeenCalledExactlyOnceWith(pngBytes.buffer);
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
});
