/**
 * 页面切换使用真实全局钩子时的窗口刷新回归测试。
 * @since Beta v0.13.2
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ reload: vi.fn(), component: {} }));

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue-router")>();
  return { ...actual, createWebHistory: actual.createMemoryHistory };
});
vi.mock("@/pages/common/ComiProf.vue", () => ({ default: mocks.component }));
vi.mock("@/pages/common/PageTest.vue", () => ({ default: mocks.component }));
vi.mock("@/pages/common/PostForum.vue", () => ({ default: mocks.component }));
vi.mock("@/pages/common/PostForumRank.vue", () => ({ default: mocks.component }));
vi.mock("@/pages/common/PostNews.vue", () => ({ default: mocks.component }));
vi.mock("@/pages/common/PostTopic.vue", () => ({ default: mocks.component }));
vi.mock("@comp/comiProf/cp-posts-page.vue", () => ({ default: mocks.component }));
vi.mock("@comp/comiProf/cp-content-page.vue", () => ({ default: mocks.component }));

import router from "../src/router/index.js";
import { getCommunityProfileRoute } from "../src/utils/community/profileRoute.js";

beforeEach(() => {
  mocks.reload.mockClear();
  vi.stubGlobal("window", { location: { reload: mocks.reload } });
});

afterEach(() => vi.unstubAllGlobals());

describe("community profile route refresh", () => {
  it("keeps same-section query, user and duplicate navigations inside the application", async () => {
    await router.push(getCommunityProfileRoute("comments", "123456789", { gid: "2" }));
    await router.push(getCommunityProfileRoute("comments", "123456789", { gid: "3" }));
    await router.push(getCommunityProfileRoute("comments", "987654321", { gid: "3" }));
    await router.push(getCommunityProfileRoute("comments", "987654321", { gid: "3" }));

    expect(mocks.reload).not.toHaveBeenCalled();
    expect(router.currentRoute.value.params.uid).toBe("987654321");
    expect(router.currentRoute.value.query.gid).toBe("3");
  });

  it("leaves the existing refresh policy for other pages intact", async () => {
    await router.push({ name: "测试页", query: { sample: "1" } });
    mocks.reload.mockClear();
    await router.push({ name: "测试页", query: { sample: "2" } });

    expect(mocks.reload).toHaveBeenCalledOnce();
  });

  it("switches ranked forums and partitions without reloading the application", async () => {
    await router.push({ name: "版块榜单", params: { gid: 2, forum: 29 } });
    await router.push({ name: "版块榜单", params: { gid: 2, forum: 49 } });
    expect(router.currentRoute.value.path).toBe("/posts/rank/2/49");
    await router.push({ name: "版块榜单", params: { gid: 3, forum: 40 } });
    expect(router.currentRoute.value.path).toBe("/posts/rank/3/40");
    expect(mocks.reload).not.toHaveBeenCalled();
  });

  it("drops the explicit forum and partition when returning through the generic sidebar entry", async () => {
    await router.push({ name: "酒馆", params: { gid: 3, forum: 40 }, query: { forum: "40" } });
    await router.push({ name: "酒馆", params: { gid: "", forum: "" }, query: {} });

    expect(router.currentRoute.value.fullPath).toBe("/posts/forum");
    expect(mocks.reload).not.toHaveBeenCalled();
  });

  it("drops the explicit news type when using the sidebar while retaining the selected partition", async () => {
    await router.push({ name: "资讯", params: { gid: 2, type: "news" } });
    await router.push({ name: "资讯", params: { gid: 3, type: "" }, query: {} });

    expect(router.currentRoute.value.fullPath).toBe("/news/3");
    expect(mocks.reload).not.toHaveBeenCalled();
  });

  it("switches explicit topic routes without reloading", async () => {
    await router.push({ name: "话题", params: { gid: 2, topic: "100" } });
    await router.push({ name: "话题", params: { gid: 3, topic: "200" } });

    expect(router.currentRoute.value.fullPath).toBe("/posts/topic/3/200");
    expect(mocks.reload).not.toHaveBeenCalled();
  });
});
