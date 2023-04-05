/**
 * @file plugins Mys utils gacha.ts
 * @description Mys 插件抽卡工具
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { getPostData } from "../request/post";
import { type GachaCard, type GachaData } from "../interface/gacha";
import { type Map } from "../../../interface/Base";

/**
 * @description 根据卡池信息转为渲染用的卡池信息
 * @since Alpha v0.1.2
 * @param {GachaData[]} gachaData 卡池信息
 * @param {Map<string>} poolCover 卡池封面
 * @returns {Promise<GachaCard[]>}
 */
export async function getGachaCard (
  gachaData: GachaData[],
  poolCover: Map<string> | undefined = undefined,
): Promise<GachaCard[]> {
  const gachaCard: GachaCard[] = [];
  await Promise.allSettled(
    gachaData.map(async (data: GachaData) => {
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
      return gachaCard.push({
        title: data.title,
        subtitle: data.content_before_act,
        cover,
        post_id: postId,
        characters: data.pool.map((character) => ({
          icon: character.icon,
          url: character.url,
        })),
        voice: {
          icon: data.voice_icon,
          url: data.voice_url,
        },
        time: {
          start: data.start_time,
          start_stamp: new Date(data.start_time).getTime(),
          end: data.end_time,
          end_stamp: new Date(data.end_time).getTime(),
        },
      });
    }),
  );
  return gachaCard;
}
