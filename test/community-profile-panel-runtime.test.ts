/**
 * 个人中心真实 Vue 面板的 setup 和渲染冒烟检查。
 * @since Beta v0.13.1
 */

import { createPinia } from "pinia";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h, ref, shallowRef } from "vue";
import type { Component } from "vue";
import { renderToString } from "vue/server-renderer";
import { createMemoryHistory, createRouter } from "vue-router";

const mocks = vi.hoisted(() => ({ posts: vi.fn() }));

vi.mock("@comp/comiProf/cp-post.vue", () => ({ default: {} }));
vi.mock("@comp/comiProf/cp-avatar.vue", () => ({ default: {} }));
vi.mock("@comp/func/dialog.js", () => ({ default: { checkF: vi.fn() } }));
vi.mock("@comp/func/snackbar.js", () => ({
  default: { success: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@req/communityReq.js", () => ({
  default: {
    posts: mocks.posts,
    notificationUnread: vi.fn(async () => ({ retcode: 0, data: { count: {} } })),
    notificationSettings: vi.fn(async () => ({ retcode: 0, data: { settings: {} } })),
  },
}));
vi.mock("@req/bbsReq.js", () => ({
  default: { userInfo: vi.fn(async () => await new Promise(() => undefined)) },
}));
vi.mock("@req/apiHubReq.js", () => ({ default: {} }));
vi.mock("@/router/index.js", () => ({ default: { push: vi.fn(), resolve: vi.fn() } }));
vi.mock("@req/postReq.js", () => ({ default: {} }));
vi.mock("@req/postEditReq.js", () => ({ default: {} }));
vi.mock("@utils/app/TGWindow.js", () => ({ createPost: vi.fn() }));
vi.mock("@utils/bbs/replyAccount.js", () => ({
  matchesCurrentAccount: vi.fn(() => true),
  executeReplyForCurrentAccount: vi.fn(),
}));
vi.mock("@utils/network/TGHttps.js", () => ({
  default: { getErrMsg: (cause: unknown): string => String(cause) },
}));
vi.mock("@utils/common/toolFunc.js", () => ({ getUserAvatar: vi.fn() }));
vi.mock("@utils/system/TGLogger.js", () => ({ default: { Warn: vi.fn() } }));
vi.mock("@store/app.js", async () => {
  const { defineStore } = await import("pinia");
  return { default: defineStore("profile-runtime-app", { state: () => ({ isLogin: true }) }) };
});
vi.mock("@store/user.js", async () => {
  const { defineStore } = await import("pinia");
  return {
    default: defineStore("profile-runtime-user", {
      state: () => ({
        uid: "123456789",
        cookie: {
          account_id: "123456789",
          cookie_token: "test-cookie",
          ltoken: "test-ltoken",
          ltuid: "123456789",
          mid: "test-mid",
          stoken: "test-stoken",
          stuid: "123456789",
        },
      }),
    }),
  };
});
vi.mock("@store/bbs.js", async () => {
  const { defineStore } = await import("pinia");
  return {
    default: defineStore("profile-runtime-bbs", {
      state: () => ({ gameList: [], forumList: [] }),
      actions: { refreshGameList: vi.fn(async () => undefined) },
    }),
  };
});
vi.mock("vuetify/components/VVirtualScroll", () => ({ VVirtualScroll: {} }));

import CpPostsPage from "../src/components/comiProf/cp-posts-page.vue";
import CpProfileHeader from "../src/components/comiProf/cp-profile-header.vue";
import CpProfilePublish from "../src/components/comiProf/cp-profile-publish.vue";
import CpProfileSidebar from "../src/components/comiProf/cp-profile-sidebar.vue";
import { provideCommunityProfile } from "../src/hooks/useCommunityProfile.js";
import ComiProf from "../src/pages/common/ComiProf.vue";
import { createCommunityProfileChildren } from "../src/router/modules/communityProfile.js";

const panels: Array<{
  name: string;
  component: Component;
  props: Record<string, unknown>;
  expected: string;
}> = [
  { name: "posts", component: CpPostsPage, props: {}, expected: "我的发帖" },
  {
    name: "header",
    component: CpProfileHeader,
    props: { loading: true },
    expected: "正在加载个人信息",
  },
  {
    name: "sidebar",
    component: CpProfileSidebar,
    props: { loading: false, unreadCounts: {}, followRelation: undefined },
    expected: "个人中心",
  },
  { name: "publish", component: CpProfilePublish, props: {}, expected: "发布分区" },
  { name: "layout", component: ComiProf, props: {}, expected: "正在加载个人信息" },
];

describe("community profile panel runtime", () => {
  it.each(panels)(
    "executes the real $name setup and initial render",
    async ({ component, props, expected }) => {
      const game = { id: 2, name: "原神" };
      const context: TGApp.BBS.Profile.Context = {
        profileUid: ref<string>("123456789"),
        isOwnProfile: ref<boolean>(true),
        canViewProfile: ref<boolean>(true),
        profile: shallowRef<TGApp.BBS.User.Info>(),
        profileAudit: shallowRef<TGApp.BBS.User.InfoRes["audit_info"]>(),
        selectedGid: ref<number>(2),
        gameOptions: ref<Array<TGApp.BBS.Profile.GameOption>>([game]),
        currentGame: ref<TGApp.BBS.Profile.GameOption>(game),
        refreshProfile: vi.fn(async () => undefined),
        adjustPostCount: vi.fn(),
        settingsSaved: vi.fn(),
        notificationRead: vi.fn(),
        notificationSettingsSaved: vi.fn(),
      };
      const app = createSSRApp({
        setup() {
          provideCommunityProfile(context);
          return () => h(component, props);
        },
      });
      app.use(createPinia());
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: "/", component: {} },
          { path: "/config", name: "设置", component: {} },
          {
            path: "/community/profile",
            component: {},
            children: createCommunityProfileChildren({ parentName: "个人信息" }).map((child) => ({
              path: child.path,
              name: child.name,
              component: {},
            })),
          },
        ],
      });
      app.use(router);
      await router.push("/");
      const control = defineComponent({
        setup:
          (_, { slots }) =>
          () =>
            h("span", [slots.activator?.({ props: {} }), slots.default?.()]),
      });
      for (const name of [
        "v-icon",
        "v-btn",
        "v-text-field",
        "v-progress-circular",
        "v-menu",
        "v-divider",
      ]) {
        app.component(name, control);
      }

      const markup = await renderToString(app);

      expect(markup).toContain(expected);
      expect(mocks.posts).not.toHaveBeenCalled();
    },
  );
});
