<!-- eslint-disable vue/no-v-html -->
<!-- todo 优化显示样式 -->
<template>
  <TSwitchTheme />
  <TShareBtn
    v-show="!loadingEmpty"
    v-model="annoRef"
    v-model:loading="loadShare"
    :title="annoTitle"
  />
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" :empty="loadingEmpty" />
  <div class="anno-body">
    <div class="anno-info">AnnoID: {{ annoId }} | Render by TeyvatGuide v{{ appVersion }}</div>
    <div class="anno-title">
      {{ annoData.title }}
    </div>
    <div class="anno-subtitle">
      {{ parseText(annoData.subtitle) }}
    </div>
    <img v-if="annoData.banner !== ''" :src="annoBanner" alt="cover" class="anno-img" />
    <div class="anno-content" v-html="annoHtml" />
  </div>
</template>
<script lang="ts" setup>
import { app, webviewWindow } from "@tauri-apps/api";
import { ref, onMounted, watch, onUnmounted } from "vue";
import { useRoute } from "vue-router";

import TSwitchTheme from "../components/app/t-switchTheme.vue";
import TShareBtn from "../components/main/t-shareBtn.vue";
import ToLoading from "../components/overlay/to-loading.vue";
import { useAppStore } from "../store/modules/app.js";
import TGLogger from "../utils/TGLogger.js";
import { saveImgLocal } from "../utils/TGShare.js";
import { createTGWindow } from "../utils/TGWindow.js";
import { AnnoLang, AnnoServer } from "../web/request/getAnno.js";
import TGRequest from "../web/request/TGRequest.js";
import TGUtils from "../web/utils/TGUtils.js";

// loading
const loading = ref<boolean>(true);
const loadShare = ref<boolean>(false);
const loadingTitle = ref<string>("正在加载");
const loadingSub = ref<string>();
const loadingEmpty = ref<boolean>(false);

// share
const annoRef = ref<HTMLElement | null | undefined>();
const annoTitle = ref<string>("");

// 数据
const route = useRoute();
const annoId = Number(route.params.anno_id);
const region = <AnnoServer>route.params.region;
const lang = <AnnoLang>route.params.lang;
const appVersion = ref<string>();
const annoData = ref<TGApp.BBS.Announcement.ContentItem>(<TGApp.BBS.Announcement.ContentItem>{});
const annoHtml = ref<string>();
const annoBanner = ref<string>();

onMounted(async () => {
  appVersion.value = await app.getVersion();
  // 检查数据
  if (!annoId || !region) {
    loadingEmpty.value = true;
    loadingTitle.value = "未找到数据";
    await TGLogger.Error("[t-anno.vue] 未找到数据");
    return;
  }
  // 获取数据
  loadingTitle.value = "正在获取数据...";
  try {
    annoData.value = await TGRequest.Anno.getContent(annoId, region, lang);
    loadingTitle.value = "正在渲染数据...";
    annoHtml.value = await TGUtils.Anno.parseContent(annoData.value.content);
    if (annoData.value.banner !== "") annoBanner.value = await saveImgLocal(annoData.value.banner);
    annoTitle.value = `Anno_${annoId}`;
    await webviewWindow.getCurrent().setTitle(`Anno_${annoId} ${annoData.value.title}`);
    annoRef.value = <HTMLElement>document.querySelector(".anno-body");
  } catch (error) {
    if (error instanceof Error)
      await TGLogger.Error(`[t-anno.vue][${annoId}] ${error.name}：${error.message}`);
    else console.error(error);
    loadingEmpty.value = true;
    loadingTitle.value = "公告不存在或解析失败";
    await webviewWindow.getCurrent().setTitle(`Anno_${annoId} Parsing Error`);
    return;
  }
  // 打开 json
  const isDev = useAppStore().devMode ?? false;
  if (isDev) await createAnnoJson(annoId, region, lang);
  setTimeout(() => {
    loading.value = false;
  }, 200);
});

watch(loadShare, (value) => {
  if (value) {
    loadingTitle.value = "正在生成分享图片";
    loadingSub.value = `${annoTitle.value}.png`;
    loading.value = true;
  } else {
    loadingSub.value = "";
    loading.value = false;
  }
});

function parseText(title: string): string {
  const div = document.createElement("div");
  div.innerHTML = title;
  return div.innerText;
}

async function createAnnoJson(annoId: number, region: AnnoServer, lang: AnnoLang): Promise<void> {
  const jsonPath = `/anno_detail_json/${region}/${annoId}/${lang}`;
  const jsonTitle = `Anno_${region}_${annoId}_${lang}_JSON`;
  await createTGWindow(jsonPath, "Dev_JSON", jsonTitle, 960, 720, false, false);
}

onUnmounted(() => {
  document
    .querySelector(".anno-body")
    ?.querySelectorAll("img")
    .forEach((img) => {
      if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
    });
});
</script>
<style lang="css" scoped>
.anno-info {
  position: relative;
  display: flex;
  align-items: end;
  justify-content: space-between;
  border-bottom: 1px dashed var(--common-shadow-2);
  margin-bottom: 10px;
  color: var(--box-text-4);
  font-family: var(--font-title);
  font-size: 14px;
}
</style>
<style lang="css" src="../assets/css/anno-parser.css" scoped></style>
