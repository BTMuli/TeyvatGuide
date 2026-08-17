<!-- 垫数卡片 -->
<template>
  <div :title="`${props.compute}星已垫`" class="gro-rc-box">
    <div class="gro-rc-progress" />
    <span class="gro-rc-value">{{ props.count }}</span>
    <span class="gro-rc-badge">垫</span>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

type GroResetCardProps = {
  /** 计算星级 */
  compute: "4" | "5";
  /** 祈愿类型 */
  gacha: string;
  /** 当前垫数 */
  count: number;
};

const props = defineProps<GroResetCardProps>();
const color = computed<string>(() => {
  if (props.compute === "4") return "#c678dd";
  return "#d19a66";
});
const width = computed<string>(() => {
  let final = 10;
  if (props.compute === "5") {
    if (props.gacha === "302") final = 80;
    else final = 90;
  }
  return ((props.count / final) * 100).toFixed(2) + "%";
});
</script>
<style lang="scss" scoped>
.gro-rc-box {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  min-width: 0;
  height: 28px;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  border: 1px solid v-bind(color);
  border-radius: 4px;
  color: v-bind(color);
}

.gro-rc-value {
  position: relative;
  z-index: 1;
  overflow: hidden;
  max-width: 100%;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  line-height: 18px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gro-rc-badge {
  position: absolute;
  z-index: 1;
  right: 0;
  bottom: 0;
  padding: 0 3px;
  border-radius: 4px 0;
  border-top: 1px solid v-bind(color);
  border-left: 1px solid v-bind(color);
  background: var(--box-bg-3);
  color: var(--box-text-4);
  font-size: 9px;
  line-height: 12px;
  pointer-events: none;
}

.gro-rc-progress {
  position: absolute;
  z-index: 0;
  top: 0;
  left: 0;
  width: v-bind(width);
  height: 100%;
  background: v-bind(color);
  opacity: 0.3;
}
</style>
