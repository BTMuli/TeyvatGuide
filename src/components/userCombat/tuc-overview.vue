<!-- 剧诗数据概览 -->
<template>
  <div class="tuco-box">
    <div class="tuco-title">
      <div class="tuco-heading">
        <div class="tuco-heading-main">
          <img v-if="isFinTarot()" alt="tarot" src="/icon/combat/tarot.webp" />
          <span>第{{ props.data.id }}期</span>
        </div>
        <span class="tuco-period">
          统计周期 {{ props.data.startTime }} ~ {{ props.data.endTime }}
        </span>
      </div>
      <div class="tuco-meta">
        <span>{{ props.data.updated }} 更新</span>
        <span v-if="props.showShareInfo" class="tuco-share">
          真境剧诗 | UID {{ props.data.uid }} | TeyvatGuide v{{ props.version }}
        </span>
      </div>
    </div>
    <div class="tuco-content">
      <div class="tuco-line1">
        <TucTile :val="getBestVal()" title="最佳记录" />
        <TucTile :val="props.data.stat.coin_num" title="消耗幻剧之花" />
        <TucTile :val="getTime()" title="总耗时" />
        <TucTile
          :title="gameEnum.combat.diffDesc(props.data.stat.difficulty_id)"
          :val="getRoundVal()"
        />
      </div>
      <div class="tuco-line2">
        <TucFight :data="props.data.detail.fight_statisic.max_defeat_avatar" label="击败最多敌人" />
        <TucFight
          :data="props.data.detail.fight_statisic.max_take_damage_avatar"
          label="最高承受伤害"
        />
        <TucFight
          :data="props.data.detail.fight_statisic.shortest_avatar_list"
          label="最快完成演出"
        />
        <TucFight :data="props.data.detail.fight_statisic.max_damage_avatar" label="最高伤害输出" />
      </div>
      <div class="tuco-line3">
        <TucTile :val="`${props.data.stat.rent_cnt}次`" title="助演角色支援" />
        <TucTile
          :title="`获得星章-${props.data.stat.medal_num}`"
          :val="props.data.stat.get_medal_round_list"
        />
        <TucTile :val="`${props.data.stat.avatar_bonus_num}次`" title="场外声援" />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import gameEnum from "@enum/game.js";

import TucFight from "./tuc-fight.vue";
import TucTile from "./tuc-tile.vue";

type TucOverviewProps = {
  data: TGApp.Sqlite.Combat.TableTrans;
  showShareInfo: boolean;
  version: string | undefined;
};

const props = defineProps<TucOverviewProps>();

function getBestVal(): string {
  if (props.data.stat.difficulty_id < gameEnum.combat.diff.TAROT) {
    return `第${props.data.stat.max_round_id}幕`;
  }
  return `第${props.data.stat.max_round_id}幕·圣牌${props.data.stat.tarot_finished_cnt}`;
}

function getRoundVal(): string {
  if (props.data.stat.difficulty_id < gameEnum.combat.diff.TAROT) {
    return `第${props.data.stat.max_round_id}幕`;
  }
  return `${props.data.stat.tarot_finished_cnt + props.data.stat.max_round_id}`;
}

function getTime(): string {
  const totalUseTime = props.data.detail.fight_statisic.total_use_time;
  const sec = totalUseTime % 60;
  const min = (totalUseTime - sec) / 60;
  return `${min}分${sec}秒`;
}

function isFinTarot(): boolean {
  if (!props.data.hasData) return false;
  return props.data.stat.max_round_id === 10 && props.data.stat.tarot_finished_cnt > 0;
}
</script>
<style lang="scss" scoped>
.tuco-box {
  position: relative;
  display: flex;
  width: 100%;
  height: fit-content;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  box-shadow: 0 2px 6px var(--common-shadow-1);
  row-gap: 12px;
}

.tuco-title {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--common-shadow-1);
  column-gap: 8px;
}

.tuco-heading {
  display: flex;
  flex-direction: column;
  row-gap: 4px;
}

.tuco-heading-main {
  display: flex;
  align-items: center;
  column-gap: 8px;

  img {
    width: 30px;
    height: 30px;
    object-fit: contain;
  }

  span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
  }
}

.tuco-period {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
}

.tuco-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  margin-left: auto;
  font-size: 12px;
  opacity: 0.8;
  row-gap: 4px;
}

.tuco-content {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  row-gap: 8px;
}

.tuco-line1 {
  position: relative;
  display: grid;
  width: 100%;
  column-gap: 8px;
  grid-template-columns: 1fr 2fr 2fr 1fr;
}

.tuco-line2 {
  position: relative;
  display: grid;
  width: 100%;
  column-gap: 8px;
  grid-template-columns: repeat(4, 1fr);
}

.tuco-line3 {
  position: relative;
  display: grid;
  width: 100%;
  column-gap: 8px;
  grid-template-columns: repeat(3, 1fr);
}
</style>
