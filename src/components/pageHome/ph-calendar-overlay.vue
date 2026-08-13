<!-- 首页素材日历浮窗 -->
<template>
  <TOverlay v-model="visible" blurVal="8px" topOffset="64px">
    <div class="phmo-container">
      <slot name="left" />
      <PhCalendarCultivationPanel
        v-if="showCultivation"
        :entries="entries"
        :entry-materials="entryMaterials"
        :item="item"
        :plan-entries="planEntries"
        :project="project"
        @close="visible = false"
      />
      <PhCalendarPanel v-else :item="item" :src="src" @close="visible = false" />
      <slot name="right" />
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import { computed } from "vue";

import PhCalendarCultivationPanel from "./ph-calendar-cultivation-panel.vue";
import PhCalendarPanel from "./ph-calendar-panel.vue";

type PhCalendarOverlayProps = {
  item: TGApp.App.Calendar.Item;
  /** 来源组件标签 */
  src?: string;
  /** 养成目标条目（非空时显示养成目标内容） */
  entries?: Array<TGApp.Sqlite.Cultivation.EntryWithItems>;
  /** 按目标 ID 保存的计划材料分配结果 */
  entryMaterials?: ReadonlyMap<string, Array<TGApp.App.UserCalc.ResultMaterial>>;
  /** 用于计算持久优先级的完整计划目标 */
  planEntries?: Array<TGApp.Sqlite.Cultivation.EntryWithItems>;
  /** 养成计划 */
  project?: TGApp.Sqlite.Cultivation.Project;
};

const props = withDefaults(defineProps<PhCalendarOverlayProps>(), {
  src: "素材日历",
  entries: () => [],
  entryMaterials: () => new Map(),
  planEntries: () => [],
});
const visible = defineModel<boolean>({ default: false });
const showCultivation = computed<boolean>(() => props.entries.length > 0);
</script>
<style lang="scss" scoped>
.phmo-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
}
</style>
