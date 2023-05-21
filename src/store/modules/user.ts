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
// utils
import TGSqlite from "../../utils/TGSqlite";

export const useUserStore = defineStore(
  "user", () => {
    const briefInfo = ref({
      nickname: "",
      avatar: "",
      uid: "",
      desc: "",
    } as BTMuli.User.Base.BriefInfo);
    const cookie = ref({} as Record<string, string>);

    function setBriefInfo (info: BTMuli.User.Base.BriefInfo): void {
      briefInfo.value = info;
    }

    function getBriefInfo (): Record<string, string> {
      return briefInfo.value;
    }

    function getCookieItem (key: string): string {
      return cookie.value[key] || "";
    }

    async function initCookie (): Promise<void> {
      const ck = await TGSqlite.getCookie();
      if (cookie.value !== ck) {
        cookie.value = ck;
      }
    }
    return {
      getBriefInfo,
      setBriefInfo,
      getCookieItem,
      initCookie,
    };
  },
  {
    persist: true,
  },
);
