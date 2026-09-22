<template>
  <TOverlay v-model="visible" blur-val="5px" topOffset="112px">
    <div v-if="props.data" class="tua-ao-container">
      <slot name="left"></slot>
      <div :class="{ 'has-stage-chain': achievementStageChain.length > 1 }" class="tua-ao-box">
        <img :src="achievementCard" alt="" aria-hidden="true" class="tua-ao-bg" />
        <header class="tua-ao-header">
          <button
            class="tua-ao-series"
            title="查看所属系列"
            type="button"
            @click="emits('select-series', props.data.categoryId)"
          >
            <img :src="achievementSeriesIcon" alt="" aria-hidden="true" />
            <span>{{ achievementSeriesName }}</span>
          </button>
          <div class="tua-ao-title-main">
            <h2 class="tua-ao-title">{{ props.data.name }}</h2>
            <span class="tua-ao-version">v{{ props.data.version }}</span>
            <span v-if="achievementStageChain.length > 1" class="tua-ao-stage">
              阶段 {{ achievementStageIndex }}/{{ achievementStageChain.length }}
            </span>
            <span v-if="props.data.hidden" class="tua-ao-hidden">
              <v-icon size="12">mdi-eye-off-outline</v-icon>
              隐藏成就
            </span>
          </div>
        </header>
        <div class="tua-ao-info">
          <section aria-labelledby="achi-condition-title" class="tua-ao-panel tua-ao-conditions">
            <div class="tua-ao-section-heading">
              <h3 id="achi-condition-title">达成条件</h3>
              <span :title="props.data.trigger.type">{{ triggerTypeLabel }}</span>
            </div>
            <p class="tua-ao-condition-text">{{ props.data.description }}</p>
            <div v-if="groupedTriggerTasks.length > 0" class="tua-ao-task-grid">
              <button
                v-for="item in groupedTriggerTasks"
                :key="item.key"
                :title="`查询任务：${item.name}`"
                class="tua-ao-task"
                type="button"
                @click="searchDirect(item.name)"
              >
                <v-icon size="16">mdi-alert-decagram-outline</v-icon>
                <span class="tua-ao-task-content">
                  <span class="tua-ao-task-name">{{ item.name }}</span>
                  <span :title="item.type" class="tua-ao-task-meta">
                    {{ getTaskTypeLabel(item.type) }}<b v-if="item.count > 1"> ×{{ item.count }}</b>
                  </span>
                </span>
              </button>
            </div>
            <div class="tua-ao-condition-reward">
              <span>达成奖励</span>
              <span class="tua-ao-condition-reward-value">
                <span>{{ props.data.reward }}</span>
                <img alt="原石" src="/icon/material/201.webp" />
              </span>
            </div>
          </section>
          <section aria-labelledby="achi-record-title" class="tua-ao-panel tua-ao-record">
            <img
              :src="achievementStatusIcon"
              alt="statIcon"
              aria-hidden="true"
              class="tua-ao-record-ghost"
            />
            <div class="tua-ao-section-heading">
              <h3 id="achi-record-title">成就记录</h3>
              <button
                :aria-label="props.data.isCompleted ? '取消完成' : '标记完成'"
                :title="props.data.isCompleted ? '取消完成' : '标记完成'"
                class="tua-ao-completion-button"
                data-html2canvas-ignore
                type="button"
                @click="toggleCompletion"
              >
                <v-icon size="16">
                  {{ props.data.isCompleted ? "mdi-undo" : "mdi-check-circle-outline" }}
                </v-icon>
              </button>
            </div>
            <dl class="tua-ao-record-list">
              <div>
                <dt>完成状态</dt>
                <dd
                  :class="{
                    'is-completed': props.data.isCompleted,
                    'is-unclaimed': props.data.status === UiafAchiStatEnum.Finished,
                    'is-invalid': props.data.status === UiafAchiStatEnum.Invalid,
                  }"
                >
                  <v-icon size="16">
                    {{ getStatusIcon(props.data.status) }}
                  </v-icon>
                  {{ getStatusLabel(props.data.status) }}
                </dd>
              </div>
              <div>
                <dt>完成时间</dt>
                <dd>{{ props.data.isCompleted ? props.data.completedTime || "未记录" : "—" }}</dd>
              </div>
              <div>
                <dt>当前进度</dt>
                <dd>{{ props.data.progress }} / {{ props.data.target }}</dd>
              </div>
            </dl>
          </section>
        </div>
        <section
          v-if="otherAchievementStages.length > 0"
          aria-labelledby="achi-stages-title"
          class="tua-ao-panel tua-ao-stages"
        >
          <div class="tua-ao-section-heading">
            <h3 id="achi-stages-title">其他阶段</h3>
            <span data-html2canvas-ignore>点击阶段可查看完整详情</span>
          </div>
          <div class="tua-ao-stage-list">
            <button
              v-for="item in otherAchievementStages"
              :key="item.id"
              :class="{
                'is-completed': item.isCompleted,
                'is-unclaimed': item.status === UiafAchiStatEnum.Finished,
                'is-invalid': item.status === UiafAchiStatEnum.Invalid,
              }"
              :title="'查看阶段 ' + getStageIndex(item.id) + '：' + item.name"
              class="tua-ao-stage-item"
              type="button"
              @click="emits('select-achievement', item)"
            >
              <span class="tua-ao-stage-item-head">
                <strong>{{ item.name }}</strong>
                <span class="tua-ao-stage-item-index">
                  阶段 {{ getStageIndex(item.id) }}/{{ achievementStageChain.length }}
                </span>
              </span>
              <span class="tua-ao-stage-item-desc">{{ item.description }}</span>
              <span class="tua-ao-stage-item-footer">
                <span class="tua-ao-stage-item-status">
                  <v-icon size="14">
                    {{ getStatusIcon(item.status) }}
                  </v-icon>
                  {{ getStatusLabel(item.status) }}
                </span>
                <span class="tua-ao-stage-item-reward">
                  {{ item.reward }}
                  <img alt="原石" src="/icon/material/201.webp" />
                </span>
              </span>
            </button>
          </div>
        </section>
        <footer class="tua-ao-footer">
          <div class="tua-ao-metadata">
            <span>
              ID {{ props.data.id }} UID {{ props.data.uid }} | TeyvatGuide v{{
                appVersion ?? "..."
              }}
            </span>
          </div>
          <div class="tua-ao-actions" data-html2canvas-ignore>
            <v-btn
              class="tua-ao-action tua-ao-action-query"
              size="small"
              variant="text"
              @click="searchDirect(props.data.name)"
            >
              <v-icon>mdi-magnify</v-icon>
              <span>查询攻略</span>
            </v-btn>
            <v-btn
              :loading
              class="tua-ao-action tua-ao-action-share"
              size="small"
              variant="text"
              @click="share"
            >
              <v-icon>mdi-share-variant</v-icon>
              <span>分享</span>
            </v-btn>
          </div>
        </footer>
      </div>
      <slot name="right"></slot>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import { getStatusIcon, getStatusLabel, UiafAchiStatEnum } from "@enum/uiaf.js";
