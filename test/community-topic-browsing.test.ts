/**
 * 话题分区与排序恢复的请求回归测试。
 * @since Beta v0.13.2
 */

import bbsEnum from "@enum/bbs.js";
import useCommunityBrowsingStore from "@store/communityBrowsing.js";
import { createPinia, disposePinia } from "pinia";
import { afterEach, expect, it, vi } from "vitest";
import { createRenderer, h, ref, ssrContextKey } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

const mocks = vi.hoisted(() => ({ topicInfo: vi.fn(), posts: vi.fn() }));

vi.mock("@comp/app/t-gameNav.vue", () => ({ default: {} }));
vi.mock("@comp/app/t-mi-img.vue", () => ({ default: {} }));
vi.mock("@comp/app/t-postcard.vue", () => ({ default: {} }));
vi.mock("@comp/viewPost/vp-overlay-search.vue", () => ({ default: {} }));
vi.mock("@comp/viewPost/vp-overlay-user.vue", () => ({ default: {} }));
vi.mock("@comp/func/loading.js", () => ({
  default: { start: vi.fn(), update: vi.fn(), end: vi.fn() },
}));
vi.mock("@comp/func/snackbar.js", () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@hooks/reachBottom.js", () => ({
  usePageReachBottom: () => ({ isReachBottom: ref(false) }),
}));
vi.mock("@req/topicReq.js", () => ({ default: { info: mocks.topicInfo } }));
vi.mock("@req/postReq.js", () => ({ default: { topic: mocks.posts } }));
vi.mock("@store/app.js", () => ({ default: () => ({}) }));
vi.mock("@store/bbs.js", () => ({ default: () => ({ gameList: ref([]) }) }));
vi.mock("@store/user.js", () => ({ default: () => ({}) }));
vi.mock("@utils/app/TGWindow.js", () => ({ createPost: vi.fn() }));
vi.mock("@utils/network/TGHttps.js", () => ({ default: { getErrMsg: String } }));
vi.mock("@utils/system/TGLogger.js", () => ({ default: { Warn: vi.fn(), Error: vi.fn() } }));

import PostTopic from "@/pages/common/PostTopic.vue";

afterEach(() => vi.unstubAllGlobals());

it("loads posts with a supported fallback and restores preferences on the next topic", async () => {
  const featured = bbsEnum.post.topicSortType.FEATURED;
  const latest = bbsEnum.post.topicSortType.LATEST;
  mocks.topicInfo.mockImplementation((requestedGid: string, topic: string) => {
    if (requestedGid === "2") return { retcode: -1, message: "分区不支持此话题" };
    const supported = topic === "200";
    const gid = supported ? 6 : 3;
    return {
      retcode: 0,
      data: {
        game_info_list: [{ id: gid, name: "米游社分区" }],
        good_post_exist: supported,
        topic: { id: topic, name: "米游社话题", default_game_id: gid },
      },
    };
  });
  mocks.posts.mockResolvedValue({ retcode: 0, data: { posts: [], last_id: "", is_last: true } });
  vi.stubGlobal("document", { documentElement: { scrollTo: vi.fn() } });

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/posts/topic/:gid?/:topic", name: "话题", component: PostTopic }],
  });
  await router.push("/posts/topic/2/100");
  PostTopic.render = () => h("div");
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
  const app = renderer.createApp(PostTopic);
  app.use(router).use(pinia).provide(ssrContextKey, {});
  const store = useCommunityBrowsingStore(pinia);
  store.recentGid = 6;
  store.topicSortType = featured;
  app.mount({});
  try {
    await vi.waitFor(() => expect(mocks.posts).toHaveBeenCalledWith(3, "100", latest));
    expect(mocks.topicInfo).toHaveBeenNthCalledWith(1, "2", "100");
    expect(mocks.topicInfo).toHaveBeenNthCalledWith(2, "0", "100");
    expect(store.recentGid).toBe(6);
    expect(store.topicSortType).toBe(featured);

    await router.push("/posts/topic/200");
    await vi.waitFor(() => expect(mocks.posts).toHaveBeenLastCalledWith(6, "200", featured));
  } finally {
    app.unmount();
    disposePinia(pinia);
  }
});
