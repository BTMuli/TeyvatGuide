<template>
  <TOverlay v-model="visible" blur-val="5px">
    <div class="tua-ao-container" v-if="props.data">
      <slot name="left"></slot>
      <div class="tua-ao-box">
        <div class="tua-ao-top">
          <span class="tua-ao-click" title="查询" @click="searchDirect(props.data.name)">
            {{ props.data.name }}
          </span>
          <span class="tua-ao-click" title="分享" @click="share()">
            {{ props.data.description }}
          </span>
        </div>
        <div class="tua-ao-mid">
          <div class="tua-ao-mid-title">
            <span>所属系列：</span>
            <span class="tua-ao-click" @click="emits('select-series', props.data.series)">
              {{
                AppAchievementSeriesData.find((s) => s.id === props.data?.series)?.name ?? "未知"
              }}
            </span>
          </div>
          <div class="tua-ao-mid-title">
            <span>原石奖励：</span>
            <span>{{ props.data.reward }}</span>
          </div>
          <div class="tua-ao-mid-title">
            <span>触发方式：</span>
            <span>{{
              props.data.trigger.task ? "完成以下所有任务" : props.data.trigger.type
            }}</span>
          </div>
          <div class="tua-ao-mid-item" v-for="item in props.data.trigger.task" :key="item.questId">
            <v-icon>mdi-alert-decagram</v-icon>
            <span class="tua-ao-click" @click="searchDirect(item.name)">{{ item.name }}</span>
            <span>（{{ item.type }}）</span>
          </div>
        </div>
        <div class="tua-ao-bottom">
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
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import VpOverlaySearch from "@comp/viewPost/vp-overlay-search.vue";
import { ref } from "vue";

import { AppAchievementSeriesData } from "@/data/index.js";
import TGLogger from "@/utils/TGLogger.js";
import { generateShareImg } from "@/utils/TGShare.js";

type ToAchiInfoProps = { data: TGApp.Sqlite.Achievement.RenderAchi };
type ToAchiInfoEmits = (e: "select-series", v: number) => void;

const props = defineProps<ToAchiInfoProps>();
const emits = defineEmits<ToAchiInfoEmits>();
const visible = defineModel<boolean>();
const showSearch = ref<boolean>(false);
const search = ref<string>();

async function searchDirect(word: string): Promise<void> {
  await TGLogger.Info(`[ToAchiInfo][${props.data.id}][Search] 查询 ${word}`);
  search.value = word;
  showSearch.value = true;
}

async function share(): Promise<void> {
  const achiBox = document.querySelector<HTMLElement>(".tua-ao-box");
  if (achiBox === null) {
    showSnackbar.error("未找到成就详情");
    return;
  }
  const fileName = `【成就详情】【${props.data.id}】-${props.data.name}`;
  await generateShareImg(fileName, achiBox);
}
</script>
<style lang="css" scoped>
.tua-ao-container {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
}

.tua-ao-box {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 600px;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
  row-gap: 8px;
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
