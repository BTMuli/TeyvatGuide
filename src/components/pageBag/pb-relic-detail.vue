<!-- 圣遗物详情浮窗 -->
<template>
  <v-navigation-drawer v-model="visible" :location="'right'" :style="{ zIndex: 9 }">
    <div class="pb-rdt-meta">GUID:{{ props.cur.guid }}</div>
    <div class="pb-rd-box">
      <v-icon class="pb-rdt-act" size="16" title="收起" @click="hide()">mdi-close</v-icon>
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
      </div>
      <div class="pb-rd-props">
        <div class="pb-rdp-main">
          <img v-if="props.cur.mp.info.icon !== ''" :src="props.cur.mp.info.icon" alt="icon" />
          <span v-else style="width: 16px" />
          <span>{{ props.cur.mp.info.filter_name }}</span>
          <span>{{ wikiUtils.propFmt(props.cur.mp.type, props.cur.mp.val) }}</span>
        </div>
        <div v-for="(prop, idx) in props.cur.sp" :key="idx" class="pb-rdp-sub">
          <img v-if="prop.info.icon !== ''" :src="prop.info.icon" alt="icon" />
          <span v-else style="width: 16px" />
          <span>{{ prop.info.filter_name }}</span>
          <span v-if="prop.vals.length > 1" class="pb-rdp-cnt">{{ prop.vals.length - 1 }}</span>
          <span>{{ wikiUtils.propFmt(prop.type, prop.val) }}</span>
        </div>
      </div>
      <div v-if="setInfo" class="pb-rd-set">
        <div class="pb-rds-title">{{ setInfo.name }}：</div>
        <div v-for="affix in setInfo.affix" :key="affix.cnt" class="pb-rds-effect">
          <span>{{ affix.cnt }}</span>
          <span>件套：</span>
          <span>{{ affix.desc }}</span>
        </div>
      </div>
      <div v-if="posInfo" class="pb-rd-desc">{{ posInfo.desc }}</div>
    </div>
  </v-navigation-drawer>
</template>
<script lang="ts" setup>
import { shallowRef, watch } from "vue";
import { wrRelic, wrSet } from "@/data/index.js";
import wikiUtils from "@utils/wikiUtils.js";

type PbRelicDetailProps = { cur: TGApp.Sqlite.UserBag.RelicTable };

const props = defineProps<PbRelicDetailProps>();
const visible = defineModel<boolean>("show");
const posInfo = shallowRef<TGApp.App.Relic.RelicItem>();
const setInfo = shallowRef<TGApp.App.Relic.SetItem>();

watch(
  () => props.cur,
  () => {
    loadPosInfo();
  },
  { immediate: true },
);

function hide(): void {
  visible.value = false;
}

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

.pb-rdt-right {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.pb-rdt-title {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 24px;
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

.pb-rdt-act {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  margin-left: auto;
  color: var(--tgc-od-red);
  cursor: pointer;
}

.pb-rdt-meta {
  position: absolute;
  right: 0;
  bottom: 0;
  color: var(--tgc-od-white);
  font-size: 10px;
}

.pb-rd-desc {
  color: var(--tgc-od-white);
  font-size: 12px;
  font-style: italic;
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
