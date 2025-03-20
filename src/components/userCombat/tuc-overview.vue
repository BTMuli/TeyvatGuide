<template>
  <div class="tuco-box">
    <TucTile title="最佳记录" :val="props.data.max_round_id" />
    <TucTile :title="`获得星章-${props.data.medal_num}`" :val="props.data.get_medal_round_list" />
    <TucTile :title="getTitle()" :val="`第${props.data.max_round_id}幕`" />
    <TucTile title="消耗幻剧之花" :val="props.data.coin_num" />
    <TucFight label="最快完成演出" :data="props.fights.shortest_avatar_list" />
    <TucTile title="总耗时" :val="getTime()" />
    <!--    <TucTile title="助演角色支援" :val="`${props.data.rent_cnt}次`" />-->
    <!--    <TucTile title="场外声援" :val="`${props.data.avatar_bonus_num}次`" />-->
    <TucFight label="击败最多敌人" :data="props.fights.max_defeat_avatar" />
    <TucFight label="最高伤害输出" :data="props.fights.max_damage_avatar" />
    <TucFight label="最高承受伤害" :data="props.fights.max_take_damage_avatar" />
  </div>
</template>
<script lang="ts" setup>
import TucFight from "./tuc-fight.vue";
import TucTile from "./tuc-tile.vue";

type TucOverviewProps = { data: TGApp.Game.Combat.Stat; fights: TGApp.Game.Combat.FightStatisic };

const props = defineProps<TucOverviewProps>();

function getTitle(): string {
  switch (props.data.difficulty_id) {
    case 1:
      return "轻简模式";
    case 2:
      return "普通模式";
    case 3:
      return "困难模式";
    case 4:
      return "卓越模式";
    default:
      return `未知模式${props.data.difficulty_id}`;
  }
}

function getTime(): string {
  const sec = props.fights.total_use_time % 60;
  const min = (props.fights.total_use_time - sec) / 60;
  return `${min}分${sec}秒`;
}
</script>
<style lang="css" scoped>
.tuco-box {
  display: grid;
  width: 100%;
  grid-gap: 8px;
  grid-template-columns: repeat(3, 1fr);
}
</style>
