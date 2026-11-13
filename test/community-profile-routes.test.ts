/**
 * 米游社个人中心子路由回归测试。
 * @since Beta v0.13.1
 */

import { describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

const dummyComponent = vi.hoisted(() => ({}));

vi.mock("@/pages/common/ComiProf.vue", () => ({ default: dummyComponent }));
vi.mock("@comp/comiProf/cp-content-page.vue", () => ({ default: dummyComponent }));
vi.mock("@comp/comiProf/cp-notifications-page.vue", () => ({ default: dummyComponent }));
vi.mock("@comp/comiProf/cp-notify-settings-page.vue", () => ({ default: dummyComponent }));
vi.mock("@comp/comiProf/cp-posts-page.vue", () => ({ default: dummyComponent }));
vi.mock("@comp/comiProf/cp-settings-page.vue", () => ({ default: dummyComponent }));

import routes from "../src/router/routes.js";
import { getCommunityProfileRoute } from "../src/utils/community/profileRoute.js";

/**
 * 创建使用真实路由配置的内存路由。
 * @since Beta v0.13.1
 * @returns 测试路由实例
 */
function createTestRouter() {
  return createRouter({ history: createMemoryHistory(), routes });
}

/**
 * 等待一次历史前进或后退完成。
 * @since Beta v0.13.1
 * @param router - 测试路由
 * @param delta - 历史偏移量
 */
async function moveHistory(
  router: ReturnType<typeof createTestRouter>,
  delta: number,
): Promise<void> {
  const navigation = new Promise<void>((resolve) => {
    const removeHook = router.afterEach(() => {
      removeHook();
      resolve();
    });
    router.go(delta);
  });
  await navigation;
}

describe("community profile child routes", () => {
  it("keeps the existing profile names on the posts child", async () => {
    const router = createTestRouter();

    await router.push({ name: "个人信息" });

    expect(router.currentRoute.value.name).toBe("个人信息");
    expect(router.currentRoute.value.meta.profileSection).toBe("posts");
    expect(router.currentRoute.value.matched).toHaveLength(2);
  });

  it("matches every public and private child section", async () => {
    const sections: Array<TGApp.BBS.Profile.Section> = [
      "comments",
      "collections",
      "favorites",
      "following",
      "followers",
      "history",
      "privacy",
      "edit",
      "reply",
      "mention",
      "system",
      "likes",
      "notifySettings",
    ];

    for (const section of sections) {
      const router = createTestRouter();
      await router.push(getCommunityProfileRoute(section));
      expect(router.currentRoute.value.meta.profileSection).toBe(section);
      expect(router.currentRoute.value.meta.communityProfile).toBe(true);
      expect(router.currentRoute.value.meta.profileOwnOnly).toBe(
        [
          "history",
          "privacy",
          "edit",
          "reply",
          "mention",
          "system",
          "likes",
          "notifySettings",
        ].includes(section),
      );
    }
  });

  it("keeps a user UID route separate from the post edit route", () => {
    const router = createTestRouter();

    const user = router.resolve(getCommunityProfileRoute("posts", "123456789"));
    const edit = router.resolve("/community/profile/posts/987654321/edit");

    expect(user.name).toBe("用户信息");
    expect(user.params.uid).toBe("123456789");
    expect(edit.name).toBe("编辑帖子");
    expect(edit.name).not.toBe("用户信息");
  });

  it("opens a collection child route with its collection and game context", async () => {
    const router = createTestRouter();

    await router.push(
      getCommunityProfileRoute("collections", "123456789", {
        collection: "90071992547409931234567890",
        gid: "3",
        from: "post",
      }),
    );

    expect(router.currentRoute.value.name).toBe("用户信息-collections");
    expect(router.currentRoute.value.path).toBe("/community/profile/123456789/collections");
    expect(router.currentRoute.value.query).toEqual({
      collection: "90071992547409931234567890",
      gid: "3",
      from: "post",
    });
  });

  it("supports browser back and forward across child sections", async () => {
    const router = createTestRouter();

    await router.push(getCommunityProfileRoute("posts"));
    await router.push(getCommunityProfileRoute("comments"));
    await router.push(getCommunityProfileRoute("collections", undefined, { gid: "2" }));
    await moveHistory(router, -1);

    expect(router.currentRoute.value.name).toBe("个人信息-comments");
    await moveHistory(router, 1);
    expect(router.currentRoute.value.name).toBe("个人信息-collections");
    expect(router.currentRoute.value.query).toEqual({ gid: "2" });
  });
});
