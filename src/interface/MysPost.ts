/**
 * @file interface MysPost
 * @description interface MysPost
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

export const MysNewsApi = "https://bbs-api.mihoyo.com/post/wapi/getNewsList?gids=2&type=";
export const MysPostApi = "https://bbs-api.mihoyo.com/post/wapi/getPostFull?gids=2&post_id=";
export const MysGachaInfo =
	"https://api-takumi.mihoyo.com/common/blackboard/ys_obc/v1/gacha_pool?app_sn=ys_obc";

export const MysContent = "https://api-static.mihoyo.com/common/blackboard/ys_obc/v1/content/info?app_sn=ys_obc&content_id="

/**
 * @description 获取 News 的返回类型
 * @see https://bbs-api.mihoyo.com/post/wapi/getNewsList?gids=2&type={EnumPostType}
 * @interface ResponseNewsList
 * @property {number} retcode 返回码
 * @property {string} message 返回信息
 * @property data 返回数据
 * @property data.list {ResponseListType[]} 返回列表
 * @property {number} data.last_id 最后ID
 * @property {boolean} data.is_last 是否最后
 * @return ResponseNewsList
 */
export interface ResponseNewsList {
	retcode: number;
	message: string;
	data: {
		list: ResponseNews[];
		last_id: number;
		is_last: boolean;
	};
}

/**
 * @description 获取 Post 的返回类型
 * @see https://bbs-api.mihoyo.com/post/wapi/getPostFull?gids=2&post_id={post_id}
 * @interface ResponsePost
 * @property {number} retcode 返回码
 * @property {string} message 返回信息
 * @property data 返回数据
 * @property data.post 帖子
 * @property {string} data.post.collection 是否收藏
 * @property {string} data.post.cover 封面 URL
 * @property {MysForumType} data.post.forum 板块
 * @property {string} data.post.forum_rank_info 板块等级信息
 * @property {string} data.post.help_sys 是否有帮助系统
 * @property {boolean} data.post.hot_reply_exist 是否有热门回复
 * @property {ImageType[]} data.post.iamge_list 图片列表
 * @property {boolean} data.post.is_block_on 是否被屏蔽
 * @property {boolean} data.post.is_official_master 是否官方
 * @property {boolean} data.post.is_user_master 是否用户
 * @property {number} data.post.last_modify_time 最后修改时间
 * @property {string[]} data.post.like_card_list 点赞卡片列表
 * @property {NewsMetaType} data.post.news_meta 新闻元数据
 * @property {MysPostType} data.post.post 帖子
 * @property {string} data.post.recommend_type 推荐类型
 * @property {SelfOperationType} data.post.self_operation 自己的操作
 * @property {StatType} data.post.stat 统计
 * @property {MysTopicType[]} data.post.topics 话题
 * @property {MysUserType} data.post.user 用户
 * @property {string[]} data.post.vod_list 视频列表
 * @property {number} data.post.vod_count 视频数量
 * @return ResponsePost
 */
export interface ResponsePost {
	retcode: number;
	message: string;
	data: {
		post: {
			collection: string;
			cover: string;
			forum: MysForumType;
			forum_rank_info: string;
			help_sys: string;
			hot_reply_exist: boolean;
			image_list: ImageType[];
			is_block_on: boolean;
			is_official_master: boolean;
			is_user_master: boolean;
			last_modify_time: number;
			like_card_list: string[];
			news_meta: NewsMetaType;
			post: MysPostType;
			recommend_type: string;
			self_operation: SelfOperationType;
			stat: StatType;
			topics: MysTopicType[];
			user: MysUserType;
			vod_list: string[];
			vod_count: number;
		};
	};
}

/**
 * @description 获取卡池信息的返回类型
 * @see https://api-takumi.mihoyo.com/common/blackboard/ys_obc/v1/gacha_pool?app_sn=ys_obc
 * @interface ResponseGachaPool
 * @property {number} retcode 返回码
 * @property {string} message 返回信息
 * @property data 返回数据
 * @property data.list 卡池列表
 * @property {string} data.list[].id 卡池ID
 * @property {string} data.list[].title 卡池标题
 * @property {string} data.list[].activity_url 卡池对应帖子
 * @property {string} data.list[].content_before_act 卡池内容
 * @property {string} data.list[].pool 卡池包含的角色
 * @property {string} data.list[].pool[].icon 卡池角色头像
 * @property {string} data.list[].pool[].url 卡池角色URL
 * @property {string} data.list[].voice_icon 卡池角色语音头像
 * @property {string} data.list[].voice_url 卡池角色语音URL
 * @property {string} data.list[].voice_status 卡池角色语音状态
 * @description 如下时间示例：2023-03-21 17:59:59
 * @property {string} data.list[].start_time 卡池开始时间
 * @property {string} data.list[].end_time 卡池结束时间
 * @return ResponseGachaPool
 */
