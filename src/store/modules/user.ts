/**
 * @file store modules user.ts
 * @description User store module
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

// vue
import { ref } from "vue";
// pinia
import { defineStore } from "pinia";

export const useUserStore = defineStore(
  "user", () => {
    const briefInfo = ref({
      nickname: "",
      avatar: "",
      uid: "",
      desc: "",
    } as TGApp.App.Account.BriefInfo);
    const cookie = ref({} as Record<string, string>);

    function setBriefInfo (info: TGApp.App.Account.BriefInfo): void {
      briefInfo.value = info;
    }

    function getBriefInfo (): Record<string, string> {
      return briefInfo.value;
    }

    function getCookieItem (key: string): string {
      return cookie.value[key] || "";
    }

    function getCookieGroup1 (): TGApp.BBS.Constant.CookieGroup1 {
      return {
        login_ticket: getCookieItem("login_ticket"),
        login_uid: getCookieItem("login_uid"),
      };
    }

    function getCookieGroup2 (): TGApp.BBS.Constant.CookieGroup2 {
      return {
        account_id: getCookieItem("account_id"),
        cookie_token: getCookieItem("cookie_token"),
      };
    }

    function getCookieGroup3 (): TGApp.BBS.Constant.CookieGroup3 {
      return {
        ltoken: getCookieItem("ltoken"),
        ltuid: getCookieItem("ltuid"),
      };
    }

    function getCookieGroup4 (): TGApp.BBS.Constant.CookieGroup4 {
      return {
        account_id: getCookieItem("account_id"),
        cookie_token: getCookieItem("cookie_token"),
        ltoken: getCookieItem("ltoken"),
        ltuid: getCookieItem("ltuid"),
      };
    }

    function initCookie (ck: Record<string, string>): void {
      if (cookie.value !== ck) {
        cookie.value = ck;
      }
    }
    return {
      briefInfo,
      cookie,
      getBriefInfo,
      setBriefInfo,
      getCookieItem,
      getCookieGroup1,
      getCookieGroup2,
      getCookieGroup3,
      getCookieGroup4,
      initCookie,
    };
  },
  {
    persist: [{
      key: "cookie",
      storage: window.localStorage,
      paths: ["cookie"],
    }, {
      key: "briefInfo",
      storage: window.localStorage,
      paths: ["briefInfo"],
    }],
  },
);
