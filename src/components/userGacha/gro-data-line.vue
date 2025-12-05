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
      <div class="gro-dl-hint" v-if="props.hint !== ''">{{ props.hint }}</div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { getWikiBrief } from "@utils/toolFunc.js";
import { computed } from "vue";

export type GroDataLineProps = {
  data: TGApp.Sqlite.GachaRecords.TableGacha;
  count: number;
  hint: string;
};

const props = defineProps<GroDataLineProps>();

function getIcon(): string {
  const find = getWikiBrief(props.data.itemId);
  if (!find) return `/source/UI/paimon.webp`;
  if ("element" in find) return `/WIKI/character/${props.data.itemId}.webp`;
  return `/WIKI/weapon/${props.data.itemId}.webp`;
}

const progressColor = computed<string>(() => {
  if (props.hint === "UP" && props.data.rank === "5") return "#d19a66";
  if (props.hint === "UP" && props.data.rank === "4") return "#c678dd";
  if (props.hint === "歪") return "#e06c75";
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
