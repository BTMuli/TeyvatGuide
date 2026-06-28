<!-- 圣遗物套装详情 -->
<template>
  <div v-if="props.set" class="pwd-rs-box">
    <!-- 套装信息 -->
    <div class="pwd-rs-title">
      <span>{{ props.set.name }}</span>
      <v-btn-toggle
        v-model="curStar"
        :mandatory="true"
        class="pwd-rss-star"
        color="var(--tgc-od-orange)"
        variant="outlined"
      >
        <v-btn v-for="i in props.set.stars" :key="i" :title="`${i}星`" :value="i" size="small">
          {{ i }}⭐
        </v-btn>
      </v-btn-toggle>
      <v-btn-toggle
        v-model="curPos"
        :mandatory="true"
        class="pwd-rss-pos"
        color="var(--tgc-od-orange)"
        variant="outlined"
      >
        <v-btn v-for="i in props.set.pos" :key="i" :title="getPosDesc(i)" :value="i" size="small">
          <img :alt="getPosDesc(i)" :src="getPosIcon(i)" />
        </v-btn>
      </v-btn-toggle>
    </div>
    <div class="pwd-rs-effects">
      <div v-for="affix in props.set.affix" :key="affix.cnt" class="pwd-rs-effect">
        <span>{{ affix.cnt }}</span>
        <span>件套：</span>
        <span>{{ affix.desc }}</span>
      </div>
    </div>
    <!-- 部件信息 -->
    <div v-if="curRelic" class="pwd-rs-pos">
      <div class="pwd-rsp-title">
        <img :src="getPosIcon(curPos)" alt="icon" />
        <span>{{ curRelic.name }}</span>
      </div>
      <div class="pwd-rsp-desc">
        <span>{{ curRelic.desc }}</span>
      </div>
      <div class="pwd-rsp-story">
        <span>{{ curRelic.story }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, shallowRef, watch } from "vue";
import { wrRelic } from "@/data/index.js";

type PwdRelicSetProps = { set: TGApp.App.Relic.SetItem };
const props = defineProps<PwdRelicSetProps>();

const curStar = ref<number>(props.set.maxStar);
const curPos = ref<number>(getInitPos());
const curRelic = shallowRef<TGApp.App.Relic.RelicItem>();

watch(
  () => props.set,
  () => {
    curStar.value = props.set.maxStar;
    curPos.value = getInitPos();
    loadPosInfo();
  },
);
watch(
  () => [curStar.value, curPos.value],
  () => {
    loadPosInfo();
  },
  { immediate: true },
);

function getInitPos(): number {
  let iconPop = props.set.icon.split("_").pop();
  if (iconPop) {
    if (props.set.affix.length > 1) return Number(iconPop);
    return 5;
  }
  return 1;
}

function getPosIcon(idx: number): string {
  if (props.set.affix.length > 1) {
    return `/WIKI/relic/UI_RelicIcon_${props.set.id}_${idx}.webp`;
  }
  return `/WIKI/relic/${props.set.icon}.webp`;
}

function getPosDesc(idx: number): string {
  const relicPos = ["生之花", "死之羽", "时之沙", "空之杯", "理之冠"];
  return relicPos[idx - 1];
}

function loadPosInfo(): void {
  const suitFind = props.set.suits.find((i) => i.pos === curPos.value && i.star === curStar.value);
  if (!suitFind) {
    console.log("noSuitFind");
    return;
  }
  const relicFind = wrRelic.find((i) => i.pos === curPos.value && i.set === props.set.id);
  if (!relicFind) {
    console.log("noRelicFind");
    return;
  }
  curRelic.value = relicFind;
}
</script>
<style lang="scss" scoped>
.pwd-rs-box {
  display: flex;
  flex-direction: column;
  padding: 12px;
  margin: 0 auto;
  row-gap: 12px;
}

.pwd-rs-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: var(--common-text-title);
  column-gap: 8px;
  font-family: var(--font-title);
  font-size: 20px;
}

.pwd-rss-pos,
.pwd-rss-star {
  height: 32px;
}

.pwd-rss-pos {
  img {
    width: 28px;
    height: 28px;
  }
}

.pwd-rs-effect {
  :nth-child(1),
  :nth-child(2) {
    font-family: var(--font-title);
  }

  :nth-child(1) {
    color: var(--tgc-od-orange);
  }
}

.pwd-rs-pos {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  row-gap: 4px;
}

.pwd-rsp-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 4px;

  span {
    font-family: var(--font-title);
    font-size: 18px;
  }

  img {
    width: 28px;
    height: 28px;
  }
}

.pwd-rsp-desc {
  color: var(--tgc-od-white);
  font-size: 12px;
  font-style: italic;
}

.pwd-rsp-story {
  white-space: pre-wrap;
}
</style>
