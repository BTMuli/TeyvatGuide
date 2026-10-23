<template>
  <div class="tua-recent-menu-wrapper">
    <v-menu
      v-model="isOpen"
      location="start top"
      location-strategy="connected"
      offset="8"
      open-on-click
      origin="end top"
    >
      <template #activator="{ props: menuProps }">
        <v-btn
          class="tua-recent-trigger"
          prepend-icon="mdi-history"
          variant="elevated"
          v-bind="menuProps"
        >
          最近完成
        </v-btn>
      </template>
      <div class="tua-recent-menu">
        <header class="tua-recent-header">
          <strong>最近完成</strong>
          <span>最多 50 条</span>
        </header>
        <div v-if="recentItems.length > 0" class="tua-recent-list">
          <TuaRecentItem
            v-for="item in recentItems"
            :key="item.data.id"
            :completedStageCount="item.completedStageCount"
            :data="item.data"
            :stageCount="item.stageCount"
            :stageIndex="item.stageIndex"
            @select-achi="handleSelect(item.data)"
          />
        </div>
        <div v-else class="tua-recent-empty">暂无已完成成就</div>
      </div>
    </v-menu>
  </div>
</template>
<script lang="ts" setup>
import TSUserAchi from "@Sqlm/userAchi.js";
import { computed, ref } from "vue";

import TuaRecentItem from "./tua-recent-item.vue";

/**
 * 最近完成成就菜单属性。
 * @since Beta v0.13.0
 */
type TuaRecentMenuProps = {
  items: ReadonlyArray<TGApp.App.Achievement.RenderItem>;
};
/**
 * 最近完成成就菜单事件。
 * @since Beta v0.13.0
 */
type TuaRecentMenuEmits = {
  select: [achievement: TGApp.App.Achievement.RenderItem];
};
/**
 * 最近完成成就的菜单展示项。
 * @since Beta v0.13.0
 */
type TuaRecentListItem = {
  data: TGApp.App.Achievement.RenderItem;
  completedStageCount: number;
  stageIndex: number;
  stageCount: number;
};

const props = defineProps<TuaRecentMenuProps>();
const emits = defineEmits<TuaRecentMenuEmits>();

const isOpen = ref<boolean>(false);
const recentItems = computed<Array<TuaRecentListItem>>(() =>
  props.items.map((data) => {
    const chain = TSUserAchi.getAchievementStageChain(data.id) ?? [data];
    const stageIndex = Math.max(chain.findIndex((item) => item.id === data.id) + 1, 1);
    return {
      data,
      completedStageCount: stageIndex,
      stageIndex,
      stageCount: chain.length,
    };
  }),
);

function handleSelect(achievement: TGApp.App.Achievement.RenderItem): void {
  closeMenu();
  emits("select", achievement);
}

function closeMenu(): void {
  isOpen.value = false;
}
</script>
<style lang="scss" scoped>
.tua-recent-menu-wrapper {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.tua-recent-trigger {
  height: 40px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
  font-weight: normal;
}

.tua-recent-menu {
  display: flex;
  overflow: hidden;
  width: min(320px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
  max-height: min(480px, calc(100vh - 144px));
  box-sizing: border-box;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  background: var(--box-bg-1);
  box-shadow: 0 4px 12px var(--common-shadow-2);
  color: var(--box-text-1);
}

.tua-recent-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0 4px 8px;
  border-bottom: 1px solid var(--common-shadow-1);

  strong {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
  }

  span {
    color: var(--box-text-2);
    font-size: 12px;
  }
}

.tua-recent-list {
  display: flex;
  flex-direction: column;
  padding-top: 8px;
  gap: 8px;
  overflow-y: auto;
}

.tua-recent-empty {
  padding: 24px 8px;
  color: var(--box-text-2);
  font-size: 14px;
  text-align: center;
}
</style>
