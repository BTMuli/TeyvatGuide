/**
 * @file plugins/Mys/utils/getGachaCard.ts
 * @description Mys 插件抽卡工具
 * @since Beta v0.4.4
 */

import { AppCharacterData } from "../../../data";
import getPostData from "../request/getPostData";

/**
 * @description 根据单个卡池信息转为渲染用的卡池信息
 * @since Beta v0.4.4
 * @param {TGApp.Plugins.Mys.Gacha.Data} data 卡池信息
 * @param {string} poolCover 卡池封面
 * @returns {Promise<TGApp.Plugins.Mys.Gacha.RenderCard>}
 */
async function getGachaItemCard(
  data: TGApp.Plugins.Mys.Gacha.Data,
  poolCover?: string,
): Promise<TGApp.Plugins.Mys.Gacha.RenderCard> {
  let cover = "/source/UI/empty.webp";
  const postId: number | undefined = Number(data.activity_url.split("/").pop()) || undefined;
  if (postId === undefined || isNaN(postId)) {
    throw new Error("无法获取帖子 ID");
  }
  if (poolCover !== undefined) {
    cover = poolCover;
  } else {
    try {
      console.log("调用 getPostData");
      const post = await getPostData(postId);
      cover = post.cover?.url ?? post.post.images[0];
    } catch (error) {
      console.error(error);
    }
  }
  const timeStr = `${data.start_time} ~ ${data.end_time}`;
  const characters: TGApp.Plugins.Mys.Gacha.RenderItem[] = [];
  for (const character of data.pool) {
    const item: TGApp.Plugins.Mys.Gacha.RenderItem = {
      icon: character.icon,
      url: character.url,
    };
    const contentId = character.url.match(/(?<=content\/)\d+/)?.[0];
    if (contentId) {
      const itemF = AppCharacterData.find((item) => item.contentId.toString() === contentId);
      if (itemF) {
        item.info = itemF;
      }
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
    },
  };
}

/**
 * @description 根据卡池信息转为渲染用的卡池信息
 * @since Beta v0.4.4
 * @param {TGApp.Plugins.Mys.Gacha.Data[]} gachaData 卡池信息
 * @param {Record<number, string>} poolCover 卡池封面
 * @returns {Promise<TGApp.Plugins.Mys.Gacha.RenderCard[]>}
 */
export async function getGachaCard(
  gachaData: TGApp.Plugins.Mys.Gacha.Data[],
  poolCover?: Record<number, string>,
): Promise<TGApp.Plugins.Mys.Gacha.RenderCard[]> {
  const gachaCard: TGApp.Plugins.Mys.Gacha.RenderCard[] = [];
  await Promise.allSettled(
    gachaData.map(async (data: TGApp.Plugins.Mys.Gacha.Data) => {
      const item = await getGachaItemCard(data, poolCover?.[Number(data.id)]);
      gachaCard.push(item);
    }),
  );
  return gachaCard;
}
