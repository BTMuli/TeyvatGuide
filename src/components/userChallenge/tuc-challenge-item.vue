<!-- 幽境危战，单个怪物挑战 -->
<template>
  <div class="tuc-challenge-item-comp" @click="console.log(props.data)">
    <div class="top-title">
      <div class="name">{{ props.data.name }} Lv.{{ props.data.monster.level }}</div>
      <div class="tags">
        <TucMonsterTag v-for="(tag, idx) in props.data.monster.tags" :key="idx" :data="tag" />
      </div>
      <div class="append">
        <span>战斗用时：</span>
        <span>{{ props.data.second }}</span>
        <span>秒</span>
      </div>
    </div>
    <div class="main-box">
      <div class="left-info">
        <div class="team-box">
          <TItemBox
            :model-value="getTeamBox(avatar)"
            v-for="(avatar, idx) in props.data.teams"
            :key="idx"
          />
        </div>
        <div class="best-dps">
          <div class="best-dps-item" v-for="(avatar, idx) in props.data.best_avatar" :key="idx">
            <TMiImg :src="avatar.side_icon" :ori="true" :alt="`${avatar.avatar_id}`" />
            <span>{{ avatar.type === 1 ? "最强一击" : "最高总伤害" }}</span>
            <span>{{ avatar.dps }}</span>
          </div>
        </div>
      </div>
      <div class="right-desc">
        <span
          v-html="parseHtmlText(desc)"
          v-for="(desc, idx) in props.data.monster.desc"
          :key="idx"
        />
      </div>
    </div>
    <div class="monster-icon">
      <TMiImg :src="props.data.monster.icon" :alt="props.data.name" :ori="true" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import TMiImg from "@comp/app/t-mi-img.vue";
import TucMonsterTag from "@comp/userChallenge/tuc-monster-tag.vue";
import { getZhElement, parseHtmlText } from "@utils/toolFunc.js";

import { AppCharacterData } from "@/data/index.js";

type TucChallengeItemProps = { data: TGApp.Game.Challenge.ChallengeList };

const props = defineProps<TucChallengeItemProps>();

function getTeamBox(avatar: TGApp.Game.Challenge.ChallengeTeam): TItemBoxData {
  const find = AppCharacterData.find((i) => i.id === avatar.avatar_id);
  if (!find) {
    return {
      bg: `/icon/bg/${avatar.rarity}-BGC.webp`,
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
      innerHeight: 20,
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
    innerHeight: 20,
    innerIcon: `/icon/weapon/${find.weapon}.webp`,
  };
}
</script>
<style lang="scss" scoped>
.tuc-challenge-item-comp {
  position: relative;
  display: flex;
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
  row-gap: 12px;
}

.top-title {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  column-gap: 12px;

  .name {
    font-family: var(--font-title);
    font-size: 16px;
  }

  .tags {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: 8px;
  }

  .append {
    display: flex;
    align-items: center;
    margin-left: auto;
    color: var(--box-text-2);
    font-family: var(--font-title);
    font-size: 14px;
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
  min-height: 120px;
  align-items: flex-start;
  justify-content: flex-start;
  column-gap: 16px;
}

.left-info {
  position: relative;
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  row-gap: 16px;
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

.best-dps {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 16px;
}

.best-dps-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: linear-gradient(to right, var(--box-bg-3), var(--box-bg-1));
  color: var(--box-text-2);
  column-gap: 4px;
  font-family: var(--font-title);

  img {
    width: 24px;
    height: 24px;
    object-fit: contain;
    transform: translateY(-4px);
  }

  span {
    font-size: 14px;

    &:last-child {
      color: var(--tgc-yellow-1);
    }
  }
}

.dark .best-dps-item {
  background: linear-gradient(to right, var(--box-bg-2) 100px, var(--box-bg-1));
}

.right-desc {
  position: relative;
  z-index: 1;
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  row-gap: 8px;

  span {
    color: var(--box-text-1);
    font-size: 14px;
    line-height: 1.4;
    text-align: left;
    white-space: pre-wrap;
    word-break: break-all;
    word-wrap: break-word;

    :deep(span) {
      font-weight: bold;
    }
  }
}

.monster-icon {
  position: absolute;
  z-index: 0;
  right: 0;
  bottom: 0;
  height: 100%;
  opacity: 0.5;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.dark .monster-icon {
  opacity: 0.8;
}
</style>
