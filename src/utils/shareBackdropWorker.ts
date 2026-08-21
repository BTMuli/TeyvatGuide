/**
 * 分享图毛玻璃烘焙 Worker：OffscreenCanvas 批量 blur，回传 ImageBitmap
 * @since Beta v0.11.5
 */

import { paintShareBackdropBlur } from "./shareBackdropBlur.js";
import type {
  ShareBackdropBlurBatchRequest,
  ShareBackdropBlurBatchResponse,
  ShareBackdropBlurRequest,
} from "./shareBackdropBlur.js";

type WorkerScope = {
  addEventListener: (
    type: "message",
    listener: (event: MessageEvent<ShareBackdropBlurBatchRequest>) => void,
  ) => void;
  postMessage: (message: ShareBackdropBlurBatchResponse, transfer?: Array<Transferable>) => void;
};

const scope = <WorkerScope>globalThis;

scope.addEventListener("message", (event) => {
  handleShareBackdropBlurBatch(event.data);
});

function paintOne(req: ShareBackdropBlurRequest): ImageBitmap {
  const canvas = new OffscreenCanvas(req.sw, req.sh);
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("OffscreenCanvas 2d 不可用");
  paintShareBackdropBlur(ctx, req.bitmap, req);
  return canvas.transferToImageBitmap();
}

function handleShareBackdropBlurBatch(batch: ShareBackdropBlurBatchRequest): void {
  const items: ShareBackdropBlurBatchResponse["items"] = [];
  const transfer: Array<ImageBitmap> = [];
  for (const req of batch.items) {
    try {
      const bitmap = paintOne(req);
      items.push({ id: req.id, bitmap });
      transfer.push(bitmap);
    } catch (error) {
      items.push({ id: req.id, error: `${error}` });
    } finally {
      req.bitmap.close();
    }
  }
  scope.postMessage({ items }, transfer);
}
