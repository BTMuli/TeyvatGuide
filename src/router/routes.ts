// 信息展示
import Home from "../pages/Home.vue";
import News from "../pages/News.vue";
// 数据交互
import Achievements from "../pages/Achievements.vue";
// 应用配置相关
import Config from "../pages/Config.vue";
import Dev from "../pages/Dev.vue";

const routes = [
	{
		path: "/",
		name: "首页",
		component: Home,
	},
	{
		path: "/home",
		redirect: "/",
	},
	{
		path: "/achievements",
		name: "成就",
		component: Achievements,
	},
	{
		path: "/news",
		name: "咨讯",
		component: News,
	},
	{
		path: "/dev",
		name: "开发者工具",
		component: Dev,
	},
	{
		path: "/config",
		name: "设置",
		component: Config,
	},
];

export default routes;
