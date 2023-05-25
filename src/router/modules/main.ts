/**
 * @file router modules main.ts
 * @description 主路由模块
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.5
 */

// 信息展示
import Announcements from "../../pages/Announcements.vue";
import Home from "../../pages/Home.vue";
// 数据交互
import Achievements from "../../pages/Achievements.vue";
// 应用配置相关
import Config from "../../pages/Config.vue";
// 测试页
import Test from "../../pages/test.vue";

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
    path: "/achievements",
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
