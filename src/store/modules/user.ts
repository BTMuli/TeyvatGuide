/**
 * 用户信息模块
 * @since Beta v0.7.6
 */

import showSnackbar from "@comp/func/snackbar.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import { defineStore } from "pinia";
import { ref } from "vue";

const useUserStore = defineStore(
  "user",
  () => {
    const briefInfo = ref<TGApp.App.Account.BriefInfo>({
      nickname: "",
      avatar: "",
      uid: "",
      desc: "",
    });
    const account = ref<TGApp.Sqlite.Account.Game>({
      uid: "",
      gameBiz: "",
      gameUid: "",
      isChosen: 0,
      isOfficial: 0,
      level: "",
      nickname: "",
      region: "",
      regionName: "",
      updated: "",
    });
    const uid = ref<string>();
    const cookie = ref<TGApp.App.Account.Cookie>();
    const propMap = ref<TGApp.Game.Avatar.PropMap>();

    /** 胡桃云邮箱 */
    const hutaoEmail = ref<string>();

    function getProp(prop: number): TGApp.Game.Avatar.PropMapItem | false {
      if (!propMap.value) return false;
      return propMap.value[prop.toString()] || false;
    }

    async function switchGameAccount(uidG: string): Promise<boolean> {
      if (!uid.value) {
        showSnackbar.warn("未找到登录用户");
        return false;
      }
      if (uidG === account.value.gameUid) {
        showSnackbar.warn("该账户已经选中");
        return false;
      }
      const gameAccounts = await TSUserAccount.game.getAccount(uid.value);
      const accountFind = gameAccounts.find((a) => a.gameUid === uidG && a.gameBiz === "hk4e_cn");
      if (!accountFind) {
        showSnackbar.warn("未找到账户绑定的游戏账户");
        return false;
      }
      account.value = accountFind;
      await TSUserAccount.game.switchAccount(uid.value, uidG);
      showSnackbar.success(`成功切换游戏账户为${uidG}`);
      return true;
    }

    return {
      uid,
      cookie,
      briefInfo,
      account,
      propMap,
      hutaoEmail,
      getProp,
      switchGameAccount,
    };
  },
  {
    persist: [
      {
        key: "curAccount",
        storage: window.localStorage,
        pick: ["uid", "briefInfo", "cookie", "account"],
      },
      { key: "propMap", storage: window.localStorage, pick: ["propMap"] },
      { key: "hutaoAccount", storage: window.localStorage, pick: ["hutaoEmail"] },
    ],
  },
);

export default useUserStore;
