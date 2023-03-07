import Home from "../pages/Home.vue";
import News from "../pages/News.vue";
import Achievements from "../pages/Achievements.vue";
import Config from "../pages/Config.vue";

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
		path: "/config",
		name: "设置",
		component: Config,
	},
];

export default routes;
