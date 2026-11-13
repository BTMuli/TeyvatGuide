/**
 * 米游社个人中心帖子列表回归测试。
 * @since Beta v0.13.1
 */

import { describe, expect, it } from "vitest";

import {
  appendCommunityPostPage,
  createCommunityProfilePostsController,
} from "../src/hooks/useCommunityProfilePosts.js";

/**
 * 帖子控制器测试快照。
 * @since Beta v0.13.1
 */
type TestSnapshot = { key: string };

/**
 * 创建最小帖子测试数据。
 * @since Beta v0.13.1
 * @param postId - 帖子 ID
 * @returns 帖子数据
 */
function createPost(postId: string): TGApp.BBS.Post.FullData {
  return <TGApp.BBS.Post.FullData>(<unknown>{ post: { post_id: postId } });
}

/**
 * 创建帖子分页测试数据。
 * @since Beta v0.13.1
 * @param ids - 帖子 ID 列表
 * @param nextOffset - 下一页游标
 * @param isLast - 是否最后一页
 * @param total - 搜索结果总数
 * @returns 帖子分页数据
 */
function createPage(
  ids: Array<string>,
  nextOffset: string,
  isLast: boolean = false,
  total: number = 0,
): TGApp.BBS.Profile.PostPage {
  return { list: ids.map(createPost), nextOffset, isLast, total };
}

describe("appendCommunityPostPage", () => {
  it("removes duplicate posts while retaining page order", () => {
    const current = [createPost("1"), createPost("2")];

    const result = appendCommunityPostPage(current, createPage(["2", "3"], "next"));

    expect(result.map((post) => post.post.post_id)).toEqual(["1", "2", "3"]);
  });

  it("rejects an empty or unchanged cursor on a non-final page", () => {
    expect(() => appendCommunityPostPage([], createPage(["1"], ""))).toThrow("分页游标无效");
    expect(() => appendCommunityPostPage([], createPage(["1"], "same"), "same")).toThrow(
      "刷新后重试",
    );
  });
});

describe("createCommunityProfilePostsController", () => {
  it("loads the first page and then requests the next page with its cursor", async () => {
    const snapshot: TestSnapshot = { key: "account-a" };
    const calls: Array<{ key: string; keyword: string; offset?: string }> = [];
    const controller = createCommunityProfilePostsController<TestSnapshot>({
      getSnapshot: () => snapshot,
      isCurrentSnapshot: (value) => value.key === snapshot.key,
      fetchPage: async (value, keyword, offset) => {
        calls.push({ key: value.key, keyword, offset });
        return offset === undefined
          ? createPage(["1"], "cursor-1")
          : createPage(["1", "2"], "cursor-2", true);
      },
    });

    await controller.loadInitial();
    await controller.loadMore();

    expect(calls).toEqual([
      { key: "account-a", keyword: "", offset: undefined },
      { key: "account-a", keyword: "", offset: "cursor-1" },
    ]);
    expect(controller.posts.value.map((post) => post.post.post_id)).toEqual(["1", "2"]);
    expect(controller.isLast.value).toBe(true);
  });

  it("passes the trimmed search keyword and search total", async () => {
    const snapshot: TestSnapshot = { key: "account-a" };
    const calls: Array<{ keyword: string; offset?: string }> = [];
    const controller = createCommunityProfilePostsController<TestSnapshot>({
      getSnapshot: () => snapshot,
      isCurrentSnapshot: (value) => value.key === snapshot.key,
      fetchPage: async (_value, keyword, offset) => {
        calls.push({ keyword, offset });
        return createPage(["3"], "", true, 1);
      },
    });

    await controller.search("  paimon  ");

    expect(calls).toEqual([{ keyword: "paimon", offset: undefined }]);
    expect(controller.searchKeyword.value).toBe("paimon");
    expect(controller.searchTotal.value).toBe(1);
  });

  it("ignores a response after the account context changes", async () => {
    let snapshot: TestSnapshot = { key: "account-a" };
    const pending: Array<{
      key: string;
      resolve: (page: TGApp.BBS.Profile.PostPage) => void;
    }> = [];
    const controller = createCommunityProfilePostsController<TestSnapshot>({
      getSnapshot: () => snapshot,
      isCurrentSnapshot: (value) => value.key === snapshot.key,
      fetchPage: async (value) =>
        await new Promise<TGApp.BBS.Profile.PostPage>((resolve) => {
          pending.push({ key: value.key, resolve });
        }),
    });

    const firstLoad = controller.loadInitial();
    snapshot = { key: "account-b" };
    controller.reset();
    const secondLoad = controller.loadInitial();
    pending.find((item) => item.key === "account-b")?.resolve(createPage(["new"], "", true));
    await secondLoad;
    pending.find((item) => item.key === "account-a")?.resolve(createPage(["old"], "", true));
    await firstLoad;

    expect(controller.posts.value.map((post) => post.post.post_id)).toEqual(["new"]);
  });

  it("ignores a stale search response after the account context changes", async () => {
    let snapshot: TestSnapshot = { key: "account-a" };
    const pending: Array<{
      key: string;
      keyword: string;
      resolve: (page: TGApp.BBS.Profile.PostPage) => void;
    }> = [];
    const controller = createCommunityProfilePostsController<TestSnapshot>({
      getSnapshot: () => snapshot,
      isCurrentSnapshot: (value) => value.key === snapshot.key,
      fetchPage: async (value, keyword) =>
        await new Promise<TGApp.BBS.Profile.PostPage>((resolve) => {
          pending.push({ key: value.key, keyword, resolve });
        }),
    });

    const firstLoad = controller.loadInitial();
    pending[0]?.resolve(createPage(["seed"], "", true));
    await firstLoad;
    const oldSearch = controller.search("old");
    snapshot = { key: "account-b" };
    controller.reset();
    const newSearch = controller.search("new");
    pending
      .find((item) => item.key === "account-b" && item.keyword === "new")
      ?.resolve(createPage(["new"], "", true));
    await newSearch;
    pending
      .find((item) => item.key === "account-a" && item.keyword === "old")
      ?.resolve(createPage(["old"], "", true));
    await oldSearch;

    expect(controller.posts.value.map((post) => post.post.post_id)).toEqual(["new"]);
  });

  it("does not apply a response after disposal", async () => {
    let resolvePage: ((page: TGApp.BBS.Profile.PostPage) => void) | undefined;
    const controller = createCommunityProfilePostsController<TestSnapshot>({
      getSnapshot: () => ({ key: "account-a" }),
      isCurrentSnapshot: () => true,
      fetchPage: async () =>
        await new Promise<TGApp.BBS.Profile.PostPage>((resolve) => {
          resolvePage = resolve;
        }),
    });

    const load = controller.loadInitial();
    controller.dispose();
    resolvePage?.(createPage(["late"], "", true));
    await load;

    expect(controller.posts.value).toEqual([]);
  });
});
