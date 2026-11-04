/**
 * 米游社折叠预览表情加载回归测试。
 * @since Beta v0.13.0
 */

import { describe, expect, it } from "vitest";

import { getMissingPostPreviewEmoticonNames } from "../src/utils/bbs/postPreview.js";

const smileUrl = "https://example.com/emoticons/smile.png";

describe("fold preview emoticons", () => {
  it("finds missing tokens across nested folds without changing the draft", () => {
    const nested: TGApp.BBS.PostEdit.Fold = {
      title: JSON.stringify([{ insert: "嵌套\n" }]),
      content: JSON.stringify([{ insert: "_(nested)\n" }]),
    };
    const fold: TGApp.BBS.PostEdit.Fold = {
      title: JSON.stringify([{ insert: "_(title)\n" }]),
      content: JSON.stringify([
        { insert: "_(smile)_(content)_(title)\n" },
        { insert: { fold: nested } },
      ]),
    };
    const nodes: Array<TGApp.BBS.SctPost.Base> = [{ insert: { fold } }];
    const snapshot = structuredClone(nodes);

    expect(getMissingPostPreviewEmoticonNames(nodes, { smile: smileUrl })).toEqual([
      "title",
      "content",
      "nested",
    ]);
    expect(
      getMissingPostPreviewEmoticonNames(nodes, {
        smile: smileUrl,
        title: smileUrl,
        content: smileUrl,
        nested: smileUrl,
      }),
    ).toEqual([]);
    expect(nodes).toEqual(snapshot);
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
});
