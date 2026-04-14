/**
 * 米社数据状态管理
 * @since Beta v0.10.1
 */
import apiHubReq from "@req/apiHubReq.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { defineStore } from "pinia";
import { shallowRef } from "vue";

const useBBSStore = defineStore(
  "bbs",
  () => {
    // 游戏列表
    const gameList = shallowRef<Array<TGApp.BBS.Game.Item>>([]);
    // 游戏卡片配置项
    const gameUidCards = shallowRef<Record<string, TGApp.BBS.AppConfig.GameUidCardConf>>({});
    // 版块数据
    const forumList = shallowRef<Array<TGApp.BBS.Forum.GameForum>>([]);

    // 刷新游戏列表
    async function refreshGameList(): Promise<void> {
      try {
        const resp = await apiHubReq.game();
        if (resp.retcode !== 0) {
          await TGLogger.Warn(`[BBSStore] 获取游戏列表失败：${resp.retcode} ${resp.message}`);
          return;
        }
        gameList.value = resp.data.list;
      } catch (e) {
        await TGLogger.Error(`[BBSStore] 获取游戏列表异常：${TGHttps.getErrMsg(e)}`);
      }
    }

    // 刷新版块列表
    async function refreshForumList(): Promise<void> {
      try {
        const resp = await apiHubReq.forum();
        if (resp.retcode !== 0) {
          await TGLogger.Warn(`[BBSStore] 获取版块列表失败：${resp.retcode} ${resp.message}`);
          return;
        }
        forumList.value = resp.data.list;
      } catch (e) {
        await TGLogger.Error(`[BBSStore] 获取版块列表异常：${TGHttps.getErrMsg(e)}`);
      }
    }

    // 刷新游戏卡片配置项
    async function refreshGameUidCards(): Promise<void> {
      try {
        const resp = await apiHubReq.appConfig();
        if (resp.retcode !== 0) {
          await TGLogger.Warn(`[BBSStore] 获取游戏卡片配置失败：${resp.retcode} ${resp.message}`);
          return;
        }
        const conf = <TGApp.BBS.AppConfig.GameUidCardConfigParse>(
          JSON.parse(resp.data.config.game_uid_card_config)
        );
        gameUidCards.value = conf.game_uid_card_conf;
      } catch (e) {
        await TGLogger.Error(`[BBSStore] 获取游戏卡片配置异常：${TGHttps.getErrMsg(e)}`);
      }
    }

    return {
      gameList,
      refreshGameList,
      forumList,
      refreshForumList,
      gameUidCards,
      refreshGameUidCards,
    };
  },
  { persist: true },
);

export default useBBSStore;
