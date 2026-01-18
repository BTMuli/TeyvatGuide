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
  display: flex;
  height: 60px;
  align-items: center;
  justify-content: flex-start;
  border: 1px solid var(--common-shadow-2);
  border-radius: 5px;
  background: var(--box-bg-1);
  column-gap: 5px;
}

.twa-info {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  color: var(--box-text-4);
  font-size: 12px;

  :first-child {
    font-family: var(--font-title);
    font-size: 15px;
  }

  :last-child {
    color: var(--tgc-od-blue);
    font-family: var(--font-title);

    &.up {
      color: var(--tgc-od-red);
    }

    &.down {
      color: var(--tgc-od-green);
    }
  }
}
</style>
