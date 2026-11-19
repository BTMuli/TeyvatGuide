/**
 * 米游社浏览偏好。
 * @since Beta v0.13.2
 */
import bbsEnum from "@enum/bbs.js";
import { defaultCommunityGid } from "@utils/bbs/browsing.js";
import { defineStore } from "pinia";

/**
 * 通过各页面的主动选择记录的浏览偏好。
 * @since Beta v0.13.2
 */
type CommunityBrowsingState = {
  recentGid: number;
  forumByGid: Partial<Record<number, number>>;
  forumSortType: TGApp.BBS.Post.ForumSortTypeEnum;
  topicSortType: TGApp.BBS.Post.PostTopicSortTypeEnum;
  rankPeriod: number | undefined;
  shopCategory: string;
  shopGoodsType: "all" | "physical" | "virtual";
  shopStock: "all" | "available" | "upcoming" | "sold-out";
};

const useCommunityBrowsingStore = defineStore("communityBrowsing", {
  state: (): CommunityBrowsingState => ({
    recentGid: defaultCommunityGid,
    forumByGid: {},
    forumSortType: bbsEnum.post.forumSortType.LATEST_REPLY,
    topicSortType: bbsEnum.post.topicSortType.LATEST,
    rankPeriod: undefined,
    shopCategory: "all",
    shopGoodsType: "all",
    shopStock: "all",
  }),
  persist: true,
});

export default useCommunityBrowsingStore;
