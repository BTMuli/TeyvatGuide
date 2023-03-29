/**
 * @file router modules main.ts
 * @description 主路由模块
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

// 信息展示
import Home from "../../pages/Home.vue";
import News from "../../pages/News.vue";
import GCG from "../../pages/GCG.vue";
// 数据交互
import Achievements from "../../pages/Achievements.vue";
// 应用配置相关
import Config from "../../pages/Config.vue";

const mainRoutes = [
	{
		path: "/",
		name: "首页",
		component: Home,
	},
	{
		path: "/achievements",
		name: "成就",
		component: Achievements,
	},
	{
		path: "/config",
		name: "设置",
		component: Config,
	},
	{
		path: "/GCG",
		name: "卡牌",
		component: GCG,
	},
	{
		path: "/home",
		redirect: "/",
	},
	{
		path: "/news",
		name: "咨讯",
		component: News,
	},
];

export default mainRoutes;
