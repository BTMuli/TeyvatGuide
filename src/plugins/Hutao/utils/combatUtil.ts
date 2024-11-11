/**
 * @file plugins/Hutao/utils/combatUtil.ts
 * @description 将本地数据转为上传用的数据
 * @since Beta v0.6.3
 */

/**
 * @description 将本地数据转为上传用的数据
 * @since Beta v0.6.3
 * @param {number[]} avatars 角色
 * @param {number} schedule 期数
 * @param {number} uid UID
 * @returns {TGApp.Plugins.Hutao.Combat.UploadData} 上传用的数据
 */
export function transCombatLocal(
  avatars: number[],
  schedule: number,
  uid: string,
): TGApp.Plugins.Hutao.Combat.UploadData {
  return {
    Version: 1,
    Uid: uid,
    Identity: "TeyvatGuide",
    BackupAvatars: avatars,
    ScheduleId: schedule,
  };
}
