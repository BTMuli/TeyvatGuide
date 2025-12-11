<!-- 关卡组件 -->
<template>
  <div class="tua-dl-box">
    <div class="tua-dl-title">
      <div class="title">第{{ props.level.id }}间</div>
      <div class="star">
        <img
          v-for="(i, idx) in genStarList()"
          :key="idx"
          :src="`/icon/star/abyss${i}.webp`"
          alt="icon"
        />
      </div>
    </div>
    <TuaDetailBattle v-if="props.level.upBattle" :battle="props.level.upBattle" title="上半" />
    <TuaDetailBattle v-if="props.level.downBattle" :battle="props.level.downBattle" title="下半" />
  </div>
</template>
<script lang="ts" setup>
import TuaDetailBattle from "./tua-detail-battle.vue";

type TuaDetailLevelProps = { level: TGApp.Sqlite.Abyss.Level };

const props = defineProps<TuaDetailLevelProps>();

function genStarList(): Array<number> {
  const arr: Array<number> = [];
  for (let i = 0; i < props.level.maxStar; i++) {
    if (i < props.level.winStar) arr.push(1);
    else arr.push(0);
  }
  return arr.reverse();
}
</script>
<style lang="css" scoped>
.tua-dl-box {
  position: relative;
  display: flex;
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  row-gap: 8px;
}

.tua-dl-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 12px;

  .title {
    color: var(--box-text-4);
    font-size: 18px;
  }

  .star {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: 4px;

    img {
      width: 24px;
      height: 24px;
      padding: 2px;
      border-radius: 50%;
      background: #2c313c;
    }
  }
}
</style>
