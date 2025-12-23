/**
 * 米社数据状态管理
 * @since Beta v0.8.2
 */
import apiHubReq from "@req/apiHubReq.js";
import { defineStore } from "pinia";
import { shallowRef } from "vue";

const useBBSStore = defineStore(
  "bbs",
  () => {
    // 游戏列表
    const gameList = shallowRef<Array<TGApp.BBS.Game.Item>>([]);
    // 游戏卡片配置项
    const gameUidCards = shallowRef<Record<string, TGApp.BBS.AppConfig.GameUidCardConf>>({});

    // 刷新游戏列表
    async function refreshGameList(): Promise<void> {
      gameList.value = await apiHubReq.game();
    }

    // 刷新游戏卡片配置项
    async function refreshGameUidCards(): Promise<void> {
      const resp = await apiHubReq.appConfig();
      if ("retcode" in resp) return;
      const conf = <TGApp.BBS.AppConfig.GameUidCardConfigParse>(
        JSON.parse(resp.game_uid_card_config)
      );
      gameUidCards.value = conf.game_uid_card_conf;
    }

    return { gameList, refreshGameList, gameUidCards, refreshGameUidCards };
  },
  { persist: true },
);

export default useBBSStore;
