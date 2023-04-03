/**
 * @file plugins Mys utils gacha.ts
 * @description Mys 插件抽卡工具
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { getPostData } from "../request/post";
import { GachaCard, GachaData } from "../interface/gacha";

/**
 * @description 根据卡池信息转为渲染用的卡池信息
 * @since Alpha v0.1.2
 * @param {GachaData[]} gachaData 卡池信息
 * @return {Promise<GachaCard[]>}
 */
export async function getGachaCard(gachaData: GachaData[]): Promise<GachaCard[]> {
	const gachaCard: GachaCard[] = [];
	await Promise.allSettled(
		gachaData.map(async (data: GachaData) => {
			const post_id: number | undefined = Number(data.activity_url.split("/").pop()) || undefined;
			if (post_id === undefined) {
				throw new Error("无法获取帖子 ID");
			}
			let cover = "/source/UI/empty.webp";
			try {
				const post = await getPostData(post_id);
				cover = post.cover?.url || post.post.images[0];
			} catch (error) {
				await console.error(error);
			}
			return gachaCard.push({
				title: data.title,
				subtitle: data.content_before_act,
				cover: cover,
				post_id: post_id,
				characters: data.pool.map(character => ({
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
		})
	);
	return gachaCard;
}
