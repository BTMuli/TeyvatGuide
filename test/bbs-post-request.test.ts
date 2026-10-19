/**
 * 米游社普通图文帖请求契约回归测试。
 * @since Beta v0.12.6
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  getRequestHeader: vi.fn(),
  serializePostDocument: vi.fn(),
}));

vi.mock("@utils/TGHttps.js", () => ({
  default: { get: mocks.get, post: mocks.post },
}));
vi.mock("@utils/getRequestHeader.js", () => ({ getRequestHeader: mocks.getRequestHeader }));
vi.mock("@utils/bbsPostHtml.js", () => ({ serializePostDocument: mocks.serializePostDocument }));

import postEditReq, { getPostEditSettings } from "../src/request/postEditReq.js";
import { buildPostDocument } from "../src/utils/bbsPostDocument.js";

const imageUrl = "https://example.com/images/post.png";
const pictureImageUrls = [
  "https://example.com/images/picture-1.png",
  "https://example.com/images/picture-2.png",
];
const pictureNodes: Array<TGApp.BBS.SctPost.Base> = [
  { insert: "说明 " },
  { insert: { mention: { uid: 100000002, nickname: "旅行者" } } },
  { insert: "\n" },
];
const cookie = { ltoken: "ltoken-value", ltuid: "100000001" };
const authCookie = { ltoken: cookie.ltoken, ltuid: cookie.ltuid };
const nodes: Array<TGApp.BBS.SctPost.Base> = [
  { insert: "hello", attributes: { bold: true } },
  { insert: "\n", attributes: { header: 1 } },
  { insert: { image: imageUrl } },
  { insert: "\n" },
];
const source = <TGApp.BBS.Post.FullData>(<unknown>{
  post: {
    game_id: 2,
    post_id: "123",
    f_forum_id: 29,
    uid: "100000001",
    subject: "old subject",
    view_type: 1,
    cover: imageUrl,
    images: [imageUrl],
    structured_content: JSON.stringify(nodes),
    topic_ids: [7],
    cate_id: 3,
    is_original: 1,
    republish_authorization: 1,
    review_id: 0,
    is_deleted: 0,
    is_profit: false,
    is_in_profit: false,
    profit_post_status: 0,
    block_reply_img: 0,
    user_ai_content_choice: "USER_AI_CONTENT_CHOICE_NOT_AI",
  },
  forum: { id: 29, forum_cate: { id: 3 } },
  topics: [{ id: 7 }],
  cover: { url: imageUrl },
  collection: null,
  contribution_act: null,
  is_official_master: false,
  release_time_type: "NOW",
  future_release_time: 0,
  vod_list: [],
  link_card_list: [],
  is_has_vote: false,
  is_has_lottery: false,
  post_full_extra_info: null,
  post_attachment_info: null,
  feed_attachment_info: null,
  external_link: { external_link: "", external_link_title: "" },
});

const successResponse = { retcode: 0, message: "ok", data: { post_id: "123" } };
const collectionMetadata = <TGApp.BBS.Post.Collection>(<unknown>{
  prev_post_id: "32028631",
  next_post_id: "0",
  collection_id: "17723",
  cur: 24,
  total: 24,
  collection_title: "记录贴",
  prev_post_game_id: 2,
  next_post_game_id: 0,
  prev_post_view_type: 1,
  next_post_view_type: 0,
});

const pictureSource = <TGApp.BBS.Post.FullData>(<unknown>{
  ...source,
  post: {
    ...source.post,
    view_type: 2,
    cover: pictureImageUrls[1],
    // Deliberately keep a different legacy image field: type 2 uses content.imgs.
    images: ["https://example.com/images/legacy.png"],
    content: JSON.stringify({ imgs: pictureImageUrls, describe: "说明 @旅行者 \n" }),
    structured_content: JSON.stringify(pictureNodes),
  },
  cover: { ...source.cover, url: pictureImageUrls[1] },
});

// Only the profit and release metadata encodings mirror observed API responses; the remaining fields stay synthetic.
const apiEncodedSource = <TGApp.BBS.Post.FullData>(<unknown>{
  ...source,
  post: {
    ...source.post,
    profit_post_status: -2,
  },
  release_time_type: "ReleaseTimeTypeNone",
  future_release_time: 0,
});

const apiEncodedPictureSource = <TGApp.BBS.Post.FullData>(<unknown>{
  ...pictureSource,
  post: {
    ...pictureSource.post,
    profit_post_status: -2,
  },
  release_time_type: "ReleaseTimeTypeNone",
  future_release_time: 0,
});

const pictureNoTrailingLfText = "  合成图片介绍 \n第二行  ";
const pictureNoTrailingLfImages = [
  "https://example.com/images/no-trailing-lf-1.png",
  "https://example.com/images/no-trailing-lf-2.png",
];
const pictureNoTrailingLfNodes: Array<TGApp.BBS.SctPost.Base> = [
  { insert: pictureNoTrailingLfText },
];
const pictureNoTrailingLfSource = <TGApp.BBS.Post.FullData>(<unknown>{
  ...apiEncodedPictureSource,
  post: {
    ...apiEncodedPictureSource.post,
    cover: pictureNoTrailingLfImages[1],
    images: ["https://example.com/images/no-trailing-lf-legacy.png"],
    content: JSON.stringify({
      imgs: pictureNoTrailingLfImages,
      describe: pictureNoTrailingLfText,
    }),
    structured_content: JSON.stringify(pictureNoTrailingLfNodes),
  },
  cover: { ...apiEncodedPictureSource.cover, url: pictureNoTrailingLfImages[1] },
});

/**
 * 构造用于图片帖介绍一致性校验的合成来源。
 * @since Beta v0.12.6
 * @param structuredDescription - 结构化介绍文本
 * @param describe - 正文中的图片介绍
 * @returns 保留测试图片顺序的来源帖子
 */
