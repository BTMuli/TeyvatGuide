/**
 * 幻想真境剧诗相关请求
 * @since Beta v0.10.1
 */
import TGHttps from "@utils/TGHttps.js";

const CombatUrl: Readonly<string> = "https://homa.gentle.house/RoleCombat/";

/**
 * 获取剧诗统计数据
 * @since Beta v0.10.1
 * @param isLast - 是否获取上期数据
 * @returns 剧诗响应
 */
async function data(isLast: boolean = false): Promise<TGApp.Plugins.Hutao.Combat.Response> {
  const url = `${CombatUrl}Statistics`;
  const resp = await TGHttps.get<TGApp.Plugins.Hutao.Combat.Response>(url, {
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * 上传剧诗数据
 * @since Beta v0.10.1
 * @param uploadData - 上传数据
 * @returns 上传响应
 */
async function upload(
  uploadData: TGApp.Plugins.Hutao.Combat.UploadData,
): Promise<TGApp.Plugins.Hutao.Combat.UploadResp> {
  const url = `${CombatUrl}Upload`;
  const resp = await TGHttps.post<TGApp.Plugins.Hutao.Combat.UploadResp>(url, {
    body: uploadData,
    headers: { "Content-Type": "application/json" },
  });
  return resp.data;
}

/**
 * 将本地数据转为上传用的数据
 * @since Beta v0.6.3
 * @param data - 本地数据
 * @returns 上传用的数据
 */
function trans(data: TGApp.Sqlite.Combat.TableTrans): TGApp.Plugins.Hutao.Combat.UploadData {
  return {
    Version: 1,
    Uid: data.uid,
    Identity: "TeyvatGuide",
    BackupAvatars: data.detail.backup_avatars.map((i) => i.avatar_id),
    ScheduleId: data.id,
  };
}

const CombatReq = {
  data,
  upload,
  trans,
};

export default CombatReq;
