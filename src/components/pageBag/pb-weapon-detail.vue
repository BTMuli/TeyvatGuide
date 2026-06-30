<!-- 武器详情浮窗 -->
<template>
  <v-navigation-drawer v-model="visible" :location="'right'" :style="{ zIndex: 9 }">
    <div class="pb-wdt-meta">GUID:{{ props.cur.tb.guid }}</div>
    <div class="pb-wd-box">
      <v-icon class="pb-wdt-act" size="16" title="收起" @click="hide()">mdi-close</v-icon>
      <div class="pb-wd-top">
        <div class="pb-wdt-left">
          <img :src="`/icon/bg/${props.cur.info.star}-Star.webp`" alt="bg" class="pb-wdtl-bg" />
          <img :src="`/WIKI/weapon/${props.cur.info.id}.webp`" alt="icon" class="pb-wdtl-icon" />
        </div>
        <div class="pb-wdt-right">
          <div class="pb-wdt-title">
            <span>{{ props.cur.info.name }}</span>
            <span>Lv.{{ props.cur.tb.info.level }}</span>
          </div>
          <div class="pb-wdt-sub">
            <span>{{ props.cur.info.weapon }}</span>
            <span>精炼{{ getAffixLevel() }}</span>
          </div>
        </div>
      </div>
      <div class="pb-wd-stats">
        <div v-for="stat in weaponStats" :key="stat.type" class="pb-wd-stat">
          <span class="pb-wd-stat-name">{{ stat.info.name }}</span>
          <span class="pb-wd-stat-val">{{ wikiUtils.propFmt(stat.type, stat.val) }}</span>
        </div>
      </div>
      <div class="pb-wd-affix">
        <span v-if="props.cur.info.affix" class="pb-wd-affix-title">
          {{ props.cur.info.affix.Name }}：
        </span>
        <span class="pb-wd-affix-desc" v-html="parseAffixDesc()" />
      </div>
      <div class="pb-wd-desc">{{ props.cur.info.description }}</div>
    </div>
  </v-navigation-drawer>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import wikiUtils from "@utils/wikiUtils.js";
import { parseHtmlText } from "@utils/toolFunc.js";

import type { WeaponInfo } from "@/pages/common/PageBagWeapon.vue";

type PbWeaponDetailProps = { cur: WeaponInfo };

const props = defineProps<PbWeaponDetailProps>();
const visible = defineModel<boolean>("show");

function hide(): void {
  visible.value = false;
}

function getAffixLevel(): number {
  if (!props.cur.tb.info.affix_map) return 1;
  const values = Object.values(props.cur.tb.info.affix_map);
  return values.length > 0 ? values[0] + 1 : 1;
}

function parseAffixDesc(): string {
  if (!props.cur.info.affix) return "";
  const affixLevel = getAffixLevel();
  const descIndex = Math.min(affixLevel - 1, props.cur.info.affix.Descriptions.length - 1);
  return parseHtmlText(props.cur.info.affix.Descriptions[descIndex].Description);
}

const weaponStats = computed(() => {
  const level = props.cur.tb.info.level;
  const promoteLevel = props.cur.tb.info.promote_level;
  return wikiUtils.weapon(props.cur.info, level, promoteLevel);
});
</script>
<style lang="scss" scoped>
:deep(.v-expansion-panel-title) {
  background: var(--common-shadow-1);
}

.pb-wd-box {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  overflow-y: auto;
  row-gap: 8px;
}

.pb-wd-top {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  column-gap: 8px;
}

.pb-wdt-left {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  aspect-ratio: 1;
}

.pb-wdtl-bg {
  position: absolute;
  z-index: 0;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.pb-wdtl-icon {
  position: relative;
  width: 100%;
  height: 100%;
}

.pb-wdt-right {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.pb-wdt-title {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 24px;
  font-family: var(--font-title);
}

.pb-wdt-sub {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.pb-wdt-act {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  margin-left: auto;
  color: var(--tgc-od-red);
  cursor: pointer;
}

.pb-wdt-meta {
  position: absolute;
  right: 0;
  bottom: 0;
  color: var(--tgc-od-white);
  font-size: 10px;
}

.pb-wd-desc {
  color: var(--tgc-od-white);
  font-size: 12px;
  font-style: italic;
}

.pb-wd-affix {
  position: relative;
  display: flex;
  flex-direction: column;
  font-size: 14px;

  &-title {
    font-family: var(--font-title);
  }
}

.pb-wd-stats {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  row-gap: 4px;
}

.pb-wd-stat {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;

  &-name {
    color: var(--tgc-od-white);
    font-size: 12px;
  }

  &-val {
    color: var(--tgc-od-green);
    font-family: var(--font-title);
    font-size: 14px;
  }
}
</style>
