/**
 * @file plugins Mys utils getLotteryCard.ts
 * @description 抽奖工具类
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.1
 */

/**
 * @description 根据抽奖奖励信息转为渲染用的抽奖奖励信息
 * @since Alpha v0.2.1
 * @param {TGApp.Plugins.Mys.Lottery.Reward} lotteryReward 抽奖奖励信息
 * @returns {TGApp.Plugins.Mys.Lottery.RenderReward}
 */
function getLotteryRewardCard(
  lotteryReward: TGApp.Plugins.Mys.Lottery.Reward,
): TGApp.Plugins.Mys.Lottery.RenderReward {
  return {
    name: lotteryReward.reward_name,
    win: lotteryReward.winner_number,
    goal: lotteryReward.scheduled_winner_number,
    users: lotteryReward.users,
  };
}

/**
 * @description 根据抽奖信息转为渲染用的抽奖信息
 * @since Alpha v0.2.1
 * @param {TGApp.Plugins.Mys.Lottery.FullData} lotteryData 抽奖信息
 * @returns {TGApp.Plugins.Mys.Lottery.RenderCard}
 */
function getLotteryCard(
  lotteryData: TGApp.Plugins.Mys.Lottery.FullData,
): TGApp.Plugins.Mys.Lottery.RenderCard {
  return {
    id: lotteryData.id,
    upWay: lotteryData.participant_way,
    status: lotteryData.status,
    creator: lotteryData.creator,
    drawTime: lotteryData.draw_time,
    rewards: lotteryData.user_rewards.map((reward) => {
      return getLotteryRewardCard(reward);
    }),
  };
}

export default getLotteryCard;
