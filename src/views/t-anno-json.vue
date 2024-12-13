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
import TSwitchTheme from "@comp/app/t-switchTheme.vue";
import showLoading from "@comp/func/loading.js";
import { onMounted, shallowRef } from "vue";
import JsonViewer from "vue-json-viewer";
import { useRoute } from "vue-router";

import Hk4eApi, { type AnnoLang, AnnoServer } from "@/web/request/hk4eReq.js";

// 数据
const route = useRoute();
const annoId = Number(route.params.anno_id);
const region = <AnnoServer>route.params.region;
const lang = <AnnoLang>route.params.lang;
const jsonList = shallowRef<TGApp.BBS.Announcement.AnnoSingle>();
const jsonContent = shallowRef<TGApp.BBS.Announcement.ContentItem>();

onMounted(async () => {
  showLoading.start("正在获取公告数据...");
  if (!annoId) {
    showLoading.empty("未找到数据");
    return;
  }
  showLoading.update("正在获取数据...", `公告ID: ${annoId}`);
  const listData = await Hk4eApi.anno.list(region, lang);
  for (const listItem of listData.list) {
    for (const single of listItem.list) {
      if (single.ann_id === annoId) {
        jsonList.value = single;
        break;
      }
    }
  }
  jsonContent.value = await Hk4eApi.anno.content(annoId, region, lang);
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
