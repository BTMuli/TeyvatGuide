<template>
  <TOverlay v-model="model" hide blur-val="20px">
    <div class="tog-box">
      <div class="tog-top">
        <div class="tog-title">请使用米游社进行扫码操作</div>
      </div>
      <div class="tog-mid">
        <qrcode-vue
          v-if="codeUrl"
          class="tog-qr"
          :value="codeUrl"
          render-as="svg"
          :background="'var(--box-bg-1)'"
          foreground="var(--box-text-1)"
        />
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import TOverlay from "@comp/app/t-overlay.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import QrcodeVue from "qrcode.vue";
import { computed, onUnmounted, ref, watch } from "vue";

import hk4eReq from "@/web/request/hk4eReq.js";
import PassportReq from "@/web/request/passportReq.js";
import takumiReq from "@/web/request/takumiReq.js";

type ToGameLoginEmits = (e: "success", data: TGApp.App.Account.Cookie) => void;

// eslint-disable-next-line no-undef
let cycleTimer: NodeJS.Timeout | null = null;

const model = defineModel<boolean>({ default: false });
const isLauncherCode = defineModel<boolean>("launcher", { default: false });
const emits = defineEmits<ToGameLoginEmits>();
const codeUrl = ref<string>();
const codeTicket = computed<string>(() => {
  if (!codeUrl.value) return "";
  const url = new URL(codeUrl.value);
  return url.searchParams.get("ticket") || "";
});

watch(model, async (value) => {
  if (value) {
    await freshQr();
    cycleTimer = setInterval(cycleGetData, 1000);
  }
});

async function freshQr(): Promise<void> {
  let res;
  if (isLauncherCode.value) res = await PassportReq.qrLogin.create();
  else res = await hk4eReq.loginQr.create();
  console.log(res);
  if ("retcode" in res) {
    showSnackbar.error(`[${res.retcode}] ${res.message}`);
    return;
  }
  codeUrl.value = res.url;
}

async function cycleGetData() {
  if (cycleTimer === null || codeTicket.value === "") return;
  if (isLauncherCode.value) await cycleGetDataLauncher(cycleTimer);
  else await cycleGetDataGame(cycleTimer);
}

// eslint-disable-next-line no-undef
async function cycleGetDataLauncher(timer: NodeJS.Timeout): Promise<void> {
  const res = await PassportReq.qrLogin.query(codeTicket.value);
  console.log(res);
  if ("retcode" in res) {
    showSnackbar.error(`[${res.retcode}] ${res.message}`);
    if (res.retcode === -106) {
      await freshQr();
    } else {
      clearInterval(timer);
      cycleTimer = null;
      model.value = false;
    }
    return;
  }
  if (res.status === "Created" || res.status === "Scanned") return;
  if (res.status === "Confirmed") {
    clearInterval(timer);
    cycleTimer = null;
    const ck: TGApp.App.Account.Cookie = {
      account_id: res.user_info.aid,
      ltuid: res.user_info.aid,
      stuid: res.user_info.aid,
      mid: res.user_info.mid,
      cookie_token: "",
      stoken: res.tokens[0].token,
      ltoken: "",
    };
    emits("success", ck);
    model.value = false;
  }
}

// eslint-disable-next-line no-undef
async function cycleGetDataGame(timer: NodeJS.Timeout): Promise<void> {
  const res = await hk4eReq.loginQr.state(codeTicket.value);
  console.log(res);
  if ("retcode" in res) {
    showSnackbar.error(`[${res.retcode}] ${res.message}`);
    if (res.retcode === -106) {
      await freshQr();
    } else {
      clearInterval(timer);
      cycleTimer = null;
      model.value = false;
    }
    return;
  }
  if (res.stat === "Init" || res.stat === "Scanned") return;
  if (res.stat === "Confirmed") {
    clearInterval(timer);
    cycleTimer = null;
    if (res.payload.proto === "Raw") {
      showSnackbar.error(`返回数据异常：${res.payload}`);
      model.value = false;
      return;
    }
    const statusRaw: TGApp.Game.Login.StatusPayloadRaw = JSON.parse(res.payload.raw);
    await showLoading.start("正在获取SToken");
    const stResp = await takumiReq.game.stoken(statusRaw);
    console.log(stResp);
    await showLoading.end();
    if ("retcode" in stResp) {
      showSnackbar.error(`[${stResp.retcode}] ${stResp.message}`);
      model.value = false;
      return;
    }
    // const ck: TGApp.App.Account.Cookie = {
    //   account_id: statusRaw.uid,
    //   ltuid: statusRaw.uid,
    //   stuid: statusRaw.uid,
    //   mid: res.user_info.mid,
    //   cookie_token: "",
    //   stoken: res.tokens[0].token,
    //   ltoken: "",
    // };
    // emits("success", ck);
    model.value = false;
  }
}

onUnmounted(() => {
  if (cycleTimer !== null) clearInterval(cycleTimer);
  cycleTimer = null;
});
</script>
<style lang="css" scoped>
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
  border-bottom: 1px solid var(--common-shadow-4);
  font-family: var(--font-title);
  text-align: center;
}

.tog-title {
  color: var(--common-text-title);
  font-size: 20px;
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
  background: var(--box-bg-2);
}

.tog-qr {
  width: 256px;
  height: 256px;
}
</style>
