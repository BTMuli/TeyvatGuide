<template>
  <TSwitchTheme />
  <ToLoading v-model="loading" :empty="loadingEmpty" :title="loadingTitle" />
  <div class="post-json">
    <div class="post-title">帖子返回内容 JSON</div>
    <JsonViewer :value="jsonData" copyable boxed />
    <div class="post-title" v-show="!isEmpty">结构化内容解析</div>
    <JsonViewer v-if="!isEmpty" :value="parseData" copyable boxed />
  </div>
</template>
<script lang="ts" setup>
import { webviewWindow } from "@tauri-apps/api";
import { onMounted, reactive, ref } from "vue";
import JsonViewer from "vue-json-viewer";
import { useRoute } from "vue-router";

import TSwitchTheme from "../components/app/t-switchTheme.vue";
import ToLoading from "../components/overlay/to-loading.vue";
import Mys from "../plugins/Mys/index.js";

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载");
const loadingEmpty = ref<boolean>(false);

// 数据
const postId = Number(useRoute().params.post_id);
let jsonData = reactive<TGApp.Plugins.Mys.Post.FullData>(<TGApp.Plugins.Mys.Post.FullData>{});
let parseData = reactive<TGApp.Plugins.Mys.SctPost.Base[]>([]);
const isEmpty = ref<boolean>(false);

onMounted(async () => {
  if (!postId) {
    loadingEmpty.value = true;
    loadingTitle.value = "错误的 POST ID！";
    return;
  }
  loadingTitle.value = "正在获取数据...";
  try {
    jsonData = await Mys.Post.get(postId);
  } catch (e) {
    loadingTitle.value = "获取数据失败";
    loadingEmpty.value = true;
    return;
  }
  try {
    parseData = JSON.parse(jsonData.post.content);
  } catch (e) {
    try {
      parseData = JSON.parse(jsonData.post.structured_content);
    } catch (e) {
      isEmpty.value = true;
    }
  }
  loading.value = false;
});
</script>
<style lang="css" scoped>
.post-json {
  padding: 20px;
  border-radius: 20px;
  font-family: var(--font-text);
}

.post-title {
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
