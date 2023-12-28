<template>
  <TSwitchTheme />
  <ToLoading v-model="loading" :empty="loadingEmpty" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="tww-box" v-if="data !== undefined">
    <div class="tww-brief">
      <TItembox :model-value="box" />
      <div class="tww-brief-info">
        <div class="tww-brief-title">{{ data.name }}</div>
        <v-rating
          class="tww-brief-rating"
          v-model="select"
          :length="selectItems.length"
          :size="24"
          dense
        />
        <div class="tww-brief-desc">{{ data.description }}</div>
      </div>
    </div>
    <TwcMaterials :data="data.materials" />
    <v-expansion-panels class="tww-affix">
      <v-expansion-panel expand-icon="mdi-menu-down">
        <template #title>
          <span class="tww-text-title">{{ data.affix.Name }}-精炼 {{ select }}</span>
        </template>
        <template #text>
          <span
            class="tww-text-content"
            v-html="parseHtmlText(data.affix.Descriptions[select - 1].Description)"
          />
        </template>
      </v-expansion-panel>
    </v-expansion-panels>
    <v-expansion-panels class="tww-story">
      <v-expansion-panel
        expand-icon="mdi-menu-down"
        v-for="(story, index) in data.story"
        :key="index"
      >
        <template #title>
          <span class="tww-text-title">
            {{ data.story.length > 1 ? `故事 ${index + 1}` : "故事" }}
          </span>
        </template>
        <template #text>
          <span class="tww-text-content">{{ parseHtmlText(story) }}</span>
        </template>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>
<script lang="ts" setup>
import { appWindow } from "@tauri-apps/api/window";
import { computed, onMounted, ref, toRaw } from "vue";
import { useRoute } from "vue-router";

import TSwitchTheme from "../components/app/t-switchTheme.vue";
import showSnackbar from "../components/func/snackbar";
import TItembox, { TItemBoxData } from "../components/main/t-itembox.vue";
import ToLoading from "../components/overlay/to-loading.vue";
import TwcMaterials from "../components/wiki/twc-materials.vue";
import { getWikiData } from "../data";
import { parseHtmlText } from "../utils/toolFunc";

// 路由数据
const id = <string>useRoute().params.id;
// 加载
const loading = ref<boolean>(true);
const loadingEmpty = ref<boolean>(false);
const loadingTitle = ref<string>("正在加载");
const loadingSub = ref<string>();

// 数据
const data = ref<TGApp.App.Weapon.WikiItem>();
const box = computed(() => {
  return <TItemBoxData>{
    bg: `/icon/bg/${data.value?.star}-Star.webp`,
    icon: `/WIKI/weapon/${data.value?.id}.webp`,
    size: "128px",
    height: "128px",
    display: "inner",
    lt: `/icon/weapon/${data.value?.weapon}.webp`,
    ltSize: "40px",
    innerHeight: 0,
    clickable: false,
  };
});
const select = ref<number>(1);
const selectItems = ref<number[]>([]);

onMounted(async () => {
  await appWindow.show();
  try {
    const res = await getWikiData("Weapon", id);
    if (res !== undefined) {
      data.value = res.default;
      console.log(toRaw(data.value));
    }
    selectItems.value = data.value?.affix.Descriptions.map((item) => item.Level) ?? [];
    loading.value = false;
  } catch (error) {
    loadingEmpty.value = true;
    if (error instanceof Error) {
      loadingTitle.value = error.name;
      loadingSub.value = error.message;
    } else {
      loadingTitle.value = "未知错误";
      loadingSub.value = <string>error;
    }
    showSnackbar({
      text: "Wiki 数据获取失败，即将关闭窗口",
      color: "error",
    });
    setTimeout(() => {
      appWindow.close();
    }, 3000);
  }
});
</script>
<style lang="css" scoped>
.tww-box {
  display: flex;
  width: 800px;
  flex-direction: column;
  margin: 0 auto;
  row-gap: 10px;
}

.tww-brief {
  display: flex;
  align-items: flex-start;
  column-gap: 10px;
}

.tww-brief-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.tww-brief-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.tww-brief-rating {
  color: var(--common-text-title);
}

.tww-brief-desc {
  display: flex;
  align-items: flex-end;
  opacity: 0.8;
}

.tww-story {
  display: flex;
  flex-direction: column;
  row-gap: 5px;
}

.tww-text-title {
  font-weight: bold;
}

.tww-text-content {
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
