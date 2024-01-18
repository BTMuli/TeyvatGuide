<template>
  <TSwitchTheme />
  <ToLoading v-model="loading" :empty="loadingEmpty" :title="loadingTitle" />
  <div class="anno-json">
    <div class="anno-title">活动列表 JSON</div>
    <JsonViewer :value="jsonList" copyable boxed />
    <div class="anno-title">活动内容 JSON</div>
    <JsonViewer :value="jsonContent" copyable boxed />
  </div>
</template>
<script lang="ts" setup>
import { appWindow } from "@tauri-apps/api/window";
import { ref, onMounted, reactive } from "vue";
import JsonViewer from "vue-json-viewer";
import { useRoute } from "vue-router";

import TSwitchTheme from "../components/app/t-switchTheme.vue";
import ToLoading from "../components/overlay/to-loading.vue";
import TGRequest from "../web/request/TGRequest";

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载");
const loadingEmpty = ref<boolean>(false);

// 数据
const annoId = Number(useRoute().params.anno_id);
let jsonList = reactive({});
let jsonContent = reactive({});

onMounted(async () => {
  await appWindow.show();
  // 检查数据
  if (!annoId) {
    loadingEmpty.value = true;
    loadingTitle.value = "未找到数据";
    return;
  }
  // 获取数据
  loadingTitle.value = "正在获取数据...";
  const listData = await TGRequest.Anno.getList();
  listData.list.map((item: TGApp.BBS.Announcement.ListItem) => {
    return item.list.map((single: TGApp.BBS.Announcement.AnnoSingle) => {
      return single.ann_id === annoId ? (jsonList = single) : null;
    });
  });
  jsonContent = await TGRequest.Anno.getContent(annoId);
  setTimeout(() => {
    loading.value = false;
  }, 200);
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
