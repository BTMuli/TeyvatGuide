<template>
  <div class="tuc-cards-box">
    <div
      class="tuc-cards-item"
      v-for="(card, idx) in props.modelValue"
      :key="idx"
      :title="card.name"
    >
      <img :src="card.icon" :alt="card.name" />
    </div>
  </div>
</template>
<script lang="ts" setup>
interface TucCardsProps {
  modelValue: TGApp.Game.Combat.Card[];
}

const props = defineProps<TucCardsProps>();
</script>
<style lang="css" scoped>
.tuc-cards-box {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 5px;
}

.tuc-cards-item {
  position: relative;
  display: flex;
  width: 50px;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;

  img {
    max-width: 100%;
    filter: invert(1);
    object-fit: cover;
  }
}

.dark .tuc-cards-item {
  img {
    filter: none;
  }
}
</style>
