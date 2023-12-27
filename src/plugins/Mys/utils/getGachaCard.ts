/**
 * @file plugins/Mys/utils/getGachaCard.ts
 * @description Mys 插件抽卡工具
 * @since Beta v0.3.9
 */

import getPostData from "../request/getPostData";

/**
 * @description 根据卡池信息转为渲染用的卡池信息
 * @since Beta v0.3.9
 * @param {TGApp.Plugins.Mys.Gacha.Data[]} gachaData 卡池信息
 * @param {Record<number, string>} poolCover 卡池封面
 * @returns {Promise<TGApp.Plugins.Mys.Gacha.RenderCard[]>}
 */
async function getGachaCard(
  gachaData: TGApp.Plugins.Mys.Gacha.Data[],
  poolCover?: Record<number, string>,
): Promise<TGApp.Plugins.Mys.Gacha.RenderCard[]> {
  const gachaCard: TGApp.Plugins.Mys.Gacha.RenderCard[] = [];
  await Promise.allSettled(
    gachaData.map(async (data: TGApp.Plugins.Mys.Gacha.Data) => {
      let cover = "/source/UI/empty.webp";
      const postId: number | undefined = Number(data.activity_url.split("/").pop()) || undefined;
      if (postId === undefined || isNaN(postId)) {
        throw new Error("无法获取帖子 ID");
      }
      if (poolCover !== undefined) {
        cover = poolCover[postId];
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
      return gachaCard.push({
        title: data.title,
        subtitle: data.content_before_act,
        cover,
        postId,
        characters: data.pool.map((character) => ({
          icon: character.icon,
          url: character.url,
        })),
        voice: {
          icon: data.voice_icon || "/source/UI/lumine.webp",
          url: data.voice_url,
        },
        time: {
          str: timeStr,
          startStamp: new Date(data.start_time).getTime(),
          endStamp: new Date(data.end_time).getTime(),
        },
      });
    }),
  );
  return gachaCard;
}

export default getGachaCard;
