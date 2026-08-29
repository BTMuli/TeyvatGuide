/**
 * 分享图毛玻璃烘焙：Worker 与主线程共用的绘制与消息类型
 * @since Beta v0.12.0
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
  /** blur 采样区在四周扩展的像素 */
  pad: number;
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
 * @since Beta v0.12.0
 * @param ctx - 2D 上下文，画布尺寸应为 sw × sh
 * @param bitmap - 裁切后的快照
 * @param job - 绘制参数
 * @returns 无返回值
 */
export function paintShareBackdropBlur(
  ctx: BackdropDrawContext,
  bitmap: ImageBitmap,
  job: Omit<ShareBackdropBlurRequest, "id" | "bitmap">,
): void {
  const { sw, sh, pad, blurDraw, radius, tint } = job;
  const sampleCanvas = new OffscreenCanvas(sw + pad * 2, sh + pad * 2);
  const sampleCtx = sampleCanvas.getContext("2d");
  if (sampleCtx === null) throw new Error("毛玻璃采样 Canvas 2d 不可用");
  drawMirroredBackdropTiles(sampleCtx, bitmap, sw, sh, pad);

  const blurCanvas = new OffscreenCanvas(sampleCanvas.width, sampleCanvas.height);
  const blurCtx = blurCanvas.getContext("2d");
  if (blurCtx === null) throw new Error("毛玻璃模糊 Canvas 2d 不可用");
  blurCtx.filter = `blur(${blurDraw}px)`;
  blurCtx.drawImage(sampleCanvas, 0, 0);

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
  ctx.drawImage(blurCanvas, pad, pad, sw, sh, 0, 0, sw, sh);
  if (tint !== "" && tint !== "rgba(0, 0, 0, 0)" && tint !== "transparent") {
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, sw, sh);
  }
}

/** 用中心图块的镜像平铺填满 blur 采样区 */
function drawMirroredBackdropTiles(
  ctx: OffscreenCanvasRenderingContext2D,
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
