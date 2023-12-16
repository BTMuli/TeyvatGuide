/**
 * @file store/modules/user.ts
 * @description 用户信息模块
 * @since Beta v0.3.8
 */

import { defineStore } from "pinia";
import { ref } from "vue";

import TGSqlite from "../../plugins/Sqlite";

export const useUserStore = defineStore(
  "user",
  () => {
    const briefInfo = ref<TGApp.App.Account.BriefInfo>(loadBriefInfo());
    const account = ref<TGApp.Sqlite.Account.Game>(loadAccount());
    const cookie = ref<TGApp.User.Account.Cookie>();

    /**
     * @description 从本地加载用户信息
     * @since Beta v0.3.8
     * @function loadBriefInfo
     * @memberof useUserStore
     * @returns {TGApp.App.Account.BriefInfo}
     */
    function loadBriefInfo(): TGApp.App.Account.BriefInfo {
      const info = window.localStorage.getItem("briefInfo");
      if (info !== null && info !== undefined) {
        console.log(JSON.parse(info).briefInfo);
        return JSON.parse(info).briefInfo;
      }
      return {
        nickname: "",
        avatar: "",
        uid: "",
        desc: "",
      };
    }

    /**
     * @description 从本地加载当前用户信息
     * @since Beta v0.3.8
     * @function loadAccount
     * @memberof useUserStore
     * @returns {TGApp.Sqlite.Account.Game}
     */
    function loadAccount(): TGApp.Sqlite.Account.Game {
      const info = window.localStorage.getItem("account");
      if (info !== null && info !== undefined) {
        console.log(JSON.parse(info).account);
        return JSON.parse(info).account;
      }
      return {
        gameBiz: "",
        gameUid: "",
        isChosen: 0,
        isOfficial: 0,
        level: "",
        nickname: "",
        region: "",
        regionName: "",
      };
    }

    /**
     * @description 获取用户信息
     * @since Beta v0.3.8
     * @function getBriefInfo
     * @memberof useUserStore
     * @returns {TGApp.App.Account.BriefInfo}
     */
    function getBriefInfo(): TGApp.App.Account.BriefInfo {
      return briefInfo.value;
    }

    /**
     * @description 获取当前用户信息
     * @since Beta v0.3.8
     * @function getCurAccount
     * @memberof useUserStore
     * @returns {TGApp.Sqlite.Account.Game}
     */
    function getCurAccount(): TGApp.Sqlite.Account.Game {
      return account.value;
    }

    /**
     * @description 设置用户信息
     * @param info
     * @since Beta v0.3.8
     * @function setBriefInfo
     * @memberof useUserStore
     * @param {TGApp.App.Account.BriefInfo} info - 用户信息
     * @returns {void}
     */
    function setBriefInfo(info: TGApp.App.Account.BriefInfo): void {
      briefInfo.value = info;
    }

    /**
     * @description 设置当前用户信息
     * @since Beta v0.3.8
     * @function setCurAccount
     * @memberof useUserStore
     * @param {TGApp.Sqlite.Account.Game} user - 用户信息
     * @returns {void}
     */
    function setCurAccount(user: TGApp.Sqlite.Account.Game): void {
      account.value = user;
    }

    /**
     * @description 保存cookie到本地
     * @since Beta v0.3.8
     * @function saveCookie
     * @memberof useUserStore
     * @param {TGApp.User.Account.Cookie} ck - cookie对象
     * @returns {Promise<void>}
     */
    async function saveCookie(ck?: TGApp.User.Account.Cookie): Promise<void> {
      if (ck) {
        cookie.value = ck;
      }
      await TGSqlite.saveAppData("cookie", JSON.stringify(cookie.value));
    }

    /**
     * @description 保存用户信息到本地
     * @since Beta v0.3.8
     * @function saveBriefInfo
     * @memberof useUserStore
     * @param {TGApp.App.Account.BriefInfo} info - 用户信息
     * @returns {Promise<void>}
     */
    async function saveBriefInfo(info?: TGApp.App.Account.BriefInfo): Promise<void> {
      if (info) {
        setBriefInfo(info);
        localStorage.setItem("briefInfo", JSON.stringify({ briefInfo: info }));
      }
      await TGSqlite.saveAppData("userInfo", JSON.stringify(briefInfo.value));
    }

    return {
      cookie,
      getBriefInfo,
      setBriefInfo,
      setCurAccount,
      getCurAccount,
      saveCookie,
      saveBriefInfo,
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
