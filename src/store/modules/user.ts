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
