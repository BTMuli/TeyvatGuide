<template>
  <div class="gro-dl-box">
    <div class="gro-dl-progress" />
    <div class="gro-dl-icon">
      <img :alt="props.data.name" :src="getIcon()" />
    </div>
    <div class="gro-dl-line">
      <div class="gro-dl-base">
        <div class="gro-dl-name">{{ props.data.name }}</div>
        <div class="gro-dl-time">{{ props.data.time }}</div>
      </div>
      <div class="gro-dl-info">
        <div class="gro-dl-cnt">{{ props.count }}</div>
        <div class="gro-dl-hint" v-if="hint !== ''">{{ hint }}</div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TSUserGacha from "@Sqlite/modules/userGacha.js";
import { computed } from "vue";

import { AppGachaData } from "@/data/index.js";

export type GroDataLineProps = { data: TGApp.Sqlite.GachaRecords.SingleTable; count: number };

const props = defineProps<GroDataLineProps>();
const hint = getEndHint();

function getIcon(): string {
  const itemType = TSUserGacha.getGachaItemType(props.data.itemId);
  if (itemType[0] === "角色") return `/WIKI/character/${props.data.itemId}.webp`;
  if (itemType[0] === "武器") return `/WIKI/weapon/${props.data.itemId}.webp`;
  return `/source/UI/paimon.webp`;
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
  if (hint === "UP" && props.data.rank === "5") return "var(--tgc-od-orange)";
  if (hint === "UP" && props.data.rank === "4") return "var(--tgc-od-purple)";
  if (hint === "歪") return "var(--tgc-od-red)";
  return "var(--tgc-od-blue)";
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
<style lang="css" scoped>
.gro-dl-box {
  position: relative;
  display: flex;
  width: calc(100% - 10px);
  height: 40px;
  align-items: center;
  justify-content: flex-start;
  padding: 5px;
  border-radius: 5px;
  margin: 0 5px;
  background: var(--box-bg-3);
  column-gap: 5px;
}

.gro-dl-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: v-bind(progressWidth);
  max-width: 100%;
  height: 5px;
  border-radius: 5px;
  background: v-bind(progressColor);
  transition: width 0.5s;
}

.gro-dl-icon {
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
  }
}

.gro-dl-line {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.gro-dl-base {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.gro-dl-name {
  height: 16px;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
}

.gro-dl-time {
  height: 14px;
  color: var(--box-text-7);
  font-size: 12px;
}

.gro-dl-info {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  column-gap: 5px;
}

.gro-dl-cnt {
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.gro-dl-hint {
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 50%;
  background: var(--box-bg-1);
  color: v-bind(progressColor);
  font-family: var(--font-title);
  transform: rotate(25deg);
}
</style>