import TSUserAchi from "@Sqlm/userAchi.js";
import { event } from "@tauri-apps/api";
import { getVersion } from "@tauri-apps/api/app";
import TGLogger from "@utils/TGLogger.js";
import TGShare from "@utils/TGShare.js";
import { computed, onMounted, ref, shallowRef, watch } from "vue";

import { AppNameCardsData } from "@/data/index.js";

type ToAchiInfoProps = { data: TGApp.App.Achievement.RenderItem };
type ToAchiInfoEmits = {
  "select-achievement": [data: TGApp.App.Achievement.RenderItem];
  "select-series": [seriesId: number];
  search: [word: string];
  updated: [];
};
type GroupedTriggerTask = TGApp.App.Achievement.TriggerTask & {
  count: number;
  key: string;
};

const props = defineProps<ToAchiInfoProps>();
const emits = defineEmits<ToAchiInfoEmits>();
const visible = defineModel<boolean>({ required: true });
const loading = ref<boolean>(false);

async function toggleCompletion(): Promise<void> {
  const completed = props.data.isCompleted;
  const confirmed = await showDialog.checkF({
    title: completed ? "取消完成？" : "标记完成？",
    text: `确认将成就「${props.data.name}」${completed ? "设为未完成" : "标记为已完成"}？`,
    confirmLabel: completed ? "设为未完成" : "标记完成",
  });
  if (!confirmed) return;
  await TSUserAchi.updateAchievementProgress(
    props.data.uid,
    props.data.id,
    completed ? 0 : props.data.target,
  );
  await event.emit("updateAchi", props.data.categoryId);
  emits("updated");
}

