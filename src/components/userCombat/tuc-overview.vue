<!-- 剧诗数据概览 -->
<template>
  <div class="tuco-box">
    <div class="tuco-line1">
      <TucTile :val="getBestVal()" title="最佳记录" />
      <TucTile :val="props.data.coin_num" title="消耗幻剧之花" />
      <TucTile :val="getTime()" title="总耗时" />
      <TucTile :title="getRoundTitle()" :val="getRoundVal()" />
    </div>
    <div class="tuco-line2">
      <TucFight :data="props.fights.max_defeat_avatar" label="击败最多敌人" />
      <TucFight :data="props.fights.max_take_damage_avatar" label="最高承受伤害" />
      <TucFight :data="props.fights.shortest_avatar_list" label="最快完成演出" />
      <TucFight :data="props.fights.max_damage_avatar" label="最高伤害输出" />
    </div>
    <div class="tuco-line3">
      <TucTile :val="`${props.data.rent_cnt}次`" title="助演角色支援" />
      <TucTile :title="`获得星章-${props.data.medal_num}`" :val="props.data.get_medal_round_list" />
      <TucTile :val="`${props.data.avatar_bonus_num}次`" title="场外声援" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import TucFight from "./tuc-fight.vue";
import TucTile from "./tuc-tile.vue";

type TucOverviewProps = { data: TGApp.Game.Combat.Stat; fights: TGApp.Game.Combat.FightStatisic };

const props = defineProps<TucOverviewProps>();

function getRoundTitle(): string {
  switch (props.data.difficulty_id) {
    case 0:
      return "未选择";
    case 1:
      return "轻简模式";
    case 2:
      return "普通模式";
    case 3:
      return "困难模式";
    case 4:
      return "卓越模式";
    case 5:
      return "月谕模式";
    default:
      return `未知模式${props.data.difficulty_id}`;
  }
}

function getBestVal(): string {
  if (props.data.difficulty_id < 5) return `第${props.data.max_round_id}幕`;
  return `第${props.data.max_round_id}幕·圣牌${props.data.tarot_finished_cnt}`;
}

function getRoundVal(): string {
  if (props.data.difficulty_id < 5) return `第${props.data.max_round_id}幕`;
  return `${props.data.tarot_finished_cnt + props.data.max_round_id}`;
}

function getTime(): string {
  const sec = props.fights.total_use_time % 60;
  const min = (props.fights.total_use_time - sec) / 60;
  return `${min}分${sec}秒`;
}
</script>
<style lang="css" scoped>
.tuco-box {
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
