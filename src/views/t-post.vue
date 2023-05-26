<!-- eslint-disable vue/no-v-html -->
<template>
  <TSwitchTheme />
  <TOLoading v-model="loading" :empty="loadingEmpty" :title="loadingTitle" />
  <div class="mys-post-body" v-html="postHtml" />
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import TOLoading from "../components/overlay/to-loading.vue";
// tauri
import { appWindow } from "@tauri-apps/api/window";
// plugins
import MysOper from "../plugins/Mys";
import TSwitchTheme from "../components/main/t-switchTheme.vue";

// loading
const loading = ref(true as boolean);
const loadingTitle = ref("正在加载");
const loadingEmpty = ref(false as boolean);

// 数据
const postId = Number(useRoute().params.post_id);
const postHtml = ref("");

onMounted(async () => {
  await appWindow.show();
  // 检查数据
  if (!postId) {
    loadingEmpty.value = true;
    loadingTitle.value = "未找到数据";
    await appWindow.setTitle("未找到数据");
    return;
  }
  // 获取数据
  loadingTitle.value = "正在获取数据...";
  try {
    const postData = await MysOper.Post.get(postId);
    loadingTitle.value = "正在渲染数据...";
    postHtml.value = MysOper.Post.parser(postData);
    await appWindow.setTitle(postData.post.subject);
  } catch (error) {
    console.error(error);
    loadingEmpty.value = true;
    loadingTitle.value = "帖子不存在或解析失败";
    await appWindow.setTitle("帖子不存在或解析失败");
    return;
  }
  setTimeout(() => {
    loading.value = false;
  }, 200);
});
</script>
<style lang="css" scoped src="../assets/css/post-parser.css"></style>
