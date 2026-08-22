/**
 * 生成分享截图并保存到本地
 * @since Beta v0.11.5
 */

import showSnackbar from "@comp/func/snackbar.js";
import mdiWoff2Url from "@mdi/font/fonts/materialdesignicons-webfont.woff2?url";
import useAppStore from "@store/app.js";
import { path } from "@tauri-apps/api";
import { sep } from "@tauri-apps/api/path";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { platform } from "@tauri-apps/plugin-os";
import { snapdom } from "@zumer/snapdom";
import html2canvas from "html2canvas";
import { domToBlob } from "modern-screenshot";
import workerUrl from "modern-screenshot/worker?url&no-inline";
import { storeToRefs } from "pinia";

import fmtUtil from "./fmtUtil.js";
import type {
  ShareBackdropBlurBatchRequest,
  ShareBackdropBlurBatchResponse,
  ShareBackdropBlurRequest,
} from "./shareBackdropBlur.js";
import ShareBackdropWorker from "./shareBackdropWorker?worker";
import TGHttps from "./TGHttps.js";
import TGLogger from "./TGLogger.js";

import fontGenshinLightUrl from "@/assets/fonts/HYWenHei-55W.ttf?url";
import fontJetbrainsBoldUrl from "@/assets/fonts/JetBrainsMono-Bold.ttf?url";
import fontJetbrainsUrl from "@/assets/fonts/JetBrainsMono-Regular.ttf?url";
import fontGenshinUrl from "@/assets/fonts/zh-cn.ttf?url";

/**
 * 保存图片-canvas
 * @since Beta v0.10.0
 * @param buffer - 图片数据
 * @param filename - 文件名
 * @param format - 文件格式
 * @returns 无返回值
 */
export async function saveBufferFile(
  buffer: ArrayBuffer,
  filename: string,
  format?: string,
): Promise<void> {
  if (format === undefined) format = "png";
  const res = await save({
    title: "保存图片",
    filters: [{ name: "图片", extensions: [format] }],
    defaultPath: `${await path.downloadDir()}${path.sep()}${filename}.${format}`,
  });
  if (res === null) {
    await TGLogger.Info(`[saveCanvasImg][${filename}] 未选择保存路径`);
    showSnackbar.cancel("未选择保存路径");
    return;
  }
  const bf = new Uint8Array(buffer);
  await writeFile(res, bf);
  const realName = res.split(sep()).pop();
  await TGLogger.Info(`[saveCanvasImg][${realName}] 已将图像保存到本地`);
  showSnackbar.success(`已将 ${realName} 保存到本地，大小为 ${fmtUtil.size(bf.length)}`);
}

/**
 * 从远程获取buffer并保存到本地文件
 * @since Beta v0.10.0
 * @param url - 图片链接
 * @param fn - 文件名
 * @returns 保存结果
 */