const appVersion = ref<string>();
const achievementStages = shallowRef<Array<TGApp.App.Achievement.RenderItem>>([props.data]);
let stageLoadRequest = 0;
const achievementSeries = computed<TGApp.App.Achievement.Category | undefined>(() =>
  TSUserAchi.getAchievementCategoryById(props.data.categoryId),
);
const achievementSeriesName = computed<string>(() => achievementSeries.value?.name ?? "未知系列");
const achievementSeriesIcon = computed<string>(() => {
  const icon = achievementSeries.value?.icon ?? "UI_AchievementIcon_O001";
  return `/icon/achievement/${icon}.webp`;
});
const achievementStageChain = computed<Array<TGApp.App.Achievement.Definition>>(
  () => TSUserAchi.getAchievementStageChain(props.data.id) ?? [props.data],
);
const achievementStageIndex = computed<number>(() => {
  const index = achievementStageChain.value.findIndex((item) => item.id === props.data.id);
  return index === -1 ? 1 : index + 1;
});
const otherAchievementStages = computed<Array<TGApp.App.Achievement.RenderItem>>(() =>
  achievementStages.value.filter((item) => item.id !== props.data.id),
);
const completedStageCount = computed<number>(() => {
  const currentStageIndex = achievementStages.value.findIndex((item) => !item.isCompleted);
  return currentStageIndex === -1 ? achievementStageChain.value.length : currentStageIndex;
});
const achievementStatusIcon = computed<string>(
  () =>
    `/icon/achievement/UI_AchievementIcon_${achievementStageChain.value.length}_${completedStageCount.value}.webp`,
);
const achievementCard = computed<string>(() => {
  const namecardId = achievementSeries.value?.namecardId;
  const cardName =
    namecardId === undefined || namecardId === null
      ? "原神·印象"
      : (AppNameCardsData.find((item) => item.id === namecardId)?.name ?? "原神·印象");
  return `/WIKI/nameCard/profile/${cardName}.webp`;
});
const groupedTriggerTasks = computed<Array<GroupedTriggerTask>>(() => {
  const taskMap = new Map<string, GroupedTriggerTask>();
  for (const task of props.data.trigger.tasks) {
    const key = `${task.questId}:${task.name}:${task.type}`;
    const groupedTask = taskMap.get(key);
    if (groupedTask !== undefined) {
      groupedTask.count += 1;
      continue;
    }
    taskMap.set(key, { ...task, count: 1, key });
  }
  return Array.from(taskMap.values());
});
const triggerTypeLabel = computed<string>(() => {
  if (groupedTriggerTasks.value.length === 0) return props.data.trigger.type;
  return parseTriggerType(props.data.trigger.type);
});

onMounted(async () => (appVersion.value = await getVersion()));
watch(
  () => [props.data.id, props.data.uid],
  async () => await loadAchievementStages(),
  { immediate: true },
);