export interface ResponseGachaPool {
	retcode: number;
	message: string;
	data: {
		list: {
			id: string;
			title: string;
			activity_url: string;
			content_before_act: string;
			pool: {
				icon: string;
				url: string;
			}[];
			voice_icon: string;
			voice_url: string;
			voice_status: string;
			start_time: string;
			end_time: string;
		}[];
	};
}

/**
 * @description 官方动态类型
 * @description 参考米游社官方页面
 * @enum {number}
 * @return {number}
 */
export enum EnumPostType {
	/**
	 * @description 活动
	 * @description 这个有 news_meta
	 */
	Activity = 2,
	/**
	 * @description 公告
	 */
	Notice = 1,
	/**
	 * @description 咨讯
	 */
	News = 3,
}

/**
 * @description 帖子状态
 * @interface PostStatusType
 * @property {boolean} is_top 是否置顶
 * @property {boolean} is_good 是否精华
 * @property {boolean} is_official 是否官方
 * @return PostStatusType
 */
interface PostStatusType {
	is_top: boolean;
	is_good: boolean;
	is_official: boolean;
}

/**
 * @description Post类型
 * @interface MysPostType
 * @property {number} game_id 游戏ID 2为原神
 * @property {string} post_id 帖子ID
 * @property {number} f_forum_id 论坛ID
 * @property {string} uid 用户ID
 * @property {string} subject 标题
 * @property {string} content 内容
 * @property {string} cover 封面
 * @property {number} view_type 浏览类型
 * @property {number} created_at 创建时间
 * @property {string[]} images 图片 URL
 * @property {PostStatusType} post_status 帖子状态
 * @property {number[]} topic_ids 话题ID
 * @property {number} view_status 浏览状态
 * @property {number} max_floor 最大楼层
 * @property {number} is_original 是否原创
 * @property {number} republish_authorization 是否授权转载
 * @property {string} reply_time 最后回复时间 // "2023-03-05 20:26:54"
 * @property {number} is_deleted 是否删除
 * @property {boolean} is_interactive 是否互动
 * @property {string} structured_content 结构化内容
 * @property {string[]} structured_content_raws 结构化内容原始数据
 * @property {number} review_id 审核ID
 * @property {boolean} is_profit 是否盈利
 * @property {boolean} is_in_profit 是否在盈利
 * @property {number} updated_at 更新时间
 * @property {number} deleted_at 删除时间
 * @property {number} pre_pub_status 预发布状态
 * @property {number} cate_id 分类ID
 * @property {number} profit_post_status 盈利帖子状态
 * @property {number} audit_status 审核状态
 * @property {string} meta_content 元内容
 * @property {boolean} is_missing 是否缺失
 * @property {number} block_reply_img 是否屏蔽回复图片
 * @property {boolean} is_showing_missing 是否显示缺失
 * @property {number} block_latest_reply_time 是否屏蔽最新回复时间
 * @return MysPostType
 */
export interface MysPostType {
	game_id: number;
	post_id: string;
	f_forum_id: number;
	uid: string;
	subject: string;
	content: string;
	cover: string;
	view_type: number;
	created_at: number;
	images: string[];
	post_status: PostStatusType;
	topic_ids: number[];
	view_status: number;
	max_floor: number;
	is_original: number;
	republish_authorization: number;
	reply_time: string;
	is_deleted: number;
	is_interactive: boolean;
	structured_content: string;
	structured_content_raws: string[];
	review_id: number;
	is_profit: boolean;
	is_in_profit: boolean;
	updated_at: number;
	deleted_at: number;
	pre_pub_status: number;
	cate_id: number;
	profit_post_status: number;
	audit_status: number;
	meta_content: string;
	is_missing: boolean;
	block_reply_img: number;
	is_showing_missing: boolean;
	block_latest_reply_time: number;
}

/**
 * @description Forum类型
 * @interface MysForumType
 * @property {number} id 论坛ID
 * @property {string} name 论坛名称
 * @property {string} icon 论坛图标
 * @property {number} game_id 游戏ID
 * @property {number} forum_cate 论坛分类 // todo 这边目前看到的都是 null
 * @return MysForumType
 */
interface MysForumType {
	id: number;
	name: string;
	icon: string;
	game_id: number;
	forum_cate: number;
}

/**
 * @description Topic类型
 * @interface MysTopicType
 * @property {number} id 话题ID
 * @property {string} name 话题名称
 * @property {string} cover 话题封面
 * @property {boolean} is_top 是否置顶
 * @property {boolean} is_good 是否精华
 * @property {boolean} is_interactive 是否互动
 * @property {number} game_id 游戏ID
 * @property {number} content_type 话题内容类型
 * @see EnumPostType
 * @return MysTopicType
 */
interface MysTopicType {
	id: number;
	name: string;
	cover: string;
	is_top: boolean;
	is_good: boolean;
	is_interactive: boolean;
	game_id: number;
	content_type: number;
}

