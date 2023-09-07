<template>
  <TSwitchTheme />
  <ToLoading v-model="loading" :empty="loadingEmpty" :title="loadingTitle" />
  <div class="post-json">
    <div class="post-title">帖子返回内容 JSON</div>
    <JsonViewer :value="jsonData" copyable boxed />
    <div class="post-title">结构化内容解析</div>
    <JsonViewer :value="parseData" copyable boxed />
  </div>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted, reactive } from "vue";
import { useRoute } from "vue-router";
import JsonViewer from "vue-json-viewer";
import ToLoading from "../components/overlay/to-loading.vue";
import TSwitchTheme from "../components/app/t-switchTheme.vue";
// tauri
import { appWindow } from "@tauri-apps/api/window";
// plugins
import Mys from "../plugins/Mys";

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载");
const loadingEmpty = ref<boolean>(false);

// 数据
const postId = Number(useRoute().params.post_id);
let jsonData = reactive<TGApp.Plugins.Mys.Post.FullData>(<TGApp.Plugins.Mys.Post.FullData>{});
let parseData = reactive<TGApp.Plugins.Mys.Post.StructuredContent[]>([]);

onMounted(async () => {
  await appWindow.show();
  // 检查数据
  if (!postId) {
    loadingEmpty.value = true;
    loadingTitle.value = "未找到数据";
    return;
  }
  // 获取数据
  loadingTitle.value = "正在获取数据...";
  try {
    jsonData = await Mys.Post.get(postId);
    parseData = JSON.parse(jsonData.post.structured_content);
    loading.value = false;
  } catch (e) {
    loadingTitle.value = "帖子不存在或解析失败";
    loadingEmpty.value = true;
  }
});
</script>
<style lang="css" scoped>
.post-json {
  padding: 20px;
  border-radius: 20px;
  font-family: var(--font-text);
}

.post-title {
  margin: 20px 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: 600;
}

.jv-container {
  background: var(--box-bg-2) !important;
}

.jv-key,
.jv-array {
  color: var(--box-text-4) !important;
}
</style>
