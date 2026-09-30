<!-- 圣遗物详情正文 -->
<template>
  <div ref="shareRef" class="pb-rd-box">
    <div class="pb-rdt-meta" aria-hidden="true">GUID:{{ props.cur.guid }}</div>
    <div class="pb-rd-top">
      <div class="pb-rdt-left">
        <img :src="`/icon/bg/${props.cur.brief.star}-Star.webp`" alt="bg" class="pb-rdtl-bg" />
        <img :src="`/WIKI/relic/${props.cur.brief.icon}.webp`" alt="icon" class="pb-rdtl-icon" />
      </div>
      <div class="pb-rdt-right">
        <div class="pb-rdt-title">
          <span>{{ props.cur.brief.name }}</span>
          <span>Lv.{{ props.cur.level - 1 }}</span>
        </div>
        <div class="pb-rdt-sub">
          <span>{{ wikiUtils.relic.pos(props.cur.brief.pos ?? 0) }}</span>
          <span v-if="props.cur.is_marked || props.cur.is_locked" class="pb-rdt-stat">
            <span v-if="props.cur.is_locked">🔒</span>
            <span v-if="props.cur.is_marked">⭐</span>
          </span>
        </div>
      </div>
      <div v-if="props.avatarId !== undefined" class="pb-rdtl-avatar">
        <img
          v-if="avatarStar !== undefined"
          :src="`/icon/bg/${avatarStar}-Star.webp`"
          alt="star"
          class="pb-rdtl-avatar-bg"
        />
        <img
          :src="`/WIKI/character/${props.avatarId}.webp`"
          alt="avatar"
          class="pb-rdtl-avatar-icon"
        />
      </div>
    </div>
    <div class="pb-rd-props">
      <div class="pb-rdp-main">
        <img
          v-if="props.cur.mp.info.icon !== ''"
          :src="props.cur.mp.info.icon"
          alt=""
          class="pb-rdp-icon"
        />
        <span v-else class="pb-rdp-icon" aria-hidden="true" />
        <span class="pb-rdp-label">{{ props.cur.mp.info.filter_name }}</span>
        <span class="pb-rdp-value">{{
          wikiUtils.propFmt(props.cur.mp.type, props.cur.mp.val)
        }}</span>
      </div>
      <div v-for="prop in props.cur.sp" :key="prop.type" class="pb-rdp-sub">
        <img v-if="prop.info.icon !== ''" :src="prop.info.icon" alt="" class="pb-rdp-icon" />
        <span v-else class="pb-rdp-icon" aria-hidden="true" />
        <span class="pb-rdp-label">{{ prop.info.filter_name }}</span>
        <span
          v-if="prop.vals.length > 1"
          :aria-label="`强化${prop.vals.length - 1}次`"
          class="pb-rdp-cnt"
          role="img"
        >
          <span
            v-for="count in prop.vals.length - 1"
            :key="count"
            class="pb-rdp-cnt-bar"
            aria-hidden="true"
          />
        </span>
        <span class="pb-rdp-value">{{ wikiUtils.propFmt(prop.type, prop.val) }}</span>
      </div>
    </div>
    <div v-if="setInfo" class="pb-rd-set">
      <span class="pb-rd-section-label">套装效果</span>
      <div class="pb-rds-title">{{ setInfo.name }}</div>
      <div v-for="affix in setInfo.affix" :key="affix.cnt" class="pb-rds-effect">
        <span>{{ affix.cnt }}</span>
        <span>件套：</span>
        <span>{{ affix.desc }}</span>
      </div>
    </div>
    <div v-if="posInfo" class="pb-rd-desc">
      <p>{{ posInfo.desc }}</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import TGShare from "@utils/TGShare.js";
import wikiUtils from "@utils/wikiUtils.js";
import { computed, shallowRef, useTemplateRef, watch } from "vue";

import { AppCharacterData, wrRelic, wrSet } from "@/data/index.js";

type PbRelicDetailContentProps = {
  cur: TGApp.Sqlite.UserBag.RelicTable;
  avatarId?: number;
};

