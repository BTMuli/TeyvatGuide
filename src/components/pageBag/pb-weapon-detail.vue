<!-- 武器详情浮窗 -->
<template>
  <v-navigation-drawer v-model="visible" :location="'right'" :style="{ zIndex: 9 }">
    <div ref="shareRef" class="pb-wd-box">
      <div class="pb-wdt-meta">GUID:{{ props.cur.tb.guid }}</div>
      <v-icon class="pb-wdt-act" data-html2canvas-ignore size="16" title="收起" @click="hide()">
        mdi-close
      </v-icon>
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
            <span>{{ props.cur.info.weapon }}{{ props.cur.tb.info.is_locked ? "🔒" : "" }}</span>
            <span>精炼{{ getAffixLevel() }}</span>
          </div>
        </div>
        <div v-if="props.avatarId !== undefined" class="pb-wdtl-avatar">
          <img
            v-if="avatarStar !== undefined"
            :src="`/icon/bg/${avatarStar}-Star.webp`"
            alt="star"
            class="pb-wdtl-avatar-bg"
          />
          <img
            :src="`/WIKI/character/${props.avatarId}.webp`"
            alt="avatar"
            class="pb-wdtl-avatar-icon"
          />
        </div>
        <v-icon
          class="pb-wdt-share"
          data-html2canvas-ignore
          size="12"
          title="分享"
          @click="share()"
        >
          mdi-share-variant
        </v-icon>
      </div>
      <div class="pb-wd-stats">
        <div
          v-for="(stat, idx) in weaponStats"
          :key="idx"
          :class="{ sub: idx === 1 }"
          class="pb-wd-stat"
        >
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
import showSnackbar from "@comp/func/snackbar.js";
import TGShare from "@utils/TGShare.js";
import { parseHtmlText } from "@utils/toolFunc.js";
import wikiUtils from "@utils/wikiUtils.js";
import { computed, useTemplateRef } from "vue";

import { AppCharacterData } from "@/data/index.js";
import type { WeaponInfo } from "@/pages/common/PageBagWeapon.vue";

type PbWeaponDetailProps = { cur: WeaponInfo; avatarId?: number };

const props = defineProps<PbWeaponDetailProps>();
const visible = defineModel<boolean>("show");
const shareRef = useTemplateRef<HTMLElement>("shareRef");
const characterStarMap = new Map<number, number>(
  AppCharacterData.map((character) => [character.id, character.star]),
);
const avatarStar = computed<number | undefined>(() =>
  props.avatarId === undefined ? undefined : characterStarMap.get(props.avatarId),
);

function hide(): void {
  visible.value = false;
}

async function share(): Promise<void> {
  if (shareRef.value === null) {
    showSnackbar.error("分享失败，未找到分享元素");
    return;
  }
  const fileName = `武器-${props.cur.info.name}-${props.cur.tb.guid}`;
  await TGShare.modern(fileName, shareRef.value, 4);
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

const weaponStats = computed<Array<TGApp.App.Weapon.WeaponProp>>(() => {
  const level = props.cur.tb.info.level;
  const promoteLevel = props.cur.tb.info.promote_level;
  return wikiUtils.weapon(props.cur.info, level, promoteLevel);
});
</script>
<style lang="scss" scoped>
.pb-wd-box {
  position: relative;
  display: flex;
  box-sizing: border-box;
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

.pb-wdtl-avatar {
  position: absolute;
  z-index: 2;
  bottom: -4px;
  left: 20px;
  overflow: hidden;
  width: 24px;
  height: 24px;
  border-radius: 50%;

  &-bg,
  &-icon {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}

.pb-wdt-right {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.pb-wdt-title {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
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
  left: 0;
  margin-left: auto;
  color: var(--tgc-od-red);
  cursor: pointer;
}

.pb-wdt-share {
  position: absolute;
  z-index: 1;
  bottom: 0;
  left: -6px;
  color: var(--tgc-od-blue);
  cursor: pointer;
}

.pb-wdt-meta {
  position: absolute;
  right: 0;
  bottom: 0;
  color: var(--tgc-od-white);
  font-size: 8px;
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

  &-title {
    font-family: var(--font-title);
  }

  &-desc {
    font-size: 14px;

    :deep(span) {
      filter: var(--gs-filter);
    }
  }
}

.pb-wd-stats {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 4px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 2px;
  background: var(--box-bg-1);
}

.pb-wd-stat {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-title);
  font-size: 16px;

  &.sub {
    font-family: var(--font-text);
    font-size: 14px;
  }
}
</style>