export async function saveImgFile(url: string, fn: string, fmt?: string): Promise<void> {
  let buffer: ArrayBuffer | undefined;
  try {
    buffer = await TGHttps.buffer(url);
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取图像Buffer失败：${errMsg}`);
    await TGLogger.Error(`[TGShare][saveImgFile] 获取图像Buffer失败：${url}`);
    await TGLogger.Error(`${e}`);
    return;
  }
  if (buffer === undefined) return;
  await saveBufferFile(buffer, fn, fmt);
}

/**
 * 将图片保存到本地
 * @since Beta v0.10.0
 * @todo format param
 * @param url - 图片链接
 * @returns 图片元素
 */
export async function saveImgBlob(url: string): Promise<string> {
  let buffer: ArrayBuffer | undefined;
  try {
    buffer = await TGHttps.buffer(url);
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await TGLogger.Error(`[TGShare][saveImgBlob] 获取图像Buffer失败: ${url}`);
    await TGLogger.Error(`[TGShare][saveImgBlob] ${errMsg}`);
    return url;
  }
  const blob = new Blob([new Uint8Array(buffer)], { type: "image/png" });
  return URL.createObjectURL(blob);
}

/**
 * 获取分享截图背景色
 * @since Beta v0.9.0
 * @returns 背景色
 */
function getShareImgBgColor(): string {
  let theme = localStorage.getItem("theme");
  if (theme) theme = JSON.parse(theme).theme;
  if (theme === "dark") return "#1e1e1e";
  return "#ffffff";
}

/**
 * 获取 modern-screenshot 截图根节点背景色
 *
 * modern-screenshot 会用 backgroundColor 覆盖克隆根节点自身的 background-color；
 * 根节点已有底色时应保留，仅在透明时使用页面底色兜底。
 * @since Beta v0.11.5
 * @param element - 截图根节点
 * @returns 截图根节点背景色
 */
function getShareRootBgColor(element: HTMLElement): string {
  const backgroundColor = getComputedStyle(element).backgroundColor;
  if (
    backgroundColor === "" ||
    backgroundColor === "transparent" ||
    backgroundColor === "rgba(0, 0, 0, 0)"
  ) {
    return getShareImgBgColor();
  }
  return backgroundColor;
}

/**
 * 过滤分享图中需忽略的节点（兼容 data-html2canvas-ignore）
 * @since Beta v0.11.5
 * @param node - DOM 节点
 * @returns 是否纳入截图
 */
function shareIgnoreFilter(node: Node): boolean {
  if (!(node instanceof Element)) return true;
  return !node.hasAttribute("data-html2canvas-ignore");
}

/** MDI 图标字体族名 */
const MDI_FONT_FAMILY = "Material Design Icons";

type ShareFontSpec = {
  /** 字体族 */
  family: string;
  /** Vite 资源 URL */
  url: string;
  /** \@font-face format */
  format: string;
};

/** 分享图需要显式嵌入的字体（与 assets/fonts、--font-text/--font-title 对齐） */
const SHARE_FONT_SPECS: ReadonlyArray<ShareFontSpec> = [
  { family: "Genshin", url: fontGenshinUrl, format: "truetype" },
  { family: "Genshin-Light", url: fontGenshinLightUrl, format: "truetype" },
  { family: "JetBrians mono", url: fontJetbrainsUrl, format: "truetype" },
  { family: "JetBrians mono Bold", url: fontJetbrainsBoldUrl, format: "truetype" },
  { family: MDI_FONT_FAMILY, url: mdiWoff2Url, format: "woff2" },
];

/** 缓存的分享字体 \@font-face CSS（data URL） */
let shareFontFaceCss: string | undefined;
/** 进行中的字体嵌入，避免并发重复拉取 */
let shareFontEmbedTask: Promise<string | undefined> | undefined;
/** SVG foreignObject 字体是否已预热（避免首次截图文字空白） */
let shareSvgFontsWarmed = false;

/**
 * Blob 转 data URL
 * @since Beta v0.11.5
 * @param blob - Blob
 * @returns data URL
 */
async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("FileReader 未返回字符串"));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("FileReader 读取失败"));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * 等待指定毫秒
 * @since Beta v0.11.5
 * @param ms - 毫秒
 * @returns 无返回值
 */
function waitShareMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * 构建 \@font-face CSS，并用 FontFace 解码进 document.fonts
 * @since Beta v0.11.5
 * @param specs - 字体列表
 * @param logTag - 日志标签
 * @returns \@font-face CSS；全部失败时为 undefined
 */
async function embedShareFontSpecs(
  specs: ReadonlyArray<ShareFontSpec>,
  logTag: string,
): Promise<string | undefined> {
  const cssParts: Array<string> = [];

  for (const spec of specs) {
    try {
      const res = await fetch(spec.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const dataUrl = await blobToDataUrl(blob);
      cssParts.push(
        [
          `@font-face{`,
          `font-family:"${spec.family}";`,
          `font-style:normal;`,
          `font-weight:normal;`,
          `font-display:block;`,
          `src:url("${dataUrl}") format("${spec.format}");`,
          `}`,
        ].join(""),
      );
      try {
        const face = new FontFace(spec.family, `url("${dataUrl}")`, {
          style: "normal",
          weight: "normal",
          display: "block",
        });
        await face.load();
        document.fonts.add(face);
        await document.fonts.load(`normal 16px "${spec.family}"`, "字UID Aa1");
      } catch (e) {
        await TGLogger.Warn(`${logTag} FontFace ${spec.family} 失败: ${e}`);
      }
      await TGLogger.Info(`${logTag} 已嵌入 ${spec.family} ${fmtUtil.size(blob.size)}`);
    } catch (e) {
      await TGLogger.Warn(`${logTag} ${spec.family} 失败: ${e}`);
    }
  }

  if (cssParts.length === 0) {
    await TGLogger.Warn(`${logTag} 未嵌入任何分享字体`);
    return undefined;
  }

  try {
    await document.fonts.ready;
  } catch {
    // 字体就绪检测失败时仍继续
  }
  return cssParts.join("\n");
}

/**
 * 拉取并缓存分享用字体（正文字体 + MDI），转为 data URL \@font-face
 * @since Beta v0.11.5
 * @returns \@font-face CSS；全部失败时为 undefined
 */
async function ensureShareFontEmbed(): Promise<string | undefined> {
  if (shareFontFaceCss !== undefined) return shareFontFaceCss;
  if (shareFontEmbedTask !== undefined) return await shareFontEmbedTask;
  shareFontEmbedTask = embedShareFontSpecs(SHARE_FONT_SPECS, "[TGShare][ensureShareFontEmbed]");
  try {
    shareFontFaceCss = await shareFontEmbedTask;
    return shareFontFaceCss;
  } finally {
    shareFontEmbedTask = undefined;
  }
}

/**
 * 加载图片并尝试 decode
 * @since Beta v0.11.5
 * @param url - 图片 URL
 * @returns 图片元素
 */
async function loadShareWarmupImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "sync";
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
  try {
    await img.decode();
  } catch {
    // 解码失败仍尝试绘制
  }
  return img;
}

/**
 * 判断图片是否画出浅色像素（预热 SVG 白字是否已出现）
 * @since Beta v0.11.5
 * @param img - 图片
 * @returns 是否已有文字墨迹
 */
function shareWarmupImageHasInk(img: HTMLImageElement): boolean {
  if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return false;
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (ctx === null) return false;
  try {
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 32) continue;
      if (data[i] > 40 || data[i + 1] > 40 || data[i + 2] > 40) return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * 预热 SVG foreignObject 内的 \@font-face。
 * Chromium 把 SVG 当 Image 绘制时，onload 早于字体解码；font-display:block
 * 会让首次截图文字空白，第二次才命中字体缓存。
 * @since Beta v0.11.5
 * @param css - \@font-face CSS
 * @returns 无返回值
 */
async function warmupShareSvgFonts(css: string): Promise<void> {
  if (shareSvgFontsWarmed) return;

  const spans = SHARE_FONT_SPECS.map(
    (spec) =>
      `<span style="font-family:'${spec.family}';font-size:24px;color:#ffffff">字Aa1</span>`,
  ).join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="36">` +
    `<foreignObject width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="background:#000000;display:flex">` +
    `<style>${css}</style>${spans}</div></foreignObject></svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const deadline = Date.now() + 4000;

  while (Date.now() < deadline) {
    const url = URL.createObjectURL(blob);
    try {
      const img = await loadShareWarmupImage(url);
      if (shareWarmupImageHasInk(img)) {
        shareSvgFontsWarmed = true;
        await TGLogger.Info(`[TGShare][warmupShareSvgFonts] SVG 字体已就绪`);
        return;
      }
    } finally {
      URL.revokeObjectURL(url);
    }
    await waitShareMs(80);
  }

  shareSvgFontsWarmed = true;
  await TGLogger.Warn(`[TGShare][warmupShareSvgFonts] 预热超时，继续截图`);
}

/**
 * 临时让图标节点自身声明 MDI 字体族（foreignObject 路线才能收集到该字体）
 * @since Beta v0.11.5
 * @param root - 截图根节点
 * @returns 还原函数
 */
function patchShareIconFonts(root: HTMLElement): () => void {
  const patched: Array<{ el: HTMLElement; fontFamily: string }> = [];
  const icons = root.querySelectorAll<HTMLElement>(".mdi, .v-icon");
  for (const el of Array.from(icons)) {
    patched.push({ el, fontFamily: el.style.fontFamily });
    el.style.fontFamily = `"${MDI_FONT_FAMILY}"`;
  }
  return () => {
    for (const item of patched) {
      item.el.style.fontFamily = item.fontFamily;
    }
  };
}

/**
 * 解析伪元素 content 为实际字形字符串
 * @since Beta v0.11.5
 * @param content - getComputedStyle(...).content
 * @returns 字形；无法解析时为空串
 */
function parsePseudoContentGlyph(content: string): string {
  if (content === "" || content === "none" || content === "normal") return "";
  if (/^["']/.test(content)) {
    return content.slice(1, -1);
  }
  const escapes = content.match(/\\[0-9A-Fa-f]{1,6}/g);
  if (escapes === null) return "";
  let glyph = "";
  for (const token of escapes) {
    const code = Number.parseInt(token.slice(1), 16);
    if (Number.isNaN(code)) continue;
    glyph += String.fromCodePoint(code);
  }
  return glyph;
}

/**
 * 将单字形（含代理对）栅格化为 data URL
 * @since Beta v0.11.5
 * @param glyph - 图标字形
 * @param family - 字体族
 * @param fontSize - 字号 px
 * @param color - 填充色
 * @param fontWeight - 字重
 * @returns data URL 与像素尺寸
 */
async function rasterizeIconGlyph(
  glyph: string,
  family: string,
  fontSize: number,
  color: string,
  fontWeight: string,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const cleanFamily =
    family
      .replace(/^["']+|["']+$/g, "")
      .split(",")[0]
      ?.trim() || MDI_FONT_FAMILY;
  try {
    await document.fonts.load(`${fontWeight} ${fontSize}px "${cleanFamily}"`);
    await document.fonts.ready;
  } catch {
    // 字体未就绪时仍尝试绘制
  }
  const probe = document.createElement("span");
  probe.setAttribute("data-tg-share-internal", "1");
  probe.textContent = glyph;
  probe.style.cssText = [
    "position:absolute",
    "visibility:hidden",
    "left:-99999px",
    "white-space:nowrap",
    "margin:0",
    "padding:0",
    "line-height:1",
    `font-family:"${cleanFamily}"`,
    `font-weight:${fontWeight}`,
    `font-size:${fontSize}px`,
    `color:${color}`,
  ].join(";");
  document.body.appendChild(probe);
  const rect = probe.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  document.body.removeChild(probe);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width * dpr));
  canvas.height = Math.max(1, Math.ceil(height * dpr));
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return { dataUrl: "", width, height };
  }
  ctx.scale(dpr, dpr);
  ctx.font = `${fontWeight} ${fontSize}px "${cleanFamily}"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = color;
  ctx.fillText(glyph, 0, 0);
  return { dataUrl: canvas.toDataURL("image/png"), width, height };
}

/**
 * 截图前将 MDI / v-icon 的 ::before 字形烘焙为 img
 *
 * snapdom 把 “Material Design Icons” 识别为 icon 字体后会跳过 \@font-face 嵌入，
 * 且仅在 content 的 JS string.length === 1 时栅格化；MDI 码点在 BMP 外（代理对 length===2）
 * 会被落成空伪元素，导致图标空白。
 *
 * @since Beta v0.11.5
 * @param root - 截图根节点
 * @returns 还原函数
 */
async function bakeShareMdiIcons(root: HTMLElement): Promise<() => void> {
  const icons = root.querySelectorAll<HTMLElement>(".mdi, .v-icon");
  if (icons.length === 0) return () => {};

  const styleEl = document.createElement("style");
  styleEl.setAttribute("data-tg-share-mdi-style", "1");
  styleEl.textContent =
    "[data-tg-share-mdi-baked]::before,[data-tg-share-mdi-baked]::after{" +
    "content:none!important;display:none!important}";
  document.head.appendChild(styleEl);

  const restores: Array<() => void> = [
    () => {
      styleEl.remove();
    },
  ];

  for (const el of Array.from(icons)) {
    if (el.closest("[data-html2canvas-ignore]") !== null) continue;
    const before = getComputedStyle(el, "::before");
    const glyph = parsePseudoContentGlyph(before.content);
    if (glyph === "" || [...glyph].length === 0) continue;

    const fontSize =
      Number.parseInt(before.fontSize, 10) ||
      Number.parseInt(getComputedStyle(el).fontSize, 10) ||
      24;
    const fill =
      before.getPropertyValue("-webkit-text-fill-color")?.trim() ||
      before.color ||
      getComputedStyle(el).color ||
      "#000";
    const color =
      fill === "" ||
      /^transparent$/i.test(fill) ||
      /rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(fill) ||
      fill.toLowerCase() === "currentcolor"
        ? getComputedStyle(el).color || "#000"
        : fill;
    const family = before.fontFamily || MDI_FONT_FAMILY;
    const weight =
      before.fontWeight && before.fontWeight !== "normal" ? before.fontWeight : "normal";

    const { dataUrl, width, height } = await rasterizeIconGlyph(
      glyph,
      family,
      fontSize,
      color,
      weight,
    );
    if (dataUrl === "") continue;

    const img = document.createElement("img");
    img.setAttribute("data-tg-share-mdi", "1");
    img.alt = "";
    img.src = dataUrl;
    const aspect = height > 0 ? width / height : 1;
    img.style.cssText = [
      `height:${fontSize}px`,
      `width:${Math.max(1, Math.round(aspect * fontSize))}px`,
      "object-fit:contain",
      "display:block",
      "flex-shrink:0",
    ].join(";");

    el.setAttribute("data-tg-share-mdi-baked", "1");
    el.appendChild(img);
    restores.push(() => {
      img.remove();
      el.removeAttribute("data-tg-share-mdi-baked");
    });
  }

  return () => {
    for (let i = restores.length - 1; i >= 0; i -= 1) {
      restores[i]();
    }
  };
}

/**
 * 将分享字体 CSS 注入到截图 SVG / clone 根节点
 * @since Beta v0.11.5
 * @param css - \@font-face CSS
 * @returns modern-screenshot 回调
 */
function createShareFontInjectors(css: string | undefined): {
  onCloneNode: (cloned: Node) => void;
  onCreateForeignObjectSvg: (svg: SVGSVGElement) => Promise<void>;
} {
  return {
    onCloneNode: (cloned) => {
      if (!(cloned instanceof HTMLElement)) return;
      hoistShareBackdropAtlasStyles(cloned);
      if (css === undefined) return;
      if (cloned.dataset.tgShareFont === "1") return;
      cloned.dataset.tgShareFont = "1";
      const styleEl = cloned.ownerDocument.createElement("style");
      styleEl.textContent = css;
      cloned.insertBefore(styleEl, cloned.firstChild);
    },
    onCreateForeignObjectSvg: async (svg) => {
      await embedShareBackdropAtlasStyles(svg);
      if (css === undefined) return;
      const styleEl = svg.querySelector("style");
      if (styleEl !== null) {
        styleEl.appendChild(document.createTextNode(`\n${css}\n`));
        return;
      }
      const created = document.createElementNS("http://www.w3.org/2000/svg", "style");
      created.textContent = css;
      svg.insertBefore(created, svg.firstChild);
    },
  };
}

/**
 * 将 clone 中重复的图集 URL 提升为根节点 CSS 变量
 * @since Beta v0.11.5
 * @param root - modern-screenshot 的 clone 根节点
 * @returns 无返回值
 */
function hoistShareBackdropAtlasStyles(root: HTMLElement): void {
  const backgrounds = new Map<string, string>();
  const nodes = [
    ...(root.hasAttribute(SHARE_BACKDROP_ATLAS_ATTR) ? [root] : []),
    ...Array.from(root.querySelectorAll<HTMLElement>(`[${SHARE_BACKDROP_ATLAS_ATTR}]`)),
  ];
  for (const node of nodes) {
    const marker = node.getAttribute(SHARE_BACKDROP_ATLAS_ATTR);
    if (marker === null) continue;
    const cssVar = `--tg-share-bd-atlas-${marker}`;
    let background = backgrounds.get(marker);
    if (background === undefined) {
      const hoisted = root.style.getPropertyValue(cssVar);
      background = hoisted === "" ? node.style.backgroundImage : hoisted;
      if (background === "") continue;
      backgrounds.set(marker, background);
      if (hoisted === "") root.style.setProperty(cssVar, background);
    }
    node.style.backgroundImage = `var(${cssVar})`;
  }
}

/**
 * 将图集 CSS 变量里的 blob URL 只嵌入一次，并清理 clone 标记
 * @since Beta v0.11.5
 * @param svg - modern-screenshot 创建的 foreignObject SVG
 * @returns 无返回值
 */
async function embedShareBackdropAtlasStyles(svg: SVGSVGElement): Promise<void> {
  const foreignObject = svg.querySelector("foreignObject");
  const root = foreignObject?.firstElementChild;
  if (!(root instanceof HTMLElement)) return;
  hoistShareBackdropAtlasStyles(root);

  const markers = new Set<string>();
  const nodes = [
    ...(root.hasAttribute(SHARE_BACKDROP_ATLAS_ATTR) ? [root] : []),
    ...Array.from(root.querySelectorAll<HTMLElement>(`[${SHARE_BACKDROP_ATLAS_ATTR}]`)),
  ];
  for (const node of nodes) {
    const marker = node.getAttribute(SHARE_BACKDROP_ATLAS_ATTR);
    if (marker !== null) markers.add(marker);
    node.removeAttribute(SHARE_BACKDROP_ATLAS_ATTR);
  }

  await Promise.all(
    [...markers].map(async (marker) => {
      const cssVar = `--tg-share-bd-atlas-${marker}`;
      const background = root.style.getPropertyValue(cssVar);
      const matched = /^url\(["']?(blob:[^"')]+)["']?\)$/.exec(background.trim());
      if (matched === null) return;
      try {
        const response = await fetch(matched[1]);
        if (!response.ok) return;
        const dataUrl = await blobToDataUrl(await response.blob());
        root.style.setProperty(cssVar, `url("${dataUrl}")`);
      } catch {
        // blob URL 在本次截图完成前仍有效，转换失败时保留原值
      }
    }),
  );
}

/**
 * 解析 backdrop-filter 中的 blur 像素值
 * @since Beta v0.11.5
 * @param value - computed backdrop-filter
 * @returns blur 像素；无法解析时为 0
 */
function parseBackdropBlurPx(value: string): number {
  const matched = /blur\(\s*([\d.]+)\s*px\s*\)/i.exec(value);
  if (matched === null) return 0;
  return Number(matched[1]);
}

/**
 * 解析 border-radius 为画布像素半径
 * @since Beta v0.11.5
 * @param value - computed border-radius
 * @param width - 元素宽
 * @param height - 元素高
 * @returns 四角半径（px）
 */
function parseBorderRadiusPx(
  value: string,
  width: number,
  height: number,
): { tl: number; tr: number; br: number; bl: number } {
  const parts = value
    .split(" ")
    .map((p) => p.trim())
    .filter((p) => p !== "");
  const toPx = (token: string): number => {
    if (token.endsWith("%")) {
      const pct = Number(token.slice(0, -1));
      if (Number.isNaN(pct)) return 0;
      return (Math.min(width, height) * pct) / 100;
    }
    return Number.parseFloat(token) || 0;
  };
  if (parts.length === 0) return { tl: 0, tr: 0, br: 0, bl: 0 };
  if (parts.length === 1) {
    const r = toPx(parts[0]);
    return { tl: r, tr: r, br: r, bl: r };
  }
  if (parts.length === 2) {
    const a = toPx(parts[0]);
    const b = toPx(parts[1]);
    return { tl: a, tr: b, br: a, bl: b };
  }
  if (parts.length === 3) {
    return { tl: toPx(parts[0]), tr: toPx(parts[1]), br: toPx(parts[2]), bl: toPx(parts[1]) };
  }
  return {
    tl: toPx(parts[0]),
    tr: toPx(parts[1]),
    br: toPx(parts[2]),
    bl: toPx(parts[3]),
  };
}

/**
 * Blob 转 HTMLImageElement
 * @since Beta v0.11.5
 * @param blob - 图片 Blob
 * @returns 图片元素与可释放 URL
 */
async function blobToImage(blob: Blob): Promise<{ img: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.decoding = "sync";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("backdrop 快照解码失败"));
    };
    img.src = url;
  });
  return { img, url };
}

