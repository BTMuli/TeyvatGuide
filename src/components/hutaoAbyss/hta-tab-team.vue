<template>
  <div v-if="selectedData" class="hta-tt-box">
    <div class="hta-tuf-box">
      <div class="hta-tuf-title">上半</div>
      <div v-if="selectedData.Up.length > 0" class="hta-tuf-item">
        <HtaTeamLine
          v-for="(item, index) in selectedData.Up"
          :key="`${item.Item}-${index}`"
          :model-value="item"
        />
      </div>
      <span v-if="selectedData.Up.length === 0" class="hta-tt-empty">暂无数据</span>
    </div>
    <div class="hta-tuf-box">
      <div class="hta-tuf-title">下半</div>
      <div v-if="selectedData.Down.length > 0" class="hta-tuf-item">
        <HtaTeamLine
          v-for="(item, index) in selectedData.Down"
          :key="`${item.Item}-${index}`"
          :model-value="item"
        />
      </div>
      <span v-if="selectedData.Down.length === 0" class="hta-tt-empty">暂无数据</span>
    </div>
  </div>
  <div v-else class="hta-tt-empty">暂无数据</div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import HtaTeamLine from "./hta-team-line.vue";

type HtaTabTeamProps = {
  modelValue: Array<TGApp.Plugins.Hutao.Abyss.TeamCombination>;
  floor?: number;
};
const props = defineProps<HtaTabTeamProps>();

const selectedData = computed<TGApp.Plugins.Hutao.Abyss.TeamCombination | undefined>(() => {
  const data = props.modelValue.find((item) => item.Floor === props.floor);
  if (data === undefined) return undefined;
  return {
    ...data,
    Up: [...data.Up].sort((a, b) => b.Rate - a.Rate),
    Down: [...data.Down].sort((a, b) => b.Rate - a.Rate),
  };
});
</script>
<style lang="css" scoped>
.hta-tt-box {
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  align-items: stretch;
  padding: 12px;
  column-gap: 12px;
}

.hta-tuf-box {
  display: flex;
  overflow: hidden;
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 8px;
  border-radius: 6px;
  background: var(--box-bg-2);
  row-gap: 8px;
}

.hta-tuf-title {
  width: 100%;
  flex-shrink: 0;
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;
  text-align: left;
}

.hta-tuf-item {
  position: relative;
  width: 100%;
  min-height: 0;
  flex: 1;
  border-radius: 4px;
  background: var(--box-bg-1);
  overflow-y: auto;
}

.hta-tt-empty {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: var(--box-text-4);
}

:deep(.hta-tl-box + .hta-tl-box) {
  border-top: 1px solid var(--common-shadow-1);
}
</style>
