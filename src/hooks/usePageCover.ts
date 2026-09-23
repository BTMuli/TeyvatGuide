/**
 * 游戏安装页的启动器轮换背景。
 * @since Beta v0.12.4
 */

import hoyoPlayReq from "@req/hoyoPlayReq.js";
import useAppStore from "@store/app.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { onMounted, onUnmounted, ref } from "vue";
import type { Ref } from "vue";

/**
 * 单张启动器背景。
 * @since Beta v0.12.4
 */
export type PageCoverItem = {
  /** 背景 ID */
  id: string;
  /** 静态背景图；动态背景为该视频的封面图 */
  imageUrl: string;
  /** 动态背景视频地址；静态背景或系统要求减少动效时为 null */
  videoUrl: string | null;
  /** 动态背景叠加图地址；无叠加图或系统要求减少动效时为 null */
  themeUrl: string | null;
  /** 动态背景是否暂停播放；暂停时页面显示静态背景图 */
  videoPaused: boolean;
};

/**
 * 轮换背景状态与操作。
 * @since Beta v0.12.4
 */
type PageCoverContext = {
  /** 当前背景 */
  pageCoverCurrent: Ref<PageCoverItem | null>;
  /** 当前背景下标 */
  pageCoverIndex: Ref<number>;
  /** 轮换背景列表 */
  pageCoverItems: Ref<Array<PageCoverItem>>;
  /** 是否会自动轮换 */
  pageCoverRotationAvailable: Ref<boolean>;
  /** 是否暂停自动轮换 */
  pageCoverRotationPaused: Ref<boolean>;
  /** 当前轮换窗口已用比例，0~1 */
  pageCoverRotationProgress: Ref<number>;
  /** 切换到指定背景 */
  selectPageCover: (index: number) => void;
  /** 暂停或继续自动轮换 */
  togglePageCoverRotationPaused: () => void;
  /** 切换指定动态背景的播放 */
  togglePageCoverVideoPaused: (index: number) => void;
};

const RotateIntervalMs: Readonly<number> = 120_000;
const RotateProgressTickMs: Readonly<number> = 500;

const pageCoverCurrent = ref<PageCoverItem | null>(null);
const pageCoverItems = ref<Array<PageCoverItem>>([]);
const pageCoverIndex = ref<number>(0);
const pageCoverRotationAvailable = ref<boolean>(false);
const pageCoverRotationPaused = ref<boolean>(false);
const pageCoverRotationProgress = ref<number>(0);

let rotateTimer: number | null = null;
let progressTimer: number | null = null;
let rotateStartedAt = 0;
let rotateElapsedMs = 0;
let coverSession = 0;
let rotating = false;
let coverInUse = false;

/**
 * 使用启动器轮换背景；背景只在游戏安装页展示，状态与计时由本模块共享。
 * @since Beta v0.12.4
 * @returns 背景状态与操作
 */
export function usePageCover(): PageCoverContext {
  if (!coverInUse) {
    coverInUse = true;
    const appStore = useAppStore();
    onMounted(() => {
      void loadBackdrops(appStore.lang);
    });
    onUnmounted(handleCoverUnmount);
  }
  return {
    pageCoverCurrent,
    pageCoverIndex,
    pageCoverItems,
    pageCoverRotationAvailable,
    pageCoverRotationPaused,
    pageCoverRotationProgress,
    selectPageCover,
    togglePageCoverRotationPaused,
    togglePageCoverVideoPaused,
  };
}

/**
 * 拉取轮换背景并交给页面渲染。
 * @since Beta v0.12.4
 * @param language - 语言
 */
async function loadBackdrops(language: TGApp.Game.Anno.AnnoLangEnum): Promise<void> {
  const session = ++coverSession;
  try {
    const backgrounds = await hoyoPlayReq.backgrounds(language);
    if (session !== coverSession) return;
    const covers = collectCovers(backgrounds);
    if (covers.length === 0) {
      clearPageCover();
      return;
    }
    pageCoverItems.value = covers;
    pageCoverRotationAvailable.value = !prefersReducedMotion() && covers.length > 1;
    await showCover(0, session);
    if (session !== coverSession) return;
    startRotation(session);
  } catch (error) {
    if (session !== coverSession) return;
    await TGLogger.Warn(`[PageCover] 获取启动器背景失败：${TGHttps.getErrMsg(error)}`);
  }
}

/**
 * 页面卸载时清空背景并停止计时。
 * @since Beta v0.12.4
 */
