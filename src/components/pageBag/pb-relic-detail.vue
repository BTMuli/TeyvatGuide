<!-- 圣遗物详情浮窗 -->
<template>
  <v-navigation-drawer v-model="visible" :location="'right'">
    <div class="pb-rd-box">
      <v-icon class="pb-rdt-act" @click="hide()">mdi-close</v-icon>
      <div class="pb-rd-top">
        <div class="pb-rdt-left">
          <img :src="`/icon/bg/${props.cur.info.star}-Star.webp`" alt="bg" class="pb-rdtl-bg" />
          <img :src="`/WIKI/relic/${props.cur.info.icon}.webp`" alt="icon" class="pb-rdtl-icon" />
        </div>
        <div class="pb-rdt-right">
          <div class="pb-rdt-title">
            <span>{{ props.cur.info.name }}</span>
            <span>Lv.{{ props.cur.tb.info.level - 1 }}</span>
          </div>
          <span class="pb-rdt-meta">GUID:{{ props.cur.guid }}</span>
        </div>
      </div>
      <div v-if="posInfo" class="pb-rd-desc">{{ posInfo.desc }}</div>
      <div class="pb-rd-props">
        <div v-if="mainProp" class="pb-rdp-main">
          <img v-if="mainProp.info.icon !== ''" :src="mainProp.info.icon" alt="icon" />
          <span v-else style="width: 16px" />
          <span>{{ mainProp.info.filter_name }}</span>
          <span>{{ mainProp.val < 1 ? mainProp.val.toFixed(2) : mainProp.val }}</span>
        </div>
        <div v-for="(prop, idx) in subProps" :key="idx" class="pb-rdp-sub">
          <img v-if="prop.info.icon !== ''" :src="prop.info.icon" alt="icon" />
          <span v-else style="width: 16px" />
          <span>{{ prop.info.filter_name }}</span>
          <span v-if="prop.cnt && prop.cnt > 1" class="pb-rdp-cnt">{{ prop.cnt }}</span>
          <span>{{ prop.val < 1 ? `${(prop.val * 100).toFixed(2)}%` : prop.val.toFixed(2) }}</span>
        </div>
      </div>
      <div v-if="setInfo" class="pb-rd-set">
        <div class="pb-rds-title">套装：{{ setInfo.name }}</div>
        <div v-for="affix in setInfo.affix" :key="affix.cnt" class="pb-rds-effect">
          <span>{{ affix.cnt }}</span>
          <span>件套：</span>
          <span>{{ affix.desc }}</span>
        </div>
      </div>
      <div v-if="posInfo" class="pb-rd-story">{{ posInfo.story.replace("\r\n", "") }}</div>
    </div>
  </v-navigation-drawer>
</template>
<script lang="ts" setup>
import type { RelicInfo } from "@/pages/common/PageBagRelic.vue";
import { computed, shallowRef, watch } from "vue";
import { AppPropMapData, wrMainLv, wrMainProp, wrRelic, wrSet, wrSub } from "@/data/index.js";

type PbRelicDetailProps = { cur: RelicInfo };
type PropMix = { type: number; info: TGApp.Game.Avatar.PropMapItem; val: number; cnt?: number };

const props = defineProps<PbRelicDetailProps>();
const visible = defineModel<boolean>("show");
const posInfo = shallowRef<TGApp.App.Relic.RelicItem>();
const setInfo = shallowRef<TGApp.App.Relic.SetItem>();
const mainProp = shallowRef<PropMix>();
const subProps = shallowRef<Array<PropMix>>([]);

const tbInfo = computed<TGApp.Plugins.Yae.ReliquaryInfo>(() => props.cur.tb.info);
const curInfo = computed<TGApp.App.Relic.RelicMini>(() => props.cur.info);

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
  posInfo.value = wrRelic.find((i) => i.pos === curInfo.value.pos && i.set === curInfo.value.set);
  setInfo.value = wrSet.find((i) => i.id === curInfo.value.set);
  parseMainProp();
  parseSubProps();
}

function parseMainProp(): void {
  const mainPropType = wrMainProp[tbInfo.value.main_prop_id];
  const mainLvFind = wrMainLv.find(
    (i) => i.star === curInfo.value.star && i.level === tbInfo.value.level,
  );
  if (mainLvFind) {
    mainProp.value = {
      type: mainPropType,
      val: mainLvFind.prop[mainPropType],
      info: AppPropMapData[mainPropType],
    };
  }
}

function parseSubProps(): void {
  let tmpProps: Array<PropMix> = [];
  for (const prop of tbInfo.value.append_prop_id_list) {
    const subInfo = wrSub[prop];
    const find = tmpProps.findIndex((i) => i.type === subInfo.type);
    if (find !== -1) {
      tmpProps[find].cnt = (tmpProps[find]?.cnt ?? 0) + 1;
      tmpProps[find].val += subInfo.val;
    } else {
      tmpProps.push({
        type: subInfo.type,
        val: subInfo.val,
        info: AppPropMapData[subInfo.type],
        cnt: 0,
      });
    }
  }
  console.log(tmpProps);
  subProps.value = tmpProps;
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
  column-gap: 4px;
  font-family: var(--font-title);
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
  border-radius: 2px;
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
  font-size: 14px;
}

.pb-rds-effect {
  font-size: 12px;

  :nth-child(1),
  :nth-child(2) {
    font-family: var(--font-title);
  }

  :nth-child(1) {
    color: var(--tgc-od-orange);
  }
}

.pb-rd-story {
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 2px;
  background: var(--box-bg-1);
  font-size: 12px;
  white-space: pre-wrap;
}
</style>
