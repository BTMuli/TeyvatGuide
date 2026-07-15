/**
 * 用户信息模块
 * @since Beta v0.11.2
 */

import showSnackbar from "@comp/func/snackbar.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import { defineStore } from "pinia";
import { ref } from "vue";

function getEmptyBriefInfo(): TGApp.App.Account.BriefInfo {
  return { nickname: "", avatar: "", uid: "", desc: "" };
}

function getEmptyGameAccount(): TGApp.Sqlite.Account.Game {
  return {
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
  };
}

const useUserStore = defineStore(
  "user",
  () => {
    const briefInfo = ref<TGApp.App.Account.BriefInfo>(getEmptyBriefInfo());
    const account = ref<TGApp.Sqlite.Account.Game>(getEmptyGameAccount());
    const uid = ref<string>();
    const cookie = ref<TGApp.App.Account.Cookie>();

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

    function clearLoginState(): void {
      uid.value = undefined;
      cookie.value = undefined;
      briefInfo.value = getEmptyBriefInfo();
      account.value = getEmptyGameAccount();
    }

    async function loadFallbackAccount(): Promise<boolean> {
      const savedAccounts = await TSUserAccount.account.getAllAccount();
      savedAccounts.sort((a, b) => b.updated.localeCompare(a.updated));
      for (const savedAccount of savedAccounts) {
        const gameAccount = await TSUserAccount.game.getCurAccount(savedAccount.uid);
        if (!gameAccount) continue;
        uid.value = savedAccount.uid;
        cookie.value = savedAccount.cookie;
        briefInfo.value = savedAccount.brief;
        account.value = gameAccount;
        return true;
      }
      clearLoginState();
      return false;
    }

    async function removeAccount(accountUid: string): Promise<boolean> {
      const isCurrent = uid.value === accountUid;
      await TSUserAccount.account.deleteAccount(accountUid);
      if (!isCurrent) return uid.value !== undefined;
      return await loadFallbackAccount();
    }

    async function logout(): Promise<boolean> {
      if (uid.value) {
        return await removeAccount(uid.value);
      }
      clearLoginState();
      return false;
    }

    return {
      uid,
      cookie,
      briefInfo,
      account,
      logout,
      removeAccount,
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
    ],
  },
);

export default useUserStore;
