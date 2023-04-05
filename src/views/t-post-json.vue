<template>
<div v-if="loading">
  <TLoading :empty="loadingEmpty" :title="loadingTitle" />
</div>
<div v-else class="dev-json">
  <JsonViewer :value="jsonData" copyable boxed />
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
// plugins
import MysOper from "../plugins/Mys";

// loading
const loading = ref(true as boolean);
const loadingTitle = ref("正在加载");
const loadingEmpty = ref(false as boolean);

// 数据
const post_id = Number(useRoute().params.post_id);
let jsonData = reactive({});

onMounted(async () => {
  await appWindow.show();
  // 检查数据
  if (!post_id) {
    loadingEmpty.value = true;
    loadingTitle.value = "未找到数据";
    return;
  }
  // 获取数据
  loadingTitle.value = "正在获取数据...";
  jsonData = await MysOper.Post.get(post_id);
  setTimeout(() => {
    loading.value = false;
  }, 200);
});
</script>
