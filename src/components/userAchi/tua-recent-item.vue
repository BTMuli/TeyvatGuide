<template>
  <button
    :class="{ 'is-staged': props.stageCount > 1 }"
    :title="getAchiTitle()"
    class="tua-recent-item"
    type="button"
    @click="emits('selectAchi', props.data)"
  >
    <span aria-hidden="true" class="tua-recent-item__state-ghost">
      <img :src="achievementStatusIcon" alt="" />
    </span>
    <span class="tua-recent-item__version">v{{ props.data.version }}</span>
    <span aria-hidden="true" class="tua-recent-item__state">
      <img :src="achievementStatusIcon" alt="" />
    </span>
    <span class="tua-recent-item__content">
      <span class="tua-recent-item__title">
        <span class="tua-recent-item__name">{{ props.data.name }}</span>
        <v-icon v-if="props.data.hidden" class="tua-recent-item__hidden" size="14" title="隐藏成就">
          mdi-eye-off-outline
        </v-icon>
        <span v-if="props.stageCount > 1" class="tua-recent-item__stage">
          阶段 {{ props.stageIndex }}/{{ props.stageCount }}
        </span>
      </span>
      <span class="tua-recent-item__meta">
        <span class="tua-recent-item__reward">
          <img alt="原石" src="/icon/material/201.webp" />
          <span>{{ props.data.reward }}</span>
          <v-icon
            v-if="props.data.status === UiafAchiStatEnum.Finished"
            class="tua-recent-item__reward-gift"
            color="var(--tgc-od-red)"
            icon="mdi-gift"
            size="16"
            title="已完成未领取"
          />
        </span>
        <time class="tua-recent-item__time">{{ props.data.completedTime }}</time>
      </span>
    </span>
  </button>
</template>
<script lang="ts" setup>
import { UiafAchiStatEnum } from "@enum/uiaf.js";
import TSUserAchi from "@Sqlm/userAchi.js";
import { computed } from "vue";

/**
 * 最近完成成就条目属性。
 * @since Beta v0.13.0
 */
type TuaRecentItemProps = {
  completedStageCount: number;
  data: TGApp.App.Achievement.RenderItem;
  stageIndex: number;
  stageCount: number;
};
/**
 * 最近完成成就条目事件。
 * @since Beta v0.13.0
 */
type TuaRecentItemEmits = {
  selectAchi: [data: TGApp.App.Achievement.RenderItem];
};

const props = defineProps<TuaRecentItemProps>();
const emits = defineEmits<TuaRecentItemEmits>();

const achievementStatusIcon = computed<string>(
  () =>
    `/icon/achievement/UI_AchievementIcon_${props.stageCount}_${props.completedStageCount}.webp`,
);

function getAchiTitle(): string {
  const category = TSUserAchi.getAchievementCategoryById(props.data.categoryId);
  return category ? `${category.name} · ${props.data.name}` : props.data.name;
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tua-recent-item {
  @include github-styles.github-card-shadow;

  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 60px;
  box-sizing: border-box;
  flex-shrink: 0;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  cursor: pointer;
  font-family: var(--font-text);
  text-align: left;

  &.is-staged {
    border-left: 3px solid var(--tgc-yellow-2);
  }

  &:focus-visible {
    outline: 2px solid var(--tgc-yellow-2);
    outline-offset: 1px;
  }
}

.dark .tua-recent-item {
  @include github-styles.github-card-shadow("dark");
}

.tua-recent-item__version {
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
  font-weight: normal;
  text-align: center;
}

.tua-recent-item__state-ghost {
  position: absolute;
  z-index: 0;
  top: 50%;
  right: -36px;
  width: 72px;
  height: 72px;
  filter: grayscale(0.6);
  opacity: 0.14;
  pointer-events: none;
  transform: translateY(-50%);

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.tua-recent-item__state {
  position: relative;
  z-index: 1;
  display: flex;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.tua-recent-item__content {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  padding-left: 8px;
}

.tua-recent-item__title {
  display: flex;
  min-width: 0;
  align-items: center;
  column-gap: 4px;
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
}

.tua-recent-item__name {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tua-recent-item__hidden {
  flex-shrink: 0;
  color: var(--tgc-od-orange);
}

.tua-recent-item__meta {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 2px 10px;
}

.tua-recent-item__reward {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;

  > img:first-child {
    width: 18px;
    height: 18px;
    object-fit: contain;
  }
}

.tua-recent-item__reward-gift {
  margin-left: 2px;
}

.tua-recent-item__stage {
  flex-shrink: 0;
  color: var(--box-text-4);
  font-family: var(--font-text);
  font-size: 12px;
}

.tua-recent-item__time {
  flex-shrink: 0;
  white-space: nowrap;
}
</style>
