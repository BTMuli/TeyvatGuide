/**
 * @file router modules user.ts
 * @description user 路由模块
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// user main
import Abyss from "../../pages/User/Abyss.vue";
import Characters from "../../pages/User/Characters.vue";
import Gacha from "../../pages/User/Gacha.vue";
import Info from "../../pages/User/Info.vue";
// user sub

const userRoutes = [
  {
    path: "/user/abyss",
    name: "深渊记录",
    component: Abyss,
  },
  {
    path: "/user/characters",
    name: "我的角色",
    component: Characters,
  },
  {
    path: "/user/gacha",
    name: "祈愿记录",
    component: Gacha,
  },
  {
    path: "/user/info",
    name: "基本信息",
    component: Info,
  },
];

export default userRoutes;