type ShareBoxRect = { left: number; top: number; width: number; height: number };
type ShareCornerRadius = { tl: number; tr: number; br: number; bl: number };
type SharePseudoKind = "::before" | "::after";

/**
 * 伪元素是否生成了可布局盒子
 * @since Beta v0.11.5
 * @param style - getComputedStyle(..., "::before"| "::after")
 * @returns 是否存在盒子
 */
function hasGeneratedPseudoBox(style: CSSStyleDeclaration): boolean {
  if (style.display === "none") return false;
  const content = style.content;
  return content !== "none" && content !== "normal";
}

/**
 * 读取节点上 backdrop-filter 的 blur 像素
 * @since Beta v0.11.5
 * @param style - computed style
 * @returns blur 像素；无毛玻璃时为 0
 */
function readBackdropBlurPx(style: CSSStyleDeclaration): number {
  const backdrop = style.getPropertyValue("backdrop-filter");
  const webkitBackdrop = style.getPropertyValue("-webkit-backdrop-filter");
  const filterValue = [backdrop, webkitBackdrop].find((value) => value !== "" && value !== "none");
  return parseBackdropBlurPx(filterValue ?? "");
}

/**
 * 解析 CSS 长度（px / %）
 * @since Beta v0.11.5
 * @param value - 声明值
 * @param base - 百分比基准
 * @returns 像素；auto / 无法解析时为 undefined
 */
function parseCssLengthPx(value: string, base: number): number | undefined {
  const token = value.trim();
  if (token === "" || token === "auto") return undefined;
  if (token.endsWith("%")) {
    const pct = Number.parseFloat(token);
    if (Number.isNaN(pct)) return undefined;
    return (base * pct) / 100;
  }
  const px = Number.parseFloat(token);
  if (Number.isNaN(px)) return undefined;
  return px;
}

/**
 * 估算伪元素相对视口的盒子（absolute / fixed 按 containing block）
 * @since Beta v0.11.5
 * @param host - 宿主元素
 * @param pseudoStyle - 伪元素 computed style
 * @returns 视口坐标盒子；无效时为 undefined
 */
function resolvePseudoBoxRect(
  host: HTMLElement,
  pseudoStyle: CSSStyleDeclaration,
): ShareBoxRect | undefined {
  const hostRect = host.getBoundingClientRect();
  const hostCs = getComputedStyle(host);
  const borderLeft = Number.parseFloat(hostCs.borderLeftWidth) || 0;
  const borderTop = Number.parseFloat(hostCs.borderTopWidth) || 0;
  const borderRight = Number.parseFloat(hostCs.borderRightWidth) || 0;
  const borderBottom = Number.parseFloat(hostCs.borderBottomWidth) || 0;
  const position = pseudoStyle.position;

  let cbLeft = hostRect.left;
  let cbTop = hostRect.top;
  let cbWidth = hostRect.width;
  let cbHeight = hostRect.height;
  if (position === "absolute") {
    cbLeft = hostRect.left + borderLeft;
    cbTop = hostRect.top + borderTop;
    cbWidth = Math.max(0, hostRect.width - borderLeft - borderRight);
    cbHeight = Math.max(0, hostRect.height - borderTop - borderBottom);
  } else if (position === "fixed") {
    cbLeft = 0;
    cbTop = 0;
    cbWidth = window.innerWidth;
    cbHeight = window.innerHeight;
  }

  const top = parseCssLengthPx(pseudoStyle.top, cbHeight);
  const right = parseCssLengthPx(pseudoStyle.right, cbWidth);
  const bottom = parseCssLengthPx(pseudoStyle.bottom, cbHeight);
  const left = parseCssLengthPx(pseudoStyle.left, cbWidth);
  let width = parseCssLengthPx(pseudoStyle.width, cbWidth);
  let height = parseCssLengthPx(pseudoStyle.height, cbHeight);

  if (width === undefined) {
    if (left !== undefined && right !== undefined) width = Math.max(0, cbWidth - left - right);
    else width = cbWidth;
  }
  if (height === undefined) {
    if (top !== undefined && bottom !== undefined) height = Math.max(0, cbHeight - top - bottom);
    else height = cbHeight;
  }
  if (width <= 0 || height <= 0) return undefined;

  let x = cbLeft;
  let y = cbTop;
  if (left !== undefined) x = cbLeft + left;
  else if (right !== undefined) x = cbLeft + cbWidth - right - width;
  if (top !== undefined) y = cbTop + top;
  else if (bottom !== undefined) y = cbTop + cbHeight - bottom - height;

  return { left: x, top: y, width, height };
}

/**
 * 收集叠在伪元素之上、快照时应隐藏的宿主子节点
 * @since Beta v0.11.5
 * @param host - 伪元素宿主
 * @param pseudoStyle - 伪元素 computed style
 * @returns 需临时隐藏的子元素
 */
function collectChildrenAbovePseudo(
  host: HTMLElement,
  pseudoStyle: CSSStyleDeclaration,
): Array<HTMLElement> {
  const parsedZ = Number.parseInt(pseudoStyle.zIndex, 10);
  const pseudoZ = Number.isNaN(parsedZ) ? 0 : parsedZ;
  const above: Array<HTMLElement> = [];
  for (const child of Array.from(host.children)) {
    if (!(child instanceof HTMLElement)) continue;
    const childZ = Number.parseInt(getComputedStyle(child).zIndex, 10);
    if (Number.isNaN(childZ) || childZ <= pseudoZ) continue;
    above.push(child);
  }
  return above;
}

type BakedBackdropDraw = {
  sw: number;
  sh: number;
  sx: number;
  sy: number;
  pad: number;
  blurDraw: number;
  radius: ShareCornerRadius;
};

const SHARE_BACKDROP_ATLAS_ATTR = "data-tg-share-bd-atlas";
/** 背景快照克隆体中需要隐藏的真实节点 */
const SHARE_BACKDROP_HIDE_ATTR = "data-tg-share-bd-hide";
/** 毛玻璃区域少于该数量时走主线程，避免拉起 Worker 的开销 */
const SHARE_BACKDROP_WORKER_MIN = 8;
/** blur 批量回传 ImageBitmap，可高于 CPU 核数 */
const SHARE_BACKDROP_WORKER_MAX = 16;
/** 每个 Worker 一轮处理的毛玻璃数量，减少 postMessage */
const SHARE_BACKDROP_BATCH = 24;
/** 单张毛玻璃图集边长上限，避免超大 Canvas 编码失败 */
const SHARE_BACKDROP_ATLAS_MAX_SIZE = 2048;
/** 图集小图间隔，避免缩放采样串色 */
const SHARE_BACKDROP_ATLAS_GAP = 1;

/**
 * 分享截图进度
 * @since Beta v0.11.5
 */
export type ShareProgress = {
  /** snapshot 背景快照 / bake 毛玻璃 / capture 最终截图 */
  phase: "snapshot" | "bake" | "capture";
  /** 已完成数量 */
  current: number;
  /** 总数量 */
  total: number;
};

type ShareProgressFn = (progress: ShareProgress) => void;

function reportShareProgress(
  onProgress: ShareProgressFn | undefined,
  progress: ShareProgress,
): void {
  if (onProgress === undefined) return;
  onProgress(progress);
}

/**
 * 将毛玻璃盒子换算为快照像素上的绘制参数
 * @since Beta v0.11.5
 * @param snapshot - 根节点快照
 * @param rootRect - 根节点视口矩形
 * @param box - 毛玻璃视口矩形
 * @param radius - 圆角（CSS px）
 * @param blurPx - blur（CSS px）
 * @returns 快照像素绘制参数；根节点无效时为空
 */
function resolveBakedBackdropDraw(
  snapshot: HTMLImageElement,
  rootRect: DOMRect,
  box: ShareBoxRect,
  radius: ShareCornerRadius,
  blurPx: number,
): BakedBackdropDraw | undefined {
  if (rootRect.width <= 0 || rootRect.height <= 0) return undefined;
  if (snapshot.naturalWidth <= 0 || snapshot.naturalHeight <= 0) return undefined;
  const scaleX = snapshot.naturalWidth / rootRect.width;
  const scaleY = snapshot.naturalHeight / rootRect.height;
  const sw = Math.max(1, Math.round(box.width * scaleX));
  const sh = Math.max(1, Math.round(box.height * scaleY));
  const sx = (box.left - rootRect.left) * scaleX;
  const sy = (box.top - rootRect.top) * scaleY;
  const blurDraw = blurPx * scaleX;
  return {
    sw,
    sh,
    sx,
    sy,
    pad: Math.ceil(blurDraw * 2),
    blurDraw,
    radius: {
      tl: radius.tl * scaleX,
      tr: radius.tr * scaleX,
      br: radius.br * scaleX,
      bl: radius.bl * scaleX,
    },
  };
}

