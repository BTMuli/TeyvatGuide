/**
 * 米游社 APK 投票创建请求契约测试。
 * @since Beta v0.13.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  getRequestHeader: vi.fn(),
}));

vi.mock("@utils/TGHttps.js", () => ({ default: { post: mocks.post } }));
vi.mock("@utils/getRequestHeader.js", () => ({ getRequestHeader: mocks.getRequestHeader }));

import postVoteReq from "../src/request/postVoteReq.js";

const cookie = {
  ltuid: "100000001",
  stuid: "100000001",
  stoken: "stoken-value",
  mid: "mid-value",
};
const body: TGApp.BBS.Vote.CreateRequest = {
  end_time: 1_900_000_000,
  title: "投票标题",
  vote_limit: 1,
  vote_options: ["选项一", "选项二"],
};

describe("postVoteReq", () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.getRequestHeader.mockReset();
    mocks.getRequestHeader.mockReturnValue({ ds: "signed" });
  });

  it("uses the APK sapi createVote route and native account credentials", async () => {
    const response = { retcode: 0, message: "ok", data: { vote_id: "vote-1" } };
    mocks.post.mockResolvedValueOnce({ data: response });

    await expect(postVoteReq.create(body, cookie)).resolves.toEqual(response);
    expect(mocks.getRequestHeader).toHaveBeenCalledWith(
      { stuid: cookie.stuid, stoken: cookie.stoken, mid: cookie.mid },
      "POST",
      JSON.stringify(body),
      "K2",
      true,
    );
    expect(mocks.post).toHaveBeenCalledWith(
      "https://bbs-api.miyoushe.com/apihub/sapi/createVote",
      expect.objectContaining({
        headers: expect.objectContaining({
          ds: "signed",
          "x-rpc-client_type": "2",
          urlname: "API_BBS",
          "Content-Type": "application/json",
        }),
        body,
      }),
    );
  });

  it.each([
    { ...cookie, stuid: "100000002" },
    { ...cookie, stoken: "" },
    { ...cookie, mid: "" },
    { ...cookie, ltuid: "" },
  ])("rejects an account snapshot that cannot be safely signed: %j", async (invalidCookie) => {
    await expect(postVoteReq.create(body, invalidCookie)).rejects.toThrow();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("rejects a cookie that does not match the current account snapshot", async () => {
    await expect(postVoteReq.create(body, cookie, "100000002")).rejects.toThrow("UID");
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
