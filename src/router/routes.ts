import Home from "../pages/Home.vue";
import Config from "../pages/Config.vue";

const routes = [
	{
		path: "/",
		name: "Home",
		component: Home,
	},
	{
		path: "/config",
		name: "Config",
		component: Config,
	},
];

export default routes;