/**
 * 将毛玻璃区域绘制为圆角 PNG data URL
 * @since Beta v0.11.5
 * @param snapshot - 隐藏毛玻璃后的根节点快照
 * @param rootRect - 根节点视口矩形
 * @param box - 毛玻璃视口矩形
 * @param radius - 圆角（CSS px）
 * @param blurPx - blur（CSS px）
 * @param tint - 半透明底色
 * @returns data URL；失败时为 undefined
 */
function renderBakedBackdropDataUrl(
  snapshot: HTMLImageElement,
  rootRect: DOMRect,
  box: ShareBoxRect,
  radius: ShareCornerRadius,
  blurPx: number,
  tint: string,
): string | undefined {
  const draw = resolveBakedBackdropDraw(snapshot, rootRect, box, radius, blurPx);
  if (draw === undefined) return undefined;

  const canvas = document.createElement("canvas");
  canvas.width = draw.sw;
  canvas.height = draw.sh;
  const ctx = canvas.getContext("2d");
  if (ctx === null) return undefined;

  const tileCanvas = document.createElement("canvas");
  tileCanvas.width = draw.sw;
  tileCanvas.height = draw.sh;
  const tileCtx = tileCanvas.getContext("2d");
  if (tileCtx === null) return undefined;
  tileCtx.drawImage(snapshot, draw.sx, draw.sy, draw.sw, draw.sh, 0, 0, draw.sw, draw.sh);

  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = draw.sw + draw.pad * 2;
  sampleCanvas.height = draw.sh + draw.pad * 2;
  const sampleCtx = sampleCanvas.getContext("2d");
  if (sampleCtx === null) return undefined;
  drawMirroredBackdropTiles(sampleCtx, tileCanvas, draw.sw, draw.sh, draw.pad);

  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = sampleCanvas.width;
  blurCanvas.height = sampleCanvas.height;
  const blurCtx = blurCanvas.getContext("2d");
  if (blurCtx === null) return undefined;
  blurCtx.filter = `blur(${draw.blurDraw}px)`;
  blurCtx.drawImage(sampleCanvas, 0, 0);

  ctx.beginPath();
  ctx.moveTo(draw.radius.tl, 0);
  ctx.lineTo(draw.sw - draw.radius.tr, 0);
  ctx.quadraticCurveTo(draw.sw, 0, draw.sw, draw.radius.tr);
  ctx.lineTo(draw.sw, draw.sh - draw.radius.br);
  ctx.quadraticCurveTo(draw.sw, draw.sh, draw.sw - draw.radius.br, draw.sh);
  ctx.lineTo(draw.radius.bl, draw.sh);
  ctx.quadraticCurveTo(0, draw.sh, 0, draw.sh - draw.radius.bl);
  ctx.lineTo(0, draw.radius.tl);
  ctx.quadraticCurveTo(0, 0, draw.radius.tl, 0);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(blurCanvas, draw.pad, draw.pad, draw.sw, draw.sh, 0, 0, draw.sw, draw.sh);
  if (tint !== "" && tint !== "rgba(0, 0, 0, 0)" && tint !== "transparent") {
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, draw.sw, draw.sh);
  }
  return canvas.toDataURL("image/png");
}

/** 用中心图块的镜像平铺填满 blur 采样区，避免根节点边缘混入透明像素 */
function drawMirroredBackdropTiles(
  ctx: CanvasRenderingContext2D,
  tile: CanvasImageSource,
  width: number,
  height: number,
  pad: number,
): void {
  const minX = Math.floor(-pad / width);
  const maxX = Math.ceil((width + pad) / width);
  const minY = Math.floor(-pad / height);
  const maxY = Math.ceil((height + pad) / height);
  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      const flipX = Math.abs(x) % 2 === 1;
      const flipY = Math.abs(y) % 2 === 1;
      const dx = pad + x * width;
      const dy = pad + y * height;
      ctx.save();
      ctx.translate(dx + (flipX ? width : 0), dy + (flipY ? height : 0));
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      ctx.drawImage(tile, 0, 0, width, height);
      ctx.restore();
    }
  }
}

/**
 * 当前环境是否可用 OffscreenCanvas Worker 做 blur
 * @since Beta v0.11.5
 * @returns 是否走 Worker
 */
function canUseShareBackdropWorkers(): boolean {
  return (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof createImageBitmap === "function"
  );
}

/**
 * 从快照裁出毛玻璃盒子的中心图块
 * @since Beta v0.11.5
 * @param snapshot - 根节点快照
 * @param draw - 快照像素绘制参数
 * @returns 裁切结果；区域无效时为空
 */
async function cropShareBackdropBitmap(
  snapshot: HTMLImageElement | ImageBitmap,
  draw: BakedBackdropDraw,
): Promise<ImageBitmap | undefined> {
  const srcW = "naturalWidth" in snapshot ? snapshot.naturalWidth : snapshot.width;
  const srcH = "naturalHeight" in snapshot ? snapshot.naturalHeight : snapshot.height;
  const cropX = Math.max(0, Math.min(srcW - 1, Math.round(draw.sx)));
  const cropY = Math.max(0, Math.min(srcH - 1, Math.round(draw.sy)));
  const cropW = Math.min(draw.sw, srcW - cropX);
  const cropH = Math.min(draw.sh, srcH - cropY);
  if (cropW < 1 || cropH < 1) return undefined;
  return await createImageBitmap(snapshot, cropX, cropY, cropW, cropH, {
    resizeWidth: draw.sw,
    resizeHeight: draw.sh,
    resizeQuality: "high",
  });
}

type ShareBackdropBakeJob = {
  box: ShareBoxRect;
  radius: ShareCornerRadius;
  blurPx: number;
  tint: string;
};

type ShareBakedFill = {
  url: string;
  x: number;
  y: number;
  atlasW: number;
  atlasH: number;
  atlasId?: number;
};

type ShareBackdropTile = {
  index: number;
  bitmap: ImageBitmap;
  sw: number;
  sh: number;
};

type ShareBackdropAtlasPlacement = ShareBackdropTile & {
  x: number;
  y: number;
};

type ShareBackdropAtlasPage = {
  placements: Array<ShareBackdropAtlasPlacement>;
  width: number;
  height: number;
};

/**
 * 用 Worker 池并行烘焙毛玻璃区域，失败则回退主线程
 * @since Beta v0.11.5
 * @param snapshot - 根节点快照
 * @param rootRect - 根节点视口矩形
 * @param jobs - 烘焙任务
 * @returns 与 jobs 对齐的填充（图集或单图）
 */
async function renderBakedBackdropUrls(
  snapshot: HTMLImageElement,
  rootRect: DOMRect,
  jobs: Array<ShareBackdropBakeJob>,
  onProgress?: ShareProgressFn,
  allowAtlas: boolean = true,
): Promise<Array<ShareBakedFill | undefined>> {
  if (jobs.length === 0) return [];
  reportShareProgress(onProgress, { phase: "bake", current: 0, total: jobs.length });
  if (allowAtlas && jobs.length >= SHARE_BACKDROP_WORKER_MIN && canUseShareBackdropWorkers()) {
    try {
      return await renderBakedBackdropUrlsWithWorkers(snapshot, rootRect, jobs, onProgress);
    } catch (error) {
      await TGLogger.Warn(
        `[TGShare][renderBakedBackdropUrls] Worker 烘焙失败，回退主线程: ${error}`,
      );
    }
  }
  const fills: Array<ShareBakedFill | undefined> = [];
  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    const url = renderBakedBackdropDataUrl(
      snapshot,
      rootRect,
      job.box,
      job.radius,
      job.blurPx,
      job.tint,
    );
    fills.push(url === undefined ? undefined : { url, x: 0, y: 0, atlasW: 0, atlasH: 0 });
    reportShareProgress(onProgress, { phase: "bake", current: index + 1, total: jobs.length });
  }
  return fills;
}

/**
 * 将一批烘焙任务交给 Worker 并等待 ImageBitmap
 * @since Beta v0.11.5
 * @param worker - blur Worker
 * @param items - 批量请求
 * @returns 批量结果
 */
function postShareBackdropBlurBatch(
  worker: Worker,
  items: Array<ShareBackdropBlurRequest>,
): Promise<ShareBackdropBlurBatchResponse["items"]> {
  return new Promise((resolve, reject) => {
    const handleMessage = (event: MessageEvent<ShareBackdropBlurBatchResponse>): void => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      resolve(event.data.items);
    };
    const handleError = (event: ErrorEvent): void => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      reject(event.error ?? new Error(event.message));
    };
    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    const transfer = items.map((item) => item.bitmap);
    const req: ShareBackdropBlurBatchRequest = { items };
    worker.postMessage(req, transfer);
  });
}

/**
 * 把 Worker 回传的小图分装成边长受控的图集
 * @since Beta v0.11.5
 * @param tiles - 已绘制的毛玻璃小图
 * @returns 图集页面及各区域坐标
 */
function packShareBackdropAtlasPages(
  tiles: Array<ShareBackdropTile>,
): Array<ShareBackdropAtlasPage> {
  const pages: Array<ShareBackdropAtlasPage> = [];
  let placements: Array<ShareBackdropAtlasPlacement> = [];
  let cursorX = 0;
  let cursorY = 0;
  let rowH = 0;
  let pageW = 0;

  function pushPage(): void {
    if (placements.length === 0) return;
    pages.push({ placements, width: pageW, height: cursorY + rowH });
    placements = [];
    cursorX = 0;
    cursorY = 0;
    rowH = 0;
    pageW = 0;
  }

  for (const tile of [...tiles].sort((left, right) => left.index - right.index)) {
    if (tile.sw > SHARE_BACKDROP_ATLAS_MAX_SIZE || tile.sh > SHARE_BACKDROP_ATLAS_MAX_SIZE) {
      pushPage();
      pages.push({ placements: [{ ...tile, x: 0, y: 0 }], width: tile.sw, height: tile.sh });
      continue;
    }
    if (
      cursorX > 0 &&
      cursorX + tile.sw + SHARE_BACKDROP_ATLAS_GAP > SHARE_BACKDROP_ATLAS_MAX_SIZE
    ) {
      cursorY += rowH + SHARE_BACKDROP_ATLAS_GAP;
      cursorX = 0;
      rowH = 0;
    }
    if (placements.length > 0 && cursorY + tile.sh > SHARE_BACKDROP_ATLAS_MAX_SIZE) {
      pushPage();
    }
    placements.push({ ...tile, x: cursorX, y: cursorY });
    cursorX += tile.sw + SHARE_BACKDROP_ATLAS_GAP;
    rowH = Math.max(rowH, tile.sh);
    pageW = Math.max(pageW, cursorX - SHARE_BACKDROP_ATLAS_GAP);
  }
  pushPage();
  return pages;
}

