/**
 * @file store/modules/user.ts
 * @description 用户信息模块
 * @since Beta v0.3.9
 */

import { defineStore } from "pinia";
import { ref } from "vue";

export const useUserStore = defineStore(
  "user",
  () => {
    const briefInfo = ref<TGApp.App.Account.BriefInfo>({
      nickname: "",
      avatar: "",
      uid: "",
      desc: "",
    });
    const account = ref<TGApp.Sqlite.Account.Game>({
      gameBiz: "",
      gameUid: "",
      isChosen: 0,
      isOfficial: 0,
      level: "",
      nickname: "",
      region: "",
      regionName: "",
    });
    const cookie = ref<TGApp.User.Account.Cookie>();

    return {
      cookie,
      briefInfo,
      account,
    };
  },
  {
    persist: [
      {
        key: "cookie",
        storage: window.localStorage,
        paths: ["cookie"],
      },
      {
        key: "briefInfo",
        storage: window.localStorage,
        paths: ["briefInfo"],
      },
      {
        key: "account",
        storage: window.localStorage,
        paths: ["account"],
      },
    ],
  },
);
