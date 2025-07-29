<template>
  <TOverlay v-model="model" hide blur-val="20px">
    <div class="tog-box">
      <div class="tog-top">
        <div class="tog-title">请使用米游社进行扫码操作</div>
        <div class="tog-select" v-if="!isLauncherCode">
          <div
            class="tog-select-item"
            v-for="item in selects"
            :key="item.value"
            :class="{ active: codeGid === item.value }"
            @click="codeGid = item.value"
            :title="item.title"
          >
            <img :src="item.icon" alt="icon" />
          </div>
        </div>
      </div>
      <div class="tog-divider" />
      <div class="tog-mid">
        <qrcode-vue
          v-if="codeUrl"
          class="tog-qr"
          :value="codeUrl"
          render-as="svg"
          :background="'var(--tgc-white-1)'"
          :foreground="'var(--tgc-dark-7)'"
        />
      </div>
      <div class="tog-bottom" @click="share()">
        <img src="/platforms/mhy/launcher.webp" alt="icon" v-if="isLauncherCode" />
        <img src="/platforms/mhy/mys.webp" alt="icon" v-else />
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import TOverlay from "@comp/app/t-overlay.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import hk4eReq from "@req/hk4eReq.js";
import PassportReq from "@req/passportReq.js";
import passportReq from "@req/passportReq.js";
import takumiReq from "@req/takumiReq.js";
import { generateShareImg } from "@utils/TGShare.js";
import QrcodeVue from "qrcode.vue";
import { onUnmounted, ref, watch } from "vue";

type ToGameLoginEmits = (e: "success", data: TGApp.App.Account.Cookie) => void;
type ToGameLoginSelect = { title: string; value: number; icon: string };

const selects: Array<ToGameLoginSelect> = [
  {
    title: "未定事件簿",
    value: 2,
    icon: "/platforms/mhy/wd.webp",
  },
  {
    title: "崩坏学园2",
    value: 7,
    icon: "/platforms/mhy/bh2.webp",
  },
  // {
  //   title: "星布谷地",
  //   value: 13,
  //   icon: "/platforms/mhy/xbgd.webp",
  // },
];

// eslint-disable-next-line no-undef
let cycleTimer: NodeJS.Timeout | null = null;

const model = defineModel<boolean>({ default: false });
const isLauncherCode = defineModel<boolean>("launcher", { default: true });
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
      if (isLauncherCode.value) cycleTimer = setInterval(cycleGetDataLauncher, 1000);
      else cycleTimer = setInterval(cycleGetDataGame, 1000);
    } else {
      if (cycleTimer) clearInterval(cycleTimer);
      cycleTimer = null;
    }
  },
);

watch(
  () => codeGid.value,
  async () => {
    if (isLauncherCode.value) return;
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
  if (isLauncherCode.value) {
    const resp = await passportReq.qrLogin.create();
    if ("retcode" in resp) {
      showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
      return;
    }
    codeUrl.value = resp.url;
    codeTicket.value = resp.ticket;
    return;
  }
  const resp = await hk4eReq.loginQr.create(codeGid.value);
  if ("retcode" in resp) {
    showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
    return;
  }
  codeUrl.value = resp.url;
  codeTicket.value = new URL(codeUrl.value).searchParams.get("ticket") || "";
}

async function cycleGetDataLauncher(): Promise<void> {
  const res = await PassportReq.qrLogin.query(codeTicket.value);
  console.log(res);
  if ("retcode" in res) {
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
  if (res.status === "Created" || res.status === "Scanned") return;
  if (res.status === "Confirmed") {
    if (cycleTimer) clearInterval(cycleTimer);
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

async function cycleGetDataGame(): Promise<void> {
  const res = await hk4eReq.loginQr.state(codeTicket.value, codeGid.value);
  console.log(res);
  if ("retcode" in res) {
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
  if (res.stat === "Init" || res.stat === "Scanned") return;
  if (res.stat === "Confirmed") {
    if (cycleTimer) clearInterval(cycleTimer);
    cycleTimer = null;
    if (res.payload.proto === "Raw") {
      showSnackbar.error(`返回数据异常：${res.payload}`);
      model.value = false;
      return;
    }
    const statusRaw: TGApp.Game.Login.StatusPayloadRaw = JSON.parse(res.payload.raw);
    await showLoading.start("正在获取SToken");
    const stResp = await takumiReq.game.stoken(statusRaw);
    await showLoading.end();
    if ("retcode" in stResp) {
      showSnackbar.error(`[${stResp.retcode}] ${stResp.message}`);
      model.value = false;
      return;
    }
    const ck: TGApp.App.Account.Cookie = {
      account_id: statusRaw.uid,
      ltuid: statusRaw.uid,
      stuid: statusRaw.uid,
      mid: stResp.user_info.mid,
      cookie_token: "",
      stoken: stResp.token.token,
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

.tog-select {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
}

.tog-select-item {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.6;

  &.active {
    border: 2px solid var(--tgc-od-orange);
    cursor: default;
    opacity: 1;
  }

  img {
    width: 100%;
    height: 100%;
    border-radius: 4px;
    object-fit: contain;
  }
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