/**
 * 编码图集页面，并换算为 CSS 像素背景定位
 * @since Beta v0.11.5
 * @param tiles - 已绘制的毛玻璃小图
 * @param scaleX - 快照横向缩放
 * @param scaleY - 快照纵向缩放
 * @returns 与任务序号对齐的图集填充
 */
async function encodeShareBackdropAtlases(
  tiles: Array<ShareBackdropTile>,
  scaleX: number,
  scaleY: number,
): Promise<{ fills: Array<ShareBakedFill | undefined>; atlasCount: number }> {
  const pages = packShareBackdropAtlasPages(tiles);
  const fills: Array<ShareBakedFill | undefined> = [];
  const urls: Array<string> = [];
  try {
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
      const page = pages[pageIndex];
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, page.width);
      canvas.height = Math.max(1, page.height);
      const ctx = canvas.getContext("2d");
      if (ctx === null) throw new Error("毛玻璃图集 Canvas 2d 不可用");
      for (const placement of page.placements) {
        ctx.drawImage(placement.bitmap, placement.x, placement.y);
        placement.bitmap.close();
      }
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((next) => resolve(next), "image/webp", 0.92);
      });
      if (blob === null) throw new Error("毛玻璃图集编码失败");
      const url = URL.createObjectURL(blob);
      urls.push(url);
      for (const placement of page.placements) {
        while (fills.length <= placement.index) fills.push(undefined);
        fills[placement.index] = {
          url,
          x: placement.x / scaleX,
          y: placement.y / scaleY,
          atlasW: page.width / scaleX,
          atlasH: page.height / scaleY,
          atlasId: pageIndex,
        };
      }
    }
    return { fills, atlasCount: pages.length };
  } catch (error) {
    for (const url of urls) URL.revokeObjectURL(url);
    for (const tile of tiles) tile.bitmap.close();
    throw error;
  }
}

/**
 * 最多 16 个 Worker 批量 blur，主线程拼图集后只编码一次
 * @since Beta v0.11.5
 * @param snapshot - 根节点快照
 * @param rootRect - 根节点视口矩形
 * @param jobs - 烘焙任务
 * @returns 与 jobs 对齐的图集填充
 */
async function renderBakedBackdropUrlsWithWorkers(
  snapshot: HTMLImageElement,
  rootRect: DOMRect,
  jobs: Array<ShareBackdropBakeJob>,
  onProgress?: ShareProgressFn,
): Promise<Array<ShareBakedFill | undefined>> {
  const workerCount = Math.min(SHARE_BACKDROP_WORKER_MAX, jobs.length);
  const workers = Array.from({ length: workerCount }, () => new ShareBackdropWorker());
  const tiles: Array<ShareBackdropTile> = [];
  let next = 0;
  let completed = 0;
  const blurStarted = performance.now();
  const scaleX = snapshot.naturalWidth / rootRect.width;
  const scaleY = snapshot.naturalHeight / rootRect.height;
  const source = await createImageBitmap(snapshot);
  try {
    await Promise.all(
      workers.map(async (worker) => {
        while (next < jobs.length) {
          const batchIdx: Array<number> = [];
          while (batchIdx.length < SHARE_BACKDROP_BATCH && next < jobs.length) {
            const index = next;
            next += 1;
            batchIdx.push(index);
          }
          const reqs: Array<ShareBackdropBlurRequest> = [];
          try {
            for (const index of batchIdx) {
              const job = jobs[index];
              const draw = resolveBakedBackdropDraw(
                snapshot,
                rootRect,
                job.box,
                job.radius,
                job.blurPx,
              );
              if (draw === undefined) continue;
              const bitmap = await cropShareBackdropBitmap(source, draw);
              if (bitmap === undefined) continue;
              reqs.push({
                id: index,
                bitmap,
                sw: draw.sw,
                sh: draw.sh,
                pad: draw.pad,
                blurDraw: draw.blurDraw,
                radius: draw.radius,
                tint: job.tint,
              });
            }
            if (reqs.length > 0) {
              const items = await postShareBackdropBlurBatch(worker, reqs);
              for (const item of items) {
                if (item.bitmap === undefined) continue;
                const req = reqs.find((entry) => entry.id === item.id);
                if (req === undefined) {
                  item.bitmap.close();
                  continue;
                }
                tiles.push({
                  index: item.id,
                  bitmap: item.bitmap,
                  sw: req.sw,
                  sh: req.sh,
                });
              }
            }
          } catch (error) {
            for (const req of reqs) req.bitmap.close();
            await TGLogger.Warn(`[TGShare][renderBakedBackdropUrlsWithWorkers] 批次失败: ${error}`);
          } finally {
            completed += batchIdx.length;
            reportShareProgress(onProgress, {
              phase: "bake",
              current: completed,
              total: jobs.length,
            });
          }
        }
      }),
    );
    const atlas = await encodeShareBackdropAtlases(tiles, scaleX, scaleY);
    await TGLogger.Info(
      `[TGShare][renderBakedBackdropUrlsWithWorkers] ${jobs.length} 处 · ${workerCount} workers · ${atlas.atlasCount} atlas · ${Math.round(performance.now() - blurStarted)}ms`,
    );
    return atlas.fills;
  } catch (error) {
    for (const tile of tiles) tile.bitmap.close();
    throw error;
  } finally {
    source.close();
    for (const worker of workers) worker.terminate();
  }
}

/**
 * 快速路径：去掉 backdrop-filter，保留原半透明底色（alpha 底色 foreignObject 可截；勿加深以免发黑）
 * @since Beta v0.11.5
 * @param root - 截图根节点
 * @returns 还原函数
 */
function flattenShareBackdropFilters(root: HTMLElement): () => void {
  type FlatPatch = {
    el: HTMLElement;
    backdropFilter: string;
    webkitBackdropFilter: string;
  };
  const patches: Array<FlatPatch> = [];
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const el of nodes) {
    if (el === root) continue;
    const style = getComputedStyle(el);
    const blurPx = readBackdropBlurPx(style);
    if (blurPx <= 0) continue;
    patches.push({
      el,
      backdropFilter: el.style.backdropFilter,
      webkitBackdropFilter: el.style.getPropertyValue("-webkit-backdrop-filter"),
    });
    el.style.backdropFilter = "none";
    el.style.setProperty("-webkit-backdrop-filter", "none");
  }
  return () => {
    for (const item of patches) {
      item.el.style.backdropFilter = item.backdropFilter;
      if (item.webkitBackdropFilter === "") {
        item.el.style.removeProperty("-webkit-backdrop-filter");
      } else {
        item.el.style.setProperty("-webkit-backdrop-filter", item.webkitBackdropFilter);
      }
    }
  };
}

/** 毛玻璃节点超过该阈值时改用 flatten，避免角色列表等大图二次全量截图 */
const SHARE_BACKDROP_BAKE_MAX = 24;

type ShareBackdropMode = boolean | "auto" | "none";

/**
 * 大图按图片数量提高 worker 并发（须为 2 的幂，modern-screenshot 用位运算分发）
 * @since Beta v0.11.5
 * @param root - 截图根节点
 * @returns worker 数量
 */
function resolveShareWorkerNumber(root: HTMLElement): number {
  const imageCount = root.querySelectorAll("img").length;
  if (imageCount >= 256) return 8;
  if (imageCount >= 64) return 4;
  return 1;
}

/**
 * 按策略准备毛玻璃：强制时整页烘焙，自动模式下的大列表按卡片局部烘焙
 * @since Beta v0.11.5
 * @param root - 截图根节点
 * @param mode - true 强制烘焙 / false 强制 flatten / none 跳过 / auto 按数量选全局或局部烘焙
 * @returns 还原函数
 */
async function prepareShareBackdrops(
  root: HTMLElement,
  mode: ShareBackdropMode = "auto",
  onProgress?: ShareProgressFn,
  blurScale: number = 1,
): Promise<() => void> {
  if (mode === "none") return () => {};
  if (mode === false) {
    return flattenShareBackdropFilters(root);
  }

  let elementCount = 0;
  let pseudoCount = 0;
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const el of nodes) {
    if (el !== root && readBackdropBlurPx(getComputedStyle(el)) > 0) elementCount += 1;
    for (const pseudo of <const>["::before", "::after"]) {
      const style = getComputedStyle(el, pseudo);
      if (!hasGeneratedPseudoBox(style)) continue;
      if (readBackdropBlurPx(style) > 0) pseudoCount += 1;
    }
  }
  const count = elementCount + pseudoCount;
  if (count === 0) return () => {};

  const useLocal = mode === "auto" && pseudoCount === 0 && elementCount > SHARE_BACKDROP_BAKE_MAX;
  if (useLocal) {
    await TGLogger.Info(
      `[TGShare][prepareShareBackdrops] 毛玻璃元素 ${elementCount} 处，改用局部烘焙`,
    );
    return await bakeShareBackdropFiltersLocal(root, onProgress, blurScale);
  }
  return await bakeShareBackdropFilters(root, onProgress, blurScale);
}

type ShareBackdropElementPatch = {
  el: HTMLElement;
  backdropFilter: string;
  webkitBackdropFilter: string;
  background: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: string;
  backgroundColor: string;
  visibility: string;
  atlasMarker: string | null;
};

type ShareBackdropElementTarget = {
  el: HTMLElement;
  blurPx: number;
  radius: ShareCornerRadius;
  tint: string;
};

type ShareNestedBackdropElementTarget = {
  target: ShareBackdropElementTarget;
  host: HTMLElement;
  depth: number;
};

/**
 * 收集存在毛玻璃祖先的真实节点，并按由外到内排序
 * @since Beta v0.11.5
 */
function collectNestedBackdropElementTargets(
  targets: Array<ShareBackdropElementTarget>,
): Array<ShareNestedBackdropElementTarget> {
  const targetElements = new Set(targets.map(({ el }) => el));
  const nestedTargets: Array<ShareNestedBackdropElementTarget> = [];
  for (const target of targets) {
    let host: HTMLElement | undefined;
    let depth = 0;
    let ancestor = target.el.parentElement;
    while (ancestor !== null) {
      if (targetElements.has(ancestor)) {
        host ??= ancestor;
        depth += 1;
      }
      ancestor = ancestor.parentElement;
    }
    if (host !== undefined) nestedTargets.push({ target, host, depth });
  }
  return nestedTargets.sort((left, right) => left.depth - right.depth);
}

/**
 * 在外层毛玻璃已写回 DOM 后，由外到内重新烘焙嵌套毛玻璃
 * @since Beta v0.11.5
 */
