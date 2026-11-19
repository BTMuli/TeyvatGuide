/**
 * 资讯路由与进行中的请求切换回归测试。
 * @since Beta v0.13.2
 */

import bbsEnum from "@enum/bbs.js";
import useAppStore from "@store/app.js";
import { createPinia, disposePinia } from "pinia";
import { expect, it, vi } from "vitest";
import { createRenderer, h, ref, ssrContextKey } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

const mocks = vi.hoisted(() => ({ news: vi.fn() }));

vi.mock("@comp/app/t-postcard.vue", () => ({ default: {} }));
vi.mock("@comp/func/loading.js", () => ({
  default: { start: vi.fn(), update: vi.fn(), end: vi.fn() },
}));
vi.mock("@comp/func/snackbar.js", () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@comp/pageNews/to-channel.vue", () => ({ default: {} }));
vi.mock("@comp/viewPost/vp-overlay-search.vue", () => ({ default: {} }));
vi.mock("@comp/viewPost/vp-overlay-user.vue", () => ({ default: {} }));
vi.mock("@hooks/reachBottom.js", () => ({
  usePageReachBottom: () => ({ isReachBottom: ref(false) }),
}));
vi.mock("@req/painterReq.js", () => ({ default: { news: mocks.news } }));
vi.mock("@store/app.js", async () => {
  const { defineStore } = await import("pinia");
  return { default: defineStore("news-test-app", { state: () => ({ recentNewsType: 2 }) }) };
});
vi.mock("@store/bbs.js", () => ({ default: () => ({ gameList: ref([{ id: 2 }, { id: 3 }]) }) }));
vi.mock("@utils/app/TGWindow.js", () => ({ createPost: vi.fn() }));
vi.mock("@utils/network/TGHttps.js", () => ({ default: { getErrMsg: String } }));
vi.mock("@utils/system/TGLogger.js", () => ({ default: { Warn: vi.fn(), Error: vi.fn() } }));

import PostNews from "@/pages/common/PostNews.vue";

it("reloads the latest partition after rapid navigation and respects explicit news types", async () => {
  const { NEWS, ACTIVITY } = bbsEnum.post.newsType;
  const emptyPage = { retcode: 0, message: "OK", data: { list: [], is_last: true } };
  const initial = Promise.withResolvers<typeof emptyPage>();
  mocks.news.mockReturnValueOnce(initial.promise).mockResolvedValue(emptyPage);

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/news/:gid/:type?", name: "资讯", component: PostNews }],
  });
  await router.push("/news/2/news");
  PostNews.render = () => h("div");
  const renderer = createRenderer({
    createElement: () => ({}),
    createText: () => ({}),
    createComment: () => ({}),
    insert() {},
    remove() {},
    parentNode: () => ({}),
    nextSibling: () => null,
    patchProp() {},
    setText() {},
    setElementText() {},
  });
  const pinia = createPinia();
  const app = renderer.createApp(PostNews);
  app.use(router).use(pinia).provide(ssrContextKey, {});
  app.mount({});
  try {
    await vi.waitFor(() => expect(mocks.news).toHaveBeenNthCalledWith(1, "2", NEWS, 20, 0));
    await router.push("/news/3/news");
    await router.push("/news/2/news");
    initial.resolve(emptyPage);
    await vi.waitFor(() => expect(mocks.news).toHaveBeenNthCalledWith(2, "2", NEWS, 20, 0));

    await router.push("/news/2");
    await vi.waitFor(() => expect(mocks.news).toHaveBeenNthCalledWith(3, "2", ACTIVITY, 20, 0));
    expect(useAppStore(pinia).recentNewsType).toBe(ACTIVITY);
  } finally {
    app.unmount();
    disposePinia(pinia);
  }
});
