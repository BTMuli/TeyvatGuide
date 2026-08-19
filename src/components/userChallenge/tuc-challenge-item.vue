<!-- 幽境危战，单个怪物挑战 -->
<template>
  <div class="tuc-challenge-item-comp">
    <div class="top-title">
      <div class="name">{{ props.data.name }} Lv.{{ props.data.monster.level }}</div>
      <TucMonsterTag v-for="(tag, idx) in props.data.monster.tags" :key="idx" :data="tag" />
      <div class="append">
        <span>战斗用时：</span>
        <span>{{ props.data.second }}</span>
        <span>秒</span>
      </div>
    </div>
    <div class="main-box">
      <div ref="leftInfo" class="left-info">
        <div class="team-box">
          <TItemBox
            v-for="(avatar, idx) in props.data.teams"
            :key="idx"
            :model-value="getTeamBox(avatar)"
          />
        </div>
        <div class="best-dps">
          <div v-for="avatar in props.data.best_avatar" :key="avatar.type" class="best-dps-item">
            <TMiImg
              :alt="`${avatar.avatar_id}`"
              :ori="true"
              :size="40"
              :src="avatar.side_icon"
              class="best-dps-avatar"
            />
            <div class="best-dps-meta">
              <span class="best-dps-label">
                {{ avatar.type === 1 ? "最强一击" : "最高总伤害" }}
              </span>
              <span class="best-dps-value">{{ avatar.dps }}</span>
            </div>
          </div>
        </div>
      </div>
      <div ref="rightDesc" class="right-desc">
        <span
          v-for="(desc, idx) in props.data.monster.desc"
          :key="idx"
          v-html="parseHtmlText(desc)"
        />
      </div>
      <div class="monster-icon">
        <TMiImg :alt="props.data.name" :ori="true" :src="props.data.monster.icon" />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import TMiImg from "@comp/app/t-mi-img.vue";
import { getRcStar, getZhElement, parseHtmlText } from "@utils/toolFunc.js";
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from "vue";

import TucMonsterTag from "./tuc-monster-tag.vue";

import { AppCharacterData } from "@/data/index.js";

type TucChallengeItemProps = { data: TGApp.Game.Challenge.ChallengeData };

const props = defineProps<TucChallengeItemProps>();
const leftInfo = useTemplateRef<HTMLElement>("leftInfo");
const rightDesc = useTemplateRef<HTMLElement>("rightDesc");
const monsterMaxPx = ref<number>(0);
const monsterSize = computed<string>(() => {
  if (monsterMaxPx.value <= 0) return "auto";
  return `${monsterMaxPx.value}px`;
});

let monsterSizeObs: ResizeObserver | undefined;

function readBlockHeight(el: HTMLElement | null): number {
  if (el === null) return 0;
  return Math.floor(el.getBoundingClientRect().height);
}

function updateMonsterMax(): void {
  const leftH = readBlockHeight(leftInfo.value);
  const descH = readBlockHeight(rightDesc.value);
  if (leftH === 0 && descH === 0) return;
  let next = descH;
  if (leftH > 0 && descH > 0) next = Math.max(leftH, descH);
  else if (leftH > 0) next = leftH;
  monsterMaxPx.value = next;
}

onMounted(() => {
  monsterSizeObs = new ResizeObserver(() => updateMonsterMax());
  if (leftInfo.value !== null) monsterSizeObs.observe(leftInfo.value);
  if (rightDesc.value !== null) monsterSizeObs.observe(rightDesc.value);
  updateMonsterMax();
});

onUnmounted(() => {
  monsterSizeObs?.disconnect();
});

function getTeamBox(avatar: TGApp.Game.Challenge.ChallengeTeam): TItemBoxData {
  const find = AppCharacterData.find((i) => i.id === avatar.avatar_id);
  if (!find) {
    return {
      bg: `/icon/bg/${getRcStar(avatar.avatar_id, avatar.rarity)}-BGC.webp`,
      clickable: false,
      icon: avatar.image,
      lt: `/icon/element/${getZhElement(avatar.element)}元素.webp`,
      ltSize: "20px",
      rt: avatar.rank.toString(),
      rtSize: "20px",
      size: "80px",
      height: "80px",
      display: "inner",
      innerText: avatar.name,
      innerHeight: 24,
      innerBlur: "4px",
    };
  }
  return {
    bg: `/icon/bg/${find.star}-BGC.webp`,
    clickable: false,
    icon: `/WIKI/character/${find.id}.webp`,
    lt: `/icon/element/${find.element}元素.webp`,
    ltSize: "20px",
    rt: avatar.rank.toString(),
    rtSize: "20px",
    size: "80px",
    height: "80px",
    display: "inner",
    innerText: find.name,
    innerHeight: 24,
    innerBlur: "4px",
    innerIcon: `/icon/weapon/${find.weapon}.webp`,
  };
}
</script>
<style lang="scss" scoped>
.tuc-challenge-item-comp {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  row-gap: 8px;
}

.best-dps {
  position: relative;
  display: flex;
  width: 100%;
  gap: 20px;
}

.best-dps-item {
  position: relative;
  display: flex;
  height: fit-content;
  align-items: center;
  border-radius: 20px 8px 8px 20px;
  background: linear-gradient(to right, var(--common-shadow-1) 0, var(--box-bg-1) 100%);
}

.best-dps-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  object-fit: contain;
  transform: translateY(-4px);
}

.best-dps-meta {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column-reverse;
  align-items: flex-start;
  justify-content: center;
}

.best-dps-label {
  overflow: hidden;
  max-width: 100%;
  height: 12px;
  color: var(--tgc-od-white);
  font-family: var(--font-text);
  font-size: 10px;
  line-height: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.best-dps-value {
  height: 16px;
  color: var(--tgc-od-red);
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  line-height: 20px;
}

.right-desc {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  height: fit-content;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  row-gap: 8px;

  span {
    color: var(--box-text-1);
    font-size: 14px;
    line-height: 1.2;
    text-align: left;

    :deep(span) {
      filter: var(--gs-filter);
    }
  }
}

.top-title {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  column-gap: 8px;

  .name {
    font-family: var(--font-title);
    font-size: 16px;
  }

  .append {
    display: flex;
    align-items: center;
    margin-left: auto;
    color: var(--box-text-2);
    font-family: var(--font-title);
    font-size: 16px;
    gap: 4px;

    span {
      color: var(--box-text-2);
      font-size: 14px;

      &:nth-child(2) {
        color: var(--tgc-yellow-1);
      }
    }
  }
}

.main-box {
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 120px;
  align-items: flex-start;
  justify-content: flex-start;
  column-gap: 8px;
}

.left-info {
  position: relative;
  display: flex;
  height: fit-content;
  flex-direction: column;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: flex-start;
  row-gap: 8px;
}

.team-box {
  position: relative;
  display: flex;
  width: 100%;
  height: 80px;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.monster-icon {
  position: relative;
  z-index: 0;
  width: v-bind("monsterSize");
  height: v-bind("monsterSize");
  flex-shrink: 0;
  opacity: 0.75;

  img {
    position: absolute;
    left: -8px;
    width: calc(100% + 20px);
    height: calc(100% + 20px);
    object-fit: contain;
  }
}
</style>
