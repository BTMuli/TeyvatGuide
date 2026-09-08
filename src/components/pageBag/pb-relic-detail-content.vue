<!-- 圣遗物详情正文 -->
<template>
  <div ref="shareRef" class="pb-rd-box">
    <div class="pb-rdt-meta">GUID:{{ props.cur.guid }}</div>
    <button
      v-if="props.showActions && props.closable"
      aria-label="收起圣遗物详情"
      class="pb-rdt-act"
      data-html2canvas-ignore
      title="收起"
      type="button"
      @click="emits('close')"
    >
      <v-icon size="16">mdi-close</v-icon>
    </button>
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
      <button
        v-if="props.showActions"
        aria-label="分享圣遗物详情"
        class="pb-rdt-share"
        data-html2canvas-ignore
        title="分享"
        type="button"
        @click="share()"
      >
        <v-icon size="12">mdi-share-variant</v-icon>
      </button>
    </div>
    <div class="pb-rd-props">
      <div class="pb-rdp-main">
        <img v-if="props.cur.mp.info.icon !== ''" :src="props.cur.mp.info.icon" alt="icon" />
        <span v-else style="width: 16px" />
        <span>{{ props.cur.mp.info.filter_name }}</span>
        <span>{{ wikiUtils.propFmt(props.cur.mp.type, props.cur.mp.val) }}</span>
      </div>
      <div v-for="prop in props.cur.sp" :key="prop.type" class="pb-rdp-sub">
        <img v-if="prop.info.icon !== ''" :src="prop.info.icon" alt="icon" />
        <span v-else style="width: 16px" />
        <span>{{ prop.info.filter_name }}</span>
        <span v-if="prop.vals.length > 1" class="pb-rdp-cnt">{{ prop.vals.length - 1 }}</span>
        <span>{{ wikiUtils.propFmt(prop.type, prop.val) }}</span>
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
      <span class="pb-rd-section-label">物件故事</span>
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
  closable?: boolean;
  showActions?: boolean;
};

type PbRelicDetailContentEmits = { close: [] };

const props = withDefaults(defineProps<PbRelicDetailContentProps>(), { showActions: true });
const emits = defineEmits<PbRelicDetailContentEmits>();
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
  await TGShare.modern(fileName, shareRef.value, 4);
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

.pb-rdt-act,
.pb-rdt-share {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.pb-rdt-act {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 0;
  margin-left: auto;
  color: var(--tgc-od-red);
}

.pb-rdt-share {
  position: absolute;
  z-index: 1;
  bottom: -4px;
  left: -6px;
  color: var(--tgc-od-blue);
}

.pb-rdt-act:focus-visible,
.pb-rdt-share:focus-visible {
  outline: 2px solid var(--tgc-od-blue);
  outline-offset: 2px;
}

.pb-rdt-meta {
  position: absolute;
  right: 0;
  bottom: 0;
  color: var(--box-text-4);
  font-size: 10px;
}

.pb-rd-desc {
  display: flex;
  flex-direction: column;
  padding-bottom: 16px;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 4px;
  line-height: 1.65;
}

.pb-rd-desc p {
  margin: 0;
}

.pb-rd-section-label {
  color: var(--box-text-4);
  font-size: 11px;
  line-height: 16px;
}

.pb-rd-props {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-3);
  font-size: 14px;
}

.pb-rdp-main {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  border-bottom: 1px solid var(--common-shadow-2);
  column-gap: 4px;
  font-family: var(--font-title);

  img {
    width: 16px;
    height: 16px;
    filter: invert(1);

    .dark & {
      filter: unset;
    }
  }

  :last-child {
    margin-left: auto;
  }
}

.pb-rdp-sub {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  column-gap: 4px;

  img {
    width: 16px;
    height: 16px;
    filter: invert(1);

    .dark & {
      filter: unset;
    }
  }

  :last-child {
    margin-left: auto;
  }
}

.pb-rdp-cnt {
  position: relative;
  display: flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--tgc-od-red);
  font-family: var(--font-title);
  font-size: 12px;
  line-height: 16px;
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
</style>
