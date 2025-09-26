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
            <img src="/icon/material/201.webp" alt="原石" />
          </div>
          <div class="tua-ao-mid-title">
            <span>触发方式：</span>
            <span>{{ parseTriggerType() }}</span>
          </div>
          <div class="tua-ao-mid-item" v-for="item in props.data.trigger.task" :key="item.questId">
            <v-icon size="16">mdi-alert-decagram</v-icon>
            <span class="tua-ao-click" @click="searchDirect(item.name)">{{ item.name }}</span>
            <span>（{{ item.type }}）</span>
          </div>
        </div>
        <div class="tua-ao-bottom">
          <div class="tua-ao-bottom-title">
            <span>是否完成：</span>
            <span>{{ props.data.isCompleted ? "是" : "否" }}</span>
          </div>
          <div class="tua-ao-bottom-title" v-if="props.data.isCompleted">
            <span>完成时间：</span>
            <span>{{ props.data.completedTime }}</span>
          </div>
          <div class="tua-ao-bottom-title" v-if="props.data.progress > 0">
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
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import { ref } from "vue";

import { AppAchievementSeriesData } from "@/data/index.js";

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

function parseTriggerType(): string {
  switch (props.data.trigger.type) {
    case "FINISH_QUEST_AND":
    case "FINISH_PARENT_QUEST_AND":
      return "完成以下所有任务";
    case "FINISH_QUEST_OR":
    case "FINISH_PARENT_QUEST_OR":
      return "完成以下任意任务";
    default:
      return props.data.trigger.type;
  }
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
  row-gap: 4px;
}

.tua-ao-top {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;

  :first-child {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }

  :last-child {
    font-size: 14px;
    font-style: italic;
    opacity: 0.8;
  }
}

.tua-ao-bottom-title {
  font-size: 18px;
}

.tua-ao-bottom-title :first-child {
  font-family: var(--font-title);
}

.tua-ao-mid-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;

  :first-child {
    font-family: var(--font-title);
    font-size: 18px;
  }

  :not(:first-child) {
    color: var(--tgc-od-orange);
  }

  img {
    width: 24px;
    height: 24px;
  }
}

.tua-ao-mid-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 16px;
  column-gap: 4px;
  font-size: 14px;

  :first-child {
    color: var(--box-text-5);
  }
}

.tua-ao-extra {
  position: absolute;
  right: 4px;
  bottom: 0;
  color: var(--tgc-od-white);
  font-size: 12px;
}

.tua-ao-click {
  cursor: pointer;
  text-align: center;
}
</style>
