/**
 * @file store/modules/user.ts
 * @description 用户信息模块
 * @since Beta v0.5.5
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
    const propMap = ref<TGApp.Game.Avatar.PropMap>();

    function getAllCookie(): string {
      let res = "";
      if (!cookie.value) return res;
      if (cookie.value.ltuid && cookie.value.ltuid !== "") {
        res += `ltuid=${cookie.value.ltuid};`;
      }
      if (cookie.value.ltoken && cookie.value.ltoken !== "") {
        res += `ltoken=${cookie.value.ltoken};`;
      }
      if (cookie.value.mid && cookie.value.mid !== "") {
        res += `mid=${cookie.value.mid};`;
      }
      if (cookie.value.cookie_token && cookie.value.cookie_token !== "") {
        res += `cookie_token=${cookie.value.cookie_token};`;
      }
      if (cookie.value.stoken && cookie.value.stoken !== "") {
        res += `stoken=${cookie.value.stoken};`;
      }
      if (cookie.value.stuid && cookie.value.stuid !== "") {
        res += `stuid=${cookie.value.stuid};`;
      }
      if (cookie.value.account_id && cookie.value.account_id !== "") {
        res += `account_id=${cookie.value.account_id};`;
      }
      return res;
    }

    function getProp(prop: number): TGApp.Game.Avatar.PropMapItem | false {
      if (!propMap.value) return false;
      return propMap.value[prop.toString()] || false;
    }

    return {
      cookie,
      briefInfo,
      account,
      propMap,
      getAllCookie,
      getProp,
    };
  },
  {
    persist: [
      {
        key: "cookie",
        storage: window.localStorage,
        pick: ["cookie"],
      },
      {
        key: "briefInfo",
        storage: window.localStorage,
        pick: ["briefInfo"],
      },
      {
        key: "account",
        storage: window.localStorage,
        pick: ["account"],
      },
      {
        key: "propMap",
        storage: window.localStorage,
        pick: ["propMap"],
      },
    ],
  },
);
