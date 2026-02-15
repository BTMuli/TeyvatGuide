<!-- 版块小组件菜单 -->
<template>
  <div class="tgn-container">
    <div v-for="navItem in nav" :key="navItem.id" class="tgn-nav" @click="toNav(navItem)">
      <TMiImg :ori="true" :src="navItem.icon" alt="navIcon" />
      <span>{{ navItem.name }}</span>
    </div>
    <div v-if="hasNav" class="tgn-nav" title="查看兑换码">
      <v-icon v-if="!loadCode" color="var(--tgc-od-orange)" size="25" @click="tryGetCode">
        mdi-code-tags-check
      </v-icon>
      <v-progress-circular v-else color="var(--tgc-od-orange)" indeterminate size="25" />
    </div>
    <ToLivecode v-model="showOverlay" :actId="actId" :data="codeData" :gid="model" />
  </div>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import ApiHubReq from "@req/apiHubReq.js";
import OtherApi from "@req/otherReq.js";
import useAppStore from "@store/app.js";
import { emit } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import TGClient from "@utils/TGClient.js";
import TGLogger from "@utils/TGLogger.js";
import { createPost } from "@utils/TGWindow.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, shallowRef, watch } from "vue";

import TMiImg from "./t-mi-img.vue";
import ToLivecode from "./to-livecode.vue";

const { isLogin } = storeToRefs(useAppStore());

const model = defineModel<number>({ default: 2 });

const actId = ref<string>();
const showOverlay = ref<boolean>(false);
const loadCode = ref<boolean>(false);
const nav = shallowRef<Array<TGApp.BBS.Navigator.Navigator>>([]);
const codeData = shallowRef<Array<TGApp.BBS.Navigator.CodeData>>([]);
const hasNav = computed<TGApp.BBS.Navigator.Navigator | undefined>(() => {
  const liveNames = ["前瞻直播", "前瞻节目", "直播兑换码", "特别节目"];
  const find = nav.value.find((item) => liveNames.includes(item.name));
  if (find) return find;
  return nav.value.find((item) => item.name.includes("前瞻"));
});

onMounted(async () => await loadNav());

watch(
  () => model.value,
  async () => await loadNav(),
);

/**
 * 加载组件数据
 * @returns {Promise<void>}
 */
async function loadNav(): Promise<void> {
  try {
    nav.value = await ApiHubReq.home(model.value);
    console.debug(`[TGameNav][loadNav] 组件数据：`, nav.value);
    if (loadCode.value) loadCode.value = false;
  } catch (e) {
    await TGLogger.Error(`[TGameNav][loadNav] 加载组件数据失败：${e}`);
  }
}

/**
 * 获取兑换码
 * @returns {Promise<void>}
 */
async function tryGetCode(): Promise<void> {
  if (!hasNav.value || loadCode.value) return;
  loadCode.value = true;
  const actIdFind = new URL(hasNav.value.app_path).searchParams.get("act_id");
  if (!actIdFind) {
    loadCode.value = false;
    showSnackbar.warn("未找到活动ID");
    await TGLogger.Warn(`[TGameNav][tryGetCode] 未找到活动ID，链接：${hasNav.value.app_path}`);
    return;
  }
  actId.value = actIdFind;
  const res = await OtherApi.code(actIdFind);
  if (!Array.isArray(res)) {
    loadCode.value = false;
    showSnackbar.warn(`[${res.retcode}] ${res.message}`);
    await TGLogger.Warn(`[TGameNav][tryGetCode] 获取兑换码失败：${JSON.stringify(res)}`);
    return;
  }
  codeData.value = res;
  console.debug(`[TGameNave][tryGetCode] 兑换码数据：`, codeData.value);
  showSnackbar.success("获取兑换码成功");
  showOverlay.value = true;
  loadCode.value = false;
}

/**
 * 跳转到活动页面
 * @param {TGApp.BBS.Navigator.Navigator} item 导航项
 * @returns {Promise<void>}
 */
async function toNav(item: TGApp.BBS.Navigator.Navigator): Promise<void> {
  if (!isLogin.value) {
    showSnackbar.warn("请先登录");
    return;
  }
  console.debug(`[TGameNav][toNav] 跳转到活动页面：`, item);
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
  const modeCheck = await showDialog.checkF({
    title: "是否采用宽屏模式打开？",
    cancelLabel: "采用竖屏模式",
  });
  if (modeCheck === undefined) {
    showSnackbar.cancel("已取消打开");
    return;
  }
  if (!modeCheck) await TGClient.open("web_act_thin", item.app_path);
  else await TGClient.open("web_act", item.app_path);
}

/**
 * 处理米游社论坛链接
 * @param {URL} link 链接
 * @returns {Promise<void>}
 */
async function toBBS(link: URL): Promise<void> {
  if (link.protocol == "mihoyobbs:") {
    if (link.hostname === "article") {
      const postId = link.pathname.split("/").pop();
      await createPost(<string>postId);
      return;
    }
    if (link.hostname === "forum") {
      const forumId = link.pathname.split("/").pop();
      const localPath = `/posts/forum/${model.value}/${forumId}`;
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
  @include github-styles.github-card;

  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  color: var(--tgc-white-1);
  cursor: pointer;

  img {
    width: 28px;
    height: 28px;
  }

  span {
    display: none;
    margin-left: 4px;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    white-space: nowrap;
  }

  &:hover span {
    display: block;
  }
}

.dark .tgn-nav {
  @include github-styles.github-card("dark");
}
</style>