async function loadAchievementStages(): Promise<void> {
  const requestId = ++stageLoadRequest;
  if (achievementStageChain.value.length === 1) {
    achievementStages.value = [props.data];
    return;
  }
  if (!achievementStages.value.some((item) => item.id === props.data.id)) {
    achievementStages.value = [props.data];
  }
  const stages = await TSUserAchi.getAchievementStageItems(props.data.uid, props.data.id);
  if (requestId !== stageLoadRequest) return;
  achievementStages.value = stages.length > 0 ? stages : [props.data];
}

function getStageIndex(achievementId: number): number {
  const index = achievementStageChain.value.findIndex((item) => item.id === achievementId);
  return index === -1 ? 1 : index + 1;
}

async function searchDirect(word: string): Promise<void> {
  await TGLogger.Info(`[ToAchiInfo][${props.data.id}][Search] 查询 ${word}`);
  emits("search", word);
}

async function share(): Promise<void> {
  const achiBox = document.querySelector<HTMLElement>(".tua-ao-box");
  if (achiBox === null) {
    showSnackbar.error("未找到成就详情");
    return;
  }
  const fileName = `【成就详情】【${props.data.id}】-${props.data.name}`;
  const prevBoxShadow = achiBox.style.boxShadow;
  achiBox.style.boxShadow = "none";
  loading.value = true;
  try {
    await TGShare.modern(fileName, achiBox, 2.5);
  } finally {
    achiBox.style.boxShadow = prevBoxShadow;
    loading.value = false;
  }
}

function parseTriggerType(triggerType: string): string {
  switch (triggerType) {
    case "FINISH_QUEST_AND":
    case "FINISH_PARENT_QUEST_AND":
      return "完成以下所有任务";
    case "FINISH_QUEST_OR":
    case "FINISH_PARENT_QUEST_OR":
      return "完成以下任意任务";
    default:
      return triggerType;
  }
}

function getTaskTypeLabel(taskType: string): string {
  switch (taskType) {
    case "AQ":
      return "魔神任务";
    case "IQ":
      return "邀约任务";
    case "LQ":
      return "传说任务";
    case "WQ":
      return "世界任务";
    default:
      return taskType;
  }
}
</script>
<style lang="scss" scoped>
.tua-ao-container {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 12px;
}

.tua-ao-box {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 840px;
  height: 400px;
  box-sizing: border-box;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 16px;
  border-radius: 12px;
  aspect-ratio: 21 / 10;
  background: var(--app-page-bg);
  box-shadow: 0 0 4px var(--common-shadow-4);
  color: var(--box-text-1);
  isolation: isolate;
  row-gap: 8px;

  &::after {
    position: absolute;
    z-index: 1;
    border-radius: 12px;
    background: var(--common-shadow-1);
    content: "";
    inset: 0;
    pointer-events: none;
  }

  > :not(.tua-ao-bg) {
    position: relative;
    z-index: 2;
  }
}

.tua-ao-bg {
  position: absolute;
  z-index: 0;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  inset: 0;
  object-fit: cover;
  pointer-events: none;
}

.tua-ao-header {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  place-content: start center;
}

.tua-ao-series {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--tgc-od-orange);
  column-gap: 8px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  justify-self: start;
  line-height: 16px;
  text-shadow: 0 0 8px var(--common-shadow-t-8);
}

.tua-ao-series:hover {
  text-decoration: underline;
}

.tua-ao-series img {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: contain;
}

.tua-ao-title-main {
  position: relative;
  display: flex;
  overflow: hidden;
  min-width: 0;
  align-items: flex-start;
  column-gap: 4px;
}

.tua-ao-title {
  overflow: hidden;
  margin: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 24px;
  font-weight: normal;
  line-height: 32px;
  text-overflow: ellipsis;
  text-shadow: 0 0 4px var(--common-shadow-t-8);
  white-space: nowrap;
}

.tua-ao-version {
  display: inline-flex;
  height: 20px;
  flex-shrink: 0;
  align-items: center;
  padding: 0 4px;
  border: 1px solid var(--tgc-od-orange);
  border-radius: 4px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: color-mix(in srgb, var(--tgc-od-orange) 20%, transparent);
  color: var(--tgc-od-orange);
  font-family: var(--font-title);
  font-size: 10px;
  line-height: 14px;
}

