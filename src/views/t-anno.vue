<!-- 公告详情页面,TODO:联动消除红点 -->
<template>
  <TSwitchTheme />
  <TPinWin />
  <TShareBtn selector=".anno-body" :title="`Anno_${route.params.anno_id}`" />
  <div class="anno-body" v-if="annoData">
    <div class="anno-info" @click="createAnnoJson">
      AnnoID: {{ annoId }} | Render by TeyvatGuide v{{ appVersion }}
    </div>
    <div class="anno-title">{{ parseText(annoData.subtitle) }}</div>
    <div class="anno-subtitle">{{ annoData.title }}</div>
    <div class="anno-content">
      <TaParser :data="annoData" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import TPinWin from "@comp/app/t-pinWin.vue";
import TShareBtn from "@comp/app/t-shareBtn.vue";
import TSwitchTheme from "@comp/app/t-switchTheme.vue";
import showLoading from "@comp/func/loading.js";
import TaParser from "@comp/pageAnno/ta-parser.vue";
import hk4eReq from "@req/hk4eReq.js";
import useAppStore from "@store/app.js";
import { app, webviewWindow } from "@tauri-apps/api";
import TGLogger from "@utils/TGLogger.js";
import { createTGWindow } from "@utils/TGWindow.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const annoId = Number(route.params.anno_id);
const region = <TGApp.Game.Base.ServerTypeEnum>route.params.region;
const lang = <TGApp.Game.Anno.AnnoLangEnum>route.params.lang;

const { devMode } = storeToRefs(useAppStore());

const appVersion = ref<string>();
const annoData = shallowRef<TGApp.Game.Anno.AnnoDetail>();

onMounted(async () => {
  await showLoading.start("正在加载公告数据");
  appVersion.value = await app.getVersion();
  if (!annoId || !region) {
    await showLoading.empty("未找到数据", "未解析到公告ID或服务器");
    await TGLogger.Error("[t-anno.vue] 未找到数据");
    return;
  }
  await showLoading.update("正在获取数据");
  const detailResp = await hk4eReq.anno.detail(region, lang);
  await showLoading.update("正在渲染数据");
  const find = detailResp.find((item) => item.ann_id === annoId);
  if (!find) {
    await showLoading.empty("未找到数据", "公告不存在或解析失败");
    await TGLogger.Error(`[t-anno.vue][${annoId}] 未找到公告`);
    await webviewWindow.getCurrentWebviewWindow().setTitle(`Anno_${annoId} Not Found`);
    return;
  }
  annoData.value = find;
  await showLoading.update(`公告ID: ${annoId} - ${annoData.value.title}`);
  await webviewWindow.getCurrentWebviewWindow().setTitle(`Anno_${annoId} ${annoData.value.title}`);
  if (devMode.value === true) await createAnnoJson();
  await showLoading.end();
});

function parseText(title: string): string {
  const div = document.createElement("div");
  div.innerHTML = title;
  return div.innerText;
}

async function createAnnoJson(): Promise<void> {
  // @ts-expect-error import.meta
  if (import.meta.env.MODE === "production") return;
  const jsonPath = `/anno_detail_json/${region}/${annoId}/${lang}`;
  const jsonTitle = `Anno_${region}_${annoId}_${lang}_JSON`;
  await TGLogger.Debug(`[t-anno.vue][${annoId}] 打开JSON窗口`);
  await createTGWindow(jsonPath, "Dev_JSON", jsonTitle, 960, 720, false, false);
}
</script>
<style lang="scss" scoped>
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
  max-width: calc(100% - 100px);
  margin: 0 auto;
  font-family: var(--font-text);
}

.anno-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.anno-subtitle {
  font-size: 16px;
  font-style: italic;
}

.anno-content {
  line-height: 2;
}
</style>
