/**
 * 米游社帖子视频分辨率辅助函数回归测试。
 * @since Beta v0.13.0
 */

import { describe, expect, it } from "vitest";

import { getPostVodResolutions, pickPostVodResolution } from "../src/utils/bbs/postVod.js";

const validResolution = {
  url: "https://example.com/video/720p.mp4",
  definition: "720P",
  height: 720,
  width: 1280,
  size: 100,
  format: ".mp4",
  label: "720P",
};

describe("post video resolutions", () => {
  it("returns no playable data for missing or empty resolution lists", () => {
    expect(getPostVodResolutions(undefined)).toEqual([]);
    expect(getPostVodResolutions([])).toEqual([]);
    expect(pickPostVodResolution([])).toBeUndefined();
  });

  it("drops entries without a usable playback URL or dimensions", () => {
    expect(
      getPostVodResolutions([
        { ...validResolution, url: "" },
        { ...validResolution, url: "javascript:alert(1)" },
        { ...validResolution, width: 0 },
        { ...validResolution, height: Number.NaN },
      ]),
    ).toEqual([]);
  });

  it("selects the largest valid resolution and preserves playback metadata", () => {
    const resolutions = getPostVodResolutions([
      validResolution,
      { ...validResolution, url: "https://example.com/video/1080p.mp4", size: 200, label: "1080P" },
    ]);

    expect(pickPostVodResolution(resolutions)).toEqual({
      url: "https://example.com/video/1080p.mp4",
      width: 1280,
      height: 720,
      size: 200,
      label: "1080P",
      format: ".mp4",
    });
  });

  it("fills optional display metadata without changing the source", () => {
    const source = { url: validResolution.url, width: 1280, height: 720 };
    expect(getPostVodResolutions([source])).toEqual([
      { ...source, size: 0, label: "720P", format: "MP4" },
    ]);
    expect(source).toEqual({ url: validResolution.url, width: 1280, height: 720 });
  });
});
