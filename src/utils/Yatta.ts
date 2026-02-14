/**
 * Yatta 插件入口
 * @since Beta v0.9.6
 */
import TGHttp from "@utils/TGHttp.js";

const YATTA_API = "https://gi.yatta.moe/api/v2/";

/**
 * 请求角色数据
 * @since Beta v0.9.6
 * @returns 角色数据
 */
async function fetchAvatar(): Promise<TGApp.Plugins.Yatta.AvatarResp> {
  return await TGHttp<TGApp.Plugins.Yatta.AvatarResp>(`${YATTA_API}chs/avatar`, {
    method: "GET",
  });
}

/**
 * 请求武器数据
 * @since Beta v0.9.6
 * @returns 武器数据
 */
async function fetchWeapon(): Promise<TGApp.Plugins.Yatta.WeaponResp> {
  return await TGHttp<TGApp.Plugins.Yatta.WeaponResp>(`${YATTA_API}chs/weapon`, {
    method: "GET",
  });
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
