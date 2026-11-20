/**
 * 米游社普通图文草稿请求契约回归测试。
 * @since Beta v0.13.2
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  getRequestHeader: vi.fn(),
  getReplyCookie: vi.fn(),
  serializePostDocument: vi.fn(),
}));

vi.mock("@utils/network/TGHttps.js", () => ({
  default: { get: mocks.get, post: mocks.post },
}));
vi.mock("@utils/network/getRequestHeader.js", () => ({
  getRequestHeader: mocks.getRequestHeader,
  getReplyCookie: mocks.getReplyCookie,
}));
vi.mock("@utils/bbs/postHtml.js", () => ({
  serializePostDocument: mocks.serializePostDocument,
}));

import postDraftReq from "../src/request/postDraftReq.js";
import {
  isPostDraftDeleteResp,
  isPostDraftDetailResp,
  isPostDraftListResp,
  isPostDraftSaveResp,
} from "../src/request/respValidator.js";

const cookie = { ltmid_v2: "mid-value", ltoken_v2: "ltoken-value", ltuid_v2: "100000001" };
const settings: TGApp.BBS.PostEdit.Settings = {
  gid: 2,
  forumId: 29,
  subject: "草稿标题",
  nodes: [{ insert: "草稿正文\n" }],
  viewType: 1,
  topicIds: [7],
  cateId: 3,
  isOriginal: 0,
  republishAuthorization: 0,
  cover: "",
  blockReplyImg: 0,
};

beforeEach(() => {
  mocks.get.mockReset();
  mocks.post.mockReset();
  mocks.getRequestHeader.mockReset();
  mocks.getReplyCookie.mockReset();
  mocks.serializePostDocument.mockReset();
  mocks.getRequestHeader.mockReturnValue({ "x-test-header": "test" });
  mocks.getReplyCookie.mockImplementation((value: unknown) => value);
  mocks.serializePostDocument.mockReturnValue({
    nodes: [{ insert: "草稿正文\n" }],
    text: "草稿正文",
    images: [],
    html: "<p>草稿正文</p>",
  });
});

describe("postDraftReq.list", () => {
  it("queries one view type and normalizes the paging cursor", async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        retcode: 0,
        message: "OK",
        data: {
          list: [
            {
              draft_id: "123",
              subject: "图片草稿",
              content: "摘要",
              cover: null,
              version: 1,
              game_id: 2,
            },
          ],
          is_last: false,
          next_offset: 20,
        },
      },
    });

    const response = await postDraftReq.list(cookie, 0, 20, 2);
    if (response.data === null) throw new Error("列表响应缺少数据");

    expect(response.data).toEqual({
      list: [
        {
          id: "123",
          subject: "图片草稿",
          viewType: 2,
          gid: 2,
          updatedAt: 0,
          content: "摘要",
          version: 1,
        },
      ],
      is_last: false,
      next_offset: "20",
    });
    expect(mocks.get).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/draft/list",
      {
        headers: { "x-test-header": "test", "x-rpc-client_type": "2" },
        query: { view_type: 2, size: 20 },
      },
      expect.any(Function),
    );
  });
});

describe("postDraftReq.detail", () => {
  it("loads an empty text draft without inventing content", async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        retcode: 0,
        message: "OK",
        data: {
          draft_id: "123",
          draft: {
            game_id: 2,
            forum_id: 0,
            forum_cate_id: 0,
            subject: "",
            structured_content: "[]",
            content: "",
            topic_ids: [],
            is_original: 0,
            republish_authorization: 0,
            block_reply_img: 0,
          },
        },
      },
    });

    const response = await postDraftReq.detail("123", cookie);
    if (response.data === null) throw new Error("详情响应缺少数据");

    expect(response.data.id).toBe("123");
    expect(response.data.updatedAt).toBe(0);
    expect(response.data.settings.subject).toBe("");
    expect(response.data.settings.nodes).toEqual([{ insert: "\n" }]);
    expect(response.data.settings.gid).toBe(2);
  });

  it("loads the official nested draft and saves its publish fields without the response wrapper", async () => {
    const image = "https://example.com/cover.png";
    const nodes = [{ insert: "草稿正文\n" }, { insert: { image } }, { insert: "\n" }];
    mocks.get.mockResolvedValueOnce({
      data: {
        retcode: 0,
        message: "OK",
        data: {
          draft_id: "123",
          version: 1,
          lottery: { id: "lottery-1" },
          draft: {
            post: {
              post_id: "0",
              uid: cookie.ltuid_v2,
              game_id: 2,
              f_forum_id: 29,
              subject: "嵌套草稿",
              view_type: 1,
              structured_content: JSON.stringify(nodes),
              content: "<p>草稿正文</p>",
              topic_ids: [7],
              is_original: 1,
              republish_authorization: 2,
              block_reply_img: 1,
              is_profit: false,
              user_ai_content_choice: "USER_AI_CONTENT_CHOICE_UNKNOWN",
            },
            forum: { id: 29, forum_cate: { id: 3 }, name: "酒馆" },
            topics: [
              {
                id: 7,
                name: "草稿话题",
                desc: "草稿话题简介",
                cover: "https://example.com/topic.png",
              },
              { id: "7", name: "重复话题" },
              { id: "invalid", name: "无效话题" },
            ],
            cover: { url: image, width: 100, height: 100, crop: { x: 0, y: 0, w: 100, h: 100 } },
            collection: { collection_id: "456" },
            contribution_act: { id: "activity-1" },
            link_card_list: [{ card_id: "card-1", title: "附带卡片" }],
            release_time_type: "NOW",
            future_release_time: 0,
            user: { uid: cookie.ltuid_v2 },
            stat: { view_num: 0 },
          },
        },
      },
    });

    const response = await postDraftReq.detail("123", cookie);
    if (!response.data) throw new Error("详情响应缺少数据");
    expect(response.data.settings).toMatchObject({
      gid: 2,
      forumId: 29,
      cateId: 3,
      subject: "嵌套草稿",
      viewType: 1,
      nodes,
      topicIds: [7],
      cover: image,
      isOriginal: 1,
      republishAuthorization: 2,
      blockReplyImg: 1,
      collectionId: "456",
    });
    expect(response.data.ownerUid).toBe(cookie.ltuid_v2);
    expect(response.data.topics).toEqual([
      {
        id: "7",
        name: "草稿话题",
        desc: "草稿话题简介",
        cover: "https://example.com/topic.png",
      },
    ]);
    mocks.post.mockResolvedValueOnce({
      data: { retcode: 0, message: "OK", data: { draft_id: "123" } },
    });
    await postDraftReq.save(
      { ...response.data.settings, subject: "修改后的嵌套草稿" },
      cookie,
      response.data,
    );
    const body = mocks.post.mock.calls[0][1].body;
    expect(body).toMatchObject({
      draft_id: "123",
      gids: "2",
      forum_id: 29,
      forum_cate_id: 3,
      topic_ids: [7],
      collection_id: 456,
      cover: image,
      subject: "修改后的嵌套草稿",
      lottery: { id: "lottery-1" },
      contribution_act: { id: "activity-1" },
      link_card_list: ["card-1"],
      release_time_type: "NOW",
      future_release_time: 0,
      is_profit: false,
    });
    for (const key of [
      "post",
      "post_id",
      "forum",
      "user",
      "stat",
      "collection",
      "user_ai_content_choice",
    ])
      expect(body).not.toHaveProperty(key);
  });

  it("preserves a large nested collection ID without numeric truncation", async () => {
    const collectionId = "90071992547409931234567890";
    mocks.get.mockResolvedValueOnce({
      data: {
        retcode: 0,
        message: "OK",
        data: {
          draft_id: "126",
          draft: {
            post: {
              game_id: 2,
              f_forum_id: 29,
              subject: "大合集草稿",
              view_type: 1,
              structured_content: JSON.stringify([{ insert: "正文\n" }]),
              content: "<p>正文</p>",
              is_original: 0,
              republish_authorization: 0,
              block_reply_img: 0,
            },
            forum: { id: 29, forum_cate: { id: 3 } },
            settings: { collection_id: collectionId },
          },
        },
      },
    });

    const response = await postDraftReq.detail("126", cookie);
    if (response.data === null) throw new Error("详情响应缺少数据");
    expect(response.data.settings.collectionId).toBe(collectionId);
    expect(response.data.raw?.collection_id).toBe(collectionId);

    mocks.post.mockResolvedValueOnce({
      data: { retcode: 0, message: "OK", data: { draft_id: "126" } },
    });
    const saved = await postDraftReq.save(response.data.settings, cookie, response.data);
    expect(mocks.post.mock.calls.at(-1)?.[1].body.collection_id).toBe(collectionId);
    expect(saved.data?.draft?.settings.collectionId).toBe(collectionId);
  });

  it("saves an explicit empty collection choice as wire zero", async () => {
    mocks.post.mockResolvedValueOnce({
      data: { retcode: 0, message: "OK", data: { draft_id: "127" } },
    });

    const response = await postDraftReq.save({ ...settings, collectionId: null }, cookie);
    expect(mocks.post.mock.calls.at(-1)?.[1].body.collection_id).toBe(0);
    expect(response.data?.draft?.settings.collectionId).toBeNull();
  });

  it.each(["", "-1", "1.5", "not-an-id"])(
    "rejects invalid draft collection target %s before HTTP",
    async (collectionId) => {
      await expect(postDraftReq.save({ ...settings, collectionId }, cookie)).rejects.toThrow(
        "合集 ID",
      );
      expect(mocks.post).not.toHaveBeenCalled();
    },
  );

  it("loads picture drafts and keeps the image order", async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        retcode: 0,
        message: "OK",
        data: {
          draft_id: "124",
          draft: {
            game_id: 2,
            view_type: 2,
            forum_id: 29,
            forum_cate_id: 3,
            subject: "图片草稿",
            content: JSON.stringify({
              imgs: ["https://example.com/one.png", "https://example.com/two.png"],
              describe: "说明\n",
            }),
            structured_content: JSON.stringify([{ insert: "说明\n" }]),
            topic_ids: [],
            is_original: 0,
            republish_authorization: 0,
            block_reply_img: 0,
          },
        },
      },
    });

    const response = await postDraftReq.detail("124", cookie);
    if (response.data === null) throw new Error("详情响应缺少数据");

    expect(response.data.settings.viewType).toBe(2);
    expect(response.data.settings.imageUrls).toEqual([
      "https://example.com/one.png",
      "https://example.com/two.png",
    ]);
    expect(response.data.settings.nodes).toEqual([{ insert: "说明\n" }]);
  });

  it("loads a picture draft with no images or description", async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        retcode: 0,
        message: "OK",
        data: {
          draft_id: "125",
          draft: {
            view_type: 2,
            content: JSON.stringify({ imgs: [], describe: "" }),
            structured_content: "[]",
            forum_id: 0,
            forum_cate_id: 0,
            is_original: 0,
            republish_authorization: 0,
            block_reply_img: 0,
          },
        },
      },
    });

    const response = await postDraftReq.detail("125", cookie);
    if (response.data === null) throw new Error("详情响应缺少数据");

    expect(response.data.settings.nodes).toEqual([{ insert: "\n" }]);
    expect(response.data.settings.imageUrls).toEqual([]);
  });
});

describe("postDraftReq.save", () => {
  it("preserves publish settings and omits response-only fields from a flat source", async () => {
    mocks.post.mockResolvedValueOnce({
      data: { retcode: 0, message: "OK", data: { draft_id: "123" } },
    });
    const source: TGApp.BBS.PostDraft.Detail = {
      id: "123",
      settings,
      updatedAt: 0,
      ownerUid: cookie.ltuid_v2,
      raw: { custom_metadata: "keep-me", is_profit: false },
    };

    const response = await postDraftReq.save(
      { ...settings, subject: "更新后的标题" },
      cookie,
      source,
    );
    if (response.data === null) throw new Error("保存响应缺少数据");

    expect(response.data.draft_id).toBe("123");
    expect(response.data.draft?.ownerUid).toBe(cookie.ltuid_v2);
    expect(response.data.draft?.raw).toMatchObject({
      is_profit: false,
      draft_id: "123",
      gids: "2",
      subject: "更新后的标题",
      topic_ids: [7],
    });
    expect(response.data.draft?.raw).not.toHaveProperty("custom_metadata");
    expect(response.data.draft?.raw).not.toHaveProperty("contribution_act");
    expect(mocks.post).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/draft/save",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-test-header": "test", "x-rpc-client_type": "2" }),
      }),
      expect.any(Function),
    );
  });

  it("rejects a source belonging to another account before HTTP", async () => {
    const source: TGApp.BBS.PostDraft.Detail = {
      id: "123",
      settings,
      updatedAt: 0,
      ownerUid: "100000002",
    };

    await expect(postDraftReq.save(settings, cookie, source)).rejects.toThrow("账号不一致");
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("returns a reusable source when creating a new draft", async () => {
    mocks.post.mockResolvedValueOnce({
      data: { retcode: 0, message: "OK", data: { draft_id: "126" } },
    });
    const created = await postDraftReq.save(settings, cookie);
    if (created.data === null || created.data.draft === undefined)
      throw new Error("新建响应缺少详情");

    expect(mocks.post.mock.calls[0][1].body.draft_id).toBe(0);
    expect(created.data.draft?.id).toBe("126");
    expect(created.data.draft?.raw).toMatchObject({ draft_id: 0, gids: "2" });

    mocks.post.mockResolvedValueOnce({
      data: { retcode: 0, message: "OK", data: { draft_id: "126" } },
    });
    await postDraftReq.save(settings, cookie, created.data.draft);
    expect(mocks.post.mock.calls[1][1].body.draft_id).toBe("126");
  });
});

describe("postDraftReq.delete", () => {
  it("uses the draft deletion endpoint with only the selected draft ID", async () => {
    mocks.post.mockResolvedValueOnce({ data: { retcode: 0, message: "OK", data: null } });

    const response = await postDraftReq.delete("123", cookie);

    expect(response.retcode).toBe(0);
    expect(mocks.post).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/draft/delete",
      {
        body: { draft_id: "123" },
        headers: {
          "x-test-header": "test",
          "x-rpc-client_type": "2",
          "Content-Type": "application/json",
        },
      },
      expect.any(Function),
    );
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      cookie,
      "POST",
      JSON.stringify({ draft_id: "123" }),
      "K2",
      true,
    );
  });

  it("rejects an invalid draft ID before HTTP", async () => {
    await expect(postDraftReq.delete("0", cookie)).rejects.toThrow("正整数");
    await expect(postDraftReq.delete("00", cookie)).rejects.toThrow("正整数");
    await expect(postDraftReq.delete("not-an-id", cookie)).rejects.toThrow("草稿 ID");
    expect(mocks.post).not.toHaveBeenCalled();
  });
});

describe("post draft response guards", () => {
  it("validates deletion status without assuming a response data shape", () => {
    expect(isPostDraftDeleteResp({ retcode: 0, message: "OK", data: null })).toBe(true);
    expect(isPostDraftDeleteResp({ retcode: 0, message: "OK", data: {} })).toBe(true);
    expect(isPostDraftDeleteResp({ retcode: 1108, message: "草稿不存在", data: null })).toBe(true);
    expect(isPostDraftDeleteResp({ retcode: "0", message: "OK" })).toBe(false);
    expect(isPostDraftDeleteResp({ retcode: 0 })).toBe(false);
  });
  it("accepts successful list, detail, and save envelopes", () => {
    expect(
      isPostDraftListResp({
        retcode: 0,
        message: "OK",
        data: { list: [], is_last: true, next_offset: "0" },
      }),
    ).toBe(true);
    expect(
      isPostDraftDetailResp({ retcode: 0, message: "OK", data: { draft_id: "1", draft: {} } }),
    ).toBe(true);
    expect(isPostDraftSaveResp({ retcode: 0, message: "OK", data: { draft_id: "1" } })).toBe(true);
    expect(isPostDraftListResp({ retcode: 1108, message: "草稿不存在", data: null })).toBe(true);
    expect(isPostDraftDetailResp({ retcode: 1108, message: "草稿不存在", data: null })).toBe(true);
    expect(isPostDraftSaveResp({ retcode: 1108, message: "草稿不存在", data: null })).toBe(true);
  });

  it("rejects drifted successful draft envelopes", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(
        isPostDraftListResp({
          retcode: 0,
          message: "OK",
          data: { list: [{ draft_id: "1" }], is_last: true, next_offset: "0" },
        }),
      ).toBe(false);
      expect(isPostDraftDetailResp({ retcode: 0, message: "OK", data: null })).toBe(false);
      expect(isPostDraftSaveResp({ retcode: 0, message: "OK", data: {} })).toBe(false);
      expect(errorSpy).toHaveBeenCalledTimes(3);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
