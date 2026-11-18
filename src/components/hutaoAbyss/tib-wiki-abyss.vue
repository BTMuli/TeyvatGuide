<!-- 单角色使用率/上场率 -->
<template>
  <div class="twa-container">
    <TItemBox :model-value="box" />
    <div class="twa-info">
      <span>{{ avatar?.name ?? "旅行者" }}</span>
      <span>{{ `${(props.cur * 100).toFixed(3)}%` }}</span>
      <span
        :class="{
          up: props.cur > props.last,
          down: props.cur < props.last,
        }"
        :title="`${(props.last * 100).toFixed(3)}%`"
      >
        {{ getDiffStr() }}
      </span>
    </div>
    <div
      :class="{ 'twa-progress-up': props.cur > props.last }"
      :style="progressStyle"
      aria-hidden="true"
      class="twa-progress"
    />
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import { computed, onMounted, shallowRef } from "vue";

import { AppCharacterData } from "@/data/index.js";

type TibWikiAbyssProps = {
  /** 角色ID */
  role: number;
  /** 当前数据 */
  cur: number;
  /** 上一期数据 */
  last: number;
};

const props = defineProps<TibWikiAbyssProps>();
const avatar = shallowRef<TGApp.App.Character.WikiBriefInfo>();
const progressStyle = computed<Record<string, string>>(() => {
  const current = Math.min(1, Math.max(0, props.cur));
  const previous = Math.min(1, Math.max(0, props.last));
  return {
    "--twa-current": String(current),
    "--twa-diff-start": `${Math.min(current, previous) * 100}%`,
    "--twa-diff-length": String(Math.abs(current - previous)),
  };
});

const box = computed<TItemBoxData>(() => ({
  bg: `/icon/bg/${avatar.value?.star}-Star.webp`,
  clickable: false,
  display: "inner",
  icon: `/WIKI/character/${avatar.value?.id}.webp`,
  innerHeight: 0,
  innerText: avatar.value?.name ?? "旅行者",
  lt:
    avatar.value === undefined
      ? ""
      : avatar.value.element !== ""
        ? `/icon/element/${avatar.value.element}元素.webp`
        : `/icon/weapon/${avatar.value.weapon}.webp`,
  ltSize: "15px",
  size: "60px",
  height: "60px",
}));

onMounted(() => {
  if ([10000005, 10000007].includes(props.role)) {
    avatar.value = {
      area: "",
      birthday: [0, 0],
      contentId: 0,
      costumes: [],
      element: "",
      id: props.role,
      name: props.role === 10000005 ? "空" : "荧",
      nameCard: "",
      release: "",
      star: 5,
      team: [],
      title: "",
      weapon: "单手剑",
    };
  } else avatar.value = AppCharacterData.find((a) => a.id === props.role);
});

function getDiffStr(): string {
  const diff = (Math.abs(props.cur - props.last) * 100).toFixed(3);
  if (props.cur === props.last) return `-${diff}%`;
  if (props.last > props.cur) return `↓${diff}%`;
  return `↑${diff}%`;
}
</script>
<style lang="css" scoped>
.twa-container {
  --twa-blue: var(--tgc-od-blue);
  --twa-up: var(--tgc-od-green);
  --twa-down: var(--tgc-od-red);

  display: flex;
  overflow: hidden;
  height: 60px;
  box-sizing: border-box;
  align-items: center;
  justify-content: flex-start;
  border: 1px solid var(--common-shadow-2);
  border-radius: 5px;
  border-right: 0;
  background: var(--box-bg-1);
  column-gap: 8px;
}

html.default .twa-container {
  --twa-blue: var(--tgc-blue-1);
  --twa-up: #386626ff;
  --twa-down: #a4262cff;
}

.twa-info {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  color: var(--box-text-4);
  font-size: 12px;
  row-gap: 1px;

  :first-child {
    font-family: var(--font-title);
    font-size: 15px;
    font-weight: normal;
  }

  :last-child {
    color: var(--twa-blue);
    font-family: var(--font-title);
    font-weight: normal;

    &.up {
      color: var(--twa-up);
    }

    &.down {
      color: var(--twa-down);
    }
  }
}

.twa-progress {
  position: relative;
  width: 4px;
  flex-shrink: 0;
  align-self: stretch;
  background: var(--common-shadow-2);
  margin-inline-start: auto;

  &::before,
  &::after {
    position: absolute;
    content: "";
    inset: 0;
    transform-origin: bottom;
    transition: transform var(--hta-rank-motion, 0.32s ease-out);
  }

  &::before {
    background: var(--twa-blue);
    transform: scaleY(var(--twa-current));
  }

  &::after {
    background: var(--twa-down);
    transform: translateY(calc(0% - var(--twa-diff-start))) scaleY(var(--twa-diff-length));
  }

  &.twa-progress-up::after {
    background: var(--twa-up);
  }
}

@media (prefers-reduced-motion: reduce) {
  .twa-progress::before,
  .twa-progress::after {
    transition: none;
  }
}
</style>
