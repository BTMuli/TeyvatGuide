<!-- 剧诗，辉彩祝福 -->
<template>
  <div class="tuc-buff-box">
    <div class="tuc-buff-item">
      <div class="tuc-buff-summary">
        <div class="tuc-buff-icon">
          <img alt="total" class="summary" src="/source/UI/combatCrown.webp" />
        </div>
        <div class="tuc-buff-desc">
          <span>辉彩祝福</span>
        </div>
      </div>
      <div class="tuc-buff-total" v-html="getBuffDesc(props.modelValue.summary.desc)" />
    </div>
    <template v-for="(buff, idx) in props.modelValue.buffs" :key="idx">
      <div v-if="buff.level > 1" class="tuc-buff-item">
        <div class="tuc-buff-summary">
          <div class="tuc-buff-icon">
            <img :alt="buff.name" :src="buff.icon" />
          </div>
          <div class="tuc-buff-desc">
            <span>{{ buff.name }}</span>
            <span>Lv.{{ buff.level }}</span>
          </div>
        </div>
        <div class="tuc-buff-detail" @click="console.log(buff)">
          <div v-for="(effect, idx) in buff.level_effect" :key="idx" class="tuc-effect-item">
            <div class="tuc-effect-title">
              <img :src="effect.icon" alt="icon" />
              <span v-html="parseHtmlText(effect.name)" />
            </div>
            <span class="tuc-effect-desc" v-html="getEffectDesc(effect.desc)" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
<script lang="ts" setup>
import { parseHtmlText } from "@utils/toolFunc.js";

type TucBuffBoxProps = {
  /* 辉彩祝福数据 */
  modelValue: TGApp.Game.Combat.SplendourBuff;
};

const props = defineProps<TucBuffBoxProps>();

function getBuffDesc(desc: string): string {
  return parseHtmlText(desc.replaceAll("点，", "点，\n"));
}

function getEffectDesc(desc: string): string {
  return parseHtmlText(desc.replaceAll("；", "；\n")).replaceAll("\n<br />", "<br />");
}
</script>
<style lang="css" scoped>
.tuc-buff-box {
  position: relative;
  display: flex;
  width: fit-content;
  box-sizing: border-box;
  flex: 2;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  row-gap: 8px;
}

.tuc-buff-item {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  column-gap: 8px;
}

.tuc-buff-summary {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  row-gap: 4px;
}

.tuc-buff-icon {
  position: relative;
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  padding: 4px;
  border-radius: 4px;
  background-color: var(--box-bg-3);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.tuc-buff-desc {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: var(--font-title);
  font-size: 10px;
}

.dark .tuc-buff-summary .tuc-buff-icon img.summary {
  filter: invert(1);
}

.tuc-buff-detail {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.tuc-buff-total {
  font-size: 12px;
  white-space: pre-wrap;
}

.tuc-effect-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 4px;
  font-family: var(--font-title);
  font-size: 12px;

  img {
    width: 16px;
    height: 16px;
    filter: invert(0.6);
  }
}

.dark .tuc-effect-title img {
  filter: unset;
}

.tuc-effect-desc {
  position: relative;
  display: block;
  font-size: 10px;
  white-space: pre-wrap;
}
</style>
