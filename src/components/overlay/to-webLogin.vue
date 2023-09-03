<template>
  <TOverlay v-model="visible" hide blur-val="20px">
    <div class="tow-box">
      <div class="tow-top">
        <div class="tow-title">请使用米游社APP进行扫码操作</div>
        <div class="tow-subtitle">所需米游社版本 >= 2.57.1</div>
      </div>
      <div class="tow-mid">
        <qrcode-vue class="tow-qr" :value="qrCode" render-as="svg" />
      </div>
      <div class="tow-bottom">
        <v-btn class="tow-btn" @click="onCancel">取消</v-btn>
        <v-btn class="tow-btn" @click="freshQr">刷新</v-btn>
        <v-btn class="tow-btn" @click="getData">已扫码</v-btn>
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
// utils
import { getLoginQr, getLoginStatus } from "../../plugins/Mys/utils/doWebLogin";

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
  ticket.value = res.ticket;
  qrCode.value = res.url;
}

async function getData(): Promise<void> {
  const res = await getLoginStatus(ticket.value);
  if ("retcode" in res) {
    showSnackbar({
      text: `[${res.retcode}] ${res.message}`,
      color: "error",
    });
    return;
  }
  // todo 后续处理
  console.log(res);
}

function onCancel(): void {
  visible.value = false;
}
</script>
<style lang="css" scoped>
.tow-box {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-radius: 5px;
  background-color: var(--box-bg-1);
  color: var(--app-page-content);
  gap: 10px;
}

.tow-top {
  border-bottom: 1px solid var(--common-shadow-4);
  font-family: var(--font-title);
  text-align: center;
}

.tow-title {
  color: var(--common-text-title);
  font-size: 20px;
}

.tow-subtitle {
  font-size: 14px;
  opacity: 0.6;
}

.tow-mid {
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

.tow-qr {
  width: 256px;
  height: 256px;
}

.tow-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tow-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}
</style>
