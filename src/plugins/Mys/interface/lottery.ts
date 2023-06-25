/**
 * @file plugins Mys interface lottery.ts
 * @description Mys 插件抽奖接口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { type MysResponse } from "./base";
import { type UserInfoPost } from "./user";

/**
 * @description 抽奖返回数据
 * @since Alpha v0.1.1
 * @interface LotteryResponse
 * @extends {MysResponse}
 * @property {LotteryData} data.show_lottery 抽奖数据
 * @returns {LotteryResponse}
 */
export interface LotteryResponse extends MysResponse {
  data: {
    show_lottery: LotteryData;
  };
}

/**
 * @description 抽奖数据
 * @since Alpha v0.1.1
 * @interface LotteryData
 * @property {string} id 抽奖 ID
 * @property {UserInfoPost} creator 创建者
 * @property {string} draw_time 抽奖时间
 * @property {string} participant_way 参与方式 // Forward: 转发
 * @property {boolean} is_expect_unfocus_user 是否限制未关注用户
 * @property {boolean} is_expect_non_real_name_user 是否限制未实名用户
 * @property {LotteryReward[]} user_rewards 用户奖励
 * @property {string} status 状态 // Settled: 已结算
 * @property {boolean} is_blocked 是否被屏蔽
 * @property {string} user_status 用户状态 // NotParticipant: 未参与
 * @property {boolean} is_upload_address 是否上传地址
 * @property {string} lottery_entity_summary 抽奖实体摘要
 * @property {string} entity_id 实体 ID // 若为帖子，则为帖子 ID
 * @property {string} entity_type 实体类型 // Post: 帖子
 * @property {string} now_time 当前时间
 * @returns {LotteryData}
 */
export interface LotteryData {
  id: string;
  creator: UserInfoPost;
  draw_time: string;
  participant_way: string;
  is_expect_unfocus_user: boolean;
  is_expect_non_real_name_user: boolean;
  user_rewards: LotteryReward[];
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
 * @since Alpha v0.1.1
 * @interface LotteryReward
 * @property {string} reward_name 奖励名称
 * @property {number} winner_number 获奖人数
 * @property {number} scheduled_winner_number 预计获奖人数
 * @property {boolean} is_send_by_post 是否通过帖子发放
 * @property {User[]} users 用户列表
 * @property {string} id 奖励 ID
 * @returns {LotteryReward}
 */
export interface LotteryReward {
  reward_name: string;
  winner_number: number;
  scheduled_winner_number: number;
  is_send_by_post: boolean;
  users: UserInfoPost[];
  id: string;
}

/**
 * @description 渲染用的抽奖信息
 * @since Alpha v0.1.1
 * @interface LotteryCard
 * @property {string} id 抽奖 ID
 * @property {string} participantWay 参与方式
 * @property {string} status 状态
 * @property {User} creator 创建者
 * @property {string} drawTime 开奖时间
 * @property {LotteryRewardCard[]} rewards 奖励列表
 * @returns {LotteryCard}
 */
export interface LotteryCard {
  id: string;
  participantWay: string;
  status: string;
  creator: UserInfoPost;
  drawTime: string;
  rewards: LotteryRewardCard[];
}

/**
 * @description 渲染用的奖励信息
 * @since Alpha v0.1.2
 * @interface LotteryRewardCard
 * @property {string} rewardName 奖励名称
 * @property {number} winnerNumber 获奖人数
 * @property {number} scheduledWinnerNumber 预计获奖人数
 * @property {User[]} users 用户列表
 * @returns {LotteryRewardCard}
 */
export interface LotteryRewardCard {
  rewardName: string;
  winnerNumber: number;
  scheduledWinnerNumber: number;
  users: UserInfoPost[];
}
