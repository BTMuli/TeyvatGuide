<template>
  <div
    :class="{
      'is-staged': stageCount > 1,
      'is-stage-child': props.isStageChild,
    }"
    :title="getAchiTitle()"
    class="achi-container"
    @click="selectAchi()"
  >
    <div aria-hidden="true" class="achi-state-ghost">
      <img :src="achievementStatusIcon" alt="" />
    </div>
    <div class="achi-version">v{{ props.data.version }}</div>
    <button
      v-if="props.expandable"
      :aria-label="props.expanded ? '收起前序阶段' : '展开前序阶段'"
      :aria-expanded="props.expanded"
      :title="props.expanded ? '收起前序阶段' : '展开前序阶段'"
      class="achi-stage-toggle"
      type="button"
      @click.stop="emits('toggle-stages')"
    >
      <v-icon :icon="props.expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="16" />
    </button>
    <div class="achi-pre">
      <div class="achi-pre-icon">
        <button
          :aria-label="props.data.isCompleted ? '设为未完成' : '设置完成进度'"
          :title="props.data.isCompleted ? '设为未完成' : '设置完成进度'"
          class="achi-state"
          type="button"
          @click.stop="setAchiStat(!props.data.isCompleted)"
        >
          <img :src="achievementStatusIcon" alt="" aria-hidden="true" />
        </button>
      </div>
      <div class="achi-pre-info">
        <div class="achi-pre-info__title">
          <span>{{ props.data.name }}</span>
          <v-icon v-if="props.data.hidden" class="achi-pre-info__hidden" size="14" title="隐藏成就">
            mdi-eye-off-outline
          </v-icon>
          <button
            v-if="props.data.target > 1 || stageCount > 1"
            class="achi-pre-info__progress"
            title="编辑进度"
            type="button"
            @click.stop="editProgress(props.data.progress)"
          >
            {{ props.data.progress }}/{{ props.data.target }}
          </button>
        </div>
        <div class="achi-pre-info__desc">{{ props.data.description }}</div>
      </div>
    </div>
    <div class="achi-append">
      <span v-show="props.data.isCompleted">{{ props.data.completedTime }}</span>
      <div class="achi-append-icon">
        <img alt="icon" src="/icon/material/201.webp" />
        <span>{{ props.data.reward }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import { UiafAchiStatEnum } from "@enum/uiaf.js";
import TSUserAchi from "@Sqlm/userAchi.js";
import { event } from "@tauri-apps/api";
import { computed } from "vue";

type TuaAchiProps = {
  data: TGApp.App.Achievement.RenderItem;
  expandable: boolean;
  expanded: boolean;
  isStageChild: boolean;
  stageIndex: number;
  stageCount: number;
};
type TuaAchiEmits = {
  "select-achi": [data: TGApp.App.Achievement.RenderItem];
  "toggle-stages": [];
  updated: [];
};

const props = defineProps<TuaAchiProps>();
const emits = defineEmits<TuaAchiEmits>();
const stageChain = computed<Array<TGApp.App.Achievement.Definition>>(
  () => TSUserAchi.getAchievementStageChain(props.data.id) ?? [props.data],
);
const completedStageCount = computed<number>(() =>
  props.data.isCompleted ? props.stageIndex : props.stageIndex - 1,
);
const achievementStatusIcon = computed<string>(
  () =>
    `/icon/achievement/UI_AchievementIcon_${props.stageCount}_${completedStageCount.value}.webp`,
);
const maxProgress = computed<number>(() =>
  Math.max(...stageChain.value.map((achievement) => achievement.target)),
);

function getAchiTitle(): string {
  const category = TSUserAchi.getAchievementCategoryById(props.data.categoryId);
  if (!category) return "未知";
  return category.name;
}

function selectAchi(): void {
  emits("select-achi", props.data);
}

async function setAchiStat(stat: boolean): Promise<void> {
  if (!stat) {
    await TSUserAchi.updateAchi({
      ...props.data,
      isCompleted: false,
      status: UiafAchiStatEnum.Unfinished,
    });
    await notifyUpdated();
    showSnackbar.success(
      stageChain.value.length > 1
        ? `仅将阶段 ${props.stageIndex}/${props.stageCount} 设为未完成，其他阶段保持不变`
        : `已将成就 ${props.data.name}(${props.data.id}) 状态设为未完成`,
    );
    return;
  }
  await editProgress(props.data.target);
}

async function editProgress(defaultProgress: number): Promise<void> {
  const progressInput = await showDialog.inputF({
    title: "编辑成就进度",
    text: `请输入 0 到 ${maxProgress.value} 之间的整数`,
    input: Math.min(defaultProgress, maxProgress.value).toString(),
    type: "number",
    confirmLabel: stageChain.value.length > 1 ? "预览变更" : "保存进度",
  });
  if (progressInput === false || progressInput === undefined) {
    showSnackbar.cancel("已取消成就编辑");
    return;
  }
  if (progressInput.trim() === "") {
    showSnackbar.warn("成就进度不能为空");
    return;
  }
  const progress = Number(progressInput);
  if (!Number.isSafeInteger(progress) || progress < 0 || progress > maxProgress.value) {
    showSnackbar.warn(`请输入 0 到 ${maxProgress.value} 之间的整数`);
    return;
  }
  const preview = await TSUserAchi.getAchievementProgressPreview(
    props.data.uid,
    props.data.id,
    progress,
  );
  if (preview.items.length > 1) {
    const changes = preview.items
      .map(
        (item, index) =>
          `阶段 ${index + 1}（目标 ${item.target}）：${item.previousProgress}/${getStatusLabel(item.previousStatus)} → ${item.progress}/${getStatusLabel(item.status)}`,
      )
      .join("\n");
    const confirmed = await showDialog.checkF({
      title: `同步 ${preview.items.length} 个阶段？`,
      text: `整条阶段链将共享进度 ${preview.progress}。\n${changes}`,
      confirmLabel: "同步进度",
    });
    if (!confirmed) {
      showSnackbar.cancel("已取消阶段同步");
      return;
    }
  }
  await TSUserAchi.updateAchievementProgress(props.data.uid, props.data.id, progress);
  await notifyUpdated();
  showSnackbar.success(
    preview.items.length > 1
      ? `已同步 ${preview.items.length} 个阶段的进度`
      : `已将成就进度更新为 ${progress}/${props.data.target}`,
  );
}

function getStatusLabel(status: TGApp.Plugins.UIAF.AchiItemStatEnum): string {
  switch (status) {
    case UiafAchiStatEnum.Invalid:
      return "无效";
    case UiafAchiStatEnum.Unfinished:
      return "未完成";
    case UiafAchiStatEnum.Finished:
      return "已完成";
    case UiafAchiStatEnum.RewardTaken:
      return "已领取";
  }
}

async function notifyUpdated(): Promise<void> {
  await event.emit("updateAchi", props.data.categoryId);
  emits("updated");
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.achi-container {
  @include github-styles.github-card-shadow;

  position: relative;
  display: flex;
  overflow: hidden;
  height: 60px;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  cursor: pointer;

  &.is-staged {
    border-left: 3px solid var(--tgc-yellow-2);
  }

  &.is-stage-child {
    margin-left: 16px;
  }
}

.dark .achi-container {
  @include github-styles.github-card-shadow("dark");
}

.achi-version {
  @include github-styles.github-tag-dark-gen(#fb7299);

  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  width: 48px;
  border-top: unset;
  border-left: unset;
  border-bottom-right-radius: 20px;
  border-top-left-radius: 4px;
  font-family: var(--font-title);
  font-size: 10px;
  text-align: center;
}

.achi-stage-toggle {
  position: absolute;
  z-index: 2;
  bottom: 0;
  left: 20px;
  display: flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--box-text-4);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--tgc-yellow-2);
    outline-offset: 1px;
  }
}

