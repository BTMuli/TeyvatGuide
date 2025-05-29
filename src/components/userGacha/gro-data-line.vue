<template>
  <div class="gro-dl-box">
    <div class="gro-dl-progress" />
    <div class="gro-dl-icon">
      <img :alt="props.data.name" :src="getIcon()" />
    </div>
    <div class="gro-dl-base">
      <div class="gro-dl-name">{{ props.data.name }}</div>
      <div class="gro-dl-time">{{ props.data.time }}</div>
    </div>
    <div class="gro-dl-info">
      <div class="gro-dl-cnt">{{ props.count }}</div>
      <div class="gro-dl-hint" v-if="hint !== ''">{{ hint }}</div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { getWikiBrief } from "@utils/toolFunc.js";
import { computed } from "vue";

import { AppGachaData } from "@/data/index.js";

export type GroDataLineProps = { data: TGApp.Sqlite.GachaRecords.SingleTable; count: number };

const props = defineProps<GroDataLineProps>();
const hint = getEndHint();

function getIcon(): string {
  const find = getWikiBrief(props.data.itemId);
  if (!find) return `/source/UI/paimon.webp`;
  if ("element" in find) return `/WIKI/character/${props.data.itemId}.webp`;
  return `/WIKI/weapon/${props.data.itemId}.webp`;
}

function getEndHint(): string {
  if (props.data.gachaType === "100" || props.data.gachaType === "200") return "";
  // if (props.data.rank !== "5") return "";
  const itemTime = new Date(props.data.time).getTime();
  const poolsFind = AppGachaData.filter((pool) => {
    if (pool.type.toLocaleString() !== props.data.gachaType) return false;
    const startTime = new Date(pool.from).getTime();
    const endTime = new Date(pool.to).getTime();
    return itemTime >= startTime && itemTime <= endTime;
  });
  if (poolsFind.length === 0) return "";
  if (props.data.rank === "5") {
    if (poolsFind.some((pool) => pool.up5List.includes(Number(props.data.itemId)))) return "UP";
    return "歪";
  }
  if (props.data.rank === "4") {
    if (poolsFind.some((pool) => pool.up4List.includes(Number(props.data.itemId)))) return "UP";
    return "歪";
  }
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
.gro-dl-box {
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

.gro-dl-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: v-bind(progressWidth); /* stylelint-disable-line value-keyword-case */
  max-width: 100%;
  height: 4px;
  border-radius: 4px;
  background: v-bind(progressColor); /* stylelint-disable-line value-keyword-case */
}

.gro-dl-icon {
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

.gro-dl-base {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.gro-dl-name {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
  line-height: 18px;
}

.gro-dl-time {
  color: var(--box-text-7);
  font-size: 12px;
  line-height: 14px;
}

.gro-dl-info {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  column-gap: 4px;
}

.gro-dl-cnt {
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.gro-dl-hint {
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