function makePictureDescriptionSource(
  structuredDescription: string,
  describe: string,
): TGApp.BBS.Post.FullData {
  const source = structuredClone(pictureNoTrailingLfSource);
  source.post.structured_content = JSON.stringify([{ insert: structuredDescription }]);
  source.post.content = JSON.stringify({ imgs: pictureNoTrailingLfImages, describe });
  return source;
}

beforeEach(() => {
  mocks.get.mockReset();
  mocks.post.mockReset();
  mocks.getRequestHeader.mockReset();
  mocks.get.mockResolvedValue({ data: successResponse });
  mocks.post.mockResolvedValue({ data: successResponse });
  mocks.getRequestHeader.mockReturnValue({ "x-test-header": "test" });
  mocks.serializePostDocument.mockReset();
  mocks.serializePostDocument.mockImplementation((input: Array<TGApp.BBS.SctPost.Base>) => ({
    ...buildPostDocument(input),
    html: "<p>canonical fixture</p>",
  }));
});

describe("postEditReq mutation requests", () => {
  it("sends HTML and normalized nodes from the same canonical document", async () => {
    const canonical = {
      ...buildPostDocument([{ insert: "normalized\n" }]),
      html: "<p>normalized</p>",
    };
    mocks.serializePostDocument.mockReturnValueOnce(canonical);
    await postEditReq.create({ ...getPostEditSettings(source), cover: "" }, cookie);
    expect(mocks.post.mock.calls[0][1].body).toMatchObject({
      content: canonical.html,
      structured_content: JSON.stringify(canonical.nodes),
    });
  });

  it("sends the normal-post create payload and signs its complete JSON body", async () => {
    const settings = { ...getPostEditSettings(source), subject: "new subject" };
    const document = buildPostDocument(settings.nodes);

    await expect(postEditReq.create(settings, cookie)).resolves.toEqual(successResponse);

    expect(mocks.post).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/releasePost/v2",
      expect.objectContaining({
        headers: {
          "x-test-header": "test",
          "x-rpc-client_type": "2",
          "Content-Type": "application/json",
        },
        body: {
          gids: "2",
          f_forum_id: 29,
          forum_id: 29,
          forum_cate_id: 3,
          topic_ids: [7],
          subject: "new subject",
          content: "<p>canonical fixture</p>",
          structured_content: JSON.stringify(document.nodes),
          view_type: 1,
          cover: imageUrl,
          is_original: 1,
          republish_authorization: 1,
          block_reply_img: 0,
          user_ai_content_choice: "USER_AI_CONTENT_CHOICE_NOT_AI",
        },
      }),
    );
    const body = mocks.post.mock.calls[0][1].body;
    expect(mocks.serializePostDocument).toHaveBeenCalledWith(document.nodes);
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      authCookie,
      "POST",
      JSON.stringify(body),
      "K2",
      true,
    );
  });

  it("sends the picture-post content wrapper and independent image order", async () => {
    const settings = getPostEditSettings(pictureSource);

    await expect(postEditReq.create(settings, cookie)).resolves.toEqual(successResponse);

    expect(settings).toMatchObject({
      viewType: 2,
      imageUrls: pictureImageUrls,
      cover: pictureImageUrls[1],
    });
    expect(mocks.post).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/releasePost/v2",
      expect.objectContaining({
        body: expect.objectContaining({
          view_type: 2,
          content: JSON.stringify({ imgs: pictureImageUrls, describe: "说明 @旅行者 \n" }),
          structured_content: JSON.stringify(pictureNodes),
          cover: pictureImageUrls[1],
        }),
      }),
    );
    expect(mocks.serializePostDocument).not.toHaveBeenCalled();
  });

  it("rejects a picture-post create with the nineteenth image", async () => {
    const imageUrls = Array.from(
      { length: 19 },
      (_, index) => `https://example.com/images/picture-${index + 1}.png`,
    );
    const settings = { ...getPostEditSettings(pictureSource), imageUrls };

    await expect(postEditReq.create(settings, cookie)).rejects.toThrow("18");
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("allows an existing picture post to retain more than eighteen images", async () => {
    const imageUrls = Array.from(
      { length: 19 },
      (_, index) => `https://example.com/images/picture-${index + 1}.png`,
    );
    const sourceWithNineteen = structuredClone(pictureSource);
    sourceWithNineteen.post.content = JSON.stringify({
      imgs: imageUrls,
      describe: "说明 @旅行者 \n",
    });
    sourceWithNineteen.post.structured_content = JSON.stringify(pictureNodes);
    sourceWithNineteen.post.cover = imageUrls[18];
    sourceWithNineteen.cover = <TGApp.BBS.Post.Image>(<unknown>{
      ...pictureSource.cover,
      url: imageUrls[18],
    });
    const settings = { ...getPostEditSettings(sourceWithNineteen), imageUrls };

    await expect(postEditReq.update(sourceWithNineteen, settings, cookie)).resolves.toEqual(
      successResponse,
    );
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/editPost",
      expect.objectContaining({
        body: expect.objectContaining({
          view_type: 2,
          content: JSON.stringify({ imgs: imageUrls, describe: "说明 @旅行者 \n" }),
        }),
      }),
    );
  });

  it("sends the official edit endpoint and preserves the source owner boundary", async () => {
    const settings = { ...getPostEditSettings(source), subject: "edited subject" };

    await expect(postEditReq.update(source, settings, cookie)).resolves.toEqual(successResponse);
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/editPost",
      expect.objectContaining({
        body: expect.objectContaining({ post_id: "123", subject: "edited subject" }),
      }),
    );

    await expect(
      postEditReq.update(source, settings, { ...cookie, ltuid: "100000002" }),
    ).rejects.toThrow("仅允许帖子作者");
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });

  it("rejects changing the source post type during edit", async () => {
    const normalSettings = getPostEditSettings(source);
    const pictureSettings = getPostEditSettings(pictureSource);

    await expect(postEditReq.update(source, pictureSettings, cookie)).rejects.toThrow(
      "不能切换帖子类型",
    );
    await expect(postEditReq.update(pictureSource, normalSettings, cookie)).rejects.toThrow(
      "不能切换帖子类型",
    );
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("sends the official delete payload with operate_type 0", async () => {
    await expect(postEditReq.delete(source, cookie)).resolves.toEqual(successResponse);

    expect(mocks.post).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/deletePost",
      expect.objectContaining({
        body: { gids: "2", post_id: "123", operate_type: 0, forum_id: 29 },
      }),
    );
    const body = mocks.post.mock.calls[0][1].body;
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      authCookie,
      "POST",
      JSON.stringify(body),
      "K2",
      true,
    );
  });

  it.each([2, 7])(
    "allows the owner to delete view type %s with unrelated metadata",
    async (viewType) => {
      const sourceWithOtherMetadata = structuredClone(source);
      sourceWithOtherMetadata.post.view_type = viewType;
      sourceWithOtherMetadata.collection = <TGApp.BBS.Post.Collection>(<unknown>{
        collection_id: "collection-1",
      });
      sourceWithOtherMetadata.contribution_act = <TGApp.BBS.Post.ContributionAct>(<unknown>{
        act_id: 1,
      });

      await expect(postEditReq.delete(sourceWithOtherMetadata, cookie)).resolves.toEqual(
        successResponse,
      );
      expect(mocks.post).toHaveBeenCalledWith(
        "https://bbs-api.miyoushe.com/post/wapi/deletePost",
        expect.objectContaining({
          body: { gids: "2", post_id: "123", operate_type: 0, forum_id: 29 },
        }),
      );
    },
  );

  it("rejects deletion of profit posts before HTTP", async () => {
    const profitSource = structuredClone(source);
    profitSource.post.is_profit = true;

    await expect(postEditReq.delete(profitSource, cookie)).rejects.toThrow("盈利帖子");
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("deletes an API-encoded ordinary post with the compatible status", async () => {
    await expect(postEditReq.delete(apiEncodedSource, cookie)).resolves.toEqual(successResponse);
    expect(mocks.post).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/deletePost",
      expect.objectContaining({
        body: { gids: "2", post_id: "123", operate_type: 0, forum_id: 29 },
      }),
    );
  });

  it("does not impose the editor title limit on deletion", async () => {
    const legacySource = structuredClone(source);
    legacySource.post.subject = "旧标题".repeat(30);
    await expect(postEditReq.delete(legacySource, cookie)).resolves.toEqual(successResponse);
  });

  it("queries release limits with authenticated K2 headers", async () => {
    const releaseConfig = { retcode: 0, message: "ok", data: { can_release: true } };
    mocks.get.mockResolvedValueOnce({ data: releaseConfig });

    await expect(postEditReq.checkRelease(2, 29, cookie)).resolves.toEqual(releaseConfig);
    expect(mocks.get).toHaveBeenCalledWith("https://bbs-api.miyoushe.com/post/wapi/check/release", {
      headers: { "x-test-header": "test", "x-rpc-client_type": "2" },
      query: { gids: 2, forum_id: 29 },
    });
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      authCookie,
      "GET",
      { gids: 2, forum_id: 29 },
      "K2",
      true,
    );
  });
});

