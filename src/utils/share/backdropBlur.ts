/**
 * 分享图毛玻璃烘焙：Worker 与主线程共用的绘制与消息类型
 * @since Beta v0.13.2
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
 * 模糊输出所需的绘制能力，部分 WebView 无 Canvas 滤镜属性。
 * @since Beta v0.13.2
 */
type BackdropBlurTarget = Pick<BackdropDrawContext, "drawImage" | "putImageData"> & {
  filter?: string;
};

/**
 * 沿每行进行盒式模糊，将输出转置供下一次纵向处理。
 * @since Beta v0.13.2
 * @param source - 预乘透明度的 RGBA 像素
 * @param output - 转置后的输出缓冲区
 * @param width - 输入宽度
 * @param height - 输入高度
 * @param radius - 盒式模糊半径
 */
function blurBackdropRows(
  source: Uint8ClampedArray,
  output: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): void {
  const channels = 4;
  const last = width - 1;
  const diameter = radius * 2 + 1;
  const sums = new Float64Array(channels);
  for (let y = 0; y < height; y += 1) {
    const row = y * width * channels;
    sums.fill(0);
    for (let tap = -radius; tap <= radius; tap += 1) {
      const index = row + Math.min(last, Math.max(0, tap)) * channels;
      for (let channel = 0; channel < channels; channel += 1) {
        sums[channel] += source[index + channel];
      }
    }
    for (let x = 0; x < width; x += 1) {
      const out = (x * height + y) * channels;
      const left = row + Math.max(0, x - radius) * channels;
      const right = row + Math.min(last, x + radius + 1) * channels;
      for (let channel = 0; channel < channels; channel += 1) {
        output[out + channel] = sums[channel] / diameter;
        sums[channel] += source[right + channel] - source[left + channel];
      }
    }
  }
}

/**
 * 绘制模糊采样图，Canvas 滤镜不可用时通过像素运算近似高斯模糊。
 * @since Beta v0.13.2
 * @param ctx - 输出画布的 2D 上下文
 * @param sample - 带边缘采样区的 2D 上下文
 * @param blurPx - 模糊半径，单位为画布像素
 */
export function drawShareBackdropBlur(
  ctx: BackdropBlurTarget,
  sample: Pick<BackdropDrawContext, "canvas" | "getImageData">,
  blurPx: number,
): void {
  if ("filter" in ctx) {
    ctx.filter = `blur(${blurPx}px)`;
    if (ctx.filter?.startsWith("blur(")) {
      ctx.drawImage(sample.canvas, 0, 0);
      return;
    }
  }

  // 三次盒式模糊逼近高斯。按方差选择相邻的整数半径。
  const variance = blurPx * blurPx;
  const lower = Math.floor(Math.sqrt(variance + 0.25) - 0.5);
  const widerPasses = Math.round((3 * (variance - lower * (lower + 1))) / (2 * (lower + 1)));
  if (lower === 0 && widerPasses === 0) {
    ctx.drawImage(sample.canvas, 0, 0);
    return;
  }

  const { width, height } = sample.canvas;
  const image = sample.getImageData(0, 0, width, height);
  const pixels = image.data;
  const scratch = new Uint8ClampedArray(pixels.length);
  // 预乘透明度，使透明像素的颜色不渗入可见内容。
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] / 255;
    pixels[i] *= alpha;
    pixels[i + 1] *= alpha;
    pixels[i + 2] *= alpha;
  }
  for (let pass = 0; pass < 3; pass += 1) {
    const radius = lower + Number(pass < widerPasses);
    if (radius === 0) continue;
    blurBackdropRows(pixels, scratch, width, height, radius);
    blurBackdropRows(scratch, pixels, height, width, radius);
  }
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] / 255;
    if (alpha === 0) continue;
    pixels[i] /= alpha;
    pixels[i + 1] /= alpha;
    pixels[i + 2] /= alpha;
  }
  ctx.putImageData(image, 0, 0);
}

/**
 * 在目标画布上绘制圆角毛玻璃
 * @since Beta v0.13.2
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
  drawShareBackdropBlur(blurCtx, sampleCtx, blurDraw);

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
