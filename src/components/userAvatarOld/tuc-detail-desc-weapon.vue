<template>
  <TucDetailDesc>
    <template #title>
      <span>武器</span>
    </template>
    <template #content>
      <TucDetailItemBox
        :bg="`/icon/bg/${modelValue.rarity}-Star.webp`"
        :icon="`/WIKI/weapon/${modelValue.id}.webp`"
      />
      <div class="tuc-ddw-content">
        <div class="tuc-ddwc-top">
          <span>{{ modelValue.name }}</span>
          <span>Lv.{{ modelValue.level }}</span>
          <span>精炼</span>
          <span>{{ modelValue.affix_level }}</span>
          <span>阶</span>
        </div>
        <div class="tuc-ddwc-bottom">
          <img :src="`/icon/star/${modelValue.rarity}.webp`" alt="star" />
        </div>
      </div>
    </template>
    <template #desc>
      <span v-if="modelValue.desc" v-html="parseHtmlText(modelValue.desc)"></span>
    </template>
  </TucDetailDesc>
</template>
<script lang="ts" setup>
import { parseHtmlText } from "@utils/toolFunc.js";

import TucDetailDesc from "./tuc-detail-desc.vue";
import TucDetailItemBox from "./tuc-detail-itembox.vue";

defineProps<{ modelValue: TGApp.Game.Avatar.WeaponDetail }>();
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