function handleCoverUnmount(): void {
  coverSession += 1;
  coverInUse = false;
  clearPageCover();
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
 * 从背景条目中取出可用于页面背景的静态图与动态视频；系统要求减少动效时只保留静态图。
 * @since Beta v0.12.4
 * @param backgrounds - 启动器背景列表
 * @returns 去重后的页面背景
 */
function collectCovers(backgrounds: Array<TGApp.Game.HoYoPlay.Background>): Array<PageCoverItem> {
  const covers: Array<PageCoverItem> = [];
  const ids = new Set<string>();
  const motionAllowed = !prefersReducedMotion();
  for (const background of backgrounds) {
    const imageUrl = background.background.url.trim();
    if (imageUrl === "" || !isSafeCoverUrl(imageUrl)) continue;
    const id = background.id.trim() === "" ? imageUrl : background.id.trim();
    if (ids.has(id)) continue;
    ids.add(id);
    const videoUrl = (background.video?.url ?? "").trim();
    const themeUrl = (background.theme?.url ?? "").trim();
    covers.push({
      id,
      imageUrl,
      videoUrl: motionAllowed && isSafeCoverUrl(videoUrl) ? videoUrl : null,
      themeUrl: motionAllowed && isSafeCoverUrl(themeUrl) ? themeUrl : null,
      videoPaused: false,
    });
  }
  return covers;
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
 * 当前轮换窗口已用时长；暂停后返回冻结值。
 * @since Beta v0.12.4
 * @returns 已用毫秒数
 */
function elapsedRotationMs(): number {
  if (progressTimer === null) return rotateElapsedMs;
  return rotateElapsedMs + (Date.now() - rotateStartedAt);
}

/**
 * 停止轮换与进度计时。
 * @since Beta v0.12.4
 */
function stopTimers(): void {
  if (rotateTimer !== null) {
    window.clearTimeout(rotateTimer);
    rotateTimer = null;
  }
  if (progressTimer === null) return;
  window.clearInterval(progressTimer);
  progressTimer = null;
}

/**
 * 暂停计时，冻结已用时长与进度。
 * @since Beta v0.12.4
 */
function freezeRotation(): void {
  rotateElapsedMs = elapsedRotationMs();
  stopTimers();
}

/**
 * 更新轮换进度。
 * @since Beta v0.12.4
 */
function updateProgress(): void {
  const elapsed = elapsedRotationMs();
  pageCoverRotationProgress.value = Math.min(elapsed / RotateIntervalMs, 1);
}

/**
 * 清空页面背景。
 * @since Beta v0.12.4
 */
function clearPageCover(): void {
  stopTimers();
  rotateElapsedMs = 0;
  pageCoverRotationProgress.value = 0;
  pageCoverCurrent.value = null;
  pageCoverItems.value = [];
  pageCoverIndex.value = 0;
  pageCoverRotationAvailable.value = false;
}

/**
 * 展示指定下标的背景。
 * @since Beta v0.12.4
 * @param index - 背景下标
 * @param session - 页面代次
 */
async function showCover(index: number, session: number): Promise<void> {
  const cover = pageCoverItems.value[index];
  if (cover === undefined) return;
  rotating = true;
  try {
    await preloadCover(cover.imageUrl);
    if (session !== coverSession) return;
    pageCoverIndex.value = index;
    pageCoverCurrent.value = cover;
  } finally {
    rotating = false;
  }
}

/**
 * 启动轮换计时：已用时长决定下一次切换的时间，进度条从当前进度继续。
 * @since Beta v0.12.4
 * @param session - 页面代次
 */
function beginRotation(session: number): void {
  stopTimers();
  if (prefersReducedMotion() || pageCoverRotationPaused.value) return;
  if (pageCoverItems.value.length < 2) return;
  rotateStartedAt = Date.now();
  updateProgress();
  progressTimer = window.setInterval(updateProgress, RotateProgressTickMs);
  scheduleRotation(session, Math.max(RotateIntervalMs - rotateElapsedMs, RotateProgressTickMs));
}

/**
 * 安排下一次轮换。
 * @since Beta v0.12.4
 * @param session - 页面代次
 * @param delay - 距离下一次切换的毫秒数
 */
function scheduleRotation(session: number, delay: number): void {
  rotateTimer = window.setTimeout(() => {
    rotateTimer = null;
    if (session !== coverSession || pageCoverItems.value.length < 2) return;
    if (rotating) {
      scheduleRotation(session, RotateProgressTickMs);
      return;
    }
    if (pageCoverRotationPaused.value) return;
    const next = (pageCoverIndex.value + 1) % pageCoverItems.value.length;
    void showCover(next, session).then(() => {
      if (session !== coverSession) return;
      if (pageCoverRotationPaused.value) return;
      startRotation(session);
    });
  }, delay);
}

/**
 * 重新开始轮换窗口。
 * @since Beta v0.12.4
 * @param session - 页面代次
 */
function startRotation(session: number): void {
  rotateElapsedMs = 0;
  pageCoverRotationProgress.value = 0;
  beginRotation(session);
}

/**
 * 暂停或继续自动轮换背景；继续时继承暂停前的进度，手动切换背景不受影响。
 * @since Beta v0.12.4
 */
function togglePageCoverRotationPaused(): void {
  if (pageCoverRotationPaused.value) {
    pageCoverRotationPaused.value = false;
    beginRotation(coverSession);
    return;
  }
  pageCoverRotationPaused.value = true;
  freezeRotation();
}

/**
 * 切换指定动态背景的视频播放；暂停播放时页面回落到该背景的静态图。
 * @since Beta v0.12.4
 * @param index - 背景下标
 */
function togglePageCoverVideoPaused(index: number): void {
  const cover = pageCoverItems.value[index];
  if (cover === undefined || cover.videoUrl === null) return;
  cover.videoPaused = !cover.videoPaused;
}

/**
 * 手动切换到指定轮换背景；未暂停自动轮换时重新计时。
 * @since Beta v0.12.4
 * @param index - 背景下标
 */
function selectPageCover(index: number): void {
  if (index < 0 || index >= pageCoverItems.value.length) return;
  if (index === pageCoverIndex.value) return;
  const session = coverSession;
  void showCover(index, session).then(() => {
    if (session !== coverSession) return;
    if (pageCoverRotationPaused.value) return;
    startRotation(session);
  });
}
