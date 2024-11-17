<template>
  <TSwitchTheme />
  <div class="post-json">
    <div class="post-title">帖子返回内容 JSON</div>
    <JsonViewer :value="jsonData" copyable boxed />
    <div class="post-title" v-show="!isEmpty">结构化内容解析</div>
    <JsonViewer v-if="!isEmpty" :value="parseData" copyable boxed />
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";
import JsonViewer from "vue-json-viewer";
import { useRoute } from "vue-router";

import TSwitchTheme from "../components/app/t-switchTheme.vue";
import showLoading from "../components/func/loading.js";
import showSnackbar from "../components/func/snackbar.js";
import Mys from "../plugins/Mys/index.js";
import TGLogger from "../utils/TGLogger.js";

const postId = Number(useRoute().params.post_id);
const jsonData = ref<TGApp.Plugins.Mys.Post.FullData>();
const parseData = ref<TGApp.Plugins.Mys.SctPost.Base[]>();
const isEmpty = ref<boolean>(false);

onMounted(async () => {
  showLoading.start(`正在获取帖子数据...`);
  if (!postId) {
    showLoading.empty("错误的帖子ID！");
    return;
  }
  const resp = await Mys.Post.getPostFull(postId);
  if ("retcode" in resp) {
    showLoading.empty("获取数据失败", `[${resp.retcode}]${resp.message}`);
    showSnackbar.error(`[${resp.retcode}]${resp.message}`);
    await TGLogger.Error(`[${postId}]获取帖子数据失败：${resp.retcode} ${resp.message}`);
    return;
  }
  jsonData.value = resp;
  try {
    parseData.value = JSON.parse(jsonData.value.post.content);
  } catch (err) {
    try {
      parseData.value = JSON.parse(jsonData.value.post.structured_content);
    } catch (e) {
      isEmpty.value = true;
      await TGLogger.Error(`[${postId}]解析帖子数据失败：${e}`);
    }
    console.warn(`[${postId}]解析帖子数据失败：${err}`);
  }
  showLoading.end();
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
