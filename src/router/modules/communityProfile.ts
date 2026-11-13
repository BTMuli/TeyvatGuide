/**
 * 社区个人中心子路由。
 * @since Beta v0.13.1
 */

import type { RouteRecordRaw, RouteRecordSingleView } from "vue-router";

const contentComponent = async () => await import("@comp/comiProf/cp-content-page.vue");
const notificationComponent = async () => await import("@comp/comiProf/cp-notifications-page.vue");
const notifySettingsComponent = async () =>
  await import("@comp/comiProf/cp-notify-settings-page.vue");
const postsComponent = async () => await import("@comp/comiProf/cp-posts-page.vue");
const settingsComponent = async () => await import("@comp/comiProf/cp-settings-page.vue");

/**
 * 个人中心路由入口名称。
 * @since Beta v0.13.1
 */
type CommunityProfileChildOptions = {
  parentName: "个人信息" | "用户信息";
};

/**
 * 个人中心栏目使用的子路由定义。
 * @since Beta v0.13.1
 */
type ProfileChild = {
  path: string;
  section: TGApp.BBS.Profile.Section;
  component: RouteRecordSingleView["component"];
  props?: RouteRecordSingleView["props"];
};

const notificationCategory: Readonly<
  Record<
    Extract<TGApp.BBS.Profile.Section, "reply" | "mention" | "system" | "likes">,
    TGApp.BBS.Notification.Category
  >
> = {
  reply: "reply",
  mention: "active_mention",
  system: "system",
  likes: "comment",
};

const ownOnlySections: ReadonlySet<TGApp.BBS.Profile.Section> = new Set([
  "history",
  "privacy",
  "edit",
  "reply",
  "mention",
  "system",
  "likes",
  "notifySettings",
]);

const childDefinitions: ReadonlyArray<ProfileChild> = [
  { path: "", section: "posts", component: postsComponent },
  ...(<const>["comments", "collections", "favorites", "following", "followers", "history"]).map(
    (section) => ({ path: section, section, component: contentComponent, props: { section } }),
  ),
  {
    path: "privacy",
    section: "privacy",
    component: settingsComponent,
    props: { section: "privacy" },
  },
  { path: "edit", section: "edit", component: settingsComponent, props: { section: "edit" } },
  ...(<const>["reply", "mention", "system", "likes"]).map((section) => ({
    path: section,
    section,
    component: notificationComponent,
    props: { category: notificationCategory[section] },
  })),
  {
    path: "notify-settings",
    section: "notifySettings",
    component: notifySettingsComponent,
  },
];

/**
 * 创建一个个人中心入口的全部子路由。
 * @since Beta v0.13.1
 * @param options - 父路由名称
 * @returns 个人中心子路由
 */
function createCommunityProfileChildren({
  parentName,
}: CommunityProfileChildOptions): Array<RouteRecordRaw> {
  return childDefinitions.map<RouteRecordRaw>(({ path, section, component, props }) => ({
    path,
    name: section === "posts" ? parentName : `${parentName}-${section}`,
    component,
    props,
    meta: {
      communityProfile: true,
      profileOwnOnly: ownOnlySections.has(section),
      profileSection: section,
    },
  }));
}

export { createCommunityProfileChildren };
