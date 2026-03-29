/**
 * 幽境危战
 * @since Beta v0.9.9
 */

declare namespace TGApp.Plugins.Hutao.Challenge {
  /**
   * 导入数据结构
   * @since Beta v0.9.9
   */
  type ImportData = {
    uid: string;
    schedule_id: number;
    start_time: string;
    end_time: string;
    name: string;
    single: TGApp.Game.Challenge.Challenge;
    mp: TGApp.Game.Challenge.Challenge;
    blings: TGApp.Game.Challenge.ChallengeBlings;
    data: TGApp.Game.Challenge.ChallengeItem;
  };
}
