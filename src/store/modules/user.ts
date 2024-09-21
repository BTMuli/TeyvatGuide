/**
 * @file store/modules/user.ts
 * @description 用户信息模块
 * @since Beta v0.6.0
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

    function getProp(prop: number): TGApp.Game.Avatar.PropMapItem | false {
      if (!propMap.value) return false;
      return propMap.value[prop.toString()] || false;
    }

    return {
      uid,
      cookie,
      briefInfo,
      account,
      propMap,
      getProp,
    };
  },
  {
    persist: [
      {
        key: "curAccount",
        storage: window.localStorage,
        pick: ["uid", "briefInfo", "cookie", "account"],
      },
      {
        key: "propMap",
        storage: window.localStorage,
        pick: ["propMap"],
      },
    ],
  },
);
