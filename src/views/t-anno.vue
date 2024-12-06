<template>
  <TSwitchTheme />
  <TPinWin />
  <TShareBtn selector=".anno-body" :title="`Anno_${route.params.anno_id}`" />
  <div class="anno-body" v-if="annoData">
    <div class="anno-info">AnnoID: {{ annoId }} | Render by TeyvatGuide v{{ appVersion }}</div>
    <div class="anno-title">{{ annoData.title }}</div>
    <div class="anno-subtitle">{{ parseText(annoData.subtitle) }}</div>
    <div class="anno-content">
      <TaParser :data="annoData" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { app, webviewWindow } from "@tauri-apps/api";
import { onMounted, ref, shallowRef } from "vue";
import { useRoute } from "vue-router";

import TPinWin from "../components/app/t-pinWin.vue";
import TShareBtn from "../components/app/t-shareBtn.vue";
import TSwitchTheme from "../components/app/t-switchTheme.vue";
import showLoading from "../components/func/loading.js";
import TaParser from "../components/pageAnno/ta-parser.vue";
import { useAppStore } from "../store/modules/app.js";
import TGLogger from "../utils/TGLogger.js";
import { createTGWindow } from "../utils/TGWindow.js";
import Hk4eApi, { AnnoLang, AnnoServer } from "../web/request/hk4eReq.js";

const route = useRoute();
const annoId = Number(route.params.anno_id);
const region = <AnnoServer>route.params.region;
const lang = <AnnoLang>route.params.lang;
const appVersion = ref<string>();
const annoData = shallowRef<TGApp.BBS.Announcement.ContentItem | undefined>();

onMounted(async () => {
  showLoading.start("正在加载公告数据...");
  appVersion.value = await app.getVersion();
  if (!annoId || !region) {
    showLoading.empty("未找到数据", "公告不存在或解析失败");
    await TGLogger.Error("[t-anno.vue] 未找到数据");
    return;
  }
  showLoading.update("正在获取数据...", `公告ID:${annoId}`);
  try {
    annoData.value = await Hk4eApi.anno.content(annoId, region, lang);
    showLoading.update("正在渲染数据...", `公告ID：${annoId}`);
    await webviewWindow
      .getCurrentWebviewWindow()
      .setTitle(`Anno_${annoId} ${annoData.value.title}`);
  } catch (error) {
    if (error instanceof Error)
      await TGLogger.Error(`[t-anno.vue][${annoId}] ${error.name}：${error.message}`);
    else console.error(error);
    showLoading.empty("未找到数据", "公告不存在或解析失败");
    await webviewWindow.getCurrentWebviewWindow().setTitle(`Anno_${annoId} Parsing Error`);
    return;
  }
  // 打开 json
  const isDev = useAppStore().devMode ?? false;
  if (isDev) await createAnnoJson(annoId, region, lang);
  showLoading.end();
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
