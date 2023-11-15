/**
 * @file plugins/Mys/types/Lottery.d.ts
 * @description Mys 插件抽奖类型定义文件
 * @since Alpha v0.2.1
 */

/**
 * @description Mys 插件抽奖类型
 * @since Alpha v0.2.1
 * @namespace TGApp.Plugins.Mys.Lottery
 * @memberof TGApp.Plugins.Mys
 */
declare namespace TGApp.Plugins.Mys.Lottery {
  /**
   * @description 抽奖返回数据
   * @since Alpha v0.2.1
   * @interface Response
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {FullData} data.show_lottery 抽奖数据
   * @return Response
   */
  interface Response extends TGApp.BBS.Response.BaseWithData {
    data: {
      show_lottery: FullData;
    };
  }

  /**
   * @description 抽奖数据
   * @since Alpha v0.2.1
   * @interface FullData
   * @property {string} id 抽奖 ID
   * @property {TGApp.Plugins.Mys.User.Post} creator 创建者
   * @property {string} draw_time 抽奖时间
   * @property {string} participant_way 参与方式 // Forward: 转发
   * @property {boolean} is_expect_unfocus_user 是否限制未关注用户
   * @property {boolean} is_expect_non_real_name_user 是否限制未实名用户
   * @property {Reward[]} user_rewards 用户奖励
   * @property {string} status 状态 // Settled: 已结算
   * @property {boolean} is_blocked 是否被屏蔽
   * @property {string} user_status 用户状态 // NotParticipant: 未参与
   * @property {boolean} is_upload_address 是否上传地址
   * @property {string} lottery_entity_summary 抽奖实体摘要
   * @property {string} entity_id 实体 ID // 若为帖子，则为帖子 ID
   * @property {string} entity_type 实体类型 // Post: 帖子
   * @property {string} now_time 当前时间
   * @return FullData
   */
  interface FullData {
    id: string;
    creator: TGApp.Plugins.Mys.User.Post;
    draw_time: string;
    participant_way: string;
    is_expect_unfocus_user: boolean;
    is_expect_non_real_name_user: boolean;
    user_rewards: Reward[];
    status: string;
    is_blocked: boolean;
    user_status: string;
    is_upload_address: boolean;
    lottery_entity_summary: string;
    entity_id: string;
    entity_type: string;
    now_time: string;
  }

  /**
   * @description 抽奖奖励
   * @since Alpha v0.2.1
   * @interface Reward
   * @property {string} reward_name 奖励名称
   * @property {number} winner_number 获奖人数
   * @property {number} scheduled_winner_number 预计获奖人数
   * @property {boolean} is_send_by_post 是否通过帖子发放
   * @property {TGApp.Plugins.Mys.User.Post[]} users 用户列表
   * @property {string} id 奖励 ID
   * @return Reward
   */
  interface Reward {
    reward_name: string;
    winner_number: number;
    scheduled_winner_number: number;
    is_send_by_post: boolean;
    users: TGApp.Plugins.Mys.User.Post[];
    id: string;
  }

  /**
   * @description 渲染用的抽奖信息
   * @since Alpha v0.2.1
   * @interface RenderCard
   * @property {string} id 抽奖 ID
   * @property {string} upWay 参与方式
   * @property {string} status 状态
   * @property {TGApp.Plugins.Mys.User.Post} creator 创建者
   * @property {string} drawTime 开奖时间
   * @property {RenderReward[]} rewards 奖励列表
   * @return RenderCard
   */
  interface RenderCard {
    id: string;
    upWay: string;
    status: string;
    creator: TGApp.Plugins.Mys.User.Post;
    drawTime: string;
    rewards: RenderReward[];
  }

  /**
   * @description 渲染用的奖励信息
   * @since Alpha v0.2.1
   * @interface RenderReward
   * @property {string} name 奖励名称
   * @property {number} win 获奖人数
   * @property {number} goal 预计获奖人数
   * @property {TGApp.Plugins.Mys.User.Post[]} users 用户列表
   * @return RenderReward
   */
  interface RenderReward {
    name: string;
    win: number;
    goal: number;
    users: TGApp.Plugins.Mys.User.Post[];
  }
}
