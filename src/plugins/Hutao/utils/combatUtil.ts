/**
 * 将本地数据转为上传用的数据
 * @since Beta v0.6.3
 */

/**
 * 将本地数据转为上传用的数据
 * @since Beta v0.6.3
 * @param data - 数据
 * @returns 上传用的数据
 */
export function transCombatLocal(
  data: TGApp.Sqlite.Combat.TableTrans,
): TGApp.Plugins.Hutao.Combat.UploadData {
  return {
    Version: 1,
    Uid: data.uid,
    Identity: "TeyvatGuide",
    BackupAvatars: data.detail.backup_avatars.map((i) => i.avatar_id),
    ScheduleId: data.id,
  };
}
