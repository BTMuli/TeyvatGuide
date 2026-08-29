/**
 * 页面渲染容器背景。
 * @since Beta v0.12.0
 */

import hoyoPlayReq from "@req/hoyoPlayReq.js";
import useAppStore from "@store/app.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { onMounted, onUnmounted, ref } from "vue";
import type { Ref } from "vue";

const pageCoverUrl = ref<string | null>(null);
const pageCoverUrls = ref<Array<string>>([]);
const pageCoverIndex = ref<number>(0);
const RotateIntervalMs: Readonly<number> = 20000;

let rotateTimer: number | null = null;
let coverRequestId = 0;
let rotating = false;

/**
 * 读取当前交给渲染容器的页面背景。
 * @since Beta v0.12.0
 * @returns 页面背景地址、轮换列表与当前下标
 */
export function usePageCover(): {
  pageCoverIndex: Ref<number>;
  pageCoverUrl: Ref<string | null>;
  pageCoverUrls: Ref<Array<string>>;
} {
  return { pageCoverIndex, pageCoverUrl, pageCoverUrls };
}

/**
 * 判断地址是否可作为页面背景。
 * @since Beta v0.12.0
 * @param url - 资源地址
 * @returns 是否为 https 地址
 */
function isSafeCoverUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 预加载背景图，避免轮换时闪空。
 * @since Beta v0.12.0
 * @param url - 背景地址
 * @returns 预加载完成
 */
async function preloadCover(url: string): Promise<void> {
  await new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

/**
 * 从背景条目中取出可用于页面背景的静态图。
 * @since Beta v0.12.0
 * @param backgrounds - 启动器背景列表
 * @returns 去重后的 https 背景地址
 */
function collectCoverUrls(backgrounds: Array<TGApp.Game.HoYoPlay.Background>): Array<string> {
  const urls: Array<string> = [];
  for (const background of backgrounds) {
    const url = background.background.url.trim();
    if (url === "" || !isSafeCoverUrl(url) || urls.includes(url)) continue;
    urls.push(url);
  }
  return urls;
}

/**
 * 是否应跳过自动轮换。
 * @since Beta v0.12.0
 * @returns 系统要求减少动效时为 true
 */
function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * 判断请求是否仍是当前轮次。
 * @since Beta v0.12.0
 * @param requestId - 请求代次
 * @returns 是否仍有效
 */
function isCurrentRequest(requestId: number): boolean {
  return requestId === coverRequestId;
}

/**
 * 停止自动轮换。
 * @since Beta v0.12.0
 */
function stopRotation(): void {
  if (rotateTimer === null) return;
  window.clearInterval(rotateTimer);
  rotateTimer = null;
}

/**
 * 清空渲染容器背景。
 * @since Beta v0.12.0
 */
function clearPageCover(): void {
  stopRotation();
  pageCoverUrl.value = null;
  pageCoverUrls.value = [];
  pageCoverIndex.value = 0;
}

/**
 * 展示指定下标的背景。
 * @since Beta v0.12.0
 * @param index - 背景下标
 * @param requestId - 请求代次
 */
async function showCover(index: number, requestId: number): Promise<void> {
  const url = pageCoverUrls.value[index];
  if (url === undefined) return;
  rotating = true;
  try {
    await preloadCover(url);
    if (!isCurrentRequest(requestId)) return;
    pageCoverIndex.value = index;
    pageCoverUrl.value = url;
  } finally {
    rotating = false;
  }
}

/**
 * 启动自动轮换。
 * @since Beta v0.12.0
 * @param requestId - 请求代次
 */
function startRotation(requestId: number): void {
  stopRotation();
  if (prefersReducedMotion() || pageCoverUrls.value.length < 2) return;
  rotateTimer = window.setInterval(() => {
    if (rotating || !isCurrentRequest(requestId) || pageCoverUrls.value.length < 2) return;
    const next = (pageCoverIndex.value + 1) % pageCoverUrls.value.length;
    void showCover(next, requestId);
  }, RotateIntervalMs);
}

/**
 * 手动切换到指定轮换背景，并重新计时。
 * @since Beta v0.12.0
 * @param index - 背景下标
 */
export function selectPageCover(index: number): void {
  const requestId = coverRequestId;
  if (!isCurrentRequest(requestId)) return;
  if (index < 0 || index >= pageCoverUrls.value.length) return;
  if (index === pageCoverIndex.value) return;
  void showCover(index, requestId).then(() => {
    if (!isCurrentRequest(requestId)) return;
    startRotation(requestId);
  });
}

/**
 * 拉取国服官服 HoYoPlay 轮换背景并交给应用渲染容器。
 * @since Beta v0.12.0
 */
export function useHoYoPlayPageCover(): void {
  const appStore = useAppStore();

  async function applyBackgrounds(requestId: number): Promise<void> {
    const backgrounds = await hoyoPlayReq.backgrounds(appStore.lang);
    if (!isCurrentRequest(requestId)) return;
    const urls = collectCoverUrls(backgrounds);
    if (urls.length === 0) {
      clearPageCover();
      return;
    }
    pageCoverUrls.value = urls;
    await showCover(0, requestId);
    if (!isCurrentRequest(requestId)) return;
    startRotation(requestId);
  }

  onMounted(() => {
    const requestId = ++coverRequestId;
    void applyBackgrounds(requestId).catch(async (error: unknown) => {
      if (!isCurrentRequest(requestId)) return;
      await TGLogger.Warn(`[PageCover] 获取启动器背景失败：${TGHttps.getErrMsg(error)}`);
    });
  });

  onUnmounted(() => {
    coverRequestId += 1;
    clearPageCover();
  });
}
