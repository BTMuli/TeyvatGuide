/**
 * 个人中心使用真实全局钩子时的窗口刷新回归测试。
 * @since Beta v0.13.1
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ reload: vi.fn(), component: {} }));

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue-router")>();
  return { ...actual, createWebHistory: actual.createMemoryHistory };
});
vi.mock("@/pages/common/ComiProf.vue", () => ({ default: mocks.component }));
vi.mock("@/pages/common/PageTest.vue", () => ({ default: mocks.component }));
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
});
