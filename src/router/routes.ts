// 信息展示
import GCG from "../pages/GCG.vue";
import Home from "../pages/Home.vue";
import News from "../pages/News.vue";
// 数据交互
import Achievements from "../pages/Achievements.vue";
import TPost from "../views/t-post.vue";
// 应用配置相关
import Config from "../pages/Config.vue";

const routes = [
	{
		path: "/",
		name: "首页",
		component: Home,
		meta: {
			isMain: true,
		},
	},
	{
		path: "/achievements",
		name: "成就",
		component: Achievements,
		meta: {
			isMain: true,
		},
	},
	{
		path: "/config",
		name: "设置",
		component: Config,
		meta: {
			isMain: true,
		},
	},
	{
		path: "/GCG",
		name: "卡牌",
		component: GCG,
		meta: {
			isMain: true,
		},
	},
	{
		path: "/home",
		redirect: "/",
		meta: {
			isMain: true,
		},
	},
	{
		path: "/news",
		name: "咨讯",
		component: News,
		meta: {
			isMain: true,
		},
	},
	{
		path: "/post_detail/:post_id",
		name: "帖子详情",
		component: TPost,
		meta: {
			isMain: false,
		},
	},
];

export default routes;