.achi-pre {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 0;
}

.achi-pre-icon {
  position: relative;
  display: flex;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.achi-state-ghost {
  position: absolute;
  z-index: 0;
  top: 50%;
  left: 50%;
  width: 72px;
  height: 72px;
  filter: grayscale(0.6);
  opacity: 0.18;
  pointer-events: none;
  transform: translate(-50%, -50%);

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.achi-state {
  position: relative;
  z-index: 1;
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--tgc-yellow-2);
    outline-offset: 1px;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.achi-pre-info {
  display: flex;
  width: 100%;
  flex-flow: column wrap;
  align-items: flex-start;
  justify-content: center;
  text-align: left;

  &__title {
    display: flex;
    align-items: center;
    column-gap: 4px;
    font-family: var(--font-title);
    font-size: 14px;
  }

  &__desc {
    font-size: 12px;
    opacity: 0.8;
  }

  &__progress {
    @include github-styles.github-tag-dark-gen(#00aeec);

    display: flex;
    height: 18px;
    box-sizing: border-box;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    border: 0;
    border-radius: 9px;
    cursor: pointer;
    font-family: var(--font-text);
    font-size: 10px;

    &:hover {
      @include github-styles.github-tag-dark-gen(#7ab61f);
    }
  }

  &__hidden {
    flex-shrink: 0;
    color: var(--tgc-od-orange);
  }
}

.achi-append {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  column-gap: 8px;

  :first-child:not(:last-child) {
    color: var(--box-text-4);
    font-size: small;
  }
}

.achi-append-icon {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background-image: url("/icon/bg/5-Star.webp");
  background-size: cover;

  img {
    width: 100%;
    height: 100%;
    flex-shrink: 0;
  }

  span {
    position: absolute;
    bottom: 0;
    left: 0;
    display: flex;
    width: 100%;
    height: 10px;
    align-items: stretch;
    justify-content: center;
    background: #00000080;
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    color: var(--tgc-white-1);
    font-size: 8px;
  }
}
</style>