const props = defineProps<PbRelicDetailContentProps>();
const shareRef = useTemplateRef<HTMLElement>("shareRef");
const characterStarMap = new Map<number, number>(
  AppCharacterData.map((character) => [character.id, character.star]),
);
const avatarStar = computed<number | undefined>(() =>
  props.avatarId === undefined ? undefined : characterStarMap.get(props.avatarId),
);
const posInfo = shallowRef<TGApp.App.Relic.RelicItem>();
const setInfo = shallowRef<TGApp.App.Relic.SetItem>();

watch(
  () => props.cur,
  () => {
    loadPosInfo();
  },
  { immediate: true },
);

async function share(): Promise<void> {
  if (shareRef.value === null) {
    showSnackbar.error("分享失败，未找到分享元素");
    return;
  }
  const fileName = `圣遗物-${props.cur.brief.name}-${props.cur.guid}`;
  await TGShare.modern(fileName, shareRef.value, 4, false, {
    onCloneNode: (cloned) => {
      if (!(cloned instanceof HTMLElement)) return;
      const meta = cloned.querySelector<HTMLElement>(".pb-rdt-meta");
      if (meta === null) return;
      meta.style.visibility = "visible";
      meta.style.zIndex = "0";
    },
  });
}

defineExpose({ share });

function loadPosInfo(): void {
  posInfo.value = wrRelic.find(
    (i) => i.pos === props.cur.brief.pos && i.set === props.cur.brief.set,
  );
  setInfo.value = wrSet.find((i) => i.id === props.cur.brief.set);
}
</script>

<style lang="scss" scoped>
.pb-rd-box {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  color: var(--app-page-content);
  overflow-y: auto;
  row-gap: 8px;
}

.pb-rd-top {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  column-gap: 8px;
}

.pb-rdt-left {
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

.pb-rdtl-bg {
  position: absolute;
  z-index: 0;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.pb-rdtl-icon {
  position: relative;
  width: 100%;
  height: 100%;
}

.pb-rdtl-avatar {
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
    z-index: 2;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}

.pb-rdt-right {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.pb-rdt-title {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-title);
}

.pb-rdt-sub {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.pb-rdt-stat {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  column-gap: 4px;
}

.pb-rdt-meta {
  position: absolute;
  z-index: -1;
  right: 0;
  bottom: 0;
  color: var(--box-text-4);
  font-size: 10px;
  visibility: hidden;
}

.pb-rd-desc {
  display: flex;
  flex-direction: column;
  padding-bottom: 16px;
  color: var(--app-page-content);
  font-size: 12px;
  gap: 4px;
  line-height: 1.65;
}

.pb-rd-desc p {
  margin: 0;
  font-style: italic;
}

.pb-rd-section-label {
  color: var(--box-text-4);
  font-size: 11px;
  line-height: 16px;
}

.pb-rd-props {
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

.pb-rdp-main,
.pb-rdp-sub {
  display: flex;
  min-width: 0;
  box-sizing: border-box;
  align-items: center;
  padding: 4px 8px;
  gap: 8px;
}

.pb-rdp-main {
  min-height: 36px;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-3);
  font-weight: 600;
}

.pb-rdp-sub {
  min-height: 28px;
  color: var(--box-text-4);
}

.pb-rdp-icon {
  width: 16px;
  height: 16px;
  flex: none;
  filter: var(--icon-filter);
  object-fit: contain;
}

.pb-rdp-label {
  min-width: 0;
  color: var(--app-page-content);
  overflow-wrap: anywhere;
}

.pb-rdp-value {
  flex: none;
  margin-left: auto;
  color: var(--app-page-content);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.pb-rdp-main .pb-rdp-value {
  color: var(--common-text-title);
}

.pb-rdp-cnt {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 2px;
}

.pb-rdp-cnt-bar {
  width: 4px;
  height: 12px;
  border-radius: 1px;
  background: var(--tgc-od-orange);
}

.pb-rd-set {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
}

.pb-rds-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 16px;
}

.pb-rds-effect {
  font-size: 14px;

  :nth-child(1),
  :nth-child(2) {
    font-family: var(--font-title);
  }

  :nth-child(1) {
    color: var(--tgc-od-orange);
  }
}

html.default .pb-rds-effect :nth-child(1) {
  filter: brightness(0.65);
}
</style>
