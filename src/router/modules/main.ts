/**
 * @file router modules main.ts
 * @description 主路由模块
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.2
 */

// 信息展示
import Announcements from "../../pages/common/Announcements.vue";
import Home from "../../pages/common/Home.vue";
// 数据交互
import Achievements from "../../pages/common/Achievements.vue";
// 应用配置相关
import Config from "../../pages/common/Config.vue";
// 测试页
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
