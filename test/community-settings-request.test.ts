/**
 * 米游社个人中心设置请求契约回归测试。
 * @since Beta v0.12.6
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  getRequestHeader: vi.fn(),
}));

vi.mock("@utils/TGHttps.js", () => ({
  default: { get: mocks.get, post: mocks.post },
}));
vi.mock("@utils/getRequestHeader.js", () => ({ getRequestHeader: mocks.getRequestHeader }));

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
  mocks.get.mockResolvedValue({ data: successResponse });
  mocks.post.mockResolvedValue({ data: successResponse });
  mocks.getRequestHeader.mockReturnValue({ "x-test-header": "test" });
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

  it("writes only supported profile fields through the official edit endpoint", async () => {
    const profile: TGApp.BBS.CommunitySettings.ProfileUpdate = {
      nickname: "新昵称",
      introduce: "新的简介",
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
