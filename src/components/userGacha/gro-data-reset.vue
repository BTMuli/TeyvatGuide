<!-- 垫数 -->
<template>
  <div class="gro-dr-box">
    <div class="gro-dr-progress" />
    <div class="gro-dr-icon">
      <img alt="empty" src="/source/UI/empty.webp" />
    </div>
    <div class="gro-dr-info">
      <div class="gro-dr-cnt">{{ props.count }}</div>
      <div class="gro-dr-hint">垫</div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

type GroDataResetProps = {
  /** 计算星级 */
  compute: "4" | "5";
  /** 祈愿类型 */
  gacha: string;
  /** 当前垫数 */
  count: number;
};

const props = defineProps<GroDataResetProps>();
const progressColor = computed<string>(() => {
  if (props.gacha === "normal") return "#61afef";
  if (props.compute === "4") return "#c678dd";
  if (props.compute === "5") return "#d19a66";
  return "#61afef";
});
const progressWidth = computed<string>(() => {
  let final = 10;
  if (props.compute === "5") {
    if (props.gacha === "302") final = 80;
    else final = 90;
  }
  return ((props.count / final) * 100).toFixed(2) + "%";
});
</script>
<style lang="scss" scoped>
.gro-dr-box {
  position: relative;
  display: flex;
  width: 100%;
  height: 48px;
  box-sizing: border-box;
  align-items: center;
  justify-content: flex-start;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  margin-bottom: 8px;
  background: var(--box-bg-2);
  column-gap: 4px;
}

.gro-dr-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: v-bind(progressWidth); /* stylelint-disable-line value-keyword-case */
  max-width: 100%;
  height: 4px;
  border-radius: 4px;
  background: v-bind(progressColor); /* stylelint-disable-line value-keyword-case */
}

.gro-dr-icon {
  display: flex;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
  }
}

.gro-dr-base {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.gro-dr-name {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
  line-height: 18px;
}

.gro-dr-time {
  color: var(--box-text-7);
  font-size: 12px;
  line-height: 14px;
}

.gro-dr-info {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  column-gap: 4px;
}

.gro-dr-cnt {
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.gro-dr-hint {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 50%;
  background: var(--box-bg-3);
  color: var(--tgc-od-blue);
  font-family: var(--font-title);
  transform: rotate(25deg);
}
</style>
