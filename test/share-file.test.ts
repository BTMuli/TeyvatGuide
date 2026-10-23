/**
 * 分享图文件保存回归测试。
 * @since Beta v0.13.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  writeFile: vi.fn(async () => undefined),
  info: vi.fn(async () => undefined),
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
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: mocks.save }));
vi.mock("@tauri-apps/plugin-fs", () => ({ writeFile: mocks.writeFile }));
vi.mock("@tauri-apps/plugin-os", () => ({ platform: vi.fn(async () => "windows") }));
vi.mock("@zumer/snapdom", () => ({ snapdom: vi.fn() }));
vi.mock("html2canvas", () => ({ default: vi.fn() }));
vi.mock("modern-screenshot", () => ({ domToBlob: vi.fn() }));
vi.mock("modern-screenshot/worker?url&no-inline", () => ({ default: "worker" }));
vi.mock("pinia", () => ({ storeToRefs: vi.fn() }));
vi.mock("@mdi/font/fonts/materialdesignicons-webfont.woff2?url", () => ({ default: "mdi" }));
vi.mock("@store/app.js", () => ({ default: vi.fn() }));
vi.mock("@/assets/fonts/HYWenHei-55W.ttf?url", () => ({ default: "genshin-light" }));
vi.mock("@/assets/fonts/JetBrainsMono-Bold.ttf?url", () => ({ default: "jetbrains-bold" }));
vi.mock("@/assets/fonts/JetBrainsMono-Regular.ttf?url", () => ({ default: "jetbrains" }));
vi.mock("@/assets/fonts/zh-cn.ttf?url", () => ({ default: "genshin" }));
vi.mock("../src/utils/shareBackdropBlur.js", () => ({}));
vi.mock("../src/utils/shareBackdropWorker?worker", () => ({ default: "worker" }));
vi.mock("../src/utils/TGHttps.js", () => ({ default: {} }));
vi.mock("../src/utils/TGLogger.js", () => ({ default: { Info: mocks.info } }));
vi.mock("../src/utils/fmtUtil.js", () => ({ default: { size: mocks.size } }));

import { saveBufferFile } from "../src/utils/TGShare.js";

beforeEach(() => {
  mocks.save.mockReset();
  mocks.writeFile.mockClear();
  mocks.info.mockClear();
  mocks.cancel.mockClear();
  mocks.success.mockClear();
  mocks.size.mockClear();
  mocks.save.mockResolvedValue("C:/Pictures/chosen.png");
});

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
