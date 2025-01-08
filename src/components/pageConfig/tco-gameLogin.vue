<template>
  <TOverlay v-model="model" hide blur-val="20px">
    <div class="tog-box">
      <div class="tog-top">
        <div class="tog-title">请使用米游社进行扫码操作</div>
      </div>
      <div class="tog-mid">
        <qrcode-vue
          v-if="codeData"
          class="tog-qr"
          :value="codeData.url"
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
import showSnackbar from "@comp/func/snackbar.js";
import QrcodeVue from "qrcode.vue";
import { onUnmounted, shallowRef, watch } from "vue";

import PassportReq from "@/web/request/passportReq.js";

type ToGameLoginEmits = (e: "success", data: TGApp.App.Account.Cookie) => void;

// eslint-disable-next-line no-undef
let cycleTimer: NodeJS.Timeout | null = null;

const model = defineModel<boolean>({ default: false });
const emits = defineEmits<ToGameLoginEmits>();
const codeData = shallowRef<TGApp.BBS.GameLogin.GetLoginQrData>();

watch(model, async (value) => {
  if (value) {
    await freshQr();
    cycleTimer = setInterval(cycleGetData, 1000);
  }
});

async function freshQr(): Promise<void> {
  const res = await PassportReq.qrLogin.create();
  if ("retcode" in res) {
    showSnackbar.error(`[${res.retcode}] ${res.message}`);
    return;
  }
  codeData.value = res;
}

async function cycleGetData() {
  if (cycleTimer === null || !codeData.value) return;
  const res = await PassportReq.qrLogin.query(codeData.value.ticket);
  console.log(res);
  if ("retcode" in res) {
    showSnackbar.error(`[${res.retcode}] ${res.message}`);
    if (res.retcode === -106) {
      await freshQr();
    } else {
      clearInterval(cycleTimer);
      cycleTimer = null;
      model.value = false;
    }
    return;
  }
  if (res.status === "Created" || res.status === "Scanned") return;
  if (res.status === "Confirmed") {
    clearInterval(cycleTimer);
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
