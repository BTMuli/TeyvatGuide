/**
 * @file router modules main.ts
 * @description 主路由模块
 * @since Beta v0.3.2
 */

import Achievements from "../../pages/common/Achievements.vue";
import Announcements from "../../pages/common/Announcements.vue";
import Config from "../../pages/common/Config.vue";
import Home from "../../pages/common/Home.vue";
import Test from "../../pages/common/Test.vue";

const mainRoutes = [
  {
    path: "/",
    name: "首页",
    component: Home,
  },
  {
    path: "/test",
    name: "测试页",
    component: Test,
  },
  {
    path: "/achievements/:app?",
    name: "成就",
    component: Achievements,
  },
  {
    path: "/announcements",
    name: "公告",
    component: Announcements,
  },
  {
    path: "/config",
    name: "设置",
    component: Config,
  },
  {
    path: "/home",
    redirect: "/",
  },
];

export default mainRoutes;
