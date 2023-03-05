import Home from "../pages/Home.vue";
import News from "../pages/News.vue";
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
