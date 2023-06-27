<!-- eslint-disable vue/no-v-html -->
<template>
  <TSwitchTheme />
  <TShareBtn v-show="!loadingEmpty" v-model="postRef" :title="shareTitle" />
  <ToLoading v-model="loading" :empty="loadingEmpty" :title="loadingTitle" />
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
// vue
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import ToLoading from "../components/overlay/to-loading.vue";
import TSwitchTheme from "../components/main/t-switchTheme.vue";
import TShareBtn from "../components/main/t-shareBtn.vue";
// tauri
import { appWindow } from "@tauri-apps/api/window";
// plugins
import Mys from "../plugins/Mys";

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载");
const loadingEmpty = ref<boolean>(false);

// share
const postRef = ref<HTMLElement>({} as HTMLElement);
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
    shareTitle.value = `【帖子】${postId}-${postData.post.subject}`;
    postRef.value = document.querySelector(".mys-post-body") as HTMLElement;
    await appWindow.setTitle(shareTitle.value);
  } catch (error) {
    console.error(error);
    loadingEmpty.value = true;
    loadingTitle.value = "帖子不存在或解析失败";
    await appWindow.setTitle(`【帖子】${postId}-解析失败`);
    return;
  }
  setTimeout(() => {
    loading.value = false;
  }, 200);
});
</script>
<style lang="css" scoped src="../assets/css/post-parser.css"></style>
