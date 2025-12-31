<template>
  <div class="hta-ol-container">
    <div class="hta-ol-title">{{ props.label }}</div>
    <div class="hta-ol-val">
      <div class="hta-olv-cur">{{ getNumStr(localCur) }}</div>
      <div
        v-if="props.showDiff"
        :class="{ 'hta-olv-up': localCur > localLast, 'hta-olv-down': localCur < localLast }"
        :title="`上期数据：${getNumStr(localLast)}`"
        class="hta-olv-diff"
      >
        {{ getDiff(localCur, localLast) }}
      </div>
    </div>
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
<style lang="css" scoped>
.hta-ol-container {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.hta-ol-title {
  color: var(--tgc-od-white);
}

.hta-ol-val {
  display: flex;
  align-items: center;
  justify-content: center;
}

.hta-olv-diff {
  font-size: 12px;
}

.hta-olv-cur {
  color: var(--tgc-od-blue);
}

.hta-olv-up {
  color: var(--tgc-od-red);
}

.hta-olv-down {
  color: var(--tgc-od-green);
}
</style>
