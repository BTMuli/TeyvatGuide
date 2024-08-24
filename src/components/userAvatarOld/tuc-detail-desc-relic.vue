<template>
  <TucDetailDesc>
    <template #title>
      <span>圣遗物</span>
    </template>
    <template #content>
      <TucDetailRelic :model-value="props.modelValue" :pos="props.modelValue.pos" />
      <div class="tuc-ddr-content">
        <div class="tuc-ddrc-top">
          <span>{{ props.modelValue.name }}</span>
          <span>+</span>
          <span>{{ props.modelValue.level }}</span>
        </div>
        <div class="tuc-ddrc-bottom">
          <img :src="`/icon/star/${props.modelValue.rarity}.webp`" alt="star" />
        </div>
      </div>
    </template>
    <template #desc>
      <div class="tuc-ddrd-title">{{ props.modelValue.set.name }}：</div>
      <div v-for="(desc, index) in props.modelValue.set.affixes" :key="index" class="tuc-ddrc-desc">
        <span>{{ desc.activation_number }}件套：</span>
        <span>{{ desc.effect }}</span>
      </div>
    </template>
  </TucDetailDesc>
</template>
<script lang="ts" setup>
import TucDetailDesc from "./tuc-detail-desc.vue";
import TucDetailRelic from "./tuc-detail-relic.vue";

interface TucDetailDescRelicProps {
  modelValue: TGApp.Game.Avatar.Relic;
}

const props = defineProps<TucDetailDescRelicProps>();
</script>
<style lang="css" scoped>
.tuc-ddr-content {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: start;
  justify-content: space-around;
  margin-left: 5px;
}

.tuc-ddrc-top {
  height: 20px;
  color: var(--box-text-1);
}

.tuc-ddrc-top :nth-child(1) {
  margin-right: 10px;
}

.tuc-ddrc-top :nth-child(3) {
  color: var(--tgc-yellow-1);
}

.tuc-ddrc-bottom {
  height: 20px;
}

.tuc-ddrc-bottom img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.tuc-ddrd-title {
  color: var(--box-text-3);
  font-family: var(--font-title);
  font-size: 16px;
}
</style>
