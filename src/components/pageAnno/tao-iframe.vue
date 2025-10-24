<!-- 游戏内公告浮窗 -->
<template>
  <TOverlay v-model="visible">
    <div class="tao-iframe-box">
      <!-- TODO:加载完成后修改样式 -->
      <iframe :src="link" class="tao-iframe" />
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import takumiReq from "@req/takumiReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, watch } from "vue";

const { lang } = storeToRefs(useAppStore());
const { cookie, account } = storeToRefs(useUserStore());
const visible = defineModel<boolean>();

const authkey = ref<string>("");
const link = ref<string>("");

onMounted(async () => await refreshUrl());

watch(
  () => lang.value,
  async () => {
    if (!visible.value) return;
    await refreshUrl();
  },
);

async function refreshUrl(): Promise<void> {
  const res = await getUrl();
  if (res === "") return;
  link.value = res;
}

async function refreshAuthkey(): Promise<void> {
  if (!cookie.value || !account.value) {
    visible.value = false;
    showSnackbar.warn("请先登录账号");
    return;
  }
  const authkeyRes = await takumiReq.bind.authKey(cookie.value, account.value);
  if (typeof authkeyRes === "string") {
    authkey.value = authkeyRes;
  } else {
    showSnackbar.error("获取authkey失败");
    visible.value = false;
    return;
  }
}

async function getUrl(): Promise<string> {
  const path = "https://sdk.mihoyo.com/hk4e/announcement/index.html";
  if (authkey.value === "") {
    await refreshAuthkey();
  }
  if (!visible.value) return "";
  const param: Record<string, string> = {
    auth_appid: "announcement",
    authkey_ver: "1",
    bundle_id: "hk4e_cn",
    channel_id: "14",
    game: "hk4e",
    game_biz: account.value.gameBiz,
    lang: lang.value,
    level: account.value.level,
    platform: "pc",
    region: account.value.region,
    sdk_presentation_style: "fullscreen",
    sdk_screen_transparent: "true",
    sign_type: "2",
    uid: account.value.gameUid,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    authkey: authkey.value,
  };
  const targetLink = new URL(path);
  for (const key in param) {
    targetLink.searchParams.append(key, param[key]);
  }
  return targetLink.toString();
}
</script>
<style lang="scss" scoped>
.tao-iframe-box {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 50vw;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  aspect-ratio: 16/9;
}

.tao-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background-color: transparent;
}
</style>
