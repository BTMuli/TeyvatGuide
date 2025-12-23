/**
 * 米社帖子抽奖类型
 * @since Beta v0.9.1
 */

declare namespace TGApp.BBS.Lottery {
  /**
   * 抽奖返回响应
   * @since Beta v0.7.1
   */
  type Resp = TGApp.BBS.Response.BaseWithData<Res>;

  /**
   * 抽奖数据
   * @since Beta v0.9.1
   */
  type Res = {
    /** 抽奖数据 */
    show_lottery: FullData;
  };

  /**
   * 抽奖数据
   * @since Beta v0.7.2
   */
  type FullData = {
    /** 抽奖 ID */
    id: string;
    /** 创建者 */
    creator: TGApp.BBS.Post.User;
    /** 抽奖时间 */
    draw_time: string;
    /** 参与方式 */
    participant_way: string;
    /** 是否限制未关注用户 */
    is_expect_unfocus_user: boolean;
    /** 是否限制未实名用户 */
    is_expect_non_real_name_user: boolean;
    /** 用户奖励列表 */
    user_rewards: Array<Reward>;
    /** 状态 */
    status: string;
    /** 是否被屏蔽 */
    is_blocked: boolean;
    /** 用户状态 */
    user_status: string;
    /** 是否上传地址 */
    is_upload_address: boolean;
    /** 抽奖实体摘要 */
    lottery_entity_summary: string;
    /** 实体 ID */
    entity_id: string;
    /** 实体类型 */
    entity_type: string;
    /** 当前时间 */
    now_time: string;
  };

  /**
   * 抽奖奖励
   * @since Beta v0.7.2
   */
  type Reward = {
    /** 奖励名称 */
    reward_name: string;
    /** 获奖人数 */
    winner_number: number;
    /** 预计获奖人数 */
    scheduled_winner_number: number;
    /** 是否通过帖子发放 */
    is_send_by_post: boolean;
    /** 用户列表 */
    users: Array<TGApp.BBS.Post.User>;
    /** 奖励 ID */
    id: string;
  };
}
