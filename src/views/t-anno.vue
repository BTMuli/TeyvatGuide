<!-- eslint-disable vue/no-v-html -->
<template>
  <div v-if="loading" class="loading">
    <TLoading :title="loadingTitle" :empty="loadingEmpty" />
  </div>
  <div v-else class="anno-body">
    <div class="anno-title">
      {{ annoData.title }}
    </div>
    <div class="anno-subtitle">
      {{ annoData.subtitle }}
    </div>
    <img :src="annoData.banner" alt="cover" class="anno-img">
    <div class="anno-content" v-html="annoHtml" />
  </div>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import TLoading from "../components/t-loading.vue";
// tauri
import { appWindow } from "@tauri-apps/api/window";
// plugins
import GenshinOper from "../plugins/Genshin";
// interface
import { AnnoContentItem } from "../plugins/Genshin/interface/announcement";

// loading
const loading = ref(true as boolean);
const loadingTitle = ref("正在加载");
const loadingEmpty = ref(false as boolean);

// 数据
const annoId = Number(useRoute().params.anno_id);
const annoData = ref({} as AnnoContentItem);
const annoHtml = ref("");

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
  try {
    annoData.value = await GenshinOper.Announcement.getContent(annoId);
    loadingTitle.value = "正在渲染数据...";
    annoHtml.value = GenshinOper.Announcement.parser(annoData.value.content);
  } catch (error) {
    loadingEmpty.value = true;
    loadingTitle.value = "公告不存在或解析失败";
    return;
  }
  setTimeout(() => {
    loading.value = false;
  }, 200);
});
</script>
<style lang="css" src="../assets/css/anno-parser.css" scoped />
