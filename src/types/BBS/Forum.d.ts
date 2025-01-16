/**
 * @file types/BBS/Forum.d.ts
 * @description BBS 版块类型定义
 * @since Beta v0.6.8
 */

declare namespace TGApp.BBS.Forum {
  /**
   * @description 获取所有版块信息返回
   * @since Beta v0.6.8
   * @interface GameForumResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {Array<GameForum>} data.list 所有版块信息
   * @return GameForumResp
   */
  type GameForumResp = TGApp.BBS.Response.BaseWithData & { data: { list: Array<GameForum> } };

  /**
   * @description 分区版块信息
   * @since Beta v0.6.8
   * @interface GameForum
   * @property {number} game_id 游戏 ID
   * @property {List<GameForumItem>} forums 版块信息
   * @return GameForum
   */
  type GameForum = { game_id: number; forums: Array<GameForumItem> };

  /**
   * @description 版块信息
   * @since Beta v0.6.8
   * @interface GameForumItem
   * @property {number} id 版块 ID
   * @property {number} game_id 游戏 ID
   * @property {string} name 版块名称
   * @property {number} order 排序
   * @property {number} f_id 父版块 ID
   * @property {number} visible 是否可见 // 1 可见 0 不可见
   * @property {number} create_type 创建类型
   * @property {number} post_limit 发帖限制
   * @property {number} max_top 最大置顶数
   * @property {string} post_order 发帖排序 // reply 最新回复
   * @property {number} src_type 来源类型
   * @property {string} icon 图标
   * @property {string} header_image 头图
   * @property {number} hot_score 热度
   * @property {string} icon_pure 图标
   * @property {string} des 描述
   * @property {number} post_num 帖子数
   * @property {number} today_post 今日帖子数
   * @property {number} reply_type 回复类型
   * @property {number} edit_post 编辑帖子
   * @property {string} created_at 创建时间 // yyyy-MM-dd HH:mm:ss
   * @property {string} updated_at 更新时间 // yyyy-MM-dd HH:mm:ss
   * @property {number} show_type 显示类型
   * @property {number} default_tab 默认标签
   * @property {string} read_me 说明
   * @property {Array<ForumCat>} forum_cate_list 分类列表
   * @property {Array<ForumCat>} video_cat_list 视频分类列表
   * @return GameForumItem
   */
  type GameForumItem = {
    id: number;
    game_id: number;
    name: string;
    order: number;
    f_id: number;
    visible: number;
    create_type: number;
    post_limit: number;
    max_top: number;
    post_order: string;
    src_type: number;
    icon: string;
    header_image: string;
    hot_score: number;
    icon_pure: string;
    des: string;
    post_num: number;
    today_post: number;
    reply_type: number;
    edit_post: number;
    created_at: string;
    updated_at: string;
    show_type: number;
    default_tab: number;
    read_me: string;
    forum_cate_list: Array<ForumCat>;
    video_cat_list: Array<ForumCat>;
  };

  /**
   * @description 视频分类
   * @since Beta v0.6.8
   * @interface ForumCat
   * @property {number} id 分类 ID
   * @property {string} name 分类名称
   * @property {number} forum_id 版块 ID
   * @property {string} desc 描述
   * @property {string} remark 备注
   * @return ForumCat
   */
  type ForumCat = { id: number; name: string; forum_id: number; desc: string; remark: string };
}
