<!-- 武器详情正文 -->
<template>
  <div ref="shareRef" class="pb-wd-box">
    <div class="pb-wdt-meta" aria-hidden="true">GUID:{{ props.cur.tb.guid }}</div>
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
    </div>
    <div class="pb-wd-stats">
      <div
        v-for="(stat, idx) in weaponStats"
        :key="stat.type"
        :class="{ sub: idx === 1 }"
        class="pb-wd-stat"
      >
        <span class="pb-wd-stat-name">{{ stat.info.name }}</span>
        <span class="pb-wd-stat-val">{{ wikiUtils.propFmt(stat.type, stat.val) }}</span>
      </div>
    </div>
    <div class="pb-wd-affix">
      <span class="pb-wd-section-label">武器技能</span>
      <span v-if="props.cur.info.affix" class="pb-wd-affix-title">
        {{ props.cur.info.affix.Name }}：
      </span>
      <span class="pb-wd-affix-desc" v-html="parseAffixDesc()" />
    </div>
    <div class="pb-wd-desc">
      <p>{{ props.cur.info.description }}</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import TGShare from "@utils/TGShare.js";
import { parseHtmlText } from "@utils/toolFunc.js";
import { getWeaponRefineLevel } from "@utils/userBagGroup.js";
import wikiUtils from "@utils/wikiUtils.js";
import { computed, useTemplateRef } from "vue";

import { AppCharacterData } from "@/data/index.js";

type PbWeaponDetailContentProps = {
  cur: TGApp.App.UserBag.WeaponItem;
  avatarId?: number;
};

const props = defineProps<PbWeaponDetailContentProps>();
const shareRef = useTemplateRef<HTMLElement>("shareRef");
const characterStarMap = new Map<number, number>(
  AppCharacterData.map((character) => [character.id, character.star]),
);
const avatarStar = computed<number | undefined>(() =>
  props.avatarId === undefined ? undefined : characterStarMap.get(props.avatarId),
);

async function share(): Promise<void> {
  if (shareRef.value === null) {
    showSnackbar.error("分享失败，未找到分享元素");
    return;
  }
  const fileName = `武器-${props.cur.info.name}-${props.cur.tb.guid}`;
  await TGShare.modern(fileName, shareRef.value, 4, false, {
    onCloneNode: (cloned) => {
      if (!(cloned instanceof HTMLElement)) return;
      const meta = cloned.querySelector<HTMLElement>(".pb-wdt-meta");
      if (meta === null) return;
      meta.style.visibility = "visible";
      meta.style.zIndex = "0";
    },
  });
}

defineExpose({ share });

function getAffixLevel(): number {
  return getWeaponRefineLevel(props.cur);
}

function parseAffixDesc(): string {
  const affix = props.cur.info.affix;
  if (!affix || affix.Descriptions.length === 0) return "";
  const affixLevel = getAffixLevel();
  const descIndex = Math.min(affixLevel - 1, affix.Descriptions.length - 1);
  const description = affix.Descriptions[descIndex];
  return description === undefined ? "" : parseHtmlText(description.Description);
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
  color: var(--app-page-content);
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
  font-weight: normal;
}

.pb-wdt-sub {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.pb-wdt-meta {
  position: absolute;
  z-index: -1;
  right: 0;
  bottom: 0;
  color: var(--box-text-4);
  font-size: 10px;
  visibility: hidden;
}

.pb-wd-desc {
  display: flex;
  flex-direction: column;
  padding-bottom: 16px;
  color: var(--app-page-content);
  font-size: 12px;
  gap: 4px;
  line-height: 1.65;
}

.pb-wd-desc p {
  margin: 0;
  font-style: italic;
}

.pb-wd-section-label {
  color: var(--box-text-4);
  font-size: 11px;
  line-height: 16px;
}

.pb-wd-affix {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;

  &-title {
    font-family: var(--font-title);
    font-weight: normal;
  }

  &-desc {
    font-size: 14px;

    :deep(span) {
      filter: var(--gs-filter);
    }
  }
}

.pb-wd-stats {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  padding: 4px;
  border-radius: 8px;
  background: var(--box-bg-1);
  font-size: 14px;
  gap: 2px;
  line-height: 20px;
}

.pb-wd-stat {
  display: flex;
  min-width: 0;
  min-height: 36px;
  box-sizing: border-box;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-3);
  font-weight: 600;
  gap: 8px;

  &.sub {
    min-height: 28px;
    padding: 4px 8px;
    background: transparent;
    font-weight: 400;
  }
}

.pb-wd-stat-name {
  min-width: 0;
  overflow-wrap: anywhere;
}

.pb-wd-stat-val {
  flex: none;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.pb-wd-stat:not(.sub) .pb-wd-stat-val {
  color: var(--common-text-title);
}

html.default .pb-wd-affix-desc :deep(span) {
  filter: brightness(0.5);
}
</style>