async function rebakeNestedShareBackdropElements(
  nestedTargets: Array<ShareNestedBackdropElementTarget>,
  progressOffset: number,
  progressTotal: number,
  onProgress?: ShareProgressFn,
): Promise<void> {
  for (let index = 0; index < nestedTargets.length; index += 1) {
    const { target, host } = nestedTargets[index];
    const previousMarker = target.el.getAttribute(SHARE_BACKDROP_HIDE_ATTR);
    target.el.setAttribute(SHARE_BACKDROP_HIDE_ATTR, "1");
    let snapshotUrl: string | undefined;
    try {
      const hostRect = host.getBoundingClientRect();
      const targetRect = target.el.getBoundingClientRect();
      if (
        hostRect.width <= 0 ||
        hostRect.height <= 0 ||
        targetRect.width <= 0 ||
        targetRect.height <= 0
      ) {
        continue;
      }
      const blob = await domToBlob(host, {
        scale: 1,
        backgroundColor: null,
        filter: shareIgnoreFilter,
        timeout: 30000,
        font: false,
        workerUrl,
        workerNumber: 1,
        onCloneNode: (cloned) => {
          hideShareBackdropCloneTargets(cloned);
          if (cloned instanceof HTMLElement) hoistShareBackdropAtlasStyles(cloned);
        },
        onCreateForeignObjectSvg: embedShareBackdropAtlasStyles,
      });
      const loaded = await blobToImage(blob);
      snapshotUrl = loaded.url;
      const dataUrl = renderBakedBackdropDataUrl(
        loaded.img,
        hostRect,
        {
          left: targetRect.left,
          top: targetRect.top,
          width: targetRect.width,
          height: targetRect.height,
        },
        target.radius,
        target.blurPx,
        target.tint,
      );
      if (dataUrl !== undefined) applyBakedElementBackdrop(target.el, dataUrl);
    } catch (error) {
      await TGLogger.Warn(`[TGShare][rebakeNestedShareBackdropElements] 嵌套烘焙失败: ${error}`);
    } finally {
      if (previousMarker === null) target.el.removeAttribute(SHARE_BACKDROP_HIDE_ATTR);
      else target.el.setAttribute(SHARE_BACKDROP_HIDE_ATTR, previousMarker);
      if (snapshotUrl !== undefined) URL.revokeObjectURL(snapshotUrl);
      reportShareProgress(onProgress, {
        phase: "bake",
        current: progressOffset + index + 1,
        total: progressTotal,
      });
    }
  }
}

/**
 * 有限并发执行异步任务
 * @since Beta v0.11.5
 */
async function runPool(
  count: number,
  concurrency: number,
  worker: (index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, count) }, async () => {
    while (next < count) {
      const index = next;
      next += 1;
      await worker(index);
    }
  });
  await Promise.all(runners);
}

/**
 * 将烘焙结果写回真实毛玻璃节点
 * @since Beta v0.11.5
 */
function applyBakedElementBackdrop(el: HTMLElement, fill: string | ShareBakedFill): void {
  const url = typeof fill === "string" ? fill : fill.url;
  el.style.backdropFilter = "none";
  el.style.setProperty("-webkit-backdrop-filter", "none");
  el.style.backgroundColor = "transparent";
  el.style.backgroundImage = `url("${url}")`;
  if (typeof fill === "string" || fill.atlasW <= 0 || fill.atlasH <= 0) {
    el.removeAttribute(SHARE_BACKDROP_ATLAS_ATTR);
    el.style.backgroundPosition = "0 0";
    el.style.backgroundRepeat = "no-repeat";
    el.style.backgroundSize = "100% 100%";
    return;
  }
  el.setAttribute(SHARE_BACKDROP_ATLAS_ATTR, `${fill.atlasId ?? 0}`);
  el.style.backgroundRepeat = "no-repeat";
  el.style.backgroundSize = `${fill.atlasW}px ${fill.atlasH}px`;
  el.style.backgroundPosition = `${-fill.x}px ${-fill.y}px`;
}

/**
 * 还原毛玻璃节点样式
 * @since Beta v0.11.5
 */
function restoreBakedElementPatches(patches: Array<ShareBackdropElementPatch>): void {
  for (const item of patches) {
    item.el.style.backdropFilter = item.backdropFilter;
    if (item.webkitBackdropFilter === "") {
      item.el.style.removeProperty("-webkit-backdrop-filter");
    } else {
      item.el.style.setProperty("-webkit-backdrop-filter", item.webkitBackdropFilter);
    }
    item.el.style.background = item.background;
    item.el.style.backgroundImage = item.backgroundImage;
    item.el.style.backgroundSize = item.backgroundSize;
    item.el.style.backgroundPosition = item.backgroundPosition;
    item.el.style.backgroundRepeat = item.backgroundRepeat;
    item.el.style.backgroundColor = item.backgroundColor;
    item.el.style.visibility = item.visibility;
    if (item.atlasMarker === null) {
      item.el.removeAttribute(SHARE_BACKDROP_ATLAS_ATTR);
    } else {
      item.el.setAttribute(SHARE_BACKDROP_ATLAS_ATTR, item.atlasMarker);
    }
  }
}

/**
 * 收集根下真实节点毛玻璃目标
 * @since Beta v0.11.5
 */
function collectBackdropElementTargets(
  root: HTMLElement,
  blurScale: number,
): Array<ShareBackdropElementTarget> {
  const targets: Array<ShareBackdropElementTarget> = [];
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const el of nodes) {
    if (el === root) continue;
    const style = getComputedStyle(el);
    const blurPx = readBackdropBlurPx(style);
    if (blurPx <= 0) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    targets.push({
      el,
      blurPx: blurPx * blurScale,
      radius: parseBorderRadiusPx(style.borderRadius, rect.width, rect.height),
      tint: style.backgroundColor,
    });
  }
  return targets;
}

/**
 * 仅在 modern-screenshot 的克隆体中隐藏毛玻璃目标，避免真实 DOM 的图像层失效
 * @since Beta v0.11.5
 * @param cloned - 截图克隆根节点
 * @returns 无返回值
 */
function hideShareBackdropCloneTargets(cloned: Node): void {
  if (!(cloned instanceof HTMLElement)) return;
  const targets = [
    ...(cloned.hasAttribute(SHARE_BACKDROP_HIDE_ATTR) ? [cloned] : []),
    ...Array.from(cloned.querySelectorAll<HTMLElement>(`[${SHARE_BACKDROP_HIDE_ATTR}]`)),
  ];
  for (const target of targets) target.style.visibility = "hidden";
}

/**
 * 大列表局部烘焙：对每个毛玻璃节点，只截其父容器（如名片中段），有限并发
 * @since Beta v0.11.5
 * @param root - 截图根（仅用于收集目标）
 * @returns 还原函数
 */
async function bakeShareBackdropFiltersLocal(
  root: HTMLElement,
  onProgress?: ShareProgressFn,
  blurScale: number = 1,
): Promise<() => void> {
  const targets = collectBackdropElementTargets(root, blurScale);
  if (targets.length === 0) return () => {};
  const nestedTargets = collectNestedBackdropElementTargets(targets);
  const nestedElements = new Set(nestedTargets.map(({ target }) => target.el));
  const baseTargets = targets.filter(({ el }) => !nestedElements.has(el));

  const patches: Array<ShareBackdropElementPatch> = targets.map(({ el }) => ({
    el,
    backdropFilter: el.style.backdropFilter,
    webkitBackdropFilter: el.style.getPropertyValue("-webkit-backdrop-filter"),
    background: el.style.background,
    backgroundImage: el.style.backgroundImage,
    backgroundSize: el.style.backgroundSize,
    backgroundPosition: el.style.backgroundPosition,
    backgroundRepeat: el.style.backgroundRepeat,
    backgroundColor: el.style.backgroundColor,
    visibility: el.style.visibility,
    atlasMarker: el.getAttribute(SHARE_BACKDROP_ATLAS_ATTR),
  }));

  reportShareProgress(onProgress, { phase: "bake", current: 0, total: targets.length });
  let completed = 0;
  await runPool(baseTargets.length, 4, async (index) => {
    try {
      const target = baseTargets[index];
      const host = target.el.parentElement;
      if (host === null) return;

      const previousMarker = target.el.getAttribute(SHARE_BACKDROP_HIDE_ATTR);
      target.el.setAttribute(SHARE_BACKDROP_HIDE_ATTR, "1");
      let snapshotUrl: string | undefined;
      try {
        const hostRect = host.getBoundingClientRect();
        const elRect = target.el.getBoundingClientRect();
        if (
          hostRect.width <= 0 ||
          hostRect.height <= 0 ||
          elRect.width <= 0 ||
          elRect.height <= 0
        ) {
          return;
        }
        const blob = await domToBlob(host, {
          scale: 1,
          backgroundColor: null,
          filter: shareIgnoreFilter,
          timeout: 30000,
          font: false,
          workerUrl,
          workerNumber: 1,
          onCloneNode: hideShareBackdropCloneTargets,
        });
        const loaded = await blobToImage(blob);
        snapshotUrl = loaded.url;
        const dataUrl = renderBakedBackdropDataUrl(
          loaded.img,
          hostRect,
          {
            left: elRect.left,
            top: elRect.top,
            width: elRect.width,
            height: elRect.height,
          },
          target.radius,
          target.blurPx,
          target.tint,
        );
        if (dataUrl !== undefined) applyBakedElementBackdrop(target.el, dataUrl);
      } catch (e) {
        await TGLogger.Warn(`[TGShare][bakeShareBackdropFiltersLocal] 局部烘焙失败: ${e}`);
      } finally {
        if (previousMarker === null) target.el.removeAttribute(SHARE_BACKDROP_HIDE_ATTR);
        else target.el.setAttribute(SHARE_BACKDROP_HIDE_ATTR, previousMarker);
        if (snapshotUrl !== undefined) URL.revokeObjectURL(snapshotUrl);
      }
    } finally {
      completed += 1;
      reportShareProgress(onProgress, {
        phase: "bake",
        current: completed,
        total: targets.length,
      });
    }
  });
  await rebakeNestedShareBackdropElements(
    nestedTargets,
    baseTargets.length,
    targets.length,
    onProgress,
  );

  return () => {
    restoreBakedElementPatches(patches);
  };
}

/**
 * 将毛玻璃烘焙为圆角背景图（foreignObject 无法正确裁切 backdrop-filter）
 * 同时处理真实节点与 ::before / ::after 伪元素。
 * @since Beta v0.11.5
 * @param root - 截图根节点
 * @returns 还原函数
 */
