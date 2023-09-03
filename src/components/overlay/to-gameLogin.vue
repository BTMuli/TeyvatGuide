<template>
  <TOverlay v-model="visible" hide blur-val="20px">
    <div class="tog-box">
      <div class="tog-top">
        <div class="tog-title">请使用米游社APP进行扫码操作</div>
        <div class="tog-subtitle">所需米游社版本 >= 2.57.1</div>
      </div>
      <div class="tog-mid">
        <qrcode-vue class="tog-qr" :value="qrCode" render-as="svg" />
      </div>
      <div class="tog-bottom">
        <v-btn class="tog-btn" @click="onCancel">取消</v-btn>
        <v-btn class="tog-btn" @click="freshQr">刷新</v-btn>
        <v-btn class="tog-btn" @click="getData">已扫码</v-btn>
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
// vue
import { computed, onMounted, ref } from "vue";
import showSnackbar from "../func/snackbar";
import TOverlay from "../main/t-overlay.vue";
import QrcodeVue from "qrcode.vue";
// store
import { useUserStore } from "../../store/modules/user";
// utils
import { getLoginQr, getLoginStatus } from "../../plugins/Mys/utils/doGameLogin";

interface ToWebLoginProps {
  modelValue: boolean;
}

type ToWebLoginEmits = (e: "update:modelValue", value: boolean) => void;

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
const qrCode = ref<string>("");
const ticket = ref<string>("");

const userStore = useUserStore();

onMounted(async () => {
  await freshQr();
});

async function freshQr(): Promise<void> {
  const res = await getLoginQr();
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

async function getData(): Promise<void> {
  const res = await getLoginStatus(ticket.value);
  if ("retcode" in res) {
    showSnackbar({
      text: `[${res.retcode}] ${res.message}`,
      color: "error",
    });
  } else if (res.stat === "Init") {
    showSnackbar({
      text: "请先扫码",
      color: "error",
    });
  } else if (res.stat === "Scanned") {
    showSnackbar({
      text: "请在米游社APP上确认登录",
      color: "error",
    });
  } else {
    const data: TGApp.Plugins.Mys.GameLogin.StatusPayloadRaw = JSON.parse(res.payload.raw);
    await userStore.saveCookie("account_id", data.uid);
    await userStore.saveCookie("game_token", data.token);
    showSnackbar({
      text: "登录成功",
      color: "success",
    });
    visible.value = false;
  }
}

function onCancel(): void {
  visible.value = false;
}
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

.tog-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tog-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}
</style>
