<template>
  <TucDetailDesc>
    <template #title>
      <span>武器</span>
    </template>
    <template #content>
      <TucDetailItemBox v-model="box" />
      <div class="tuc-ddw-content">
        <div class="tuc-ddwc-top">
          <span>{{ props.modelValue.name }}</span>
          <span>Lv.{{ props.modelValue.level }}</span>
          <span>精炼</span>
          <span>{{ props.modelValue.affix }}</span>
          <span>阶</span>
        </div>
        <div class="tuc-ddwc-bottom">
          <img :src="`/icon/star/${props.modelValue.star}.webp`" alt="star" />
        </div>
      </div>
    </template>
    <template #desc>
      <span>{{ props.modelValue.description }}</span>
    </template>
  </TucDetailDesc>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import TucDetailDesc from "./tuc-detail-desc.vue";
import TucDetailItemBox from "./tuc-detail-itembox.vue";

interface TucDetailDescWeaponProps {
  modelValue: TGApp.Sqlite.Character.RoleWeapon;
}

const props = defineProps<TucDetailDescWeaponProps>();
const box = computed(() => {
  return {
    bg: `/icon/bg/${props.modelValue.star}-Star.webp`,
    icon: `/WIKI/weapon/icon/${props.modelValue.id}.webp`,
  };
});
</script>
<style lang="css" scoped>
.tuc-ddw-content {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: start;
  justify-content: space-around;
  margin-left: 5px;
  color: var(--box-text-1);
}

.tuc-ddwc-top {
  height: 20px;
}

.tuc-ddwc-top span {
  margin: 0 5px;
}

.tuc-ddwc-top :nth-child(2),
.tuc-ddwc-top :nth-child(4) {
  color: var(--tgc-yellow-1);
}

.tuc-ddwc-bottom {
  height: 20px;
}

.tuc-ddwc-bottom img {
  width: 100%;
  height: 100%;
}
</style>
