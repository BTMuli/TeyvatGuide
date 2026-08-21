/**
 * 分享图毛玻璃烘焙：Worker 与主线程共用的绘制与消息类型
 * @since Beta v0.11.5
 */

export type ShareBackdropCorner = { tl: number; tr: number; br: number; bl: number };

export type ShareBackdropBlurRequest = {
  /** 任务序号 */
  id: number;
  /** 已裁切的快照区域 */
  bitmap: ImageBitmap;
  /** 输出宽（快照像素） */
  sw: number;
  /** 输出高（快照像素） */
  sh: number;
  /** bitmap 绘制到输出画布的 X */
  ox: number;
  /** bitmap 绘制到输出画布的 Y */
  oy: number;
  /** canvas filter blur（快照像素） */
  blurDraw: number;
  /** 圆角（快照像素） */
  radius: ShareBackdropCorner;
  /** 半透明底色 */
  tint: string;
};

export type ShareBackdropBlurBatchRequest = {
  /** 批量任务 */
  items: Array<ShareBackdropBlurRequest>;
};

export type ShareBackdropBlurBatchItem = {
  /** 对应请求 id */
  id: number;
  /** 烘焙像素；失败时为空 */
  bitmap?: ImageBitmap;
  /** 失败信息 */
  error?: string;
};

export type ShareBackdropBlurBatchResponse = {
  /** 批量结果 */
  items: Array<ShareBackdropBlurBatchItem>;
};

type BackdropDrawContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

/**
 * 在目标画布上绘制圆角毛玻璃
 * @since Beta v0.11.5
 * @param ctx - 2D 上下文，画布尺寸应为 sw × sh
 * @param bitmap - 裁切后的快照
 * @param job - 绘制参数
 * @returns 无返回值
 */
export function paintShareBackdropBlur(
  ctx: BackdropDrawContext,
  bitmap: CanvasImageSource,
  job: Omit<ShareBackdropBlurRequest, "id" | "bitmap">,
): void {
  const { sw, sh, ox, oy, blurDraw, radius, tint } = job;
  ctx.beginPath();
  ctx.moveTo(radius.tl, 0);
  ctx.lineTo(sw - radius.tr, 0);
  ctx.quadraticCurveTo(sw, 0, sw, radius.tr);
  ctx.lineTo(sw, sh - radius.br);
  ctx.quadraticCurveTo(sw, sh, sw - radius.br, sh);
  ctx.lineTo(radius.bl, sh);
  ctx.quadraticCurveTo(0, sh, 0, sh - radius.bl);
  ctx.lineTo(0, radius.tl);
  ctx.quadraticCurveTo(0, 0, radius.tl, 0);
  ctx.closePath();
  ctx.clip();

  ctx.filter = `blur(${blurDraw}px)`;
  ctx.drawImage(bitmap, ox, oy);
  ctx.filter = "none";
  if (tint !== "" && tint !== "rgba(0, 0, 0, 0)" && tint !== "transparent") {
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, sw, sh);
  }
}
