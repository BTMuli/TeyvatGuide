<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="0">
    <div class="tua-ao-container" v-if="props.data">
      <slot name="left"></slot>
      <div class="tua-ao-box">
        <div class="tua-ao-top">
          <span class="tua-ao-click" @click="searchDirect(props.data.name)">
            {{ props.data.name }}
          </span>
          <span>{{ props.data.description }}</span>
        </div>
        <div class="tua-ao-mid-title">
          <span>所属系列：</span>
          <span class="tua-ao-click" @click="emits('select-series', props.data.series)">
            {{ AppAchievementSeriesData.find((s) => s.id === props.data?.series)?.name ?? "未知" }}
          </span>
        </div>
        <div class="tua-ao-mid-title">
          <span>原石奖励：</span>
          <span>{{ props.data.reward }}</span>
        </div>
        <div class="tua-ao-mid-title">
          <span>触发方式：</span>
          <span>{{ props.data.trigger.task ? "完成以下所有任务" : props.data.trigger.type }}</span>
        </div>
        <div class="tua-ao-mid-item" v-for="item in props.data.trigger.task" :key="item.questId">
          <v-icon>mdi-alert-decagram</v-icon>
          <span class="tua-ao-click" @click="searchDirect(item.name)">{{ item.name }}</span>
          <span>（{{ item.type }}）</span>
        </div>
        <div>
          <div class="tua-ao-bottom-title">
            <span>是否完成：</span>
            <span>{{ props.data.isCompleted ? "是" : "否" }}</span>
          </div>
          <div class="tua-ao-bottom-title">
            <span>完成时间：</span>
            <span>{{ props.data.completedTime }}</span>
          </div>
          <div class="tua-ao-bottom-title">
            <span>当前进度：</span>
            <span>{{ props.data.progress }}</span>
          </div>
        </div>
        <div class="tua-ao-extra">
          <span>ID：{{ props.data.id }}</span>
        </div>
      </div>
      <slot name="right"></slot>
    </div>
  </TOverlay>
  <VpOverlaySearch gid="2" v-model="showSearch" :keyword="search" />
</template>
<script lang="ts" setup>
import { computed, ref } from "vue";

import { AppAchievementSeriesData } from "../../data/index.js";
import TGLogger from "../../utils/TGLogger.js";
import TOverlay from "../app/t-overlay.vue";
import VpOverlaySearch from "../viewPost/vp-overlay-search.vue";

interface ToAchiInfoProps {
  modelValue: boolean;
  data: TGApp.Sqlite.Achievement.RenderAchi;
}

interface ToAchiInfoEmits {
  (e: "update:modelValue", v: boolean): void;

  (e: "select-series", v: number): void;
}

const props = defineProps<ToAchiInfoProps>();
const emits = defineEmits<ToAchiInfoEmits>();
const showSearch = ref<boolean>(false);
const search = ref<string>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});

function onCancel() {
  visible.value = false;
}

async function searchDirect(word: string): Promise<void> {
  await TGLogger.Info(`[ToAchiInfo][${props.data.id}][Search] 查询 ${word}`);
  search.value = word;
  showSearch.value = true;
}
</script>
<style lang="css" scoped>
.tua-ao-container {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 10px;
}

.tua-ao-box {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 600px;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px;
  border-radius: 10px;
  background: var(--box-bg-1);
  row-gap: 10px;
}

.tua-ao-top {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
}

.tua-ao-top :first-child {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 24px;
}

.tua-ao-top-main :last-child {
  padding: 0 5px;
  border-radius: 5px;
  background: var(--box-bg-2);
  color: var(--box-text-5);
  font-family: var(--font-title);
}

.tua-ao-mid-title,
.tua-ao-bottom-title {
  font-size: 18px;
}

.tua-ao-mid-title :first-child,
.tua-ao-bottom-title :first-child {
  font-family: var(--font-title);
}

.tua-ao-mid-title :last-child {
  color: var(--box-text-3);
}

.tua-ao-mid-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 15px;
  margin-top: 5px;
  column-gap: 5px;
  font-size: 18px;
}

.tua-ao-mid-item :first-child {
  color: var(--box-text-5);
}

.tua-ao-extra {
  position: absolute;
  right: 10px;
  bottom: 10px;
}

.tua-ao-click {
  cursor: pointer;
}
</style>