async function bakeShareBackdropFilters(
  root: HTMLElement,
  onProgress?: ShareProgressFn,
  blurScale: number = 1,
): Promise<() => void> {
  type ElementTarget = {
    kind: "element";
    el: HTMLElement;
    blurPx: number;
    radius: ShareCornerRadius;
    tint: string;
  };

  type PseudoTarget = {
    kind: "pseudo";
    el: HTMLElement;
    pseudo: SharePseudoKind;
    attr: string;
    box: ShareBoxRect;
    blurPx: number;
    radius: ShareCornerRadius;
    tint: string;
  };

  type BackdropTarget = ElementTarget | PseudoTarget;

  const targets: Array<BackdropTarget> = [];
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const el of nodes) {
    if (el !== root) {
      const style = getComputedStyle(el);
      const blurPx = readBackdropBlurPx(style);
      if (blurPx > 0) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          targets.push({
            kind: "element",
            el,
            blurPx: blurPx * blurScale,
            radius: parseBorderRadiusPx(style.borderRadius, rect.width, rect.height),
            tint: style.backgroundColor,
          });
        }
      }
    }

    for (const pseudo of <const>["::before", "::after"]) {
      const style = getComputedStyle(el, pseudo);
      if (!hasGeneratedPseudoBox(style)) continue;
      const blurPx = readBackdropBlurPx(style);
      if (blurPx <= 0) continue;
      const box = resolvePseudoBoxRect(el, style);
      if (box === undefined) continue;
      targets.push({
        kind: "pseudo",
        el,
        pseudo,
        attr: pseudo === "::before" ? "data-tg-share-bd-before" : "data-tg-share-bd-after",
        box,
        blurPx: blurPx * blurScale,
        radius: parseBorderRadiusPx(style.borderRadius, box.width, box.height),
        tint: style.backgroundColor,
      });
    }
  }
  if (targets.length === 0) return () => {};

  const elementTargets = targets.filter((t): t is ElementTarget => t.kind === "element");
  const pseudoTargets = targets.filter((t): t is PseudoTarget => t.kind === "pseudo");
  const nestedElementTargets = collectNestedBackdropElementTargets(elementTargets);
  const bakeTotal = targets.length + nestedElementTargets.length;

  const elementPatches: Array<ShareBackdropElementPatch> = elementTargets.map(({ el }) => ({
    el,
    backdropFilter: el.style.backdropFilter,
    webkitBackdropFilter: el.style.getPropertyValue("-webkit-backdrop-filter"),
    background: el.style.background,
    backgroundImage: el.style.backgroundImage,
    backgroundSize: el.style.backgroundSize,
    backgroundPosition: el.style.backgroundPosition,
    backgroundRepeat: el.style.backgroundRepeat,
    backgroundColor: el.style.backgroundColor,
    visibility: el.style.visibility,
    atlasMarker: el.getAttribute(SHARE_BACKDROP_ATLAS_ATTR),
  }));

  const aboveTargets: Array<HTMLElement> = [];
  const aboveSeen = new Set<HTMLElement>();
  for (const target of pseudoTargets) {
    const pseudoStyle = getComputedStyle(target.el, target.pseudo);
    for (const child of collectChildrenAbovePseudo(target.el, pseudoStyle)) {
      if (aboveSeen.has(child)) continue;
      aboveSeen.add(child);
      aboveTargets.push(child);
    }
  }

  let styleEl: HTMLStyleElement | undefined;
  for (const item of elementPatches) item.el.setAttribute(SHARE_BACKDROP_HIDE_ATTR, "1");
  for (const item of aboveTargets) item.setAttribute(SHARE_BACKDROP_HIDE_ATTR, "1");
  for (const target of pseudoTargets) target.el.setAttribute(target.attr, "1");

  const cleanupSnapshotMarks = (): void => {
    for (const item of elementPatches) item.el.removeAttribute(SHARE_BACKDROP_HIDE_ATTR);
    for (const item of aboveTargets) item.removeAttribute(SHARE_BACKDROP_HIDE_ATTR);
  };

  const cleanupPseudoMarks = (): void => {
    styleEl?.remove();
    cleanupSnapshotMarks();
    for (const target of pseudoTargets) {
      target.el.removeAttribute(target.attr);
    }
  };

  let snapshot: HTMLImageElement;
  let snapshotUrl: string | undefined;
  try {
    reportShareProgress(onProgress, { phase: "snapshot", current: 0, total: 1 });
    const scale =
      targets.length > SHARE_BACKDROP_BAKE_MAX ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const blob = await domToBlob(root, {
      scale,
      backgroundColor: null,
      filter: shareIgnoreFilter,
      timeout: 60000,
      // 烘焙快照只需像素，跳过字体嵌入以加速
      font: false,
      workerUrl,
      workerNumber: resolveShareWorkerNumber(root),
      drawImageInterval: 0,
      onCloneNode: (cloned) => {
        hideShareBackdropCloneTargets(cloned);
        if (!(cloned instanceof HTMLElement) || pseudoTargets.length === 0) return;
        const cloneStyle = cloned.ownerDocument.createElement("style");
        cloneStyle.textContent = pseudoTargets
          .map((target) => `[${target.attr}]${target.pseudo}{visibility:hidden!important}`)
          .join("");
        cloned.insertBefore(cloneStyle, cloned.firstChild);
      },
    });
    const loaded = await blobToImage(blob);
    snapshot = loaded.img;
    snapshotUrl = loaded.url;
    reportShareProgress(onProgress, { phase: "snapshot", current: 1, total: 1 });
  } catch (e) {
    cleanupPseudoMarks();
    await TGLogger.Warn(`[TGShare][bakeShareBackdropFilters] 背景快照失败: ${e}`);
    return () => {};
  }

  cleanupSnapshotMarks();

  const rootRect = root.getBoundingClientRect();
  const bakeJobs: Array<ShareBackdropBakeJob> = targets.map((target) => {
    if (target.kind === "element") {
      const rect = target.el.getBoundingClientRect();
      return {
        box: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        radius: target.radius,
        blurPx: target.blurPx,
        tint: target.tint,
      };
    }
    return {
      box: target.box,
      radius: target.radius,
      blurPx: target.blurPx,
      tint: target.tint,
    };
  });
  const initialBakeProgress: ShareProgressFn | undefined =
    nestedElementTargets.length === 0
      ? onProgress
      : (progress) => {
          reportShareProgress(
            onProgress,
            progress.phase === "bake" ? { ...progress, total: bakeTotal } : progress,
          );
        };
  const bakedUrls = await renderBakedBackdropUrls(
    snapshot,
    rootRect,
    bakeJobs,
    initialBakeProgress,
    pseudoTargets.length === 0,
  );
  const bakedPseudoRules: Array<string> = [];

  for (let index = 0; index < targets.length; index += 1) {
    const fill = bakedUrls[index];
    if (fill === undefined) continue;
    const target = targets[index];
    if (target.kind === "element") {
      applyBakedElementBackdrop(target.el, fill);
      continue;
    }

    bakedPseudoRules.push(
      `[${target.attr}]${target.pseudo}{` +
        `-webkit-backdrop-filter:none!important;` +
        `backdrop-filter:none!important;` +
        `background-color:transparent!important;` +
        `background-image:url("${fill.url}")!important;` +
        `background-size:100% 100%!important;` +
        `}`,
    );
  }

  if (bakedPseudoRules.length > 0) {
    styleEl = document.createElement("style");
    styleEl.setAttribute("data-tg-share-bd-style", "1");
    styleEl.textContent = bakedPseudoRules.join("");
    document.head.appendChild(styleEl);
  }
  await rebakeNestedShareBackdropElements(
    nestedElementTargets,
    targets.length,
    bakeTotal,
    onProgress,
  );
  if (snapshotUrl !== undefined) URL.revokeObjectURL(snapshotUrl);

  return () => {
    restoreBakedElementPatches(elementPatches);
    cleanupPseudoMarks();
    const blobUrls = new Set(
      bakedUrls
        .map((bake) => bake?.url)
        .filter((url): url is string => url !== undefined && url.startsWith("blob:")),
    );
    for (const url of blobUrls) URL.revokeObjectURL(url);
  };
}

/**
 * 处理分享图 Buffer：按设置写入文件或复制到剪贴板
 * @since Beta v0.11.5
 * @param tag - 日志标签
 * @param fileName - 文件名
 * @param buffer - 图片数据
 * @returns 无返回值
 */
async function handleShareBuffer(
  tag: string,
  fileName: string,
  buffer: ArrayBuffer,
): Promise<void> {
  const size = buffer.byteLength;
  const sizeStr = fmtUtil.size(size);
  await TGLogger.Info(`[${tag}][${fileName}] 图像大小为 ${sizeStr}`);
  const { shareDefaultFile } = storeToRefs(useAppStore());
  if (shareDefaultFile.value === 0) {
    await saveBufferFile(buffer, fileName);
    return;
  }
  if (typeof shareDefaultFile.value === "number" && size > shareDefaultFile.value * 1024 * 1024) {
    await saveBufferFile(buffer, fileName);
    return;
  }
  try {
    await copyToClipboard(buffer);
    showSnackbar.success(`已将 ${fileName} 复制到剪贴板，大小为 ${sizeStr}`);
    await TGLogger.Info(`[${tag}][${fileName}] 已将图像复制到剪贴板`);
  } catch (e) {
    await TGLogger.Error(`[${tag}][${fileName}] 复制到剪贴板失败 ${e}`);
    await saveBufferFile(buffer, fileName);
  }
}

/**
 * 生成分享截图
 * @since Beta v0.11.5
 * @param fileName - 文件名
 * @param element - 元素
 * @param scale - 缩放比例
 * @param scrollable - 是否可滚动，一般为上下滚动
 * @returns 无返回值
 */
export async function generateShareImg(
  fileName: string,
  element: HTMLElement,
  scale: number = 1.5,
  scrollable: boolean = false,
): Promise<void> {
  const canvas = document.createElement("canvas");
  const maxHeight = element.style?.maxHeight;
  if (scrollable) element.style.maxHeight = "100%";
  const width = element.clientWidth + 30;
  const height = (scrollable ? element.scrollHeight : element.clientHeight) + 30;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const opts = {
    backgroundColor: getShareImgBgColor(),
    windowHeight: height,
    scale,
    width,
    height,
    useCORS: true,
    canvas,
    x: -15,
    y: -15,
  };
  let canvasData;
  try {
    // @ts-expect-error This expression is not callable.
    canvasData = await html2canvas(element, opts);
  } catch (e) {
    await TGLogger.Error(`[generateShareImg][${fileName}] 生成分享截图失败 ${e}`);
    showSnackbar.error(`生成分享截图失败: ${e}`);
    return;
  } finally {
    if (scrollable) element.style.maxHeight = maxHeight;
  }
  const bf = new Uint8Array(
    atob(canvasData.toDataURL("image/png").split(",")[1])
      .split("")
      .map((item) => item.charCodeAt(0)),
  );
  await handleShareBuffer("generateShareImg", fileName, bf.buffer);
}

/**
 * modern 截图可选参数
 * @since Beta v0.11.5
 */
export type ShareModernOptions = {
  /** 毛玻璃：true 烘焙 / false flatten / none 跳过 / auto 少量烘焙、过多局部烘焙。默认 auto */
  bakeBackdrop?: ShareBackdropMode;
  /** Canvas 烘焙的 blur 强度系数；用于校准特定分享视图，默认 1 */
  backdropBlurScale?: number;
  /**
   * 外层画布边距（逻辑像素）。只加在截图容器上，不改被截节点的 padding。
   * @since Beta v0.11.5
   */
  ppx?: number;
  /**
   * 快照 / 毛玻璃烘焙 / 最终截图进度
   * @since Beta v0.11.5
   */
  onProgress?: ShareProgressFn;
};

