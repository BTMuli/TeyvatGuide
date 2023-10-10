<!-- eslint-disable vue/no-v-html -->
<!-- todo 添加更多信息 -->
<template>
  <TSwitchTheme />
  <TShareBtn
    v-show="!loadingEmpty"
    v-model="postRef"
    v-model:loading="loadShare"
    :title="shareTitle"
  />
  <ToLoading v-model="loading" :empty="loadingEmpty" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="mys-post-body">
    <div class="mys-post-title">
      {{ postRender.title }}
    </div>
    <div class="mys-post-subtitle">
      <span>创建时间：{{ postRender.created }}&emsp;</span>
      <span>更新时间：{{ postRender.updated }}</span>
    </div>
    <div class="mys-post-content" v-html="postHtml" />
  </div>
</template>
<script lang="ts" setup>
import { appWindow } from "@tauri-apps/api/window";
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";

import TSwitchTheme from "../components/app/t-switchTheme.vue";
import TShareBtn from "../components/main/t-shareBtn.vue";
import ToLoading from "../components/overlay/to-loading.vue";
import Mys from "../plugins/Mys";

// loading
const loading = ref<boolean>(true);
const loadShare = ref<boolean>(false);
const loadingTitle = ref<string>("正在加载");
const loadingSub = ref<string>();
const loadingEmpty = ref<boolean>(false);

// share
const postRef = ref<HTMLElement>(<HTMLElement>{});
const shareTitle = ref<string>("");

// 数据
const postId = Number(useRoute().params.post_id);
const postHtml = ref<string>("");
const postRender = ref({
  title: "",
  created: "",
  updated: "",
});

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
    const postData = await Mys.Post.get(postId);
    loadingTitle.value = "正在渲染数据...";
    postHtml.value = Mys.Post.parser(postData);
    postRender.value = {
      title: postData.post.subject,
      created: new Date(postData.post.created_at * 1000).toLocaleString().replace(/\//g, "-"),
      updated: new Date(postData.post.updated_at * 1000).toLocaleString().replace(/\//g, "-"),
    };
    shareTitle.value = `Post_${postId}`;
    postRef.value = <HTMLElement>document.querySelector(".mys-post-body");
    await appWindow.setTitle(`Post_${postId} ${postData.post.subject}`);
  } catch (error) {
    console.error(error);
    loadingEmpty.value = true;
    loadingTitle.value = "帖子不存在或解析失败";
    loadingSub.value = error instanceof Error ? error.message : <string>error;
    await appWindow.setTitle(`Post_${postId} Parsing Error`);
    return;
  }
  setTimeout(() => {
    loading.value = false;
  }, 200);
});

watch(loadShare, (value) => {
  if (value) {
    loadingTitle.value = "正在生成分享图片";
    loadingSub.value = `${shareTitle.value}.png`;
    loading.value = true;
  } else {
    loadingSub.value = "";
    loading.value = false;
  }
});
</script>
<style lang="css" scoped src="../assets/css/post-parser.css"></style>
