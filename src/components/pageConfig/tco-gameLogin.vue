<!-- 游戏扫码登录浮窗 -->
<template>
  <TOverlay v-model="model" blur-val="20px" hide>
    <div class="tog-box">
      <div class="tog-top">
        <div class="tog-title">请使用米游社进行扫码操作</div>
        <div class="tog-hint">仅用于登录米社账号，与实际游戏账号无关</div>
      </div>
      <div class="tog-divider" />
      <div class="tog-mid">
        <QrcodeVue
          v-if="codeUrl"
          :background="'var(--tgc-white-1)'"
          :foreground="'var(--tgc-dark-7)'"
          :value="codeUrl"
          class="tog-qr"
          render-as="svg"
        />
      </div>
      <div class="tog-bottom" @click="share()">
        <img alt="icon" src="/platforms/mhy/launcher.webp" />
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import passportReq from "@req/passportReq.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import QrcodeVue from "qrcode.vue";
import { onUnmounted, ref, watch } from "vue";

type ToGameLoginEmits = { success: [data: TGApp.App.Account.Cookie] };

// eslint-disable-next-line no-undef
let cycleTimer: NodeJS.Timeout | null = null;

const model = defineModel<boolean>({ default: false });
const emits = defineEmits<ToGameLoginEmits>();
const codeGid = ref<number>(7);
const codeUrl = ref<string>();
const codeTicket = ref<string>("");
let lastLoggedStatus: TGApp.BBS.GameLogin.GetLoginStatusData["status"] | null = null;
let qrLoginActive = false;

watch(
  () => model.value,
  async () => {
    if (model.value) {
      qrLoginActive = true;
      await TGLogger.Info("[用户登录][扫码] 开始扫码登录");
      await freshQr();
      if (cycleTimer) {
        clearInterval(cycleTimer);
        cycleTimer = null;
      }
      cycleTimer = setInterval(cycleGetDataGame, 1000);
    } else {
      if (cycleTimer) clearInterval(cycleTimer);
      cycleTimer = null;
      if (qrLoginActive) {
        await TGLogger.Info("[用户登录][扫码] 扫码登录已取消");
        qrLoginActive = false;
      }
    }
  },
);

watch(
  () => codeGid.value,
  async () => {
    await freshQr();
    if (cycleTimer) clearInterval(cycleTimer);
    cycleTimer = setInterval(cycleGetDataGame, 1000);
  },
);

async function share(): Promise<void> {
  const shareDom = document.querySelector<HTMLDivElement>(".tog-box");
  if (shareDom === null) {
    showSnackbar.error("分享失败");
    return;
  }
  await generateShareImg(`tco-gameLogin`, shareDom);
}

async function freshQr(): Promise<void> {
  let resp: TGApp.BBS.GameLogin.GetLoginQrResponse | undefined;
  lastLoggedStatus = null;
  await TGLogger.Info("[用户登录][扫码][freshQr] 开始获取二维码");
  try {
    resp = await passportReq.qrLogin.create();
    if (resp.retcode !== 0) {
      showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
      await TGLogger.Warn(`[用户登录][扫码][freshQr] 获取二维码失败，retcode=${resp.retcode}`);
      return;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`创建二维码失败：${errMsg}`);
    await TGLogger.Error("[用户登录][扫码][freshQr] 创建二维码异常");
    return;
  }
  codeUrl.value = resp.data.url;
  codeTicket.value = resp.data.ticket;
  await TGLogger.Info("[用户登录][扫码][freshQr] 获取二维码成功");
}

async function cycleGetDataGame(): Promise<void> {
  let res: TGApp.BBS.GameLogin.GetLoginStatusResponse | undefined;
  try {
    res = await passportReq.qrLogin.query(codeTicket.value);
    if (res.retcode !== 0) {
      showSnackbar.error(`[${res.retcode}] ${res.message}`);
      if (res.retcode === -106) {
        await TGLogger.Warn("[用户登录][扫码][query] 二维码已过期，重新获取");
        await freshQr();
      } else {
        await TGLogger.Warn(`[用户登录][扫码][query] 获取登录状态失败，retcode=${res.retcode}`);
        if (cycleTimer) clearInterval(cycleTimer);
        cycleTimer = null;
        qrLoginActive = false;
        model.value = false;
      }
      return;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取登录状态失败：${errMsg}`);
    await TGLogger.Error("[用户登录][扫码][query] 获取登录状态异常");
    return;
  }
  if (res.data.status !== lastLoggedStatus) {
    await TGLogger.Info(`[用户登录][扫码][query] 登录状态变更：${res.data.status}`);
    lastLoggedStatus = res.data.status;
  }
  if (res.data.status === "Created" || res.data.status === "Scanned") return;
  if (res.data.status === "Confirmed") {
    if (cycleTimer) clearInterval(cycleTimer);
    cycleTimer = null;
    const token = res.data.tokens?.[0]?.token;
    const userInfo = res.data.user_info;
    if (!token || !userInfo?.aid || !userInfo.mid) {
      await TGLogger.Error("[用户登录][扫码][token] 登录凭证交换失败：响应数据不完整");
      qrLoginActive = false;
      model.value = false;
      return;
    }
    const ck: TGApp.App.Account.Cookie = {
      account_id: userInfo.aid,
      ltuid: userInfo.aid,
      stuid: userInfo.aid,
      mid: userInfo.mid,
      cookie_token: "",
      stoken: token,
      ltoken: "",
    };
    await TGLogger.Info("[用户登录][扫码][token] 登录凭证交换成功");
    qrLoginActive = false;
    emits("success", ck);
    model.value = false;
  }
}

onUnmounted(() => {
  if (cycleTimer !== null) clearInterval(cycleTimer);
  cycleTimer = null;
});
</script>
<style lang="scss" scoped>
.tog-box {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-radius: 5px;
  background-color: var(--box-bg-1);
  color: var(--app-page-content);
  gap: 10px;
}

.tog-top {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  row-gap: 4px;
  text-align: center;
}

.tog-title {
  color: var(--common-text-title);
  font-size: 20px;
}

.tog-hint {
  color: var(--tgc-od-red);
  font-size: 14px;
}

.tog-divider {
  width: 100%;
  height: 1px;
  background-color: var(--common-shadow-2);
}

.tog-mid {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 5px;
  aspect-ratio: 1;
  background: var(--tgc-white-1);
}

.tog-qr {
  width: 256px;
  height: 256px;
}

.tog-bottom {
  margin: 0 auto;
  cursor: pointer;

  img {
    width: 32px;
    height: 32px;
    border-radius: 4px;
  }
}
</style>
