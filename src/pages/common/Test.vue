<template>
  <div class="test-box">
    <h1>颜色测试</h1>
    <div class="test-item">
      <div class="test-1">
        Box 1
        <div class="test-2">
          Box 2
          <div class="test-3">
            Box 3
            <div class="test-4">Box 4</div>
          </div>
        </div>
      </div>
    </div>
    <h1>验证码登录测试</h1>
    <div class="test-item">
      <div class="btn-list">
        <button class="test-btn" @click="tryCaptchaLogin()">获取验证码</button>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showConfirm from "../../components/func/confirm.js";
import showGeetest from "../../components/func/geetest.js";
import showSnackbar from "../../components/func/snackbar.js";
import Mys from "../../plugins/Mys/index.js";

async function tryCaptchaLogin(): Promise<void> {
  const phone = await showConfirm({
    mode: "input",
    title: "请输入手机号",
    text: "+86",
  });
  if (!phone) return;
  const action_type = await tryGetCaptcha(phone);
  if (!action_type) return;
  const captcha = await showConfirm({
    mode: "input",
    title: "请输入验证码",
    text: "验证码：",
  });
  if (!captcha) return;
  const loginResp = await Mys.User.login(phone, captcha, action_type);
  console.log("[loginResp]", loginResp);
}

async function tryGetCaptcha(phone: string, aigis?: string): Promise<string | false> {
  const captchaResp = await Mys.User.getCaptcha(phone, aigis);
  console.log("[captchaResp]", captchaResp);
  if ("retcode" in captchaResp) {
    if (!captchaResp.data || captchaResp.data === "") {
      showSnackbar({
        text: `[${captchaResp.retcode}] ${captchaResp.message}`,
        color: "error",
      });
      return false;
    }
    const aigis: TGApp.Plugins.Mys.CaptchaLogin.CaptchaAigis = JSON.parse(captchaResp.data);
    const resp = await showGeetest(aigis.data);
    const aigisStr = btoa(`${aigis.session_id};${JSON.stringify(resp)}`);
    return await tryGetCaptcha(phone, aigisStr);
  }
  return captchaResp.action_type;
}
</script>
<style lang="css" scoped>
.test-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.test-item {
  padding: 10px;
  border-radius: 5px;
}

.btn-list {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 20px;
  gap: 10px;
}

.test-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 5px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.test-1,
.test-2,
.test-3,
.test-4 {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 5px;
}

.test-1 {
  background: var(--box-bg-1);
}

.test-2 {
  background: var(--box-bg-2);
}

.test-3 {
  background: var(--box-bg-3);
}

.test-4 {
  background: var(--box-bg-4);
}
</style>
