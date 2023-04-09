/**
 * @file store modules hk4e.ts
 * @description store modules hk4e.ts
 * @author BTMuli<outlook.com>
 * @since Alpha v0.1.2
 */

// vue
import { ref } from "vue";
// pinia
import { defineStore } from "pinia";

export const useHk4eStore = defineStore(
  "hk4e",
  () => {
    // cookie
    const cookie = ref("");
    // 解析后的 cookie
    const cookieParsed = ref<Record<string, string>>({});

    // getCookie
    function getCookie (): string {
      return cookie.value;
    }

    // 获取具体的 cookie
    function getCookieItem (key: string): string {
      return cookieParsed.value[key];
    }

    // setCookie
    function setCookie (value: string): void {
      cookie.value = value;
      // 解析 cookie
      const cookieObj: Record<string, string> = {};
      value.split(";").forEach((item) => {
        const [key, value] = item.split("=");
        cookieObj[key.trim()] = value;
      });
      // 保存 cookie
      localStorage.setItem("hk4eCookie", JSON.stringify(cookieObj));
      cookieParsed.value = cookieObj;
    }

    return {
      getCookie,
      setCookie,
      getCookieItem,
    };
  },
  {
    persist: true,
  },
);