/**
 * 生成分享截图（modern-screenshot）
 * @since Beta v0.11.5
 * @param fileName - 文件名
 * @param element - 元素
 * @param scale - 缩放比例
 * @param scrollable - 是否可滚动，一般为上下滚动
 * @param options - 可选优化项
 * @returns 无返回值
 */
export async function gsiModernScreenshot(
  fileName: string,
  element: HTMLElement,
  scale: number = 1.5,
  scrollable: boolean = false,
  options?: ShareModernOptions,
): Promise<void> {
  let blob: Blob;
  try {
    blob = await captureModernBlob(element, scale, scrollable, undefined, options);
    const paddingPx = options?.ppx ?? 0;
    if (paddingPx > 0) blob = await frameShareBlob(blob, paddingPx, scale);
  } catch (e) {
    await TGLogger.Error(`[gsiModernScreenshot][${fileName}] 生成分享截图失败 ${e}`);
    showSnackbar.error(`生成分享截图失败: ${e}`);
    return;
  }
  await handleShareBuffer("gsiModernScreenshot", fileName, await blob.arrayBuffer());
}

/**
 * 在截图外围铺边距背景，相当于把渲染内容放进新容器，不改动原节点样式
 * @since Beta v0.11.5
 * @param blob - 原始截图
 * @param paddingPx - 逻辑像素边距
 * @param scale - 截图缩放
 * @returns 带边距背景的截图
 */
async function frameShareBlob(blob: Blob, paddingPx: number, scale: number): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadShareWarmupImage(url);
    if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return blob;
    const pad = Math.round(paddingPx * scale);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth + pad * 2;
    canvas.height = img.naturalHeight + pad * 2;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return blob;
    ctx.fillStyle = getShareImgBgColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, pad, pad);
    const framed = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((next) => resolve(next), "image/png");
    });
    if (framed === null) return blob;
    return framed;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 生成分享截图（snapdom）
 * @since Beta v0.11.5
 * @param fileName - 文件名
 * @param element - 元素
 * @param scale - 缩放比例
 * @param scrollable - 是否可滚动，一般为上下滚动
 * @returns 无返回值
 */
export async function gsiSnapdom(
  fileName: string,
  element: HTMLElement,
  scale: number = 1.5,
  scrollable: boolean = false,
): Promise<void> {
  let blob: Blob;
  try {
    blob = await captureSnapBlob(element, scale, scrollable);
  } catch (e) {
    await TGLogger.Error(`[gsiSnapdom][${fileName}] 生成分享截图失败 ${e}`);
    showSnackbar.error(`生成分享截图失败: ${e}`);
    return;
  }
  await handleShareBuffer("gsiSnapdom", fileName, await blob.arrayBuffer());
}

type ShareColdBenchResult = {
  /** modern 截图层耗时（不含保存） */
  modernMs: number;
  /** snap 截图层耗时（不含保存） */
  snapMs: number;
  /** modern 输出字节数 */
  modernBytes: number;
  /** snap 输出字节数 */
  snapBytes: number;
};

/**
 * 清空可重置的分享截图缓存（模块级字体 CSS；snap 侧用 cache:'disabled'）
 * @since Beta v0.11.5
 */
function resetShareCaptureCaches(): void {
  shareFontFaceCss = undefined;
  shareFontEmbedTask = undefined;
  shareSvgFontsWarmed = false;
}

/**
 * 为冷启动测速给字体 URL 加防缓存参数
 * @since Beta v0.11.5
 * @param url - 原始 URL
 * @param nonce - 防缓存随机串
 * @returns 带 query 的 URL
 */
function bustShareFontUrl(url: string, nonce: string): string {
  const abs = new URL(url, window.location.href);
  abs.searchParams.set("tgShareCold", nonce);
  return abs.href;
}

/**
 * 仅生成 modern-screenshot Blob（不含保存/剪贴板）
 * @since Beta v0.11.5
 */
async function captureModernBlob(
  element: HTMLElement,
  scale: number,
  scrollable: boolean,
  fontUrlBust?: string,
  options?: ShareModernOptions,
): Promise<Blob> {
  const maxHeight = element.style?.maxHeight;
  if (scrollable) element.style.maxHeight = "100%";

  let shareCss: string | undefined;
  if (fontUrlBust !== undefined) {
    // 冷启动：不走模块缓存，强制重新 fetch 字体
    const prev = shareFontFaceCss;
    shareFontFaceCss = undefined;
    shareSvgFontsWarmed = false;
    const specs = SHARE_FONT_SPECS.map((spec) => ({
      ...spec,
      url: bustShareFontUrl(spec.url, fontUrlBust),
    }));
    shareCss = await embedShareFontSpecs(specs, "[TGShare][captureModernBlob][cold]");
    shareFontFaceCss = prev;
  } else {
    shareCss = await ensureShareFontEmbed();
    if (shareCss === undefined) {
      showSnackbar.warn("分享字体嵌入失败，文本样式可能异常");
    }
  }
  if (shareCss !== undefined) {
    await warmupShareSvgFonts(shareCss);
  }

  const restoreIconFonts = patchShareIconFonts(element);
  const restoreBackdrop = await prepareShareBackdrops(
    element,
    options?.bakeBackdrop ?? "auto",
    options?.onProgress,
    options?.backdropBlurScale ?? 1,
  );
  const injectors = createShareFontInjectors(shareCss);
  const imageCount = element.querySelectorAll("img").length;
  const workerNumber = resolveShareWorkerNumber(element);
  const captureStarted = performance.now();
  try {
    const blob = await domToBlob(element, {
      backgroundColor: getShareRootBgColor(element),
      scale,
      timeout: 120000,
      drawImageInterval: 0,
      ...(scrollable ? { height: element.scrollHeight } : {}),
      filter: shareIgnoreFilter,
      // 已注入分享字体时跳过页面字体扫描，大列表可明显加速
      ...(shareCss !== undefined ? { font: { cssText: shareCss } } : {}),
      workerUrl,
      workerNumber,
      progress: (current, total) => {
        reportShareProgress(options?.onProgress, { phase: "capture", current, total });
      },
      features: {
        restoreScrollPosition: scrollable,
        copyScrollbar: false,
        fixSvgXmlDecode: false,
      },
      onCloneNode: injectors.onCloneNode,
      onCreateForeignObjectSvg: injectors.onCreateForeignObjectSvg,
    });
    await TGLogger.Info(
      `[TGShare][captureModernBlob] ${Math.round(performance.now() - captureStarted)}ms · img ${imageCount} · worker ${workerNumber}`,
    );
    return blob;
  } finally {
    restoreBackdrop();
    restoreIconFonts();
    if (scrollable) element.style.maxHeight = maxHeight;
  }
}

/**
 * 仅生成 snapdom Blob（不含保存/剪贴板）
 * @since Beta v0.11.5
 */
async function captureSnapBlob(
  element: HTMLElement,
  scale: number,
  scrollable: boolean,
  opts?: { fontUrlBust?: string; cacheDisabled?: boolean },
): Promise<Blob> {
  const maxHeight = element.style?.maxHeight;
  if (scrollable) element.style.maxHeight = "100%";
  const restoreMdi = await bakeShareMdiIcons(element);
  const bust = opts?.fontUrlBust;
  try {
    return await snapdom.toBlob(element, {
      type: "png",
      backgroundColor: getShareImgBgColor(),
      scale,
      dpr: 1,
      ...(scrollable ? { height: element.scrollHeight } : {}),
      exclude: ["[data-html2canvas-ignore]"],
      excludeMode: "remove",
      embedFonts: true,
      localFonts: SHARE_FONT_SPECS.filter((spec) => spec.family !== MDI_FONT_FAMILY).map(
        (spec) => ({
          family: spec.family,
          src:
            bust !== undefined
              ? bustShareFontUrl(spec.url, bust)
              : new URL(spec.url, window.location.href).href,
          weight: "normal",
          style: "normal",
        }),
      ),
      reconcile: true,
      compress: false,
      outerShadows: true,
      ...(opts?.cacheDisabled === true ? { cache: <const>"disabled" } : {}),
    });
  } finally {
    restoreMdi();
    if (scrollable) element.style.maxHeight = maxHeight;
  }
}

/**
 * 冷启动对比 modern / snap（仅截图层，不含保存；各自独立清缓存 + 字体 URL 防缓存）
 * @since Beta v0.11.5
 * @param element - 截图根节点
 * @param scale - 缩放
 * @returns 两侧耗时与体积
 */
export async function benchShareColdStart(
  element: HTMLElement,
  scale: number = 1.5,
): Promise<ShareColdBenchResult> {
  resetShareCaptureCaches();
  const modernNonce = `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const modernStart = performance.now();
  const modernBlob = await captureModernBlob(element, scale, false, modernNonce);
  const modernMs = Math.round(performance.now() - modernStart);

  resetShareCaptureCaches();
  // 让出一帧，避免两趟 bake 紧挨着互相影响布局测量
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

  const snapNonce = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const snapStart = performance.now();
  const snapBlob = await captureSnapBlob(element, scale, false, {
    fontUrlBust: snapNonce,
    cacheDisabled: true,
  });
  const snapMs = Math.round(performance.now() - snapStart);

  const result: ShareColdBenchResult = {
    modernMs,
    snapMs,
    modernBytes: modernBlob.size,
    snapBytes: snapBlob.size,
  };
  await TGLogger.Info(
    `[TGShare][benchShareColdStart] modern ${result.modernMs}ms / ${fmtUtil.size(result.modernBytes)} · snap ${result.snapMs}ms / ${fmtUtil.size(result.snapBytes)}`,
  );
  return result;
}

/**
 * 复制到剪贴板
 * @since Beta v0.9.0
 * @param buffer - 图片数据
 * @returns 无返回值
 */
export async function copyToClipboard(buffer: ArrayBuffer): Promise<void> {
  const bf = new Uint8Array(buffer);
  const blob = new Blob([bf], { type: "image/png" });
  const url = URL.createObjectURL(blob);
  // todo mac 会报错: https://bugs.webkit.org/show_bug.cgi?id=222262
  if (platform() === "macos") {
    navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]).then(
      () => URL.revokeObjectURL(url),
      (err) => TGLogger.Error(`[copyToClipboard] 复制到剪贴板失败: ${err}`),
    );
    return;
  }
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  URL.revokeObjectURL(url);
}

/**
 * 分享截图入口
 * @since Beta v0.11.5
 */
const TGShare = <const>{
  /** modern-screenshot */
  modern: gsiModernScreenshot,
  /** snapdom */
  snap: gsiSnapdom,
  /** 冷启动对比（不含保存） */
  benchCold: benchShareColdStart,
};

export default TGShare;
