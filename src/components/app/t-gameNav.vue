<template>
  <div class="tgn-container">
    <div v-for="navItem in nav" :key="navItem.id" class="tgn-nav" @click="toNav(navItem)">
      <TMiImg alt="navIcon" :src="navItem.icon" :ori="true" />
      <span>{{ navItem.name }}</span>
    </div>
    <div v-if="hasNav" class="tgn-nav">
      <v-icon size="25" @click="tryGetCode" title="查看兑换码">mdi-code-tags-check</v-icon>
    </div>
    <ToLivecode v-model="showOverlay" :data="codeData" v-model:actId="actId" />
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import { emit } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, shallowRef, watch } from "vue";

import ToLivecode from "./to-livecode.vue";

import { useAppStore } from "@/store/modules/app.js";
import TGClient from "@/utils/TGClient.js";
import TGLogger from "@/utils/TGLogger.js";
import { createPost } from "@/utils/TGWindow.js";
import ApiHubReq from "@/web/request/apiHubReq.js";
import OtherApi from "@/web/request/otherReq.js";

type TGameNavProps = { modelValue: number };
const props = withDefaults(defineProps<TGameNavProps>(), { modelValue: 2 });

const { isLogin } = storeToRefs(useAppStore());
const nav = shallowRef<TGApp.BBS.Navigator.Navigator[]>([]);
const codeData = shallowRef<TGApp.BBS.Navigator.CodeData[]>([]);
const showOverlay = ref<boolean>(false);
const actId = ref<string>();

const hasNav = computed<TGApp.BBS.Navigator.Navigator | undefined>(() => {
  const liveNames = ["前瞻直播", "前瞻节目", "直播兑换码"];
  return nav.value.find((item) => liveNames.includes(item.name));
});

onMounted(async () => await loadNav());

watch(
  () => props.modelValue,
  async () => await loadNav(),
);

async function loadNav(): Promise<void> {
  nav.value = await ApiHubReq.home(props.modelValue);
}

async function tryGetCode(): Promise<void> {
  if (!hasNav.value) return;
  const actIdFind = new URL(hasNav.value.app_path).searchParams.get("act_id");
  if (!actIdFind) {
    showSnackbar.warn("未找到活动ID");
    return;
  }
  actId.value = actIdFind;
  const res = await OtherApi.code(actIdFind);
  if (!Array.isArray(res)) {
    showSnackbar.warn(`[${res.retcode}] ${res.message}`);
    return;
  }
  codeData.value = res;
  showSnackbar.success("获取兑换码成功");
  await TGLogger.Info(JSON.stringify(res));
  showOverlay.value = true;
}

async function toNav(item: TGApp.BBS.Navigator.Navigator): Promise<void> {
  if (!isLogin.value) {
    showSnackbar.warn("请先登录");
    return;
  }
  await TGLogger.Info(`[TGameNav][toNav] 打开网页活动 ${item.name}`);
  await TGLogger.Info(`[TGameNav][toNav] ${item.app_path}`);
  const link = new URL(item.app_path);
  const mysList = [
    "https://ys.mihoyo.com",
    "https://act.mihoyo.com",
    "https://webstatic.mihoyo.com",
    "https://bbs.mihoyo.com",
    "https://qaa.miyoushe.com",
    "https://mhyurl.cn",
  ];
  if (link.protocol != "https:") {
    await toBBS(link);
    return;
  }
  // 如果不在上面的域名里面，就直接打开
  if (!mysList.includes(link.origin)) {
    await openUrl(item.app_path);
    return;
  }
  if (item.name === "签到福利" || item.name === "每日签到") {
    await TGClient.open("web_act_thin", item.app_path);
    return;
  }
  const modeCheck = await showDialog.check("是否采用宽屏模式打开？", "取消则采用竖屏模式打开");
  if (modeCheck === undefined) {
    showSnackbar.cancel("已取消打开");
    return;
  }
  if (!modeCheck) await TGClient.open("web_act_thin", item.app_path);
  else await TGClient.open("web_act", item.app_path);
}

// 处理 protocol
async function toBBS(link: URL): Promise<void> {
  if (link.protocol == "mihoyobbs:") {
    if (link.hostname === "article") {
      const postId = link.pathname.split("/").pop();
      await createPost(<string>postId);
      return;
    }
    if (link.hostname === "forum") {
      const forumId = link.pathname.split("/").pop();
      const localPath = `/posts/forum/${props.modelValue}/${forumId}`;
      await emit("active_deep_link", `router?path=${localPath}`);
      return;
    }
  }
  showSnackbar.warn(`不支持的链接：${link.href}`);
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tgn-container {
  position: relative;
  display: flex;
  padding: 8px;
  gap: 8px;
}

.tgn-nav {
  @include github-styles.github-card();
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  color: var(--tgc-white-1);
  cursor: pointer;
}

.dark .tgn-nav {
  @include github-styles.github-card("dark");
}

.tgn-nav img {
  width: 28px;
  height: 28px;
}

.tgn-nav span {
  display: none;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 16px;
}

.tgn-nav:hover span {
  display: block;
}
</style>
