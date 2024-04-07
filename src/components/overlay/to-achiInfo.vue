<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="0">
    <div class="toai-container" v-if="props.data">
      <slot name="left"></slot>
      <div class="toai-box">
        <div class="toai-top">
          <span class="toai-click" @click="searchDirect(props.data.name)">{{
            props.data.name
          }}</span>
          <span>{{ props.data.description }}</span>
        </div>
        <div v-if="achiLC">
          <div class="toai-mid-title">
            <span>所属系列：</span>
            <span class="toai-click" @click="emits('selectS', props.data.series)">{{
              AppAchievementSeriesData.find((s) => s.id === props.data?.series)?.name ?? "未知"
            }}</span>
          </div>
          <div class="toai-mid-title">
            <span>原石奖励：</span>
            <span>{{ props.data.reward }}</span>
          </div>
          <div class="toai-mid-title">
            <span>触发方式：</span>
            <span>{{ achiLC.trigger.task ? "完成以下所有任务" : achiLC.trigger.type }}</span>
          </div>
          <div class="toai-mid-item" v-for="item in achiLC.trigger.task" :key="item.questId">
            <v-icon>mdi-alert-decagram</v-icon>
            <span class="toai-click" @click="searchDirect(item.name)">{{ item.name }}</span>
            <span>（{{ item.type }}）</span>
          </div>
        </div>
        <div>
          <div class="toai-bottom-title">
            <span>是否完成：</span>
            <span>{{ props.data.isCompleted ? "是" : "否" }}</span>
          </div>
          <div class="toai-bottom-title">
            <span>完成时间：</span>
            <span>{{ props.data.completedTime }}</span>
          </div>
          <div class="toai-bottom-title">
            <span>当前进度：</span>
            <span>{{ props.data.progress }}</span>
          </div>
        </div>
        <div class="toai-extra">
          <span>ID：{{ props.data.id }}</span>
        </div>
      </div>
      <slot name="right"></slot>
    </div>
  </TOverlay>
  <ToPostSearch gid="2" v-model="showSearch" v-model:keyword="search" />
</template>
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";

import { AppAchievementsData, AppAchievementSeriesData } from "../../data";
import TGLogger from "../../utils/TGLogger";
import TOverlay from "../main/t-overlay.vue";
import ToPostSearch from "../post/to-postSearch.vue";

interface ToAchiInfoProps {
  modelValue: boolean;
  data?: TGApp.Sqlite.Achievement.SingleTable;
}

interface ToAchiInfoEmits {
  (e: "update:modelValue", v: boolean): void;

  (e: "selectS", v: number): void;
}

const props = defineProps<ToAchiInfoProps>();
const emits = defineEmits<ToAchiInfoEmits>();
const showSearch = ref(false);
const search = ref("");

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});

const achiLC = ref<TGApp.App.Achievement.Item>();

onMounted(() => getData);
watch(() => props.data, getData);

function getData(): void {
  const res = AppAchievementsData.find((item) => item.id === props.data?.id);
  if (res) {
    achiLC.value = res;
  } else {
    achiLC.value = undefined;
  }
}

// 点击外部关闭
function onCancel() {
  visible.value = false;
}

async function searchDirect(word: string): Promise<void> {
  await TGLogger.Info(`[ToAchiInfo][${props.data?.id}][Search] 查询 ${word}`);
  search.value = word;
  showSearch.value = true;
}
</script>
<style lang="css" scoped>
.toai-container {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 10px;
}

.toai-box {
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

.toai-top {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
}

.toai-top :first-child {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 24px;
}

.toai-top-main :last-child {
  padding: 0 5px;
  border-radius: 5px;
  background: var(--box-bg-2);
  color: var(--box-text-5);
  font-family: var(--font-title);
}

.toai-mid-title,
.toai-bottom-title {
  font-size: 18px;
}

.toai-mid-title :first-child,
.toai-bottom-title :first-child {
  font-family: var(--font-title);
}

.toai-mid-title :last-child {
  color: var(--box-text-3);
}

.toai-mid-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 15px;
  margin-top: 5px;
  column-gap: 5px;
  font-size: 18px;
}

.toai-mid-item :first-child {
  color: var(--box-text-5);
}

.toai-extra {
  position: absolute;
  right: 10px;
  bottom: 10px;
}

.toai-click {
  cursor: pointer;
}
</style>
