/**
 * @file plugins/Hutao/utils/combatUtil.ts
 * @description 将本地数据转为上传用的数据
 * @since Beta v0.6.3
 */

/**
 * @description 将本地数据转为上传用的数据
 * @since Beta v0.6.3
 * @param {TGApp.Sqlite.Combat.SingleTable} data 数据
 * @returns {TGApp.Plugins.Hutao.Combat.UploadData} 上传用的数据
 */
export function transCombatLocal(
  data: TGApp.Sqlite.Combat.SingleTable,
): TGApp.Plugins.Hutao.Combat.UploadData {
  return {
    Version: 1,
    Uid: data.uid,
    Identity: "TeyvatGuide",
    BackupAvatars: data.detail.backup_avatars.map((i) => i.avatar_id),
    ScheduleId: data.id,
  };
}
