/**
 * 胡桃账号
 * @since Beta v0.10.2
 */

import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import hutao from "@Hutao/index.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { validEmail } from "@utils/toolFunc.js";
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
    /** 上次刷新时间 */
    const lastUts = ref<number>(0);

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
      const inputN = await showDialog.inputF({
        title: "请输入胡桃云账号",
        text: "邮箱:",
        type: "email",
      });
      if (!inputN) {
        showSnackbar.cancel("已取消胡桃云账号输入");
        return;
      }
      if (!validEmail(inputN.trim())) {
        showSnackbar.warn("请输入合法邮箱地址");
        return;
      }
      const inputP = await showDialog.inputF({
        title: "请输入密码",
        text: "密码",
        type: "password",
      });
      if (!inputP) {
        showSnackbar.warn("已取消胡桃云登录");
        return;
      }
      await showLoading.start("正在登录胡桃云", inputN);
      try {
        const resp = await hutao.Account.login(inputN, inputP);
        if (resp.retcode !== 0) {
          showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
          await TGLogger.Warn(`[HutaoStore][tryLogin] 登录失败：${resp.retcode} ${resp.message}`);
          await showLoading.end();
          return;
        }
        if (!resp.data) {
          showSnackbar.error("登录返回数据为空");
          await TGLogger.Error(`[HutaoStore][tryLogin] 登录返回数据为空`);
          await showLoading.end();
          return;
        }
        isLogin.value = true;
        userName.value = inputN;
        accessToken.value = resp.data.AccessToken;
        refreshToken.value = resp.data.RefreshToken;
        accessExpire.value = Date.now() + resp.data.ExpiresIn * 1000;
        showSnackbar.success("成功登录胡桃云");
      } catch (e) {
        const errMsg = TGHttps.getErrMsg(e);
        showSnackbar.error(`登录胡桃云失败：${errMsg}`);
        await TGLogger.Error(`[HutaoStore][tryLogin] 登录异常：${errMsg}`);
      } finally {
        await showLoading.end();
      }
      if (isLogin.value) {
        await tryRefreshInfo();
      }
    }

    async function autoLogin(username: string, pwd: string): Promise<void> {
      await showLoading.start("正在登录胡桃云", username);
      try {
        const resp = await hutao.Account.login(username, pwd);
        if (resp.retcode !== 0) {
          showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
          await TGLogger.Warn(`[HutaoStore][autoLogin] 登录失败：${resp.retcode} ${resp.message}`);
          await showLoading.end();
          return;
        }
        if (!resp.data) {
          showSnackbar.error("登录返回数据为空");
          await TGLogger.Error(`[HutaoStore][autoLogin] 登录返回数据为空`);
          await showLoading.end();
          return;
        }
        isLogin.value = true;
        userName.value = username;
        accessToken.value = resp.data.AccessToken;
        refreshToken.value = resp.data.RefreshToken;
        accessExpire.value = Date.now() + resp.data.ExpiresIn * 1000;
        showSnackbar.success("成功登录胡桃云");
      } catch (e) {
        const errMsg = TGHttps.getErrMsg(e);
        showSnackbar.error(`登录胡桃云失败：${errMsg}`);
        await TGLogger.Error(`[HutaoStore][autoLogin] 登录异常：${errMsg}`);
      } finally {
        await showLoading.end();
      }
      if (isLogin.value) {
        await tryRefreshInfo();
      }
    }

    async function tryRefreshInfo(): Promise<void> {
      await tryRefreshToken();
      if (!isLogin.value) return;
      if (!accessToken.value || accessToken.value === "") {
        showSnackbar.warn("未找到合法的AccessToken");
        return;
      }
      try {
        const resp = await hutao.Account.info(accessToken.value!);
        if (resp.retcode !== 0) {
          showSnackbar.warn(`刷新用户信息失败：${resp.retcode}-${resp.message}`);
          await TGLogger.Warn(
            `[HutaoStore][tryRefreshInfo] 刷新用户信息失败：${resp.retcode} ${resp.message}`,
          );
          return;
        }
        if (!resp.data) {
          showSnackbar.error("刷新用户信息返回数据为空");
          await TGLogger.Error(`[HutaoStore][tryRefreshInfo] 刷新用户信息返回数据为空`);
          return;
        }
        userInfo.value = resp.data;
        showSnackbar.success("成功刷新用户信息");
        lastUts.value = Math.floor(Date.now() / 1000);
      } catch (e) {
        const errMsg = TGHttps.getErrMsg(e);
        showSnackbar.error(`刷新用户信息失败：${errMsg}`);
        await TGLogger.Error(`[HutaoStore][tryRefreshInfo] 刷新用户信息异常：${errMsg}`);
      }
    }

    async function tryRefreshToken(): Promise<void> {
      if (!refreshToken.value || refreshToken.value == "") {
        showSnackbar.warn("未找到胡桃云RefreshToken");
        return;
      }
      if (checkIsValid()) return;
      try {
        const resp = await hutao.Token.refresh(refreshToken.value);
        if (resp.retcode !== 0) {
          await TGLogger.Warn(
            `[HutaoStore][tryRefreshToken] 刷新Token失败：${resp.retcode} ${resp.message}`,
          );
          // 令牌无效或者过期，自动退出账号
          if (resp.retcode === 514002) {
            refreshToken.value = "";
            accessToken.value = "";
            isLogin.value = false;
            showSnackbar.warn(`[${resp.retcode}] ${resp.message}，已自动退出`);
          } else {
            showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
          }
          return;
        }
        if (!resp.data) {
          showSnackbar.error("刷新Token返回数据为空");
          await TGLogger.Error(`[HutaoStore][tryRefreshToken] 刷新Token返回数据为空`);
          return;
        }
        accessToken.value = resp.data.AccessToken;
        refreshToken.value = resp.data.RefreshToken;
        accessExpire.value = Date.now() + resp.data.ExpiresIn * 1000;
        showSnackbar.success("成功刷新胡桃云Token");
      } catch (e) {
        const errMsg = TGHttps.getErrMsg(e);
        showSnackbar.error(`刷新胡桃云Token失败：${errMsg}`);
        await TGLogger.Error(`[HutaoStore][tryRefreshToken] 刷新Token异常：${errMsg}`);
      }
    }

    function checkGachaExpire(): boolean {
      if (!userInfo.value) return true;
      if (userInfo.value.IsMaintainer || userInfo.value.IsLicensedDeveloper) return false;
      const expire = new Date(userInfo.value.GachaLogExpireAt).getTime();
      return Date.now() > expire;
    }

    async function tryAutoRefresh(): Promise<void> {
      if (!isLogin.value) return;
      const nowTs = Math.floor(Date.now() / 1000);
      const diffTime = nowTs - lastUts.value;
      if (diffTime < 60 * 60 * 24 * 3) return;
      try {
        await tryRefreshInfo();
      } catch (e) {
        await TGLogger.Error(`[HutaoStore][tryAutoRefresh]自动刷新异常: ${e}`);
        lastUts.value = Math.floor(Date.now() / 1000);
      }
    }

    return {
      isLogin,
      userName,
      accessToken,
      refreshToken,
      accessExpire,
      userInfo,
      lastUts,
      checkIsValid,
      tryLogin,
      autoLogin,
      tryRefreshToken,
      tryRefreshInfo,
      checkGachaExpire,
      tryAutoRefresh,
    };
  },
  {
    persist: true,
  },
);

export default useHutaoStore;
