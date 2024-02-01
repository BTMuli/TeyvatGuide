<template>
  <TOverlay v-model="visible" hide blur-val="20px" :to-click="onCancel">
    <div class="tog-box">
      <div class="tog-top">
        <div class="tog-title">请使用原神进行扫码操作</div>
        <div class="tog-subtitle">仅支持官服，渠道服请使用网页登录</div>
      </div>
      <div class="tog-mid">
        <qrcode-vue
          class="tog-qr"
          :value="qrCode"
          render-as="svg"
          :background="'var(--box-bg-1)'"
          foreground="var(--box-text-1)"
        />
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import { storeToRefs } from "pinia";
import QrcodeVue from "qrcode.vue";
import { computed, onUnmounted, reactive, ref, watch } from "vue";

import Mys from "../../plugins/Mys";
import { useUserStore } from "../../store/modules/user";
import TGLogger from "../../utils/TGLogger";
import TGRequest from "../../web/request/TGRequest";
import showSnackbar from "../func/snackbar";
import TOverlay from "../main/t-overlay.vue";

interface ToWebLoginProps {
  modelValue: boolean;
}

type ToWebLoginEmits = {
  (e: "update:modelValue", value: boolean): void;
  (e: "success"): void;
};

const props = withDefaults(defineProps<ToWebLoginProps>(), {
  modelValue: false,
});

const emits = defineEmits<ToWebLoginEmits>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});
let cycleTimer: NodeJS.Timeout | null = null;

const qrCode = ref<string>("");
const ticket = ref<string>("");
const cookie = reactive<TGApp.User.Account.Cookie>({
  account_id: "",
  ltuid: "",
  stuid: "",
  mid: "",
  cookie_token: "",
  stoken: "",
  ltoken: "",
});

const userStore = storeToRefs(useUserStore());

watch(visible, async (value) => {
  if (value) {
    await freshQr();
    cycleTimer = setInterval(cycleGetData, 1000);
  }
});

function onCancel(): void {
  visible.value = false;
  showSnackbar({
    text: "已取消登录",
    color: "cancel",
  });
}

async function freshQr(): Promise<void> {
  const res = await Mys.User.getQr();
  if ("retcode" in res) {
    showSnackbar({
      text: `[${res.retcode}] ${res.message}`,
      color: "error",
    });
    return;
  }
  qrCode.value = res.url;
  const ticketReg = /ticket=(\w+)/;
  const ticketRes = ticketReg.exec(res.url);
  if (ticketRes) {
    ticket.value = ticketRes[1];
  } else {
    showSnackbar({
      text: "获取ticket失败",
      color: "error",
    });
  }
}

async function cycleGetData() {
  if (cycleTimer === null) return;
  const res = await Mys.User.getData(ticket.value);
  console.log(res);
  if ("retcode" in res) {
    showSnackbar({
      text: `[${res.retcode}] ${res.message}`,
      color: "error",
    });
    if (res.retcode === -106) {
      await freshQr();
    } else {
      clearInterval(cycleTimer);
      cycleTimer = null;
      visible.value = false;
    }
    return;
  }
  if (res.stat === "Init" || res.stat === "Scanned") {
    return;
  }
  if (res.stat === "Confirmed") {
    clearInterval(cycleTimer);
    cycleTimer = null;
    if (res.payload.proto !== "OpenToken") {
      await TGLogger.Warn(`[to-gameLogin] 检测到非Combo协议：${res.payload.proto}`);
      showSnackbar({
        text: "请使用原神进行扫码操作",
        color: "error",
      });
      visible.value = false;
      return;
    }
    const data: TGApp.Plugins.Mys.GameLogin.StatusPayloadRaw = JSON.parse(res.payload.raw);
    cookie.account_id = data.uid;
    cookie.ltuid = data.uid;
    cookie.stuid = data.uid;
    await getTokens(data.open_token);
    showSnackbar({
      text: "登录成功",
      color: "success",
    });
    visible.value = false;
    setTimeout(() => {
      emits("success");
    }, 1000);
  }
}

async function getTokens(game_token: string): Promise<void> {
  const stokenRes = await TGRequest.User.bgGameToken.getStoken(cookie.account_id, game_token);
  if (!("retcode" in stokenRes)) {
    cookie.stoken = stokenRes.token.token;
    cookie.mid = stokenRes.user_info.mid;
  } else {
    await TGLogger.Error("[to-gameLogin] 获取stoken失败");
  }
  const cookieTokenRes = await TGRequest.User.bgGameToken.getCookieToken(
    cookie.account_id,
    game_token,
  );
  if (typeof cookieTokenRes === "string") cookie.cookie_token = cookieTokenRes;
  else await TGLogger.Error("[to-gameLogin] 获取cookieToken失败");
  const ltokenRes = await TGRequest.User.bySToken.getLToken(cookie.mid, cookie.stoken);
  if (typeof ltokenRes === "string") cookie.ltoken = ltokenRes;
  else await TGLogger.Error("[to-gameLogin] 获取ltoken失败");
  userStore.cookie.value = cookie;
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

.tog-subtitle {
  font-size: 14px;
  opacity: 0.6;
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
