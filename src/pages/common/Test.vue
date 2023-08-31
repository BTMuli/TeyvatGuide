<template>
  <div>
    <h1>Test</h1>
    <div class="btn-list">
      <v-btn @click="renderQr">渲染二维码</v-btn>
      <v-btn @click="getData">获取数据</v-btn>
    </div>
    <div class="qr-container">
      <qrcode-vue :value="content" :size="size" level="H" render-as="svg" />
    </div>
  </div>
</template>
<script lang="ts" setup>
// vue
import { ref } from "vue";
import QrcodeVue from "qrcode.vue";
import showSnackbar from "../../components/func/snackbar";
// utils
import { getLoginQr, getLoginStatus } from "../../plugins/Mys/utils/doWebLogin";

const content = ref<string>("qrcode");
const size = ref<number>(300);
const ticket = ref<string>("");

async function renderQr(): Promise<void> {
  const res = await getLoginQr();
  if ("retcode" in res) {
    showSnackbar({
      text: `[${res.retcode}] ${res.message}`,
      color: "error",
    });
    return;
  }
  ticket.value = res.ticket;
  content.value = res.url;
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
  console.log(res);
}
</script>
<style lang="css" scoped>
.btn-list {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 20px;
  gap: 10px;
}
</style>
