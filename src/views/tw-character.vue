<template>
  <TSwitchTheme />
  <ToLoading v-model="loading" :empty="loadingEmpty" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="twc-box" v-if="data !== undefined">
    <div class="twc-brief">
      <TItembox :model-value="box" />
      <div class="twc-brief-info">
        <div class="twc-bi-top">
          <span>{{ data.name }} {{ data.title }}</span>
          <span>{{ data.description }}</span>
        </div>
        <div class="twc-bi-grid">
          <div class="twc-bim-item">
            <span>所属</span>
            <span>{{ data.brief.camp }}</span>
          </div>
          <div class="twc-bim-item">
            <span>命之座</span>
            <span>{{ data.brief.constellation }}</span>
          </div>
          <div class="twc-bim-item">
            <span>生日</span>
            <span>{{ data.brief.birth }}</span>
          </div>
        </div>
        <div class="twc-bi-grid">
          <div class="twc-bib-item">
            <span>汉语CV</span>
            <span>{{ data.brief.cv.cn }}</span>
          </div>
          <div class="twc-bib-item">
            <span>日语CV</span>
            <span>{{ data.brief.cv.jp }}</span>
          </div>
          <div class="twc-bib-item">
            <span>英语CV</span>
            <span>{{ data.brief.cv.en }}</span>
          </div>
          <div class="twc-bib-item">
            <span>韩语CV</span>
            <span>{{ data.brief.cv.kr }}</span>
          </div>
        </div>
      </div>
    </div>
    <TwcMaterials :data="data.materials" />
    <TwcSkills :data="data.skills" />
    <TwcConstellations :data="data.constellation" />
    <v-expansion-panels :theme="vuetifyTheme" class="twc-text-item">
      <v-expansion-panel>
        <template #title><span class="twc-text-title">资料</span></template>
        <template #text>
          <v-expansion-panels variant="popout">
            <v-expansion-panel
              expand-icon="mdi-menu-down"
              v-for="(item, index) in data?.talks"
              :key="index"
            >
              <template #title
                ><span class="twc-text-item-title">{{ item.Title }}</span></template
              >
              <template #text
                ><span class="twc-text-item-content">{{ item.Context }}</span></template
              >
            </v-expansion-panel>
          </v-expansion-panels>
        </template>
      </v-expansion-panel>
      <v-expansion-panel>
        <template #title><span class="twc-text-title">故事</span></template>
        <template #text>
          <v-expansion-panels variant="popout">
            <v-expansion-panel
              expand-icon="mdi-menu-down"
              v-for="(item, index) in data.stories"
              :key="index"
            >
              <template #title
                ><span class="twc-text-item-title">{{ item.Title }}</span></template
              >
              <template #text
                ><span class="twc-text-item-content">{{ item.Context }}</span></template
              >
            </v-expansion-panel>
          </v-expansion-panels>
        </template>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>
<script lang="ts" setup>
import { appWindow } from "@tauri-apps/api/window";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import TSwitchTheme from "../components/app/t-switchTheme.vue";
import showSnackbar from "../components/func/snackbar";
import TItembox, { TItemBoxData } from "../components/main/t-itembox.vue";
import ToLoading from "../components/overlay/to-loading.vue";
import TwcConstellations from "../components/wiki/twc-constellations.vue";
import TwcMaterials from "../components/wiki/twc-materials.vue";
import TwcSkills from "../components/wiki/twc-skills.vue";
import { getWikiData } from "../data";
import { useAppStore } from "../store/modules/app";

// 路由数据
const id = <string>useRoute().params.id;
// 加载
const loading = ref<boolean>(true);
const loadingEmpty = ref<boolean>(false);
const loadingTitle = ref<string>("正在加载");
const loadingSub = ref<string>();

// 主题
const appStore = useAppStore();
const vuetifyTheme = computed(() => {
  return appStore.theme === "dark" ? "dark" : "light";
});

// 数据
const data = ref<TGApp.App.Character.WikiItem>();
const box = computed(() => {
  return <TItemBoxData>{
    bg: `/icon/bg/${data.value?.star}-Star.webp`,
    icon: `/WIKI/character/${data.value?.id}.webp`,
    size: "128px",
    height: "128px",
    display: "inner",
    lt: `/icon/element/${data.value?.element}元素.webp`,
    ltSize: "40px",
    innerHeight: 30,
    innerIcon: `/icon/weapon/${data.value?.weapon}.webp`,
    innerText: data.value?.name,
    clickable: false,
  };
});

onMounted(async () => {
  await appWindow.show();
  try {
    const res = await getWikiData("Character", id);
    if (res === undefined) return;
    data.value = res.default;
    await appWindow.setTitle(`Wiki_Character - ${data.value.name}`);
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
.twc-box {
  display: flex;
  width: 800px;
  flex-direction: column;
  margin: 0 auto;
  row-gap: 10px;
}

.twc-brief {
  display: flex;
  align-items: flex-end;
  column-gap: 10px;
}

.twc-brief-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.twc-bi-top {
  display: flex;
  flex-direction: column;
}

.twc-bi-top :nth-child(1) {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.twc-bi-top :nth-child(2) {
  display: flex;
  align-items: flex-end;
  font-size: 14px;
  opacity: 0.8;
}

.twc-bi-grid {
  display: grid;
  column-gap: 10px;
  grid-template-columns: repeat(4, 1fr);
}

.twc-bim-item {
  display: flex;
  column-gap: 5px;
}

.twc-bim-item :nth-child(1) {
  font-weight: bold;
}

.twc-bib-item {
  display: flex;
  flex-direction: column;
}

.twc-bib-item :nth-child(1) {
  font-weight: bold;
}

.twc-text-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
}

.twc-text-item {
  display: flex;
  flex-direction: column;
  row-gap: 5px;
}

.twc-text-item-title {
  font-weight: bold;
}

.twc-text-item-content {
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
