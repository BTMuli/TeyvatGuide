/**
 * @file types/BBS/Reply.d.ts
 * @description 回复数据类型定义文件
 * @since Beta v0.7.1
 */

declare namespace TGApp.BBS.Reply {
  /**
   * @description 帖子回复数据类型
   * @since Beta v0.7.1
   * @interface MainResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {MainRes} data - 回复数据
   * @return MainResp
   */
  type MainResp = TGApp.BBS.Response.BaseWithData<MainRes>;

  /**
   * @description 子回复数据类型
   * @since Beta v0.7.1
   * @interface SubResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {SubRes} data - 子回复数据
   * @return SubResp
   */
  type SubResp = TGApp.BBS.Response.BaseWithData<SubRes>;

  /**
   * @description 子回复数据的根数据类型
   * @since Beta v0.7.1
   * @interface SubRootResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {SubRootRes} data - 子回复数据
   * @return SubRootResp
   */
  type SubRootResp = TGApp.BBS.Response.BaseWithData<SubRootRes>;

  /**
   * @description 子回复数据类型
   * @since Beta v0.7.1
   * @interface SubRootRes
   * @property {TGApp.Plugins.Mys.Post.FullData} post - 帖子数据
   * @property {ReplyFull} reply - 回复数据
   * @return SubRootRes
   */
  type SubRootRes = { post: TGApp.Plugins.Mys.Post.FullData; reply: ReplyFull };

  /**
   * @description 回复数据类型
   * @since Beta v0.7.1
   * @interface MainRes
   * @property {Array<ReplyFull>} list - 回复列表
   * @property {string} last_id - 最后 ID
   * @property {boolean} is_last - 是否最后
   * @property {string} post_owner_id - 帖子拥有者 ID
   * @property {string} pin_reply_id - 置顶回复 ID
   * @property {number} fold_reply_num - 折叠回复数
   * @return MainRes
   */
  type MainRes = {
    list: Array<ReplyFull>;
    last_id: string;
    is_last: boolean;
    post_owner_id: string;
    pin_reply_id: string;
    fold_reply_num: number;
  };

  /**
   * @description 子回复数据类型
   * @since Beta v0.7.1
   * @interface SubRes
   * @property {Array<ReplyFull>} list - 回复列表
   * @property {string} last_id - 最后 ID
   * @property {boolean} is_last - 是否最后
   * @property {boolean} has_previous - 是否有上一页
   * @property {string} post_owner_id - 帖子拥有者 ID
   * @return SubRes
   */
  type SubRes = {
    list: Array<ReplyFull>;
    last_id: string;
    is_last: boolean;
    has_previous: boolean;
    post_owner_id: string;
  };

  /**
   * @description 回复数据类型
   * @since Beta v0.7.1
   * @interface ReplyFull
   * @property {Reply} reply - 回复数据
   * @property {User} user - 用户数据
   * @property {Stat} stat - 点赞数据
   * @property {SelfOperation} self_operation - 自身操作数据
   * @property {MasterStatus} master_status - 主楼状态数据
   * @property {Array<TGApp.Plugins.Mys.Post.Image>} images - 图片数据
   * @property {Array<ReplyFull>} sub_replies - 子回复数据
   * @property {boolean} is_lz - 是否楼主
   * @property {number} sub_reply_count - 子回复数量
   * @property {TGApp.Plugins.Mys.User.Reply} r_user - 回复用户数据
   * @property {unknown} r_reply - 未知数据
   * @property {unknown} r_post - 未知数据
   * @property {unknown} user_game_info - 未知数据
   * @return ReplyFull
   */
  type ReplyFull = {
    reply: Reply;
    user: TGApp.Plugins.Mys.User.Reply;
    stat: Stat;
    self_operation: SelfOperation;
    master_status: MasterStatus;
    images: Array<TGApp.Plugins.Mys.Post.Image>;
    sub_replies: Array<ReplyFull>;
    is_lz: boolean;
    sub_reply_count: number;
    r_user: TGApp.Plugins.Mys.User.Reply | null;
    r_reply: unknown;
    r_post: unknown;
    user_game_info: unknown;
  };

  /**
   * @description 回复数据类型
   * @since Beta v0.7.1
   * @interface Reply
   * @property {number} game_id - 游戏 ID
   * @property {string} post_id - 帖子 ID
   * @property {string} reply_id - 回复 ID
   * @property {string} uid - 用户 ID
   * @property {string} r_uid - 回复用户 ID
   * @property {string} content - 回复内容
   * @property {number} f_forum_id - 板块 ID
   * @property {string} f_reply_id - 主楼 ID
   * @property {number} floor_id - 楼层 ID
   * @property {number} is_deleted - 是否删除 // 0 未删除 1 已删除
   * @property {number} delete_src - 删除来源
   * @property {number} created_at - 创建时间，秒级时间戳
   * @property {number} updated_at - 更新时间，秒级时间戳
   * @property {number} deleted_at - 删除时间，秒级时间戳
   * @property {string} struct_content - 结构化内容
   * @property {Array<unknown>} structured_content_rows - 结构化内容行
   * @property {boolean} is_top - 是否置顶
   * @property {boolean} has_block_word - 是否有屏蔽词
   * @property {number} overt_status - 公开状态
   * @property {boolean} is_showing_missing - 是否显示缺失
   * @property {number} selected_comment_time - 选中评论时间
   * @property {boolean} is_mentor - 是否导师
   * @property {number} view_status - 查看状态
   * @return Reply
   */
  type Reply = {
    game_id: number;
    post_id: string;
    reply_id: string;
    uid: string;
    r_uid: string;
    content: string;
    f_forum_id: number;
    f_reply_id: string;
    floor_id: number;
    is_deleted: number;
    delete_src: number;
    created_at: number;
    updated_at: number;
    deleted_at: number;
    struct_content: string;
    structured_content_rows: Array<unknown>;
    is_top: boolean;
    has_block_word: boolean;
    overt_status: number;
    is_showing_missing: boolean;
    selected_comment_time: number;
    is_mentor: boolean;
    view_status: number;
  };

  /**
   * @description 回复气泡数据类型
   * @since Beta v0.7.1
   * @interface Bubble
   * @property {string} assets_id - 资源 ID
   * @property {string} bg_color - 背景颜色
   * @property {string} url - 链接
   * @property {string} name - 名称
   * @return Bubble
   */
  type Bubble = { assets_id: string; bg_color: string; url: string; name: string };

  /**
   * @description 点赞数据类型
   * @since Beta v0.7.1
   * @interface Stat
   * @property {number} reply_num - 回复数
   * @property {number} like_num - 点赞数
   * @property {number} sub_num - 子回复数
   * @property {number} dislike_num - 踩数
   * @return Stat
   */
  type Stat = { reply_num: number; like_num: number; sub_num: number; dislike_num: number };

  /**
   * @description 自身操作数据类型
   * @since Beta v0.7.1
   * @interface SelfOperation
   * @property {number} attitude - 操作态度
   * @property {number} reply_vote_attitude - 回复投票态度
   * @return SelfOperation
   */
  type SelfOperation = { attitude: number; reply_vote_attitude: number };

  /**
   * @description 主楼状态数据类型
   * @since Beta v0.5.5
   * @interface MasterStatus
   * @property {boolean} is_official_master - 是否官方
   * @property {boolean} is_user_master - 是否用户
   * @return MasterStatus
   */
  type MasterStatus = { is_official_master: boolean; is_user_master: boolean };
}
