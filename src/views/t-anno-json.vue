<template>
  <TSwitchTheme />
  <div class="anno-json">
    <div class="anno-title">活动列表 JSON</div>
    <JsonViewer :value="jsonList" copyable boxed />
    <div class="anno-title">活动内容 JSON</div>
    <JsonViewer :value="jsonContent" copyable boxed />
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";
import JsonViewer from "vue-json-viewer";
import { useRoute } from "vue-router";

import TSwitchTheme from "../components/app/t-switchTheme.vue";
import showLoading from "../components/func/loading.js";
import { AnnoLang, AnnoServer } from "../web/request/getAnno.js";
import TGRequest from "../web/request/TGRequest.js";

// 数据
const route = useRoute();
const annoId = Number(route.params.anno_id);
const region = <AnnoServer>route.params.region;
const lang = <AnnoLang>route.params.lang;
const jsonList = ref<TGApp.BBS.Announcement.AnnoSingle>();
const jsonContent = ref<TGApp.BBS.Announcement.ContentItem>();

onMounted(async () => {
  showLoading.start("正在获取公告数据...");
  if (!annoId) {
    showLoading.empty("未找到数据");
    return;
  }
  showLoading.update("正在获取数据...", `公告ID: ${annoId}`);
  const listData = await TGRequest.Anno.getList();
  listData.list.map((item: TGApp.BBS.Announcement.ListItem) => {
    return item.list.map((single: TGApp.BBS.Announcement.AnnoSingle) => {
      return single.ann_id === annoId ? (jsonList.value = single) : null;
    });
  });
  jsonContent.value = await TGRequest.Anno.getContent(annoId, region, lang);
  showLoading.end();
});
</script>
<style lang="css" scoped>
.anno-json {
  padding: 20px;
  border-radius: 20px;
  font-family: var(--font-text);
}

.anno-title {
  width: 100%;
  margin: 10px 0;
  color: #546d8b;
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: 600;
  text-align: right;
}

.jv-container {
  background: var(--box-bg-2) !important;
}

.jv-key,
.jv-array {
  color: var(--box-text-4) !important;
}
</style>
