<!-- 楼层组件 -->
<template>
  <div class="tuad-box">
    <div class="tuad-title">
      <div class="title">第{{ props.floor.id }}层</div>
      <div class="append">
        <span>{{ props.floor.winStar }}</span>
        <span>/{{ props.floor.maxStar }}</span>
        <img alt="Abyss" src="/icon/star/Abyss.webp" />
      </div>
    </div>
    <div v-if="props.floor.buff && props.floor.buff.length > 0" class="tuad-buff">
      <span>地脉异常:</span>
      <span v-for="(b, i) in props.floor.buff" :key="i">{{ b }}</span>
    </div>
    <div class="tuad-index-box">
      <TuaDetailLevel v-for="level in props.floor.levels" :key="level.id" :level />
    </div>
  </div>
</template>
<script lang="ts" setup>
import TuaDetailLevel from "./tua-detail-level.vue";

type TuaDetailProps = { floor: TGApp.Sqlite.Abyss.Floor };

const props = defineProps<TuaDetailProps>();
</script>
<style lang="css" scoped>
.tuad-box {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
  row-gap: 4px;
}

.tuad-title {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 4px;
  border-bottom: 1px solid var(--common-shadow-4);
  font-size: 20px;
  line-height: 24px;

  .append {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: 4px;

    span:first-child {
      color: var(--tgc-od-orange);
      font-family: var(--font-title);
    }

    img {
      width: 28px;
      height: 28px;
      padding: 2px;
      border-radius: 50%;
      background: #2c313c;
    }
  }
}

.tuad-buff {
  position: relative;
  margin-left: auto;
  color: var(--box-text-1);
  font-size: 14px;
  font-style: italic;
}

.tuad-index-box {
  display: grid;
  width: 100%;
  gap: 8px;
  grid-template-columns: repeat(3, 1fr);
}
</style>
