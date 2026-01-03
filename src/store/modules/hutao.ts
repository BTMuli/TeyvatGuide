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
    /** 账号 */
    const userName = ref<string>();
    /** token */
    const accessToken = ref<string>();
    /** refresh */
    const refreshToken = ref<string>();
    /** 超时时间 */
    const accessExpire = ref<number>(0);

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
        userName.value = inputN;
        accessToken.value = resp.AccessToken;
        refreshToken.value = resp.RefreshToken;
        // TODO: 判断返回单位处理expire
        // accessExpire.value = Date.now();
      } catch (err) {
        console.error(err);
        showSnackbar.error("登录胡桃云失败");
      } finally {
        await showLoading.end();
      }
    }

    return {
      userName,
      accessToken,
      refreshToken,
      accessExpire,
      tryLogin,
    };
  },
  {
    persist: true,
  },
);

export default useHutaoStore;
