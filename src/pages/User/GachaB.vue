<!-- 千星奇域祈愿记录 todo:后续改成正式页面 -->
<template>
  <iframe ref="htmlRef" :src="link" style="width: 100%; height: 100%; border: none" />
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import takumiReq from "@req/takumiReq.js";
import useUserStore from "@store/user.js";
import { storeToRefs } from "pinia";
import { onMounted, ref } from "vue";

const { cookie, account } = storeToRefs(useUserStore());
const authkey = ref<string>("");
const link = ref<string>("");

onMounted(async () => {
  link.value = await getUrl();
});

async function refreshAuthkey(): Promise<void> {
  if (!cookie.value || !account.value) {
    return;
  }
  const authkeyRes = await takumiReq.bind.authKey(cookie.value, account.value);
  if (typeof authkeyRes === "string") {
    authkey.value = authkeyRes;
  } else {
    showSnackbar.error("获取authkey失败");
    return;
  }
}

async function getUrl(): Promise<string> {
  const path = "https://webstatic.mihoyo.com/hk4e/event/e20250716gacha/index.html";
  if (authkey.value === "") await refreshAuthkey();
  const param: Record<string, string> = {
    win_mode: "fullscreen",
    no_joypad_close: "1",
    authkey_ver: "1",
    sign_type: "2",
    auth_appid: "webview_gacha",
    gacha_id: "57016dec6b768231ba1342c01935417a799b",
    timestamp: Math.floor(Date.now() / 1000).toString(),
    lang: "zh-cn",
    device_type: "pc",
    region: account.value.region,
    authkey: authkey.value,
    game_biz: account.value.gameBiz,
  };
  const targetLink = new URL(path);
  for (const key in param) {
    targetLink.searchParams.append(key, param[key]);
  }
  return targetLink.toString();
}
</script>
