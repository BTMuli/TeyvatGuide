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
        <qrcode-vue
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
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import QrcodeVue from "qrcode.vue";
import { onUnmounted, ref, watch } from "vue";
import passportReq from "@req/passportReq.js";

type ToGameLoginEmits = (e: "success", data: TGApp.App.Account.Cookie) => void;

// eslint-disable-next-line no-undef
let cycleTimer: NodeJS.Timeout | null = null;

const model = defineModel<boolean>({ default: false });
const emits = defineEmits<ToGameLoginEmits>();
const codeGid = ref<number>(7);
const codeUrl = ref<string>();
const codeTicket = ref<string>("");

watch(
  () => model.value,
  async () => {
    if (model.value) {
      await freshQr();
      if (cycleTimer) {
        clearInterval(cycleTimer);
        cycleTimer = null;
      }
      cycleTimer = setInterval(cycleGetDataGame, 1000);
    } else {
      if (cycleTimer) clearInterval(cycleTimer);
      cycleTimer = null;
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
  try {
    resp = await passportReq.qrLogin.create();
    if (resp.retcode !== 0) {
      showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
      return;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`创建二维码失败：${errMsg}`);
    await TGLogger.Error(`[TcoGameLogin][freshQr] 创建二维码异常`);
    await TGLogger.Error(`[TcoGameLogin][freshQr] ${e}`);
    return;
  }
  codeUrl.value = resp.data.url;
  codeTicket.value = resp.data.ticket;
}

async function cycleGetDataGame(): Promise<void> {
  let res: TGApp.BBS.GameLogin.GetLoginStatusResponse | undefined;
  try {
    res = await passportReq.qrLogin.query(codeTicket.value);
    console.log(res);
    if (res.retcode !== 0) {
      showSnackbar.error(`[${res.retcode}] ${res.message}`);
      if (res.retcode === -106) {
        await freshQr();
      } else {
        if (cycleTimer) clearInterval(cycleTimer);
        cycleTimer = null;
        model.value = false;
      }
      return;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取登录状态失败：${errMsg}`);
    await TGLogger.Error(`[TcoGameLogin][cycleGetDataGame] 获取登录状态异常`);
    await TGLogger.Error(`[TcoGameLogin][cycleGetDataGame] ${e}`);
    return;
  }
  if (res.data.status === "Created" || res.data.status === "Scanned") return;
  if (res.data.status === "Confirmed") {
    if (cycleTimer) clearInterval(cycleTimer);
    cycleTimer = null;
    const ck: TGApp.App.Account.Cookie = {
      account_id: res.data.user_info.aid,
      ltuid: res.data.user_info.aid,
      stuid: res.data.user_info.aid,
      mid: res.data.user_info.mid,
      cookie_token: "",
      stoken: res.data.tokens[0].token,
      ltoken: "",
    };
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
