<template>
  <div class="tuc-buff-box">
    <div class="tuc-buff-item">
      <img alt="total" src="/source/UI/combatCrown.webp" />
      <span>{{ props.modelValue.summary.total_level }}</span>
    </div>
    <div
      class="tuc-buff-item"
      v-for="(item, idx) in props.modelValue.buffs"
      :key="idx"
      :title="item.name"
    >
      <img :alt="item.name" :src="item.icon" />
      <span>{{ item.level }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

interface TucBuffProps {
  modelValue: TGApp.Game.Combat.SplendourBuff;
}

const props = defineProps<TucBuffProps>();
const columnCnt = computed<number>(() => {
  const len = props.modelValue.buffs.length;
  if ((len + 1) % 2 === 1) return len / 2 + 1;
  return (len + 1) / 2;
});
</script>
<style lang="css" scoped>
.tuc-buff-box {
  display: grid;
  width: 100%;
  grid-gap: 5px;
  grid-template-columns: repeat(v-bind(columnCnt), 1fr);
}

.tuc-buff-item {
  position: relative;
  display: flex;
  width: 80px;
  height: 80px;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 5px;
  background-color: var(--box-bg-3);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  span {
    position: absolute;
    right: 0;
    bottom: 0;
    padding: 0 5px;
    background: var(--common-shadow-2);
    border-bottom-right-radius: 5px;
    border-top-left-radius: 5px;
    color: var(--tgc-white-2);
    font-family: var(--font-title);
    font-size: 14px;
    text-shadow: 0 0 5px rgb(0 0 0 / 20%);
  }
}
</style>
