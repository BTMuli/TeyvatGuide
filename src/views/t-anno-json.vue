<template>
  <div v-if="loading">
    <TLoading :empty="loadingEmpty" :title="loadingTitle" />
  </div>
  <div v-else class="dev-json">
    <div class="anno-title">
      活动列表 JSON
    </div>
    <JsonViewer :value="jsonList" copyable boxed />
    <div class="anno-title">
      活动内容 JSON
    </div>
    <JsonViewer :value="jsonContent" copyable boxed />
  </div>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted, reactive } from "vue";
import { useRoute } from "vue-router";
import JsonViewer from "vue-json-viewer";
import TLoading from "../components/t-loading.vue";
// tauri
import { appWindow } from "@tauri-apps/api/window";
// utils
import TGRequest from "../core/request/TGRequest";

// loading
const loading = ref(true as boolean);
const loadingTitle = ref("正在加载");
const loadingEmpty = ref(false as boolean);

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
  listData.list.map((item: BTMuli.Genshin.Announcement.Announcement) => {
    return item.list.map((single: BTMuli.Genshin.Announcement.ListItem) => {
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
.anno-title {
  font-size: 20px;
  color: #546d8b;
  font-family: Genshin-Light, serif;
  font-weight: 600;
  margin: 20px 0;
}
</style>
