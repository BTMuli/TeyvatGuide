/**
 * 帖子预览节点与交互回归测试。
 * @since Beta v0.13.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { providePostPreview, usePostPreview } from "../src/hooks/usePostPreview.js";
import { buildPostDocument } from "../src/utils/bbs/postDocument.js";
import {
  createPostPreviewNodes,
  getMissingPostPreviewEmoticonNames,
  handlePostPreviewClick,
} from "../src/utils/bbs/postPreview.js";

describe("post preview context", () => {
  it("scopes static preview rendering to the provider descendants", async () => {
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
    const app = createSSRApp({ render: () => h("div", [h(Probe), h(Preview), h(Probe)]) });
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
    const insert = preview[0]?.insert;
    if (typeof insert !== "object") throw new Error("折叠节点缺失");
    const fold = <TGApp.BBS.PostEdit.Fold>insert.fold;
    const children = <Array<TGApp.BBS.SctPost.Base>>JSON.parse(fold.content);
    expect(insert.backup_text).toBe("折叠内容");
    expect(children[0]?.insert).toEqual({ fold: inner, backup_text: "折叠内容" });
    expect(document).toEqual(before);
  });

  it("preserves fallback text and deep copies video metadata", () => {
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
    const insert = preview[1]?.insert;
    if (typeof insert !== "object") throw new Error("视频节点缺失");
    const vod = <TGApp.BBS.PostEdit.Vod>insert.vod;
    (<Array<{ width: number }>>vod.resolutions)[0].width = 1280;
    expect(document).toEqual(before);
  });

  it("preserves the order of independent picture images", () => {
    const document = buildPostDocument([{ insert: "图片介绍\n" }]);
    const images = ["https://example.com/first.png", "https://example.com/second.png"];
    expect(createPostPreviewNodes(document.nodes, images)).toEqual([
      { insert: { image: images[0] } },
      { insert: { image: images[1] } },
      ...document.nodes,
    ]);
    expect(createPostPreviewNodes([])).toEqual([]);
  });

  it("finds missing emoticons in nested fold titles and bodies", () => {
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
});

/** 无 DOM 环境下的摘要或普通元素目标。 @since Beta v0.13.0 */
class PreviewElement extends EventTarget {
  /** 创建摘要或普通元素。 @since Beta v0.13.0 */
  constructor(
    private readonly summary: boolean,
    private readonly link: boolean = false,
  ) {
    super();
  }

  /** 模拟摘要祖先查询。 @since Beta v0.13.0 */
  closest(selector: string): PreviewElement | null {
    if (selector === "summary") return this.summary ? this : null;
    return this.link ? this : null;
  }
}

/** 创建目标可指定的原生可取消事件。 @since Beta v0.13.0 */
function createClick(type: string, summary: boolean, link: boolean = false): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "target", { value: new PreviewElement(summary, link) });
  return event;
}

describe("handlePostPreviewClick", () => {
  beforeEach(() => vi.stubGlobal("Element", PreviewElement));
  afterEach(() => vi.unstubAllGlobals());

  it.each(["click", "auxclick"])("cancels %s actions before child handlers", (type) => {
    const event = createClick(type, false);
    handlePostPreviewClick(event);
    expect(event.defaultPrevented).toBe(true);
    expect(event.cancelBubble).toBe(true);
  });

  it("allows summary activation while preventing child JavaScript handlers", () => {
    const event = createClick("click", true);
    handlePostPreviewClick(event);
    expect(event.defaultPrevented).toBe(false);
    expect(event.cancelBubble).toBe(true);
  });

  it("blocks middle-click navigation inside a summary", () => {
    const event = createClick("auxclick", true);
    handlePostPreviewClick(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("blocks native anchor navigation inside a summary", () => {
    const event = createClick("click", true, true);
    handlePostPreviewClick(event);
    expect(event.defaultPrevented).toBe(true);
    expect(event.cancelBubble).toBe(true);
  });
});
