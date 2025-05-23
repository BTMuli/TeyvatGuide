/**
 * @file store/modules/bbs.ts
 * @description BBS 模块状态管理
 * @since Beta v0.7.3
 */
import apiHubReq from "@req/apiHubReq.js";
import { defineStore } from "pinia";
import { shallowRef } from "vue";

const useBBSStore = defineStore(
  "bbs",
  () => {
    // 游戏列表
    const gameList = shallowRef<Array<TGApp.BBS.Game.Item>>([]);

    // 刷新游戏列表
    async function refreshGameList(): Promise<void> {
      gameList.value = await apiHubReq.game();
    }

    return { gameList, refreshGameList };
  },
  { persist: true },
);

export default useBBSStore;
