/**
 * 米游社帖子预览转换、交互和表情映射回归测试。
 * @since Beta v0.13.1
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { providePostPreview, usePostPreview } from "../src/hooks/usePostPreview.js";
import { buildPostDocument } from "../src/utils/bbs/postDocument.js";
import {
  collectPostPreviewEmoticonMap,
  createPostPreviewNodes,
  getMissingPostPreviewEmoticonNames,
  handlePostPreviewClick,
} from "../src/utils/bbs/postPreview.js";

const smileUrl = "https://example.com/emoticons/smile.png";
const customUrl = "https://example.com/emoticons/custom.webp";

describe("post preview context", () => {
  it("scopes preview rendering to the provider descendants", async () => {
    const Probe = defineComponent({
      setup() {
        const preview = usePostPreview();
        return () => h("span", String(preview));
      },
    });
    const Preview = defineComponent({
      setup() {
        providePostPreview();
        return () => h(Probe);
      },
    });
    const app = createSSRApp({
      render: () => h("div", [h(Probe), h(Preview), h(Probe)]),
    });
    expect(await renderToString(app)).toBe(
      "<div><span>false</span><span>true</span><span>false</span></div>",
    );
  });
});

describe("createPostPreviewNodes", () => {
  it("adapts nested folds without changing the validated draft", () => {
    const inner: TGApp.BBS.PostEdit.Fold = {
      title: JSON.stringify([{ insert: "内层标题\n" }]),
      content: JSON.stringify([{ insert: "内层正文\n" }]),
    };
    const outer: TGApp.BBS.PostEdit.Fold = {
      title: JSON.stringify([{ insert: "外层标题\n" }]),
      content: JSON.stringify([{ insert: { fold: inner } }, { insert: "\n" }]),
    };
    const document = buildPostDocument([{ insert: { fold: outer } }]);
    const before = structuredClone(document);
    const preview = createPostPreviewNodes(document.nodes);
    const outerInsert = preview[0]?.insert;
    if (typeof outerInsert !== "object") throw new Error("折叠节点缺失");
    const outerFold = <TGApp.BBS.PostEdit.Fold>outerInsert.fold;
    const children = <Array<TGApp.BBS.SctPost.Base>>JSON.parse(outerFold.content);
    const innerInsert = children[0]?.insert;

    expect(outerInsert.backup_text).toBe("折叠内容");
    expect(innerInsert).toEqual({ backup_text: "折叠内容", fold: inner });
    expect(document).toEqual(before);
  });

  it("preserves existing fold fallback text and isolates nested metadata", () => {
    const document = buildPostDocument([
      {
        insert: {
          backup_text: "旧折叠",
          fold: {
            title: JSON.stringify([{ insert: "标题\n" }]),
            content: JSON.stringify([{ insert: "正文\n" }]),
          },
        },
      },
      { insert: { vod: { id: "video", duration: 1000, resolutions: [{ width: 640 }] } } },
    ]);
    const before = structuredClone(document);
    const preview = createPostPreviewNodes(document.nodes);
    expect(preview[0]?.insert).toMatchObject({ backup_text: "旧折叠" });
    const video = preview[1]?.insert;
    if (typeof video !== "object") throw new Error("视频节点缺失");
    const vod = <TGApp.BBS.PostEdit.Vod>video.vod;
    (<Array<{ width: number }>>vod.resolutions)[0].width = 1280;
    expect(document).toEqual(before);
  });

  it("prepends picture images in their original order", () => {
    const document = buildPostDocument([{ insert: "图片介绍\n" }]);
    expect(createPostPreviewNodes(document.nodes, [smileUrl, customUrl])).toEqual([
      { insert: { image: smileUrl } },
      { insert: { image: customUrl } },
      ...document.nodes,
    ]);
    expect(createPostPreviewNodes([])).toEqual([]);
  });
});

describe("handlePostPreviewClick", () => {
  beforeEach(() => vi.stubGlobal("Element", PreviewElement));
  afterEach(() => vi.unstubAllGlobals());

  it.each(["click", "auxclick"])("cancels %s navigation before child handlers", (type) => {
    const event = new MouseEventFixture(type);
    handlePostPreviewClick(<MouseEvent>(<unknown>event));
    expect(event.defaultPrevented).toBe(true);
    expect(event.cancelBubble).toBe(true);
  });

  it("preserves summary activation while stopping child link handlers", () => {
    const event = new MouseEventFixture("click", new PreviewElement());
    handlePostPreviewClick(<MouseEvent>(<unknown>event));
    expect(event.defaultPrevented).toBe(false);
    expect(event.cancelBubble).toBe(true);
  });

  it("does not allow middle-click navigation inside a summary", () => {
    const event = new MouseEventFixture("auxclick", new PreviewElement());
    handlePostPreviewClick(<MouseEvent>(<unknown>event));
    expect(event.defaultPrevented).toBe(true);
  });

  it("blocks native anchor navigation inside a summary", () => {
    const event = new MouseEventFixture("click", new PreviewElement(true));
    handlePostPreviewClick(event);
    expect(event.defaultPrevented).toBe(true);
    expect(event.cancelBubble).toBe(true);
  });
});

/** 可选折叠摘要或摘要内链接目标。 @since Beta v0.13.1 */
class PreviewElement extends EventTarget {
  /** 创建摘要或摘要内链接。 @since Beta v0.13.1 */
  constructor(private readonly link: boolean = false) {
    super();
  }