.tua-ao-stage,
.tua-ao-hidden {
  display: inline-flex;
  height: 20px;
  flex-shrink: 0;
  align-items: center;
  padding: 0 4px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: var(--common-shadow-t-2);
  column-gap: 4px;
  font-size: 10px;
  line-height: 14px;
}

.tua-ao-stage {
  color: var(--tgc-od-blue);
}

.tua-ao-hidden {
  border-color: var(--tgc-od-orange);
  color: var(--tgc-od-orange);
}

.tua-ao-info {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  column-gap: 4px;
}

.tua-ao-condition-text {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  -webkit-box-orient: vertical;
  color: var(--box-text-1);
  font-size: 14px;
  -webkit-line-clamp: 2;
  line-height: 20px;
}

.tua-ao-panel {
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: var(--common-shadow-t-4);
}

.tua-ao-conditions {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  align-self: start;
  justify-content: flex-start;
  row-gap: 4px;
}

.tua-ao-record {
  position: relative;
  overflow: hidden;
  width: 240px;
  flex-shrink: 0;
  align-self: start;
  isolation: isolate;

  > :not(.tua-ao-record-ghost) {
    position: relative;
    z-index: 1;
  }
}

.tua-ao-record-ghost {
  position: absolute;
  z-index: 0;
  top: -20px;
  right: -16px;
  width: 120px;
  height: 120px;
  filter: grayscale(0.6);
  object-fit: contain;
  opacity: 0.18;
  pointer-events: none;
}

