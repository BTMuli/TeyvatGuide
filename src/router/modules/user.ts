/**
 * @file router modules user.ts
 * @description user 路由模块
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// user test
import test from "../../pages/User/test.vue";
// user main
// user sub

const userRoutes = [
  {
    path: "/user/test",
    name: "测试",
    component: test,
  },
];

export default userRoutes;
