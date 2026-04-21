/**
 * 幽境危战
 * @since Beta v0.10.1
 */

declare namespace TGApp.Plugins.Hutao.Challenge {
  /**
   * 导入数据结构
   * @since Beta v0.10.1
   */
  type ImportData = {
    uid: string;
    schedule_id: number;
    data: TGApp.Game.Challenge.ChallengeItem;
  };
}
