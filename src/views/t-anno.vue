<!-- eslint-disable vue/no-v-html -->
<!-- todo 优化显示样式 -->
<template>
  <TSwitchTheme />
  <TShareBtn
    v-show="!loadingEmpty"
    v-model="annoRef"
    v-model:loading="loadShare"
    :title="annoTitle"
  />
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" :empty="loadingEmpty" />
  <div class="anno-body">
    <div class="anno-title">
      {{ annoData.title }}
    </div>
    <div class="anno-subtitle">
      {{ annoData.subtitle }}
    </div>
    <img v-if="annoData.banner !== ''" :src="annoBanner" alt="cover" class="anno-img" />
    <div class="anno-content" v-html="annoHtml" />
  </div>
</template>
<script lang="ts" setup>
import { appWindow } from "@tauri-apps/api/window";
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";

import TSwitchTheme from "../components/app/t-switchTheme.vue";
import TShareBtn from "../components/main/t-shareBtn.vue";
import ToLoading from "../components/overlay/to-loading.vue";
import { saveImgLocal } from "../utils/TGShare";
import TGRequest from "../web/request/TGRequest";
import TGUtils from "../web/utils/TGUtils";

// loading
const loading = ref<boolean>(true);
const loadShare = ref<boolean>(false);
const loadingTitle = ref<string>("正在加载");
const loadingSub = ref<string>();
const loadingEmpty = ref<boolean>(false);

// share
const annoRef = ref<HTMLElement>(<HTMLElement>{});
const annoTitle = ref<string>("");

// 数据
const annoId = Number(useRoute().params.anno_id);
const annoData = ref<TGApp.BBS.Announcement.ContentItem>(<TGApp.BBS.Announcement.ContentItem>{});
const annoHtml = ref<string>();
const annoBanner = ref<string>();

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
    annoHtml.value = await TGUtils.Anno.parseContent(annoData.value.content);
    if (annoData.value.banner !== "") annoBanner.value = await saveImgLocal(annoData.value.banner);
    annoTitle.value = `Anno_${annoId}`;
    await appWindow.setTitle(`Anno_${annoId} ${annoData.value.title}`);
    annoRef.value = <HTMLElement>document.querySelector(".anno-body");
  } catch (error) {
    console.error(error);
    loadingEmpty.value = true;
    loadingTitle.value = "公告不存在或解析失败";
    await appWindow.setTitle(`Anno_${annoId} Parsing Error`);
    return;
  }
  setTimeout(() => {
    loading.value = false;
  }, 200);
});

watch(loadShare, (value) => {
  if (value) {
    loadingTitle.value = "正在生成分享图片";
    loadingSub.value = `${annoTitle.value}.png`;
    loading.value = true;
  } else {
    loadingSub.value = "";
    loading.value = false;
  }
});
</script>
<style lang="css" src="../assets/css/anno-parser.css" scoped></style>
