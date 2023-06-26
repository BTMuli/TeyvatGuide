<template>
  <TSwitchTheme />
  <TOLoading v-model="loading" :empty="loadingEmpty" :title="loadingTitle" />
  <div class="post-json">
    <div class="post-title">帖子返回内容 JSON</div>
    <JsonViewer :value="jsonData" copyable boxed />
  </div>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted, reactive } from "vue";
import { useRoute } from "vue-router";
import JsonViewer from "vue-json-viewer";
import TOLoading from "../components/overlay/to-loading.vue";
import TSwitchTheme from "../components/main/t-switchTheme.vue";
// tauri
import { appWindow } from "@tauri-apps/api/window";
// plugins
import MysOper from "../plugins/Mys";

// loading
const loading = ref(true as boolean);
const loadingTitle = ref("正在加载");
const loadingEmpty = ref(false as boolean);

// 数据
const postId = Number(useRoute().params.post_id);
let jsonData = reactive({});

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
    jsonData = await MysOper.Post.get(postId);
    loading.value = false;
  } catch (e) {
    loadingTitle.value = "帖子不存在或解析失败";
    loadingEmpty.value = true;
  }
});
</script>
<style>
.post-json {
  padding: 20px;
  border-radius: 20px;
  font-family: Consolas, serif;
}

.post-title {
  margin: 20px 0;
  color: #546d8b;
  font-family: Genshin-Light, serif;
  font-size: 20px;
  font-weight: 600;
}

.jv-container {
  background: var(--content-bg-2) !important;
}
</style>