.tua-ao-section-heading {
  display: flex;
  height: 20px;
  align-items: flex-end;
  justify-content: flex-start;
  column-gap: 4px;

  h3 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
    line-height: 20px;
  }

  > span {
    overflow: hidden;
    color: var(--box-text-4);
    font-size: 12px;
    line-height: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.tua-ao-completion-button {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: var(--common-shadow-2);
  color: var(--box-text-2);
  cursor: pointer;

  &:hover {
    background: var(--common-shadow-1);
    color: var(--tgc-yellow-2);
  }
}

.tua-ao-task-grid {
  position: relative;
  display: grid;
  width: 100%;
  gap: 4px 8px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.tua-ao-task {
  display: flex;
  overflow: hidden;
  min-width: 0;
  height: 40px;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: var(--common-shadow-t-1);
  color: var(--box-text-1);
  column-gap: 8px;
  cursor: pointer;
  font: inherit;
  text-align: left;

  &:hover {
    background: var(--common-shadow-1);
  }
}

.tua-ao-task > .v-icon {
  flex-shrink: 0;
  color: var(--box-text-5);
}

.tua-ao-task-content {
  display: flex;
  overflow: hidden;
  min-width: 0;
  flex-direction: column;
}

.tua-ao-task-name,
.tua-ao-task-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tua-ao-task-name {
  font-size: 12px;
  line-height: 16px;
}

.tua-ao-task-meta {
  color: var(--box-text-4);
  font-size: 10px;
  line-height: 14px;
}

.tua-ao-task-meta b {
  color: var(--tgc-yellow-3);
  font-weight: 600;
}

.tua-ao-condition-reward {
  position: relative;
  display: flex;
  width: 100%;
  height: 28px;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: var(--common-shadow-t-2);
  color: var(--box-text-4);
  column-gap: 12px;
  font-size: 12px;
  line-height: 20px;
}

.tua-ao-condition-reward-value {
  display: inline-flex;
  align-items: center;
  color: var(--common-text-title);
  column-gap: 4px;
  font-weight: 600;
}

.tua-ao-condition-reward-value img {
  width: 18px;
  height: 18px;
}

.tua-ao-record-list {
  display: grid;
  margin: 8px 0 0;
  row-gap: 8px;
}

.tua-ao-record-list > div {
  display: grid;
  align-items: center;
  column-gap: 8px;
  grid-template-columns: 72px minmax(0, 1fr);
}

.tua-ao-record-list dt,
.tua-ao-record-list dd {
  margin: 0;
  font-size: 12px;
  line-height: 20px;
}

.tua-ao-record-list dt {
  color: var(--box-text-4);
}

.tua-ao-record-list dd {
  display: inline-flex;
  overflow: hidden;
  align-items: center;
  color: var(--box-text-1);
  column-gap: 4px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tua-ao-record-list dd.is-completed {
  color: var(--tgc-yellow-3);
  font-weight: 600;
}

.tua-ao-record-list dd.is-unclaimed {
  color: var(--tgc-od-red);
}

.tua-ao-record-list dd.is-invalid {
  color: var(--tgc-od-orange);
}

.tua-ao-stages {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-self: flex-start;
  justify-content: flex-start;
  row-gap: 4px;
}

.tua-ao-stage-list {
  display: grid;
  gap: 4px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.tua-ao-stage-item {
  display: flex;
  overflow: hidden;
  min-width: 0;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--common-shadow-t-2);
  color: var(--box-text-1);
  cursor: pointer;
  font: inherit;
  gap: 4px;
  text-align: left;

  &:hover {
    border-color: var(--common-shadow-1);
    background: var(--common-shadow-2);
  }
}

.tua-ao-stage-item-head {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  column-gap: 8px;
}

.tua-ao-stage-item-head strong {
  overflow: hidden;
  min-width: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tua-ao-stage-item-index {
  flex-shrink: 0;
  color: var(--box-text-4);
  font-size: 10px;
  line-height: 14px;
}

.tua-ao-stage-item-desc {
  display: -webkit-box;
  overflow: hidden;
  min-height: 28px;
  -webkit-box-orient: vertical;
  color: var(--box-text-4);
  font-size: 10px;
  -webkit-line-clamp: 2;
  line-height: 14px;
}

.tua-ao-stage-item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  column-gap: 12px;
}

.tua-ao-stage-item-status,
.tua-ao-stage-item-reward {
  display: inline-flex;
  align-items: center;
  color: var(--box-text-2);
  column-gap: 4px;
  font-size: 10px;
  line-height: 14px;
}

.tua-ao-stage-item.is-completed .tua-ao-stage-item-status {
  color: var(--tgc-yellow-3);
  font-weight: 600;
}

.tua-ao-stage-item.is-unclaimed .tua-ao-stage-item-status {
  color: var(--tgc-od-red);
}

.tua-ao-stage-item.is-invalid .tua-ao-stage-item-status {
  color: var(--tgc-od-orange);
}

.tua-ao-stage-item-reward {
  color: var(--common-text-title);
  column-gap: 2px;
  font-weight: 600;
}

.tua-ao-stage-item-reward img {
  width: 16px;
  height: 16px;
}

.tua-ao-footer {
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: auto;
  column-gap: 16px;
}

.tua-ao-metadata {
  display: flex;
  overflow: hidden;
  min-width: 0;
  align-items: center;
  color: var(--tgc-white-1);
  column-gap: 12px;
  font-size: 12px;
  line-height: 16px;
  text-shadow: 1px 1px 1px var(--tgc-dark-1);
}

.tua-ao-metadata > span {
  flex-shrink: 0;
}

.tua-ao-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  column-gap: 8px;
}

.tua-ao-action.v-btn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid;
  border-radius: 4px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  text-shadow: 0 0 4px var(--common-shadow-t-4);
}

.tua-ao-action-query {
  background: var(--common-shadow-t-2);
  color: var(--tgc-od-blue);

  &:hover {
    background: var(--common-shadow-1);
  }
}

.tua-ao-action-share {
  background: var(--common-shadow-t-2);
  color: var(--tgc-od-purple);

  &:hover {
    background: var(--common-shadow-1);
  }
}
</style>
