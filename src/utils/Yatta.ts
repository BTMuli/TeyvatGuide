/**
 * Yatta 插件入口
 * @since Beta v0.10.0
 */
import TGHttps from "@utils/TGHttps.js";

const YATTA_API = "https://gi.yatta.moe/api/v2/";

/**
 * 请求角色数据
 * @since Beta v0.10.0
 * @returns 角色数据
 */
async function fetchAvatar(): Promise<TGApp.Plugins.Yatta.AvatarResp> {
  const resp = await TGHttps.get<TGApp.Plugins.Yatta.AvatarResp>(`${YATTA_API}chs/avatar`);
  return resp.data;
}

/**
 * 请求武器数据
 * @since Beta v0.9.6
 * @returns 武器数据
 */
async function fetchWeapon(): Promise<TGApp.Plugins.Yatta.WeaponResp> {
  const resp = await TGHttps.get<TGApp.Plugins.Yatta.WeaponResp>(`${YATTA_API}chs/weapon`);
  return resp.data;
}

/**
 * 转换数据
 * @since Beta v0.9.6
 */
async function fetchYattaJson(): Promise<Array<TGApp.Plugins.Yatta.ConvertData>> {
  const jsonW = await fetchWeapon();
  const jsonA = await fetchAvatar();
  const res: Array<TGApp.Plugins.Yatta.ConvertData> = [];
  for (const weapon of Object.values(jsonW.data.items)) {
    res.push({ id: weapon.id.toString(), name: weapon.name, type: "武器", star: weapon.rank });
  }
  for (const avatar of Object.values(jsonA.data.items)) {
    res.push({ id: avatar.id.toString(), name: avatar.name, type: "角色", star: avatar.rank });
  }
  return res;
}

export default fetchYattaJson;
