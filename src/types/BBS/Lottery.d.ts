/**
 * @file types/BBS/Lottery.d.ts
 * @description 米游社抽奖类型
 * @since Beta v0.7.1
 */

declare namespace TGApp.BBS.Lottery {
  /**
   * @description 抽奖返回响应
   * @since Beta v0.7.1
   * @interface Resp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {FullData} data.show_lottery 抽奖数据
   * @return Resp
   */
  type Resp = TGApp.BBS.Response.BaseWithData & { data: { show_lottery: FullData } };

  /**
   * @description 抽奖数据
   * @since Beta v0.7.1
   * @interface FullData
   * @property {string} id 抽奖 ID
   * @property {TGApp.Plugins.Mys.User.Post} creator 创建者
   * @property {string} draw_time 抽奖时间
   * @property {string} participant_way 参与方式 // Forward: 转发
   * @property {boolean} is_expect_unfocus_user 是否限制未关注用户
   * @property {boolean} is_expect_non_real_name_user 是否限制未实名用户
   * @property {Array<Reward>} user_rewards 用户奖励
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
  type FullData = {
    id: string;
    creator: TGApp.Plugins.Mys.User.Post;
    draw_time: string;
    participant_way: string;
    is_expect_unfocus_user: boolean;
    is_expect_non_real_name_user: boolean;
    user_rewards: Array<Reward>;
    status: string;
    is_blocked: boolean;
    user_status: string;
    is_upload_address: boolean;
    lottery_entity_summary: string;
    entity_id: string;
    entity_type: string;
    now_time: string;
  };

  /**
   * @description 抽奖奖励
   * @since Beta v0.7.1
   * @interface Reward
   * @property {string} reward_name 奖励名称
   * @property {number} winner_number 获奖人数
   * @property {number} scheduled_winner_number 预计获奖人数
   * @property {boolean} is_send_by_post 是否通过帖子发放
   * @property {Array<>TGApp.Plugins.Mys.User.Post>} users 用户列表
   * @property {string} id 奖励 ID
   * @return Reward
   */
  type Reward = {
    reward_name: string;
    winner_number: number;
    scheduled_winner_number: number;
    is_send_by_post: boolean;
    users: Array<TGApp.Plugins.Mys.User.Post>;
    id: string;
  };
}
