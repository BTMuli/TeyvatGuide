<!-- 千星奇域概览单项组件 -->
<template>
  <div class="gbr-dl-box">
    <div class="gbr-dl-progress" />
    <div class="gbr-dl-icon">
      <img :alt="props.data.name" :src="getIcon()" />
    </div>
    <div class="gbr-dl-base">
      <div class="gbr-dl-name">{{ props.data.name }}</div>
      <div class="gbr-dl-time">{{ props.data.time }}</div>
    </div>
    <div class="gbr-dl-info">
      <div class="gbr-dl-cnt">{{ props.count }}</div>
      <div class="gbr-dl-hint" v-if="hint !== ''">{{ hint }}</div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

export type GbrDataLineProps = { data: TGApp.Sqlite.GachaRecords.TableGachaB; count: number };

const props = defineProps<GbrDataLineProps>();
const hint = getEndHint();

function getIcon(): string {
  console.log(props.data);
  // const find = AppGachaBData.find((i) => i.id.toString() === props.data.itemId);
  // if (!find) return `/source/UI/paimon.webp`;
  // return `https://api.hakush.in/gi/UI/${find.icon}.webp`;
  // TODO: 缺失元数据
  return `/source/UI/paimon.webp`;
}

function getEndHint(): string {
  if (props.data.gachaType === "1000") return "";
  if (!props.data.isUp) return "歪";
  return "";
}

const progressColor = computed<string>(() => {
  if (hint === "UP" && props.data.rank === "5") return "#d19a66";
  if (hint === "UP" && props.data.rank === "4") return "#c678dd";
  if (hint === "歪") return "#e06c75";
  return "#61afef";
});
const progressWidth = computed<string>(() => {
  let final = 10;
  if (props.data.rank === "5") {
    if (props.data.gachaType === "302") final = 80;
    else final = 90;
  } else if (props.data.rank === "4") final = 10;
  else return "0%";
  return ((props.count / final) * 100).toFixed(2) + "%";
});
</script>
<style lang="scss" scoped>
.gbr-dl-box {
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
  background: var(--box-bg-2);
  column-gap: 4px;
}

.gbr-dl-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: v-bind(progressWidth); /* stylelint-disable-line value-keyword-case */
  max-width: 100%;
  height: 4px;
  border-radius: 4px;
  background: v-bind(progressColor); /* stylelint-disable-line value-keyword-case */
}

.gbr-dl-icon {
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

.gbr-dl-base {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.gbr-dl-name {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
  line-height: 18px;
}

.gbr-dl-time {
  color: var(--box-text-7);
  font-size: 12px;
  line-height: 14px;
}

.gbr-dl-info {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  column-gap: 4px;
}

.gbr-dl-cnt {
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.gbr-dl-hint {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 50%;
  background: var(--box-bg-3);
  color: v-bind(progressColor); /* stylelint-disable-line value-keyword-case */
  font-family: var(--font-title);
  transform: rotate(25deg);
}
</style>
