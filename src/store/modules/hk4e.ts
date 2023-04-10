/**
 * @file store modules hk4e.ts
 * @description store modules hk4e.ts
 * @author BTMuli<outlook.com>
 * @since Alpha v0.1.2
 */

// pinia
import { defineStore } from "pinia";

export const useHk4eStore = defineStore(
  "hk4e",
  () => {
    // getCookie
    function getCookie (): string {
      return localStorage.getItem("hk4eCookie") || "{}";
    }

    // 获取具体的 cookie
    function getCookieItem (key: string): string {
      const cookie = getCookie();
      const cookieParsed = JSON.parse(cookie);
      return cookieParsed.value[key];
    }

    // setCookie
    function setCookie (value: string): void {
      // 解析 cookie
      const cookieObj: Record<string, string> = {};
      value.split(";").forEach((item) => {
        const [key, value] = item.split("=");
        cookieObj[key.trim()] = value;
      });
      // 保存 cookie
      localStorage.setItem("hk4eCookie", JSON.stringify(cookieObj));
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
