/**
 * 胡桃账号
 * @since Beta v0.9.1
 */

import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import hutao from "@Hutao/index.js";
import { defineStore } from "pinia";
import { ref } from "vue";

const useHutaoStore = defineStore(
  "hutao",
  () => {
    /** 是否登录 */
    const isLogin = ref<boolean>(false);
    /** 账号 */
    const userName = ref<string>();
    /** token */
    const accessToken = ref<string>();
    /** refresh */
    const refreshToken = ref<string>();
    /** 超时时间 */
    const accessExpire = ref<number>(0);
    /** 用户信息 */
    const userInfo = ref<TGApp.Plugins.Hutao.Account.InfoRes>();

    /**
     * 检测是否超时
     */
    function checkIsValid(): boolean {
      if (accessExpire.value === 0 || !refreshToken.value || refreshToken.value === "") {
        return false;
      }
      return Date.now() < accessExpire.value;
    }

    async function tryLogin(): Promise<void> {
      const inputN = await showDialog.input("请输入胡桃云账号", "邮箱：");
      if (!inputN) {
        showSnackbar.cancel("已取消胡桃云账号输入");
        return;
      }
      const mailReg = /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/;
      if (!mailReg.test(inputN.trim())) {
        showSnackbar.warn("请输入合法邮箱地址");
        return;
      }
      const inputP = await showDialog.input("请输入密码", "密码");
      if (!inputP) {
        showSnackbar.warn("已取消胡桃云登录");
        return;
      }
      await showLoading.start("正在登录胡桃云", inputN);
      try {
        const resp = await hutao.Account.login(inputN, inputP);
        if ("retcode" in resp) {
          showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
          console.error(resp);
          await showLoading.end();
          return;
        }
        isLogin.value = true;
        userName.value = inputN;
        accessToken.value = resp.AccessToken;
        refreshToken.value = resp.RefreshToken;
        accessExpire.value = Date.now() + resp.ExpiresIn * 1000;
        showSnackbar.success("成功登录胡桃云");
      } catch (err) {
        console.error(err);
        showSnackbar.error("登录胡桃云失败");
      } finally {
        await showLoading.end();
      }
      if (isLogin.value) {
        await tryRefreshInfo();
      }
    }

    async function tryRefreshInfo(): Promise<void> {
      await tryRefreshToken();
      const resp = await hutao.Account.info(accessToken.value!);
      if ("retcode" in resp) {
        showSnackbar.warn(`刷新用户信息失败：${resp.retcode}-${resp.message}`);
        return;
      }
      userInfo.value = resp;
      showSnackbar.success("成功刷新用户信息");
    }

    async function tryRefreshToken(): Promise<void> {
      if (!refreshToken.value || refreshToken.value == "") {
        showSnackbar.warn("未找到胡桃云RefreshToken");
        return;
      }
      if (checkIsValid()) return;
      try {
        const resp = await hutao.Token.refresh(refreshToken.value);
        if ("retcode" in resp) {
          showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
          console.error(resp);
          return;
        }
        accessToken.value = resp.AccessToken;
        refreshToken.value = resp.RefreshToken;
        accessExpire.value = Date.now() + resp.ExpiresIn * 1000;
        showSnackbar.success("成功刷新胡桃云Token");
      } catch (e) {
        console.error(e);
        showSnackbar.error("刷新胡桃云Token失败");
      }
    }

    function checkGachaExpire(): boolean {
      if (!userInfo.value) return true;
      if (userInfo.value.IsMaintainer || userInfo.value.IsLicensedDeveloper) return false;
      const expire = new Date(userInfo.value.GachaLogExpireAt).getTime();
      return Date.now() < expire;
    }

    return {
      isLogin,
      userName,
      accessToken,
      refreshToken,
      accessExpire,
      userInfo,
      checkIsValid,
      tryLogin,
      tryRefreshToken,
      tryRefreshInfo,
      checkGachaExpire,
    };
  },
  {
    persist: true,
  },
);

export default useHutaoStore;