describe("postEditReq source initialization and validation", () => {
  it.each([undefined, null])(
    "refuses to default a missing edit reply-image policy %s",
    async (value) => {
      const settings = getPostEditSettings(source);
      Object.assign(settings, { blockReplyImg: value });

      await expect(postEditReq.update(source, settings, cookie)).rejects.toThrow("评论图片权限");
      expect(mocks.post).not.toHaveBeenCalled();
    },
  );

  it.each([
    "collection",
    "contribution_act",
    "release_time_type",
    "future_release_time",
    "vod_list",
    "link_card_list",
    "is_has_vote",
    "is_has_lottery",
    "post_full_extra_info",
    "post_attachment_info",
    "feed_attachment_info",
    "external_link",
    "is_official_master",
  ])("rejects missing edit metadata %s before HTTP", async (key) => {
    const invalid = structuredClone(source);
    delete (<Record<string, unknown>>(<unknown>invalid))[key];
    expect(() => getPostEditSettings(invalid)).toThrow();
    await expect(
      postEditReq.update(invalid, getPostEditSettings(source), cookie),
    ).rejects.toThrow();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it.each([
    "is_deleted",
    "review_id",
    "is_profit",
    "is_in_profit",
    "profit_post_status",
    "block_reply_img",
  ])("rejects missing post state %s before HTTP", async (key) => {
    const invalid = structuredClone(source);
    delete (<Record<string, unknown>>(<unknown>invalid.post))[key];
    expect(() => getPostEditSettings(invalid)).toThrow();
    await expect(
      postEditReq.update(invalid, getPostEditSettings(source), cookie),
    ).rejects.toThrow();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("preserves automatic cover selection without converting it into an explicit cover", () => {
    const automatic = structuredClone(source);
    automatic.post.cover = "";
    expect(getPostEditSettings(automatic).cover).toBe("");
  });

  it("refuses to lose an explicit cover crop", () => {
    const cropped = structuredClone(source);
    cropped.cover = <TGApp.BBS.Post.Image>{
      ...source.cover,
      crop: { x: 0, y: 0, w: 20, h: 20, url: imageUrl },
    };
    expect(() => getPostEditSettings(cropped)).toThrow("裁剪");
  });

  it("initializes editable settings from structured content and preserves reply-image policy", () => {
    expect(getPostEditSettings(source)).toEqual({
      gid: 2,
      forumId: 29,
      subject: "old subject",
      nodes: buildPostDocument(nodes).nodes,
      viewType: 1,
      topicIds: [7],
      cateId: 3,
      isOriginal: 1,
      republishAuthorization: 1,
      cover: imageUrl,
      sourceCollectionId: null,
      blockReplyImg: 0,
      userAiContentChoice: "USER_AI_CONTENT_CHOICE_NOT_AI",
    });
  });

  it("initializes and updates an API-encoded ordinary post", async () => {
    const settings = getPostEditSettings(apiEncodedSource);

    expect(settings).toMatchObject({ gid: 2, viewType: 1, subject: "old subject" });
    await expect(
      postEditReq.update(
        apiEncodedSource,
        { ...settings, subject: "edited ordinary post" },
        cookie,
      ),
    ).resolves.toEqual(successResponse);
    expect(mocks.post).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/editPost",
      expect.objectContaining({
        body: expect.objectContaining({
          post_id: "123",
          view_type: 1,
          subject: "edited ordinary post",
        }),
      }),
    );
  });

  it("initializes and edits a collection post without changing its collection assignment", async () => {
    const collectionSource = structuredClone(source);
    collectionSource.collection = structuredClone(collectionMetadata);
    collectionSource.post.structured_content = JSON.stringify([
      { insert: "以后没可能赶上了" },
      {
        insert: { image: imageUrl },
        attributes: { height: 1068, width: 1079, size: 876615, ext: "png" },
      },
      { insert: "\n" },
    ]);

    const settings = getPostEditSettings(collectionSource);

    expect(settings.sourceCollectionId).toBe("17723");
    expect(settings.nodes).toEqual([
      { insert: "以后没可能赶上了" },
      { insert: { image: imageUrl } },
      { insert: "\n" },
    ]);
    await expect(
      postEditReq.update(collectionSource, { ...settings, subject: "合集编辑" }, cookie),
    ).resolves.toEqual(successResponse);
    const body = mocks.post.mock.calls.at(-1)?.[1].body;
    expect(body).toMatchObject({
      post_id: "123",
      subject: "合集编辑",
      collection_id: "17723",
    });
  });

  it("preserves a large collection ID as a string through settings and edit requests", async () => {
    const largeCollectionId = "90071992547409931234567890";
    const collectionSource = structuredClone(source);
    collectionSource.collection = <TGApp.BBS.Post.Collection>(<unknown>{
      ...collectionMetadata,
      collection_id: largeCollectionId,
    });
    const settings = getPostEditSettings(collectionSource);

    expect(settings.sourceCollectionId).toBe(largeCollectionId);
    await expect(postEditReq.update(collectionSource, settings, cookie)).resolves.toEqual(
      successResponse,
    );
    expect(mocks.post.mock.calls.at(-1)?.[1].body.collection_id).toBe(largeCollectionId);
  });

  it("rejects collection snapshot changes before edit HTTP", async () => {
    const collectionSource = structuredClone(source);
    collectionSource.collection = structuredClone(collectionMetadata);
    const noCollectionSettings = getPostEditSettings(source);
    const collectionSettings = getPostEditSettings(collectionSource);

    expect(noCollectionSettings).not.toEqual(collectionSettings);
    await expect(
      postEditReq.update(collectionSource, noCollectionSettings, cookie),
    ).rejects.toThrow("来源合集已变化");
    await expect(postEditReq.update(source, collectionSettings, cookie)).rejects.toThrow(
      "来源合集已变化",
    );

    const collectionLegacySettings = { ...collectionSettings };
    Reflect.deleteProperty(collectionLegacySettings, "sourceCollectionId");
    await expect(
      postEditReq.update(collectionSource, collectionLegacySettings, cookie),
    ).rejects.toThrow("来源合集已变化");

    const sourceA = structuredClone(collectionSource);
    sourceA.collection = <TGApp.BBS.Post.Collection>(<unknown>{
      ...collectionMetadata,
      collection_id: "10001",
    });
    const sourceB = structuredClone(collectionSource);
    sourceB.collection = <TGApp.BBS.Post.Collection>(<unknown>{
      ...collectionMetadata,
      collection_id: "10002",
    });
    const settingsA = getPostEditSettings(sourceA);
    const settingsB = getPostEditSettings(sourceB);
    expect(settingsA).not.toEqual(settingsB);
    await expect(postEditReq.update(sourceA, settingsB, cookie)).rejects.toThrow("来源合集已变化");
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("keeps no-collection edits and creates free of collection fields", async () => {
    const settings = getPostEditSettings(source);
    await expect(postEditReq.update(source, settings, cookie)).resolves.toEqual(successResponse);
    expect(mocks.post.mock.calls.at(-1)?.[1].body).not.toHaveProperty("collection_id");

    mocks.post.mockClear();
    const legacySettings = { ...settings };
    Reflect.deleteProperty(legacySettings, "sourceCollectionId");
    await expect(postEditReq.update(source, legacySettings, cookie)).resolves.toEqual(
      successResponse,
    );
    expect(mocks.post.mock.calls.at(-1)?.[1].body).not.toHaveProperty("collection_id");

    mocks.post.mockClear();
    await expect(postEditReq.create(legacySettings, cookie)).resolves.toEqual(successResponse);
    expect(mocks.post.mock.calls.at(-1)?.[1].body).not.toHaveProperty("collection_id");
  });

  it.each([
    ["collection id", { collection_id: "" }],
    ["position", { cur: 0 }],
    ["neighbor view type", { next_post_view_type: 3 }],
    ["missing total", { total: undefined }],
  ])("rejects malformed collection metadata: %s", (_name, patch) => {
    const invalid = structuredClone(source);
    invalid.collection = <TGApp.BBS.Post.Collection>(<unknown>{
      ...collectionMetadata,
      ...patch,
    });

    expect(() => getPostEditSettings(invalid)).toThrow("合集");
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("initializes and updates an API-encoded picture post", async () => {
    const settings = getPostEditSettings(apiEncodedPictureSource);

    expect(settings).toMatchObject({ gid: 2, viewType: 2, imageUrls: pictureImageUrls });
    await expect(
      postEditReq.update(
        apiEncodedPictureSource,
        { ...settings, subject: "edited picture post" },
        cookie,
      ),
    ).resolves.toEqual(successResponse);
    expect(mocks.post).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/editPost",
      expect.objectContaining({
        body: expect.objectContaining({
          post_id: "123",
          view_type: 2,
          content: JSON.stringify({ imgs: pictureImageUrls, describe: "说明 @旅行者 \n" }),
        }),
      }),
    );
  });

  it("normalizes a picture description without a source trailing line feed", async () => {
    const settings = getPostEditSettings(pictureNoTrailingLfSource);
    const normalizedNodes = [...pictureNoTrailingLfNodes, { insert: "\n" }];

    expect(settings.nodes).toEqual(normalizedNodes);
    expect(settings.imageUrls).toEqual(pictureNoTrailingLfImages);
    await expect(
      postEditReq.update(
        pictureNoTrailingLfSource,
        { ...settings, subject: "编辑无尾换行图片帖" },
        cookie,
      ),
    ).resolves.toEqual(successResponse);
    expect(mocks.post).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/editPost",
      expect.objectContaining({
        body: expect.objectContaining({
          post_id: "123",
          view_type: 2,
          content: JSON.stringify({
            imgs: pictureNoTrailingLfImages,
            describe: `${pictureNoTrailingLfText}\n`,
          }),
          structured_content: JSON.stringify(normalizedNodes),
        }),
      }),
    );
  });

  it.each([
    ["an empty description", "\n", ""],
    ["one trailing line feed", `${pictureNoTrailingLfText}\n`, `${pictureNoTrailingLfText}\n`],
    [
      "multiple trailing line feeds",
      `${pictureNoTrailingLfText}\n\n`,
      `${pictureNoTrailingLfText}\n\n`,
    ],
    [
      "one omitted final line feed",
      `${pictureNoTrailingLfText}\n\n`,
      `${pictureNoTrailingLfText}\n`,
    ],
  ])("accepts picture descriptions with %s", (_name, structuredDescription, describe) => {
    const source = makePictureDescriptionSource(structuredDescription, describe);
    const settings = getPostEditSettings(source);

    expect(settings.nodes).toEqual([{ insert: structuredDescription }]);
    expect(settings.imageUrls).toEqual(pictureNoTrailingLfImages);
  });

  it("rejects omitting more than one final line feed before update HTTP", async () => {
    const invalidSource = makePictureDescriptionSource(
      `${pictureNoTrailingLfText}\n\n`,
      pictureNoTrailingLfText,
    );
    const settings = getPostEditSettings(pictureNoTrailingLfSource);

    expect(() => getPostEditSettings(invalidSource)).toThrow("介绍与结构化内容不一致");
    await expect(postEditReq.update(invalidSource, settings, cookie)).rejects.toThrow(
      "介绍与结构化内容不一致",
    );
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("does not ignore a missing mention trailing space", async () => {
    const invalidSource = structuredClone(pictureSource);
    invalidSource.post.content = JSON.stringify({
      imgs: pictureImageUrls,
      describe: "说明 @旅行者\n",
    });
    const settings = getPostEditSettings(pictureSource);

    expect(() => getPostEditSettings(invalidSource)).toThrow("介绍与结构化内容不一致");
    await expect(postEditReq.update(invalidSource, settings, cookie)).rejects.toThrow(
      "介绍与结构化内容不一致",
    );
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it.each([
    ["text", `${pictureNoTrailingLfText}改`],
    ["internal spaces", pictureNoTrailingLfText.replace("介绍 ", "介绍  ")],
    ["internal line feed", pictureNoTrailingLfText.replace("\n", "")],
  ])("rejects %s differences before update HTTP", async (_name, describe) => {
    const invalidSource = makePictureDescriptionSource(pictureNoTrailingLfText, describe);
    const settings = getPostEditSettings(pictureNoTrailingLfSource);

    expect(() => getPostEditSettings(invalidSource)).toThrow("介绍与结构化内容不一致");
    await expect(postEditReq.update(invalidSource, settings, cookie)).rejects.toThrow(
      "介绍与结构化内容不一致",
    );
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it.each([
    ["malformed JSON", "{not-json"],
    ["unsupported node", JSON.stringify([{ insert: { image: imageUrl } }])],
  ])("rejects %s in a picture source before update HTTP", async (_name, structuredContent) => {
    const invalidSource = structuredClone(pictureNoTrailingLfSource);
    invalidSource.post.structured_content = structuredContent;
    const settings = getPostEditSettings(pictureNoTrailingLfSource);

    expect(() => getPostEditSettings(invalidSource)).toThrow();
    await expect(postEditReq.update(invalidSource, settings, cookie)).rejects.toThrow();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("initializes picture settings from content.imgs instead of legacy image fields", () => {
    const settings = getPostEditSettings(pictureSource);

    expect(settings).toEqual({
      gid: 2,
      forumId: 29,
      subject: "old subject",
      nodes: pictureNodes,
      viewType: 2,
      imageUrls: pictureImageUrls,
      topicIds: [7],
      cateId: 3,
      isOriginal: 1,
      republishAuthorization: 1,
      cover: pictureImageUrls[1],
      sourceCollectionId: null,
      blockReplyImg: 0,
      userAiContentChoice: "USER_AI_CONTENT_CHOICE_NOT_AI",
    });
  });

  it("uses the official picture cover URL when post.cover is empty", () => {
    const automatic = structuredClone(pictureSource);
    automatic.post.cover = "";
    automatic.cover = <TGApp.BBS.Post.Image>(<unknown>{
      ...pictureSource.cover,
      url: pictureImageUrls[1],
    });

    expect(getPostEditSettings(automatic).cover).toBe(pictureImageUrls[1]);
    const settings = { ...getPostEditSettings(automatic), cover: "" };
    return expect(postEditReq.create(settings, cookie)).resolves.toEqual(successResponse);
  });

  it.each([1, -1, 2, Number.NaN, "-2", null, undefined])(
    "rejects unknown profit-post status %s before update or delete HTTP",
    async (profitPostStatus) => {
      const invalidSource = structuredClone(source);
      Object.assign(invalidSource.post, { profit_post_status: profitPostStatus });
      const settings = getPostEditSettings(source);

      expect(() => getPostEditSettings(invalidSource)).toThrow("盈利帖子元数据无法安全保留");
      await expect(postEditReq.update(invalidSource, settings, cookie)).rejects.toThrow("盈利帖子");
      await expect(postEditReq.delete(invalidSource, cookie)).rejects.toThrow("盈利帖子");
      expect(mocks.post).not.toHaveBeenCalled();
    },
  );

  it.each(["is_profit", "is_in_profit"])(
    "rejects an explicitly true %s flag before update or delete HTTP",
    async (flag) => {
      const invalidSource = structuredClone(source);
      Object.assign(invalidSource.post, { [flag]: true });
      const settings = getPostEditSettings(source);

      expect(() => getPostEditSettings(invalidSource)).toThrow("盈利帖子元数据无法安全保留");
      await expect(postEditReq.update(invalidSource, settings, cookie)).rejects.toThrow("盈利帖子");
      await expect(postEditReq.delete(invalidSource, cookie)).rejects.toThrow("盈利帖子");
      expect(mocks.post).not.toHaveBeenCalled();
    },
  );

  it("rejects an unknown release type before update HTTP", async () => {
    const invalidSource = structuredClone(source);
    invalidSource.release_time_type = "SCHEDULE";
    const settings = getPostEditSettings(source);

    expect(() => getPostEditSettings(invalidSource)).toThrow("定时发布元数据无法安全保留");
    await expect(postEditReq.update(invalidSource, settings, cookie)).rejects.toThrow(
      "定时发布元数据无法安全保留",
    );
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("rejects a non-zero future release timestamp before update HTTP", async () => {
    const invalidSource = structuredClone(source);
    invalidSource.future_release_time = 4102444800;
    const settings = getPostEditSettings(source);

    expect(() => getPostEditSettings(invalidSource)).toThrow("定时发布时间无法安全保留");
    await expect(postEditReq.update(invalidSource, settings, cookie)).rejects.toThrow(
      "定时发布时间无法安全保留",
    );
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("rejects inconsistent or cropped picture cover metadata", () => {
    const inconsistent = structuredClone(pictureSource);
    inconsistent.post.cover = pictureImageUrls[0];
    expect(() => getPostEditSettings(inconsistent)).toThrow("封面元数据不一致");

    const cropped = structuredClone(pictureSource);
    cropped.cover = <TGApp.BBS.Post.Image>(<unknown>{
      ...pictureSource.cover,
      url: pictureImageUrls[1],
      crop: { x: 0, y: 0, w: 20, h: 20, url: pictureImageUrls[1] },
    });
    expect(() => getPostEditSettings(cropped)).toThrow("裁剪");
  });

  it("rechecks picture cover metadata before update even with a valid new cover", async () => {
    const cropped = structuredClone(pictureSource);
    cropped.post.cover = "";
    cropped.cover = <TGApp.BBS.Post.Image>(<unknown>{
      ...pictureSource.cover,
      url: pictureImageUrls[1],
      crop: { x: 0, y: 0, w: 20, h: 20, url: pictureImageUrls[1] },
    });
    const settings = { ...getPostEditSettings(pictureSource), cover: pictureImageUrls[0] };

    await expect(postEditReq.update(cropped, settings, cookie)).rejects.toThrow("裁剪");
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it.each([
    JSON.stringify({
      imgs: pictureImageUrls,
      describe: "说明 @旅行者 \n",
      link_card_ids: ["card-1"],
    }),
    JSON.stringify({
      imgs: pictureImageUrls,
      describe: "说明 @旅行者 \n",
      vote: { id: "vote-1" },
    }),
  ])("rejects picture content metadata that cannot be preserved", (content) => {
    const invalid = structuredClone(pictureSource);
    invalid.post.content = content;
    expect(() => getPostEditSettings(invalid)).toThrow();
  });

  it("rejects non-empty picture introduction attributes", () => {
    const invalid = structuredClone(pictureSource);
    invalid.post.structured_content = JSON.stringify([
      { insert: "说明", attributes: { bold: true } },
      ...pictureNodes.slice(1),
    ]);
    expect(() => getPostEditSettings(invalid)).toThrow("格式属性");
  });

  it("preserves subject whitespace through source initialization and create", async () => {
    const whitespaceSource = structuredClone(source);
    whitespaceSource.post.subject = "  old subject  ";
    const settings = getPostEditSettings(whitespaceSource);

    expect(settings.subject).toBe("  old subject  ");
    await expect(postEditReq.create(settings, cookie)).resolves.toEqual(successResponse);
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/releasePost/v2",
      expect.objectContaining({ body: expect.objectContaining({ subject: "  old subject  " }) }),
    );
  });

  it.each([
    "USER_AI_CONTENT_CHOICE_UNKNOWN",
    "USER_AI_CONTENT_CHOICE_NOT_AI",
    "USER_AI_CONTENT_CHOICE_IS_AI",
  ])("preserves the known AI choice %s in edit settings and payload", async (choice) => {
    const aiSource = structuredClone(source);
    aiSource.post.user_ai_content_choice = choice;
    const settings = getPostEditSettings(aiSource);

    expect(settings.userAiContentChoice).toBe(choice);
    await expect(postEditReq.update(aiSource, settings, cookie)).resolves.toEqual(successResponse);
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/post/wapi/editPost",
      expect.objectContaining({
        body: expect.objectContaining({ user_ai_content_choice: choice }),
      }),
    );
  });

  it.each([undefined, null, ""])(
    "rejects a missing source AI choice (%s) before edit",
    async (choice) => {
      const invalidSource = structuredClone(source);
      (<Record<string, unknown>>(<unknown>invalidSource.post)).user_ai_content_choice = choice;

      expect(() => getPostEditSettings(invalidSource)).toThrow("AI 内容选择标记无效");
      await expect(
        postEditReq.update(invalidSource, getPostEditSettings(source), cookie),
      ).rejects.toThrow("AI 内容选择标记无效");
      expect(mocks.post).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["unsupported view_type", { view_type: 7 }],
    ["official post", { is_official_master: true }],
    ["profit post", { is_profit: true }],
    ["scheduled post", { release_time_type: "SCHEDULE" }],
  ])("rejects an unsupported %s before making HTTP requests", (_name, patch) => {
    const invalidSource = structuredClone(source);
    Object.assign(
      "is_official_master" in patch || "release_time_type" in patch
        ? invalidSource
        : invalidSource.post,
      patch,
    );

    expect(() => getPostEditSettings(invalidSource)).toThrow();
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("rejects malformed credentials, titles, and unsupported source content", async () => {
    await expect(
      postEditReq.create({ ...getPostEditSettings(source), subject: "x".repeat(31) }, cookie),
    ).rejects.toThrow();
    await expect(
      postEditReq.create(getPostEditSettings(source), { ltoken: "", ltuid: cookie.ltuid }),
    ).rejects.toThrow();

    const unsupportedSource = structuredClone(source);
    unsupportedSource.post.structured_content = JSON.stringify([
      { insert: { video: "https://example.com/video" } },
    ]);
    await expect(
      postEditReq.update(unsupportedSource, getPostEditSettings(source), cookie),
    ).rejects.toThrow();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("passes through business failures from the official service", async () => {
    const businessFailure = { retcode: -10001, message: "invalid request", data: null };
    mocks.post.mockResolvedValueOnce({ data: businessFailure });

    await expect(postEditReq.create(getPostEditSettings(source), cookie)).resolves.toEqual(
      businessFailure,
    );
  });
});
