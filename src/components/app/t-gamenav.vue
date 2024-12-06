<template>
  <div class="tgn-container">
    <div v-for="navItem in nav" :key="navItem.id" class="tgn-nav" @click="toNav(navItem)">
      <img alt="navIcon" :src="navItem.icon" />
      <span>{{ navItem.name }}</span>
    </div>
    <div v-if="props.modelValue === 2 && hasNav" class="tgn-nav">
      <v-btn size="25" @click="tryGetCode" title="查看兑换码" icon="mdi-code-tags-check"></v-btn>
    </div>
    <ToLivecode v-model="showOverlay" :data="codeData" v-model:actId="actId" />
  </div>
</template>
<script lang="ts" setup>
import { emit } from "@tauri-apps/api/event";
import { computed, onMounted, ref, shallowRef, watch } from "vue";

import Mys from "../../plugins/Mys/index.js";
import { useAppStore } from "../../store/modules/app.js";
import TGClient from "../../utils/TGClient.js";
import TGLogger from "../../utils/TGLogger.js";
import { createPost } from "../../utils/TGWindow.js";
import OtherApi from "../../web/request/otherReq.js";
import showDialog from "../func/dialog.js";
import showSnackbar from "../func/snackbar.js";

import ToLivecode from "./to-livecode.vue";

type TGameNavProps = { modelValue: number };
const props = withDefaults(defineProps<TGameNavProps>(), { modelValue: 2 });

const appStore = useAppStore();
const nav = shallowRef<TGApp.BBS.Navigator.Navigator[]>([]);
const codeData = shallowRef<TGApp.BBS.Navigator.CodeData[]>([]);
const showOverlay = ref<boolean>(false);
const actId = ref<string>();

const hasNav = computed<boolean>(() => {
  if (props.modelValue !== 2) return false;
  return nav.value.find((item) => item.name === "前瞻直播") !== undefined;
});

onMounted(async () => await loadNav());

watch(
  () => props.modelValue,
  async () => await loadNav(),
);

async function loadNav(): Promise<void> {
  nav.value = await Mys.ApiHub.homeNew(props.modelValue);
}

async function tryGetCode(): Promise<void> {
  if (props.modelValue !== 2) return;
  const navFind = nav.value.find((item) => item.name === "前瞻直播");
  if (!navFind) return;
  const actIdFind = new URL(navFind.app_path).searchParams.get("act_id");
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
  if (!appStore.isLogin) {
    showSnackbar.warn("请先登录");
    return;
  }
  await TGLogger.Info(`[TGameNav][toNav] 打开网页活动 ${item.name}`);
  await TGLogger.Info(`[TGameNav}][toNav] ${item.app_path}`);
  const link = new URL(item.app_path);
  const mysList = [
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
    window.open(item.app_path);
    return;
  }
  if (item.name === "签到福利") {
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
    if (link.pathname.startsWith("//article")) {
      const postId = link.pathname.split("/").pop();
      await createPost(<string>postId);
      return;
    }
    if (link.pathname.startsWith("//forum")) {
      const forumId = link.pathname.split("/").pop();
      const localPath = getLocalPath(forumId);
      if (localPath === "") {
        showSnackbar.warn(`不支持的链接：${link.href}`);
        return;
      }
      await emit("active_deep_link", `router?path=${localPath}`);
      return;
    }
  }
  showSnackbar.warn(`不支持的链接：${link.href}`);
}

function getLocalPath(forum?: string): string {
  if (!forum) return "";
  const forumLocalMap: Record<string, string> = {
    "31": "/news/3", // 崩坏2官方
    "6": "/news/1", // 崩坏3官方
    "28": "/news/2", // 原神官方
    "33": "/news/4", // 未定官方
    "58": "/news/8", // 绝区零官方
    "36": "/news/5", // 大别野公告
  };
  if (forumLocalMap[forum]) return forumLocalMap[forum];
  const ysForums = ["26", "43", "29", "49", "50"];
  const srForums = ["52", "61", "56", "62"];
  const bh3Forums = ["1", "14", "4", "41"];
  const bh2Forums = ["30", "51", "40"];
  const wdForums = ["37", "60", "42", "38"];
  const zzzForums = ["57", "59", "64", "65"];
  const dbyForums = ["54", "35", "34", "39", "47", "48", "55", "36"];
  if (ysForums.includes(forum)) return `/posts/forum/2/${forum}`;
  if (srForums.includes(forum)) return `/posts/forum/6/${forum}`;
  if (bh3Forums.includes(forum)) return `/posts/forum/1/${forum}`;
  if (bh2Forums.includes(forum)) return `/posts/forum/3/${forum}`;
  if (wdForums.includes(forum)) return `/posts/forum/4/${forum}`;
  if (zzzForums.includes(forum)) return `/posts/forum/8/${forum}`;
  if (dbyForums.includes(forum)) return `/posts/forum/5/${forum}`;
  return "";
}
</script>
<style lang="css" scoped>
.tgn-container {
  display: flex;
  padding: 5px;
  gap: 10px;
}

.tgn-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 5px;
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  background: var(--common-shadow-t-4);
  box-shadow: 0 0 5px var(--common-shadow-4);
  color: var(--tgc-white-1);
  cursor: pointer;
}

.tgn-nav img {
  width: 25px;
  height: 25px;
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
