// 信息展示
import GCG from "../pages/GCG.vue";
import Home from "../pages/Home.vue";
import News from "../pages/News.vue";
// 数据交互
import Achievements from "../pages/Achievements.vue";
// 应用配置相关
import Config from "../pages/Config.vue";

const routes = [
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

export default routes;
