/**
 * 米游社个人中心设置请求契约回归测试。
 * @since Beta v0.13.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  getRequestHeader: vi.fn(),
  uploadCustomAvatarImage: vi.fn(),
}));

vi.mock("@utils/network/TGHttps.js", () => ({
  default: { get: mocks.get, post: mocks.post },
}));
vi.mock("@utils/network/getRequestHeader.js", () => ({ getRequestHeader: mocks.getRequestHeader }));
vi.mock("../src/request/replyAssetReq.js", () => ({
  uploadCustomAvatarImage: mocks.uploadCustomAvatarImage,
}));

import communitySettingsReq, {
  buildPrivacyUpdate,
  getPrivacyDraft,
} from "../src/request/communitySettingsReq.js";

const cookie = {
  account_id: "account-id",
  cookie_token: "cookie-token",
  ltoken: "ltoken-value",
  ltuid: "100000001",
  mid: "mid-value",
  stoken: "stoken-value",
  stuid: "100000001",
};
const authCookie = { account_id: cookie.account_id, cookie_token: cookie.cookie_token };
const successResponse = { retcode: 0, message: "ok", data: null };
const privacyInfo = {
  privacy_invisible: { post_and_instant: true, reply: false, collect: true, watermark: false },
};
const privacyUpdate: TGApp.BBS.CommunitySettings.PrivacyUpdate = {
  privacy_invisible_post_and_instant: true,
  privacy_invisible_collect: true,
  privacy_invisible_watermark: false,
  privacy_visible_reply: true,
  privacy_user_center_view: 2,
};

beforeEach(() => {
  mocks.get.mockReset();
  mocks.post.mockReset();
  mocks.getRequestHeader.mockReset();
  mocks.uploadCustomAvatarImage.mockReset();
  mocks.get.mockResolvedValue({ data: successResponse });
  mocks.post.mockResolvedValue({ data: successResponse });
  mocks.getRequestHeader.mockReturnValue({ "x-test-header": "test" });
  mocks.uploadCustomAvatarImage.mockResolvedValue({
    url: "https://upload-bbs.miyoushe.com/upload/avatar.png",
    width: 1024,
    height: 1024,
  });
});

describe("communitySettingsReq", () => {
  it("rejects missing or non-object privacy data instead of enabling every switch", () => {
    expect(() => getPrivacyDraft(null, 1)).toThrow("隐私设置数据无效");
    expect(() => getPrivacyDraft([], 1)).toThrow("隐私设置数据无效");
    expect(() => getPrivacyDraft({}, 1)).toThrow("隐私设置数据无效");
  });

  it("maps official privacy hidden values to display values", () => {
    const draft = getPrivacyDraft(privacyInfo, 2);
    expect(draft).toEqual({
      showPosts: false,
      showReplies: true,
      showCollections: false,
      addWatermark: true,
      showUserCenter: false,
    });
    expect(buildPrivacyUpdate(draft)).toEqual(privacyUpdate);
  });

  it.each([true, false])("maps all five display values in both directions: %s", (visible) => {
    const draft = {
      showPosts: visible,
      showReplies: visible,
      showCollections: visible,
      addWatermark: visible,
      showUserCenter: visible,
    };
    const update = buildPrivacyUpdate(draft);
    expect(update).toEqual({
      privacy_invisible_post_and_instant: !visible,
      privacy_invisible_collect: !visible,
      privacy_invisible_watermark: !visible,
      privacy_visible_reply: visible,
      privacy_user_center_view: visible ? 1 : 2,
    });
    expect(
      getPrivacyDraft(
        {
          privacy_invisible: {
            post_and_instant: update.privacy_invisible_post_and_instant,
            collect: update.privacy_invisible_collect,
            watermark: update.privacy_invisible_watermark,
            reply: !update.privacy_visible_reply,
          },
        },
        update.privacy_user_center_view,
      ),
    ).toEqual(draft);
  });

  it("preserves every other loaded setting when only one switch changes", () => {
    const draft = getPrivacyDraft(
      {
        ...privacyInfo,
        privacy_invisible: { ...privacyInfo.privacy_invisible, future_flag: true },
        privacy_future_setting: "server-owned",
      },
      2,
    );
    expect(buildPrivacyUpdate({ ...draft, showPosts: true })).toEqual({
      ...privacyUpdate,
      privacy_invisible_post_and_instant: false,
    });
  });

  it.each(["post_and_instant", "reply", "collect", "watermark"])(
    "rejects a missing or invalid privacy field: %s",
    (field) => {
      const flags: Record<string, unknown> = { ...privacyInfo.privacy_invisible };
      delete flags[field];
      expect(() => getPrivacyDraft({ privacy_invisible: flags }, 1)).toThrow("隐私设置数据无效");
      flags[field] = "false";
      expect(() => getPrivacyDraft({ privacy_invisible: flags }, 1)).toThrow("隐私设置数据无效");
    },
  );

  it.each([0, 3, Number.NaN])("rejects an unknown homepage permission: %s", (permission) => {
    expect(() => getPrivacyDraft(privacyInfo, permission)).toThrow("隐私设置数据无效");
  });

  it("reads privacy settings with the official endpoint and smallest cookie", async () => {
    await communitySettingsReq.getPrivacy(cookie);

    expect(mocks.getRequestHeader).toHaveBeenCalledWith(authCookie, "GET", {}, "X4", true);
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/user/wapi/getUserCommunityInfo",
      { headers: { "x-test-header": "test" } },
    );
  });

  it("writes exactly the five official fields and excludes unknown input fields", async () => {
    const settings = privacyUpdate;
    const input = {
      ...settings,
      privacy_future_toggle: "keep",
      privacy_invisible: { future_flag: true },
    };

    await communitySettingsReq.setPrivacy(cookie, input);

    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      authCookie,
      "POST",
      JSON.stringify(settings),
      "X4",
      true,
    );
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/user/wapi/userPrivacySetting",
      {
        headers: { "x-test-header": "test", "Content-Type": "application/json" },
        body: settings,
      },
    );
  });

  it("writes supported profile and avatar fields through the official edit endpoint", async () => {
    const profile: TGApp.BBS.CommunitySettings.ProfileUpdate = {
      nickname: "新昵称",
      introduce: "新的简介",
      avatar: "100108",
      avatar_url: "https://upload-bbs.miyoushe.com/avatar.png",
      avatar_assets_id: "",
      gender: 0,
    };

    await communitySettingsReq.updateProfile(cookie, profile);

    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      authCookie,
      "POST",
      JSON.stringify(profile),
      "X4",
      true,
    );
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/user/wapi/userInfoEdit",
      {
        headers: { "x-test-header": "test", "Content-Type": "application/json" },
        body: profile,
      },
    );
  });

  it("checks custom-avatar cost with the native zero-body K2 request", async () => {
    const signal = new AbortController().signal;
    mocks.post.mockResolvedValueOnce({
      data: {
        retcode: 0,
        message: "ok",
        data: {
          current_myb: 120,
          edit_custom_avatar_cost_myb: 30,
          is_first_edit_custom_avatar: false,
          is_user_init: false,
        },
      },
    });

    await expect(communitySettingsReq.getCustomAvatarPolicy(cookie, signal)).resolves.toEqual({
      cost: 30,
      rawCost: 30,
      balance: 120,
    });
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      { stuid: cookie.stuid, stoken: cookie.stoken, mid: cookie.mid },
      "POST",
      "",
      "K2",
      true,
    );
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/user/api/edit_avatar/check",
      {
        headers: { "x-test-header": "test", "x-rpc-client_type": "2" },
        body: "",
        signal,
      },
    );
  });

  it.each([
    { is_first_edit_custom_avatar: true, is_user_init: false },
    { is_first_edit_custom_avatar: false, is_user_init: true },
  ])("maps a free custom-avatar policy: %s", async (flags) => {
    mocks.post.mockResolvedValueOnce({
      data: {
        retcode: 0,
        message: "ok",
        data: {
          current_myb: 0,
          edit_custom_avatar_cost_myb: 30,
          ...flags,
        },
      },
    });

    await expect(communitySettingsReq.getCustomAvatarPolicy(cookie)).resolves.toEqual({
      cost: 0,
      rawCost: 30,
      balance: 0,
    });
  });

  it("uploads the avatar and maps the official empty avatar IDs", async () => {
    const file = new File([Uint8Array.from([1, 2])], "avatar.png", { type: "image/png" });
    const signal = new AbortController().signal;

    await expect(communitySettingsReq.uploadCustomAvatar(file, cookie, signal)).resolves.toEqual({
      avatar: "",
      avatar_url: "https://upload-bbs.miyoushe.com/upload/avatar.png",
      avatar_assets_id: "",
    });
    expect(mocks.uploadCustomAvatarImage).toHaveBeenCalledWith(file, cookie, signal);
  });

  it.each([{ edit_custom_avatar_cost_myb: -1 }, { is_first_edit_custom_avatar: "false" }])(
    "rejects malformed avatar fee data: %j",
    async (invalid) => {
      mocks.post.mockResolvedValueOnce({
        data: {
          retcode: 0,
          message: "ok",
          data: {
            current_myb: 120,
            edit_custom_avatar_cost_myb: 30,
            is_first_edit_custom_avatar: false,
            is_user_init: false,
            ...invalid,
          },
        },
      });
      await expect(communitySettingsReq.getCustomAvatarPolicy(cookie)).rejects.toThrow(
        "费用数据无效",
      );
    },
  );

  it("rejects mismatched native credentials before checking avatar fees", async () => {
    await expect(
      communitySettingsReq.getCustomAvatarPolicy({ ...cookie, stuid: "100000002" }),
    ).rejects.toThrow("UID 不一致");
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it.each(["", "blob:avatar", "https://example.com/avatar.png"])(
    "rejects an invalid avatar URL before editing a profile: %s",
    async (avatarUrl) => {
      await expect(
        communitySettingsReq.updateAppProfile(cookie, {
          nickname: "旅行者",
          introduce: "",
          gender: 0,
          avatar_url: avatarUrl,
        }),
      ).rejects.toThrow("头像地址无效");
      expect(mocks.post).not.toHaveBeenCalled();
    },
  );

  it("writes custom avatar profiles through the native API_BBS endpoint", async () => {
    const signal = new AbortController().signal;
    const profile: TGApp.BBS.CommunitySettings.ProfileUpdate = {
      nickname: " 新昵称 ",
      introduce: " 新简介 ",
      gender: 0,
      avatar: "stale-avatar",
      avatar_url: "https://upload-bbs.miyoushe.com/upload/avatar.png",
      avatar_assets_id: "",
    };
    const body = {
      avatar: "",
      avatar_url: profile.avatar_url,
      avatar_assets_id: "",
      gender: 0,
      introduce: "新简介",
      nickname: "新昵称",
    };

    await communitySettingsReq.updateAppProfile(cookie, profile, signal);

    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      { stuid: cookie.stuid, stoken: cookie.stoken, mid: cookie.mid },
      "POST",
      JSON.stringify(body),
      "K2",
      true,
    );
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/user/api/userInfoEdit",
      {
        headers: {
          "x-test-header": "test",
          "x-rpc-client_type": "2",
          "Content-Type": "application/json",
        },
        body,
        signal,
      },
    );
  });

  it("keeps the dynamic asset id and resource URL when submitting a dynamic avatar", async () => {
    const profile: TGApp.BBS.CommunitySettings.ProfileUpdate = {
      nickname: "旅行者",
      introduce: "",
      gender: 0,
      avatar: "",
      avatar_url: "https://upload-bbs.miyoushe.com/upload/dynamic.gif?x-oss-process=image",
      avatar_assets_id: " asset-42 ",
    };
    const body = {
      avatar: "",
      avatar_url: profile.avatar_url,
      avatar_assets_id: "asset-42",
      gender: 0,
      introduce: "",
      nickname: "旅行者",
    };

    await communitySettingsReq.updateAppProfile(cookie, profile);

    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      { stuid: cookie.stuid, stoken: cookie.stoken, mid: cookie.mid },
      "POST",
      JSON.stringify(body),
      "K2",
      true,
    );
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/user/api/userInfoEdit",
      {
        headers: {
          "x-test-header": "test",
          "x-rpc-client_type": "2",
          "Content-Type": "application/json",
        },
        body,
      },
    );
  });

  it("loads owned dynamic avatars with a signed GET", async () => {
    const signal = new AbortController().signal;

    await communitySettingsReq.getAvatarAssets(cookie, signal);

    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      { stuid: cookie.stuid, stoken: cookie.stoken, mid: cookie.mid },
      "GET",
      { assets_type: 3 },
      "K2",
      true,
    );
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/pendant/api/assets/getMyBackpackAssets",
      {
        headers: { "x-test-header": "test", "x-rpc-client_type": "2" },
        query: { assets_type: 3 },
        signal,
      },
    );
  });

  it("forwards cancellation to profile and pendant writes when provided", async () => {
    const signal = new AbortController().signal;
    const profile: TGApp.BBS.CommunitySettings.ProfileUpdate = { nickname: "新昵称" };

    await communitySettingsReq.updateProfile(cookie, profile, signal);
    await communitySettingsReq.setPendant(cookie, 42, signal);

    expect(mocks.post.mock.calls[0]?.[1].signal).toBe(signal);
    expect(mocks.post.mock.calls[1]?.[1].signal).toBe(signal);
  });

  it("loads preset avatars from the public endpoint without account headers", async () => {
    await communitySettingsReq.getAvatars();

    expect(mocks.getRequestHeader).not.toHaveBeenCalled();
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/misc/api/avatar_set",
      {},
    );
  });

  it("loads the account pendant list with a signed GET", async () => {
    mocks.get.mockResolvedValueOnce({
      data: { retcode: 0, message: "ok", data: { list: [] } },
    });

    await communitySettingsReq.getPendantList(cookie);

    expect(mocks.getRequestHeader).toHaveBeenCalledWith(authCookie, "GET", {}, "X4", true);
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/pendant/wapi/getUserPendantList",
      { headers: { "x-test-header": "test" } },
    );
  });

  it("normalizes numeric-string pendant ids from the list response", async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        retcode: 0,
        message: "ok",
        data: {
          list: [
            {
              id: "42",
              url: "https://example.com/pendant.png",
              name: "测试头像框",
              owned: true,
              is_used: true,
              obtain_method: " 活动兑换 ",
            },
          ],
        },
      },
    });

    const response = await communitySettingsReq.getPendantList(cookie);

    expect(response.data.list[0]?.id).toBe(42);
    expect(response.data.list[0]?.obtainMethod).toBe("活动兑换");
  });

  it.each(["abc", "-1", "1.5", null])(
    "rejects an invalid pendant id from the list response: %s",
    async (id) => {
      mocks.get.mockResolvedValueOnce({
        data: {
          retcode: 0,
          message: "ok",
          data: {
            list: [{ id, url: "", name: "无效头像框", owned: true, is_used: false }],
          },
        },
      });

      await expect(communitySettingsReq.getPendantList(cookie)).rejects.toThrow("头像框数据无效");
    },
  );

  it("sets and clears the pendant with an explicit pendant id", async () => {
    await communitySettingsReq.setPendant(cookie, 42);

    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      authCookie,
      "POST",
      JSON.stringify({ pendant_id: 42 }),
      "X4",
      true,
    );
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/pendant/wapi/setUserPendant",
      {
        headers: { "x-test-header": "test", "Content-Type": "application/json" },
        body: { pendant_id: 42 },
      },
    );

    await communitySettingsReq.setPendant(cookie, 0);

    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/pendant/wapi/setUserPendant",
      {
        headers: { "x-test-header": "test", "Content-Type": "application/json" },
        body: { pendant_id: 0 },
      },
    );
  });

  it.each([-1, 1.5, Number.NaN])("rejects an invalid pendant id: %s", async (pendantId) => {
    await expect(communitySettingsReq.setPendant(cookie, pendantId)).rejects.toThrow(
      "头像框 ID 无效",
    );
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("loads and normalizes comment decorations from the backpack asset contract", async () => {
    const signal = new AbortController().signal;
    mocks.get.mockResolvedValueOnce({
      data: {
        retcode: 0,
        message: "ok",
        data: {
          assets_list: [
            {
              assets_id: "42",
              assets_type: 4,
              name: "测试评论装扮",
              desc: "评论气泡",
              resource: { url: "https://example.com/comment-decoration.png" },
              author: "绘制者",
              remain_time: "3600",
              expired_time: 1700000000,
              owned: true,
              is_used: false,
              obtainMethod: " 活动兑换 ",
            },
          ],
        },
      },
    });

    const response = await communitySettingsReq.getCommentDecorationList(cookie, signal);

    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      { stuid: cookie.stuid, stoken: cookie.stoken, mid: cookie.mid },
      "GET",
      { assets_type: 4 },
      "K2",
      true,
    );
    expect(mocks.get).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/pendant/api/assets/getMyBackpackAssets",
      {
        headers: { "x-test-header": "test", "x-rpc-client_type": "2" },
        query: { assets_type: 4 },
        signal,
      },
    );
    expect(response.data.list).toEqual([
      {
        id: "42",
        name: "测试评论装扮",
        url: "https://example.com/comment-decoration.png",
        description: "评论气泡",
        author: "绘制者",
        remain_time: 3600,
        expired_time: 1700000000,
        owned: true,
        is_used: false,
        obtainMethod: "活动兑换",
      },
    ]);
  });

  it("preserves 19-digit comment decoration ids as strings", async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        retcode: 0,
        message: "ok",
        data: {
          assets_list: [
            {
              assets_id: "2042547678469996544",
              name: "大整数装扮",
              resource: { reply_bubble: { url: "https://example.com/big.png" } },
            },
          ],
        },
      },
    });

    const response = await communitySettingsReq.getCommentDecorationList(cookie);

    expect(response.data.list[0]?.id).toBe("2042547678469996544");
  });

  it("reads comment decoration artwork from resource.reply_bubble", async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        retcode: 0,
        message: "ok",
        data: {
          assets_list: [
            {
              assets_id: "7",
              assets_type: 4,
              name: "气泡装扮",
              desc: "活动获取",
              resource: {
                reply_bubble: {
                  url: "https://example.com/bubble.png",
                  gif_url: "https://example.com/bubble.gif",
                  pag_url: "https://example.com/bubble.pag",
                  bg_color: "#ffffff",
                },
              },
              is_used: true,
            },
          ],
        },
      },
    });

    const response = await communitySettingsReq.getCommentDecorationList(cookie);

    expect(response.data.list).toEqual([
      {
        id: "7",
        name: "气泡装扮",
        url: "https://example.com/bubble.png",
        description: "活动获取",
        bg_color: "#ffffff",
        owned: true,
        is_used: true,
      },
    ]);
  });

  it("merges unowned comment decorations and lets owned entries win", async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        retcode: 0,
        message: "ok",
        data: {
          assets_list: [
            {
              assets_id: "1",
              name: "已拥有装扮",
              resource: { reply_bubble: { url: "https://example.com/owned.png" } },
            },
          ],
          unowned_assets_list: [
            {
              assets_id: "1",
              name: "重复装扮",
              resource: { reply_bubble: { url: "https://example.com/owned.png" } },
            },
            {
              assets_id: "2",
              name: "未拥有装扮",
              resource: { reply_bubble: { url: "https://example.com/unowned.png" } },
            },
          ],
        },
      },
    });

    const response = await communitySettingsReq.getCommentDecorationList(cookie);

    expect(response.data.list.map(({ id, name, owned }) => ({ id, name, owned }))).toEqual([
      { id: "1", name: "已拥有装扮", owned: true },
      { id: "2", name: "未拥有装扮", owned: false },
    ]);
  });

  it("keeps a comment decoration whose artwork is missing", async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        retcode: 0,
        message: "ok",
        data: {
          assets_list: [{ assets_id: "3", name: "无图装扮", desc: "暂无图片" }],
        },
      },
    });

    const response = await communitySettingsReq.getCommentDecorationList(cookie);

    expect(response.data.list[0]).toMatchObject({
      id: "3",
      name: "无图装扮",
      url: "",
      description: "暂无图片",
      owned: true,
    });
  });

  it.each(["abc", "-1", "1.5", "1e3", "", null])(
    "rejects an invalid comment decoration id from the list response: %s",
    async (id) => {
      mocks.get.mockResolvedValueOnce({
        data: {
          retcode: 0,
          message: "ok",
          data: {
            assets_list: [
              {
                assets_id: id,
                name: "无效评论装扮",
                url: "",
              },
            ],
          },
        },
      });

      await expect(communitySettingsReq.getCommentDecorationList(cookie)).rejects.toThrow(
        "评论装扮数据无效",
      );
    },
  );

  it("sets and clears a comment decoration with signed asset queries", async () => {
    const signal = new AbortController().signal;

    await communitySettingsReq.setCommentDecoration(cookie, "42", signal);

    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      { stuid: cookie.stuid, stoken: cookie.stoken, mid: cookie.mid },
      "POST",
      { assets_id: "42", assets_type: 4 },
      "K2",
      true,
    );
    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/pendant/api/setUserAssets",
      {
        headers: { "x-test-header": "test", "x-rpc-client_type": "2" },
        query: { assets_id: "42", assets_type: 4 },
        signal,
      },
    );

    await communitySettingsReq.setCommentDecoration(cookie, "");

    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/pendant/api/setUserAssets",
      {
        headers: { "x-test-header": "test", "x-rpc-client_type": "2" },
        query: { assets_id: "0", assets_type: 4 },
      },
    );

    await communitySettingsReq.setCommentDecoration(cookie, "2042547678469996544");

    expect(mocks.post).toHaveBeenLastCalledWith(
      "https://bbs-api.miyoushe.com/pendant/api/setUserAssets",
      {
        headers: { "x-test-header": "test", "x-rpc-client_type": "2" },
        query: { assets_id: "2042547678469996544", assets_type: 4 },
      },
    );
  });

  it.each(["abc", "-1", "1.5", "1e3"])(
    "rejects an invalid comment decoration id: %s",
    async (id) => {
      await expect(communitySettingsReq.setCommentDecoration(cookie, id)).rejects.toThrow(
        "评论装扮 ID 无效",
      );
      expect(mocks.post).not.toHaveBeenCalled();
    },
  );

  it("passes through comment decoration business responses and transport errors", async () => {
    const businessError = { retcode: 1001, message: "permission denied", data: null };
    mocks.get.mockResolvedValueOnce({ data: businessError });
    await expect(communitySettingsReq.getCommentDecorationList(cookie)).resolves.toEqual(
      businessError,
    );

    const transportError = new Error("network failure");
    mocks.post.mockRejectedValueOnce(transportError);
    await expect(communitySettingsReq.setCommentDecoration(cookie, "42")).rejects.toBe(
      transportError,
    );
  });

  it("passes through business responses and transport errors", async () => {
    const businessError = { retcode: 1001, message: "permission denied", data: null };
    mocks.post.mockResolvedValueOnce({ data: businessError });
    await expect(communitySettingsReq.setPrivacy(cookie, privacyUpdate)).resolves.toEqual(
      businessError,
    );

    const transportError = new Error("network failure");
    mocks.get.mockRejectedValueOnce(transportError);
    await expect(communitySettingsReq.getPrivacy(cookie)).rejects.toBe(transportError);
  });
});
