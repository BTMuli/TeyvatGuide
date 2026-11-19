/**
 * 米游社浏览偏好的恢复与选项回退测试。
 * @since Beta v0.13.2
 */

import bbsEnum from "@enum/bbs.js";
import useCommunityBrowsingStore from "@store/communityBrowsing.js";
import { parseBrowsingId, resolveBrowsingOption } from "@utils/bbs/browsing.js";
import { resolveNewsType } from "@utils/bbs/newsType.js";
import { createPinia, disposePinia } from "pinia";
import { createPersistedState } from "pinia-plugin-persistedstate";
import { afterEach, describe, expect, it } from "vitest";
import { createSSRApp, nextTick } from "vue";

const instances: Array<ReturnType<typeof createPinia>> = [];
const savedPreferences = new Map<string, string>();

/**
 * 模拟重启时通过真实持久化插件重新加载浏览偏好。
 * @since Beta v0.13.2
 * @returns 独立 Pinia 实例中的浏览偏好
 */
function openBrowsingStore(): ReturnType<typeof useCommunityBrowsingStore> {
  const pinia = createPinia();
  pinia.use(
    createPersistedState({
      storage: {
        getItem: (key) => savedPreferences.get(key) ?? null,
        setItem: (key, value) => savedPreferences.set(key, value),
      },
    }),
  );
  createSSRApp({}).use(pinia);
  instances.push(pinia);
  return useCommunityBrowsingStore(pinia);
}

afterEach(() => {
  instances.splice(0).forEach(disposePinia);
  savedPreferences.clear();
});

describe("community browsing preferences", () => {
  it("restores distinct forum selections per game and independent list preferences", async () => {
    const store = openBrowsingStore();
    store.recentGid = 6;
    store.forumByGid[2] = 0;
    store.forumByGid[6] = 52;
    store.forumSortType = bbsEnum.post.forumSortType.HOT;
    store.topicSortType = bbsEnum.post.topicSortType.FEATURED;
    store.rankPeriod = 2;
    store.shopCategory = "hkrpg";
    store.shopGoodsType = "virtual";
    store.shopStock = "available";
    await nextTick();

    expect(openBrowsingStore().$state).toEqual(store.$state);
  });

  it("uses the explicit board first and keeps a remembered choice through temporary fallbacks", () => {
    const store = openBrowsingStore();
    store.forumByGid[6] = 52;
    const boards = [{ id: 40 }, { id: 52 }, { id: 0 }];
    const getId = (board: { id: number }): number => board.id;

    expect(resolveBrowsingOption(boards, getId, parseBrowsingId("0"), store.forumByGid[6])).toBe(
      boards[2],
    );
    expect(resolveBrowsingOption(boards, getId, parseBrowsingId("-1"), store.forumByGid[6])).toBe(
      boards[1],
    );
    expect(resolveBrowsingOption([boards[0]], getId, undefined, store.forumByGid[6])).toBe(
      boards[0],
    );
    expect(store.forumByGid[6]).toBe(52);
  });

  it("restores defaults after resetting preferences", async () => {
    const store = openBrowsingStore();
    store.recentGid = 6;
    store.forumByGid[6] = 52;
    store.rankPeriod = 2;
    await nextTick();
    store.$reset();
    await nextTick();

    expect(openBrowsingStore().$state).toMatchObject({
      recentGid: 2,
      forumByGid: {},
      rankPeriod: undefined,
    });
  });

  it("accepts existing named and numeric news links and rejects ambiguous values", () => {
    expect(resolveNewsType("news")).toBe(bbsEnum.post.newsType.NEWS);
    expect(resolveNewsType("2")).toBe(bbsEnum.post.newsType.ACTIVITY);
    expect(resolveNewsType(bbsEnum.post.newsType.NOTICE)).toBe(bbsEnum.post.newsType.NOTICE);
    for (const value of [["news"], "__proto__", "0x1", "", "99"]) {
      expect(resolveNewsType(value)).toBeUndefined();
    }
  });
});
