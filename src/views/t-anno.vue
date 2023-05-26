<!-- eslint-disable vue/no-v-html -->
<template>
  <TSwitchTheme />
  <TOLoading v-model="loading" :title="loadingTitle" :empty="loadingEmpty" />
  <div class="anno-body">
    <div class="anno-title">
      {{ annoData.title }}
    </div>
    <div class="anno-subtitle">
      {{ annoData.subtitle }}
    </div>
    <img v-if="annoData.banner !== ''" :src="annoData.banner" alt="cover" class="anno-img">
    <div class="anno-content" v-html="annoHtml" />
  </div>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import TOLoading from "../components/overlay/to-loading.vue";
import TSwitchTheme from "../components/main/t-switchTheme.vue";
// tauri
import { appWindow } from "@tauri-apps/api/window";
// plugins
import TGRequest from "../web/request/TGRequest";
import TGUtils from "../web/utils/TGUtils";

// loading
const loading = ref(true as boolean);
const loadingTitle = ref("正在加载");
const loadingEmpty = ref(false as boolean);

// 数据
const annoId = Number(useRoute().params.anno_id);
const annoData = ref({} as TGApp.BBS.Announcement.ContentItem);
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
  loading.value = true;
  try {
    annoData.value = await TGRequest.Anno.getContent(annoId);
    loadingTitle.value = "正在渲染数据...";
    annoHtml.value = TGUtils.Anno.parseContent(annoData.value.content);
  } catch (error) {
    loadingEmpty.value = true;
    loadingTitle.value = "公告不存在或解析失败";
    return;
  }
  loading.value = false;
});
</script>
<style lang="css" src="../assets/css/anno-parser.css" scoped />
