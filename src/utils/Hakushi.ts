/**
 * Hakushi 插件入口
 * @since Beta v0.9.0
 */
import TGHttp from "@utils/TGHttp.js";

const HAKUSHI_API = "https://api.hakush.in/gi/data/";

/**
 * 请求角色数据
 * @since Beta v0.9.0
 * @returns {Promise<TGApp.Plugins.Hakushi.AvatarResp>}
 */
async function fetchAvatar(): Promise<TGApp.Plugins.Hakushi.AvatarResp> {
  return await TGHttp<TGApp.Plugins.Hakushi.AvatarResp>(`${HAKUSHI_API}character.json`, {
    method: "GET",
  });
}

/**
 * 请求武器数据
 * @since Beta v0.9.0
 * @returns {Promise<TGApp.Plugins.Hakushi.WeaponResp>}
 */
async function fetchWeapon(): Promise<TGApp.Plugins.Hakushi.WeaponResp> {
  return await TGHttp<TGApp.Plugins.Hakushi.WeaponResp>(`${HAKUSHI_API}weapon.json`, {
    method: "GET",
  });
}

/**
 * 转换数据
 * @since Beta v0.9.0
 */
async function fetchJson(): Promise<Array<TGApp.Plugins.Hakushi.ConvertData>> {
  const jsonW = await fetchWeapon();
  const jsonA = await fetchAvatar();
  const res: Array<TGApp.Plugins.Hakushi.ConvertData> = [];
  for (const [id, data] of Object.entries(jsonW)) {
    res.push({ id: id.toString(), name: data.CHS, type: "武器" });
  }
  for (const [id, data] of Object.entries(jsonA)) {
    res.push({ id: id.toString(), name: data.CHS, type: "角色" });
  }
  return res;
}

const Hakushi = {
  fetch: fetchJson,
};

export default Hakushi;
