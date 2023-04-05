/**
 * @file plugins Mys utils lottery.ts
 * @description 抽奖工具类
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.1
 */

import { type LotteryData, type LotteryCard, type LotteryRewardCard, type LotteryReward } from "../interface/lottery";

/**
 * @description 根据抽奖信息转为渲染用的抽奖信息
 * @since Alpha v0.1.1
 * @param {LotteryData} lotteryData 抽奖信息
 * @returns {LotteryCard}
 */
export function getLotteryCard (lotteryData: LotteryData): LotteryCard {
  return {
    id: lotteryData.id,
    participantWay: lotteryData.participant_way,
    status: lotteryData.status,
    creator: lotteryData.creator,
    drawTime: lotteryData.draw_time,
    rewards: lotteryData.user_rewards.map((reward) => {
      return getLotteryRewardCard(reward);
    }),
  };
}

/**
 * @description 根据抽奖奖励信息转为渲染用的抽奖奖励信息
 * @since Alpha v0.1.1
 * @param {LotteryReward} lotteryReward 抽奖奖励信息
 * @returns {LotteryRewardCard}
 */
export function getLotteryRewardCard (lotteryReward: LotteryReward): LotteryRewardCard {
  return {
    rewardName: lotteryReward.reward_name,
    winnerNumber: lotteryReward.winner_number,
    scheduledWinnerNumber: lotteryReward.scheduled_winner_number,
    users: lotteryReward.users,
  };
}