/**
 * @description 认证类型
 * @interface CertificationType
 * @property {number} type 认证类型
 * @property {string} label 认证标签
 * @return CertificationType
 */
interface CertificationType {
	type: number;
	label: string;
}

/**
 * @description User类型
 * @interface MysUserType
 * @property {string} uid 用户ID
 * @property {string} nickname 用户昵称
 * @property {string} introduce 用户简介
 * @property {string} avatar 用户头像
 * @property {number} gender 用户性别
 * @property {CertificationType} certification 认证
 * @property level_exp
 * @property {number} level_exp.level 用户等级
 * @property {number} level_exp.exp 用户经验
 * @property {boolean} is_following 是否关注
 * @property {boolean} is_followed 是否被关注
 * @property {string} avatar_url 用户头像
 * @property {string} pendant 用户注册时间
 * @return MysUserType
 */
interface MysUserType {
	uid: string;
	nickname: string;
	introduce: string;
	avatar: string;
	gender: number;
	certification: CertificationType;
	level_exp: {
		level: number;
		exp: number;
	};
	is_following: boolean;
	is_followed: boolean;
	avatar_url: string;
	pendant: string;
}

/**
 * @description 用户操作
 * @interface SelfOperationType
 * @property {number} attitude 点赞
 * @property {boolean} is_collected 是否收藏
 * @return SelfOperationType
 */
interface SelfOperationType {
	attitude: number;
	is_collected: boolean;
}

/**
 * @description 状态数据
 * @interface StatType
 * @property {number} view_num 浏览量
 * @property {number} reply_num 回复量
 * @property {number} like_num 点赞量
 * @property {number} bookmark_num 收藏量
 * @property {number} forward_num 转发量
 * @return StatType
 */
interface StatType {
	view_num: number;
	reply_num: number;
	like_num: number;
	bookmark_num: number;
	forward_num: number;
}

/**
 * @description 图片类型
 * @interface ImageType
 * @property {string} url 图片 URL
 * @property {number} height 图片高度
 * @property {number} width 图片宽度
 * @property {string} format 图片格式
 * @property {string} size 图片大小
 * @property {string} crop
 * @property {boolean} is_user_set_cover 是否作为封面
 * @property {string} image_id 图片 id
 * @property {string} entity_type
 * @property {string} entity_id
 * @return ImageType
 */
interface ImageType {
	url: string;
	height: number;
	width: number;
	format: string;
	size: string;
	crop: string;
	is_user_set_cover: boolean;
	iamge_id: string;
	entity_type: string;
	entity_id: string;
}

/**
 * @description 元数据
 * @interface NewsMetaType
 * @property {number} activity_status
 * @property {string} start_at_sec
 * @property {string} end_at_sec
 * @return NewsMetaType
 */
interface NewsMetaType {
	activity_status: number;
	start_at_sec: string;
	end_at_sec: string;
}

/**
 * @description 单个 News 的返回类型
 * @interface ResponseNews
 * @property {MysPostType} post 帖子
 * @property {MysForumType} forum 论坛
 * @property {MysTopicType} topics 话题
 * @property {MysUserType} user 用户
 * @property {SelfOperationType} self_operation 用户操作
 * @property {StatType} stat 状态数据
 * @property help_sys // todo 不清楚这个是什么
 * @property {number} help_sys.top_up
 * @property {number[]} help_sys.top_n
 * @property {number} help_sys.answer_num
 * @property {string} cover 封面
 * @property {ImageType[]} image_list 图片列表
 * @property {boolean} is_official_master 是否官方
 * @property {boolean} is_user_master 是否用户
 * @property {boolean} hot_reply_exist 是否热门回复
 * @property {number} vote_count 投票数
 * @property {number} last_modify_time 最后修改时间
 * @property {string} recommend_type 推荐类型
 * @property {string} collection 推荐类型
 * @property {string[]} vod_list 视频列表
 * @property {boolean} is_block_on 是否屏蔽
 * @property {string} forum_rank_info 论坛排名信息
 * @property {string[]} link_card_list 链接卡片列表
 * @property {NewsMetaType} news_meta 元数据
 * @return ResponseNews
 */
export interface ResponseNews {
	post: MysPostType;
	forum: MysForumType;
	topics: MysTopicType;
	user: MysUserType;
	self_operation: SelfOperationType;
	stat: StatType;
	help_sys: {
		top_up: number;
		top_n: number[];
		answer_num: number;
	};
	cover: string;
	image_list: ImageType[];
	is_official_master: boolean;
	is_user_master: boolean;
	hot_reply_exist: boolean;
	vote_count: number;
	last_modify_time: number;
	recommend_type: string;
	collection: string;
	vod_list: string[];
	is_block_on: boolean;
	forum_rank_info: string;
	link_card_list: string[];
	news_meta: NewsMetaType;
}
