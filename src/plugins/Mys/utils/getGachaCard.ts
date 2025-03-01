/**
 * @file plugins/Mys/utils/getGachaCard.ts
 * @description Mys 插件抽卡工具
 * @since Beta v0.6.3
 */

import showSnackbar from "@comp/func/snackbar.js";

import { AppCharacterData } from "@/data/index.js";
import postReq from "@/web/request/postReq.js";

/**
 * @description 根据单个卡池信息转为渲染用的卡池信息
 * @since Beta v0.6.6
 * @param {TGApp.Plugins.Mys.Gacha.Data} data 卡池信息
 * @param {string} poolCover 卡池封面
 * @returns {Promise<TGApp.Plugins.Mys.Gacha.RenderCard>}
 */
async function getGachaItemCard(
  data: TGApp.Plugins.Mys.Gacha.Data,
  poolCover?: string,
): Promise<TGApp.Plugins.Mys.Gacha.RenderCard | null> {
  let cover = "/source/UI/empty.webp";
  const postId: number | undefined = Number(data.activity_url.split("/").pop()) || undefined;
  if (postId === undefined || isNaN(postId)) return null;
  if (poolCover !== undefined) {
    cover = poolCover;
  } else {
    const postResp = await postReq.post(postId);
    if ("retcode" in postResp) {
      showSnackbar.error(`[${postResp.retcode}] ${postResp.message}`);
      return null;
    }
    cover = postResp.cover?.url ?? postResp.post.images[0];
  }
  const timeStr = `${data.start_time} ~ ${data.end_time}`;
  const characters: TGApp.Plugins.Mys.Gacha.RenderItem[] = [];
  for (const character of data.pool) {
    const item: TGApp.Plugins.Mys.Gacha.RenderItem = { icon: character.icon, url: character.url };
    const contentId = character.url.match(/(?<=content\/)\d+/)?.[0];
    if (contentId) {
      const itemF = AppCharacterData.find((item) => item.contentId.toString() === contentId);
      if (itemF) item.info = itemF;
    }
    characters.push(item);
  }
  return {
    id: data.id,
    title: data.title,
    subtitle: data.content_before_act,
    cover,
    postId,
    characters,
    time: {
      str: timeStr,
      startStamp: new Date(data.start_time).getTime(),
      endStamp: new Date(data.end_time).getTime(),
      totalStamp: new Date(data.end_time).getTime() - new Date(data.start_time).getTime(),
    },
  };
}

/**
 * @description 根据卡池信息转为渲染用的卡池信息
 * @since Beta v0.6.3
 * @param {TGApp.Plugins.Mys.Gacha.Data[]} gachaData 卡池信息
 * @param {Record<number, string>} poolCover 卡池封面
 * @returns {Promise<TGApp.Plugins.Mys.Gacha.RenderCard[]>}
 */
export async function getGachaCard(
  gachaData: TGApp.Plugins.Mys.Gacha.Data[],
  poolCover?: Record<number, string>,
): Promise<TGApp.Plugins.Mys.Gacha.RenderCard[]> {
  const gachaCard: TGApp.Plugins.Mys.Gacha.RenderCard[] = [];
  for (const data of gachaData) {
    const item = await getGachaItemCard(data, poolCover?.[Number(data.id)]);
    if (item !== null) gachaCard.push(item);
  }
  return gachaCard;
}
