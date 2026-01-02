<!-- 战斗组件 -->
<template>
  <div class="tua-db-box">
    <div class="tua-db-time">{{ props.title }} {{ props.battle.time }}</div>
    <div v-if="props.battle.monsters && props.battle.monsters.length > 0" class="tua-db-monsters">
      <div v-for="(monster, idx) in props.battle.monsters" :key="idx" class="tua-db-monster">
        <div class="icon">
          <TMiImg :ori="true" :src="monster.icon" alt="icon" />
        </div>
        <div class="info">
          <span>{{ monster.name }}</span>
          <span>Lv.{{ monster.level }}</span>
        </div>
      </div>
    </div>
    <div class="tua-db-grid">
      <TItemBox
        v-for="avatar in props.battle.characters"
        :key="avatar.id"
        :model-value="getAvatarBox(avatar)"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import TMiImg from "@comp/app/t-mi-img.vue";
import { getRcStar } from "@utils/toolFunc.js";

import { AppCharacterData } from "@/data/index.js";

type TuaDetailBattleProps = { title: string; battle: TGApp.Sqlite.Abyss.Battle };

const props = defineProps<TuaDetailBattleProps>();

function getAvatarBox(avatar: TGApp.Sqlite.Abyss.CharacterInfo): TItemBoxData {
  const res = AppCharacterData.find((i) => i.id === avatar.id);
  if (avatar.id === 10000005 || avatar.id === 10000007) {
    return {
      clickable: false,
      height: "70px",
      ltSize: "20px",
      bg: `/icon/bg/${avatar.star}-Star.webp`,
      icon: `/WIKI/character/${avatar.id}.webp`,
      lt: `/icon/weapon/${res?.weapon ?? "单手剑"}.webp`,
      innerText: `Lv.${avatar.level}`,
      innerHeight: 20,
      display: "inner",
      size: "70px",
    };
  }
  return {
    clickable: false,
    height: "70px",
    ltSize: "20px",
    bg: `/icon/bg/${getRcStar(avatar.id, avatar.star)}-Star.webp`,
    icon: `/WIKI/character/${avatar.id}.webp`,
    lt: `/icon/element/${res?.element ?? "风"}元素.webp`,
    innerText: `Lv.${avatar.level}`,
    innerHeight: 20,
    display: "inner",
    size: "70px",
  };
}
</script>
<style lang="scss" scoped>
.tua-db-box {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  row-gap: 4px;
}

.tua-db-time {
  color: var(--box-text-2);
  font-size: 12px;
  text-align: left;
}

.tua-db-grid {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  gap: 12px;
}

.tua-db-monsters {
  position: relative;
  display: flex;
  width: 100%;
  flex-wrap: wrap-reverse;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.tua-db-monster {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px 4px 4px;
  border-radius: 40px;
  background: var(--box-bg-3);
  color: var(--box-text-4);
  column-gap: 4px;

  .icon {
    position: relative;
    overflow: hidden;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--box-bg-4);

    img {
      width: 100%;
      height: 100%;
    }
  }

  .info {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    font-size: 12px;

    span {
      line-height: 14px;

      &:first-child {
        font-family: var(--font-title);
      }
    }
  }
}
</style>