  /** 返回当前目标所属的摘要或交互元素。 @since Beta v0.13.1 */
  closest(selector: string): PreviewElement | null {
    if (selector === "summary") return this;
    return this.link ? this : null;
  }
}

/** Node 环境中用于验证默认行为和传播标记的点击事件。 @since Beta v0.13.0 */
class MouseEventFixture extends Event {
  /** 点击目标。 */
  override readonly target: EventTarget | null;

  /** 构造可取消的冒泡事件。 @since Beta v0.13.0 */
  constructor(type: string, target: PreviewElement | null = null) {
    super(type, { bubbles: true, cancelable: true });
    this.target = target;
  }
}

describe("collectPostPreviewEmoticonMap", () => {
  it("collects only safe emoticons from current draft embeds", () => {
    const map = collectPostPreviewEmoticonMap([
      { insert: { emoticon: { name: "smile", src: smileUrl } } },
      { insert: { emoticon: { name: "unsafe", src: "http://example.com/unsafe.png" } } },
      { insert: "text" },
      {
        insert: "container",
        children: [{ insert: { emoticon: { name: "nested", src: smileUrl } } }],
      },
    ]);

    expect(map).toEqual({ smile: smileUrl, nested: smileUrl });
  });

  it("ignores malformed draft nodes without changing their input", () => {
    const nodes: Array<TGApp.BBS.SctPost.Base> = [
      { insert: { emoticon: { name: "bad name ", src: smileUrl } } },
      { insert: { emoticon: { name: "missing source" } } },
    ];

    expect(collectPostPreviewEmoticonMap(nodes)).toEqual({});
    expect(nodes).toEqual([
      { insert: { emoticon: { name: "bad name ", src: smileUrl } } },
      { insert: { emoticon: { name: "missing source" } } },
    ]);
  });

  it("keeps custom emoticon embeds out of the ordinary emoticon token map", () => {
    const nodes: Array<TGApp.BBS.SctPost.Base> = [
      {
        insert: {
          custom_emoticon: {
            id: "custom-one",
            url: customUrl,
            size: { width: 96, height: 64 },
            is_available: true,
          },
          backup_text: "[自定义表情]",
        },
      },
    ];

    expect(collectPostPreviewEmoticonMap(nodes)).toEqual({});
    expect(nodes[0]?.insert).toEqual({
      custom_emoticon: {
        id: "custom-one",
        url: customUrl,
        size: { width: 96, height: 64 },
        is_available: true,
      },
      backup_text: "[自定义表情]",
    });
  });
});

describe("getMissingPostPreviewEmoticonNames", () => {
  it("returns unknown token names for a possible directory refresh", () => {
    const nodes: Array<TGApp.BBS.SctPost.Base> = [{ insert: "前_(unknown)中_(smile)后_(unknown)" }];

    expect(getMissingPostPreviewEmoticonNames(nodes, { smile: smileUrl })).toEqual(["unknown"]);
  });

  it("finds missing emoticons after adapting validated nested folds", () => {
    const document = buildPostDocument([
      {
        insert: {
          fold: {
            title: JSON.stringify([{ insert: "_(title)\n" }]),
            content: JSON.stringify([
              { insert: "_(known)_(body)\n" },
              {
                insert: {
                  fold: {
                    title: JSON.stringify([{ insert: "嵌套标题\n" }]),
                    content: JSON.stringify([{ insert: "_(nested)\n" }]),
                  },
                },
              },
            ]),
          },
        },
      },
    ]);
    expect(
      getMissingPostPreviewEmoticonNames(createPostPreviewNodes(document.nodes), {
        known: "https://example.com/known.png",
      }),
    ).toEqual(["title", "body", "nested"]);
  });

  it("keeps empty folds and plain text from requesting emoticons", () => {
    expect(
      getMissingPostPreviewEmoticonNames(
        [
          {
            insert: {
              fold: {
                title: JSON.stringify([{ insert: "标题\n" }]),
                content: JSON.stringify([{ insert: "\n" }]),
              },
            },
          },
        ],
        {},
      ),
    ).toEqual([]);
  });

  it("finds missing tokens inside fold titles, contents, and nested folds", () => {
    const nodes: Array<TGApp.BBS.SctPost.Base> = [
      {
        insert: {
          fold: {
            title: JSON.stringify([{ insert: "_(title)\n" }]),
            content: JSON.stringify([
              { insert: "_(smile)_(content)_(title)\n" },
              {
                insert: {
                  fold: {
                    title: JSON.stringify([{ insert: "嵌套\n" }]),
                    content: JSON.stringify([{ insert: "_(nested)\n" }]),
                  },
                },
              },
            ]),
          },
        },
      },
    ];
    const snapshot = JSON.stringify(nodes);

    expect(getMissingPostPreviewEmoticonNames(nodes, { smile: smileUrl })).toEqual([
      "title",
      "content",
      "nested",
    ]);
    expect(JSON.stringify(nodes)).toBe(snapshot);
    expect(
      getMissingPostPreviewEmoticonNames(nodes, {
        smile: smileUrl,
        title: smileUrl,
        content: smileUrl,
        nested: smileUrl,
      }),
    ).toEqual([]);
  });
});
