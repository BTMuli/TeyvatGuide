<!-- 游戏内公告浮窗 -->
<template>
  <TOverlay v-model="visible">
    <div class="tao-iframe-box">
      <!-- TODO:加载完成后修改样式 -->
      <iframe ref="annoIframe" :src="link" class="tao-iframe" @load="handleIframeLoad" />
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import takumiReq from "@req/takumiReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { event } from "@tauri-apps/api";
import type { Event, UnlistenFn } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { parseLink, parsePost } from "@utils/linkParser.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { createPost } from "@utils/TGWindow.js";
import { storeToRefs } from "pinia";
import { onMounted, onUnmounted, ref, useTemplateRef, watch } from "vue";

const { lang } = storeToRefs(useAppStore());
const { cookie, account } = storeToRefs(useUserStore());
const visible = defineModel<boolean>();

const authkey = ref<string>("");
const link = ref<string>("");
const closeArmed = ref<boolean>(false);
const annoIframe = useTemplateRef<HTMLIFrameElement>("annoIframe");
let uniwebviewListener: UnlistenFn | null = null;

onMounted(async () => {
  window.addEventListener("blur", handleWindowBlur);
  uniwebviewListener = await event.listen<string>("uniwebview_scheme", handleUniwebviewScheme);
  await refreshUrl();
});

onUnmounted(() => {
  window.removeEventListener("blur", handleWindowBlur);
  if (uniwebviewListener !== null) {
    uniwebviewListener();
    uniwebviewListener = null;
  }
});

watch(
  () => lang.value,
  async () => {
    if (!visible.value) return;
    await refreshUrl();
  },
);

watch(
  () => visible.value,
  () => {
    closeArmed.value = false;
  },
);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function armCloseIfIframeFocused(): void {
  if (visible.value !== true) return;
  const iframe = annoIframe.value;
  if (iframe === null || iframe === undefined) return;
  if (document.activeElement === iframe) closeArmed.value = true;
}

function handleWindowBlur(): void {
  window.requestAnimationFrame(() => {
    armCloseIfIframeFocused();
  });
}

function handleIframeLoad(): void {
  closeArmed.value = false;
}

function getUniwebviewHost(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    const match = /^uniwebview:\/\/([^/?#]+)/i.exec(url.trim());
    if (match === null) return "";
    return match[1].toLowerCase();
  }
}

function isUniwebviewClose(url: string): boolean {
  const host = getUniwebviewHost(url);
  return host === "remove_close" || host === "close";
}

function isUniwebviewOpen(url: string): boolean {
  const host = getUniwebviewHost(url);
  return host === "open_url" || host === "load_url";
}

async function openParsedLink(link: string): Promise<void> {
  const isPost = await parsePost(link);
  if (isPost !== false) {
    await createPost(isPost);
    await TGLogger.Info(`[TaoIframe] 打开帖子：${isPost}`);
    return;
  }
  const res = await parseLink(link);
  if (res === true) {
    await TGLogger.Info(`[TaoIframe] 已处理链接：${link}`);
    return;
  }
  if (res === false) {
    showSnackbar.error(`未知链接:${link}`, 3000);
    await TGLogger.Warn(`[TaoIframe] 未知链接：${link}`);
    return;
  }
  if (res === "post") {
    const postId = await parsePost(link);
    if (postId !== false) await createPost(postId);
    return;
  }
  await openUrl(res);
  await TGLogger.Info(`[TaoIframe] 打开链接：${res}`);
}

async function handleUniwebviewScheme(e: Event<string>): Promise<void> {
  const url = e.payload;
  if (isUniwebviewClose(url)) {
    armCloseIfIframeFocused();
    if (closeArmed.value !== true) {
      await delay(0);
      armCloseIfIframeFocused();
    }
    if (uniwebviewListener === null) return;
    if (visible.value !== true || closeArmed.value !== true) {
      await TGLogger.Info(`[TaoIframe] 忽略公告自动关闭：${url}`);
      return;
    }
    await TGLogger.Info(`[TaoIframe] 关闭游戏内公告：${url}`);
    visible.value = false;
    return;
  }
  if (isUniwebviewOpen(url)) {
    if (visible.value !== true) {
      await TGLogger.Info(`[TaoIframe] 忽略未显示时的 uniwebview 打开：${url}`);
      return;
    }
    await openParsedLink(url);
    return;
  }
  await TGLogger.Info(`[TaoIframe] 忽略 uniwebview：${url}`);
}

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
  let authkeyRes: TGApp.Game.Gacha.AuthKeyResp | undefined;
  try {
    authkeyRes = await takumiReq.bind.authKey(cookie.value, account.value);
    if (authkeyRes.retcode !== 0) {
      showSnackbar.error(`获取authkey失败：[${authkeyRes.retcode}] ${authkeyRes.message}`);
      await TGLogger.Warn(
        `[TaoIframe] 获取authkey失败：[${authkeyRes.retcode}] ${authkeyRes.message}`,
      );
      visible.value = false;
      return;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取authkey失败：${errMsg}`);
    await TGLogger.Error(`[TaoIframe] 获取authkey异常`);
    await TGLogger.Error(`[TaoIframe] ${e}`);
    visible.value = false;
    return;
  }
  authkey.value = authkeyRes.data.authkey;
}

async function getUrl(): Promise<string> {
  const path = "https://sdk.mihoyo.com/hk4e/announcement/index.html";
  if (authkey.value === "") await refreshAuthkey();
  if (authkey.value === "") return "";
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
