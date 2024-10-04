<template>
  <TSwitchTheme />
  <TPinWin />
  <TShareBtn
    v-show="!loadingEmpty"
    v-model="annoRef"
    v-model:loading="loadShare"
    :title="annoTitle"
  />
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" :empty="loadingEmpty" />
  <div class="anno-body" v-if="annoData">
    <div class="anno-info">AnnoID: {{ annoId }} | Render by TeyvatGuide v{{ appVersion }}</div>
    <div class="anno-title">
      {{ annoData.title }}
    </div>
    <div class="anno-subtitle">
      {{ parseText(annoData.subtitle) }}
    </div>
    <div class="anno-content">
      <TaParser :data="annoData" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { app, webviewWindow } from "@tauri-apps/api";
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";

import TaParser from "../components/anno/ta-parser.vue";
import TPinWin from "../components/app/t-pinWin.vue";
import TShareBtn from "../components/app/t-shareBtn.vue";
import TSwitchTheme from "../components/app/t-switchTheme.vue";
import ToLoading from "../components/overlay/to-loading.vue";
import { useAppStore } from "../store/modules/app.js";
import TGLogger from "../utils/TGLogger.js";
import { createTGWindow } from "../utils/TGWindow.js";
import { AnnoLang, AnnoServer } from "../web/request/getAnno.js";
import TGRequest from "../web/request/TGRequest.js";

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
const annoData = ref<TGApp.BBS.Announcement.ContentItem | undefined>();

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
    annoTitle.value = `Anno_${annoId}`;
    await webviewWindow
      .getCurrentWebviewWindow()
      .setTitle(`Anno_${annoId} ${annoData.value.title}`);
    annoRef.value = <HTMLElement>document.querySelector(".anno-body");
  } catch (error) {
    if (error instanceof Error)
      await TGLogger.Error(`[t-anno.vue][${annoId}] ${error.name}：${error.message}`);
    else console.error(error);
    loadingEmpty.value = true;
    loadingTitle.value = "公告不存在或解析失败";
    await webviewWindow.getCurrentWebviewWindow().setTitle(`Anno_${annoId} Parsing Error`);
    return;
  }
  // 打开 json
  const isDev = useAppStore().devMode ?? false;
  if (isDev) await createAnnoJson(annoId, region, lang);
  loading.value = false;
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

.anno-body {
  width: 800px;
  margin: 0 auto;
  font-family: var(--font-text);
}

.anno-title,
.anno-subtitle {
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.anno-title {
  font-size: 20px;
}

.anno-subtitle {
  font-size: 16px;
  opacity: 0.6;
}

.anno-content {
  line-height: 2;
}
</style>
