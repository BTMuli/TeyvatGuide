<template>
  <div class="hta-ol-card">
    <dt class="hta-ol-title">{{ props.label }}</dt>
    <dd class="hta-ol-values">
      <span class="hta-olv-cur">{{ getNumStr(localCur) }}</span>
      <span
        v-if="props.showDiff"
        :class="{ 'hta-olv-up': localCur > localLast, 'hta-olv-down': localCur < localLast }"
        :title="`上期数据：${getNumStr(localLast)}`"
        class="hta-olv-diff"
      >
        {{ getDiff(localCur, localLast) }}
      </span>
    </dd>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

type HtaOverviewLineProps = { label: string; cur: number; last: number; showDiff?: boolean };
const props = withDefaults(defineProps<HtaOverviewLineProps>(), { showDiff: true });

const localCur = computed<number>(() => (isNaN(props.cur) ? 0 : props.cur));
const localLast = computed<number>(() => (isNaN(props.last) ? 0 : props.last));

function getNumStr(num: number): string {
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(2);
}

function getDiff(cur: number, last: number): string {
  if (cur === last) return "-";
  if (cur > last) return `↑${getNumStr(cur - last)}`;
  return `↓${getNumStr(last - cur)}`;
}
</script>
<style lang="scss" scoped>
.hta-ol-card {
  display: grid;
  min-width: 0;
  align-content: start;
  padding: 8px;
  border-radius: 8px;
  background: var(--app-page-bg);
  gap: 4px;
}

.hta-ol-title {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
}

.hta-ol-values {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  margin: 0;
  font-variant-numeric: tabular-nums;
  gap: 0 4px;
  line-height: 20px;
}

.hta-olv-cur {
  color: var(--box-text-1);
  font-size: 16px;
  font-weight: 600;
}

.hta-olv-diff {
  color: var(--box-text-4);
  font-size: 11px;
}

.hta-olv-up {
  color: var(--hta-diff-up);
}

.hta-olv-down {
  color: var(--hta-diff-down);
}
</style>
