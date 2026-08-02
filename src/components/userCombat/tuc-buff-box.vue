<!-- 剧诗，辉彩祝福 -->
<template>
  <div class="tuc-buff-box">
    <div class="tuc-buff-title">
      <span class="tuc-buff-title-label">辉彩祝福</span>
      <span class="tuc-buff-title-level">Lv. {{ props.modelValue.summary.total_level }}</span>
    </div>
    <div class="tuc-buff-list">
      <v-menu :close-on-content-click="false" location="bottom start">
        <template #activator="{ props: menuProps }">
          <div class="tuc-buff-item is-summary" v-bind="menuProps">
            <div class="tuc-buff-summary">
              <div
                :title="`辉彩祝福 Lv.${props.modelValue.summary.total_level}`"
                class="tuc-buff-icon"
              >
                <img :src="crownIcon" alt="total" class="summary" />
                <span class="tuc-buff-level-badge">
                  Lv. {{ props.modelValue.summary.total_level }}
                </span>
              </div>
              <span class="tuc-buff-name">辉彩祝福</span>
            </div>
          </div>
        </template>
        <div class="tuc-buff-popover">
          <div class="tuc-buff-popover-title">
            <img :src="crownIcon" alt="total" />
            <span>辉彩祝福</span>
            <small>Lv. {{ props.modelValue.summary.total_level }}</small>
          </div>
          <div class="tuc-buff-total" v-html="getBuffDesc(props.modelValue.summary.desc)" />
        </div>
      </v-menu>
      <v-menu
        v-for="buff in props.modelValue.buffs"
        :key="buff.icon"
        :close-on-content-click="false"
        location="bottom start"
      >
        <template #activator="{ props: menuProps }">
          <div class="tuc-buff-item" v-bind="menuProps">
            <div class="tuc-buff-summary">
              <div :title="`${buff.name} Lv.${buff.level}`" class="tuc-buff-icon">
                <img :alt="buff.name" :src="buff.icon" />
                <span class="tuc-buff-level-badge"> Lv. {{ buff.level }} </span>
              </div>
              <span class="tuc-buff-name">{{ buff.name }}</span>
            </div>
          </div>
        </template>
        <div class="tuc-buff-popover">
          <div class="tuc-buff-popover-title">
            <img :alt="buff.name" :src="buff.icon" />
            <span>{{ buff.name }}</span>
            <small>Lv. {{ buff.level }}</small>
          </div>
          <div class="tuc-buff-detail">
            <div v-for="(effect, eIdx) in buff.level_effect" :key="eIdx" class="tuc-effect-item">
              <div class="tuc-effect-title">
                <img :src="effect.icon" alt="icon" />
                <span v-html="parseHtmlText(effect.name)" />
              </div>
              <span class="tuc-effect-desc" v-html="getEffectDesc(effect.desc)" />
            </div>
          </div>
        </div>
      </v-menu>
    </div>
  </div>
</template>
<script lang="ts" setup>
import useAppStore from "@store/app.js";
import { parseHtmlText } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";
import { computed } from "vue";

type TucBuffBoxProps = { modelValue: TGApp.Game.Combat.SplendourBuff };

const props = defineProps<TucBuffBoxProps>();

const appStore = useAppStore();
const { theme } = storeToRefs(appStore);
const isDark = computed<boolean>(() => theme.value === "dark");
const crownIcon = computed<string>(() =>
  isDark.value ? "/UI/combat/combatCrown2.webp" : "/UI/combat/combatCrown.webp",
);

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
  overflow: hidden;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-2);
  row-gap: 8px;
}

.tuc-buff-title {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 28px;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--common-shadow-1);
  color: var(--box-text-2);
  font-family: var(--font-title);
  font-weight: normal;
  gap: 8px;

  &::before {
    width: 4px;
    height: 18px;
    border-radius: 2px;
    background: var(--tgc-od-orange);
    content: "";
  }
}

.tuc-buff-title-label {
  color: var(--common-text-title);
  font-size: 16px;
}

.tuc-buff-title-level {
  padding: 2px 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 12px;
  margin-left: auto;
  background: var(--box-bg-3);
  color: var(--tgc-od-orange);
  font-size: 12px;
}

.tuc-buff-list {
  display: flex;
  width: 100%;
  flex-flow: row wrap;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 8px;
}

.tuc-buff-item {
  position: relative;
  display: flex;
  width: auto;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-3);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: var(--tgc-od-orange);
    box-shadow: 0 3px 8px var(--common-shadow-2);
    transform: translateY(-2px);
  }
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
  border-radius: 6px;
  background-color: var(--box-bg-3);
  cursor: default;
}

.tuc-buff-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tuc-buff-level-badge {
  position: absolute;
  right: -5px;
  bottom: -3px;
  min-width: 30px;
  padding: 2px 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 10px;
  background-color: var(--tgc-od-orange);
  box-shadow: 0 2px 4px var(--common-shadow-2);
  color: white;
  font-size: 9px;
  font-weight: bold;
  line-height: 14px;
  text-align: center;
}

.tuc-buff-name {
  overflow: hidden;
  width: 68px;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 12px;
  font-weight: normal;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.tuc-effect-item {
  display: flex;
  flex-direction: column;
}

.tuc-effect-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: var(--common-text-title);
  column-gap: 4px;
  font-family: var(--font-title);
  font-size: 12px;
  font-weight: normal;
}

.tuc-effect-title img {
  width: 16px;
  height: 16px;
  filter: invert(0.6);
}

.tuc-effect-desc {
  position: relative;
  display: block;
  font-size: 10px;
  white-space: pre-wrap;
}

.tuc-buff-popover {
  display: flex;
  width: min(420px, calc(100vw - 48px));
  max-height: min(520px, calc(100vh - 160px));
  box-sizing: border-box;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  box-shadow: 0 8px 24px var(--common-shadow-4);
  gap: 12px;
  overflow-y: auto;
}

.tuc-buff-popover-title {
  display: flex;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--common-shadow-1);
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-weight: normal;
  gap: 8px;

  img {
    width: 36px;
    height: 36px;
    object-fit: contain;
  }

  small {
    padding: 2px 7px;
    border-radius: 10px;
    margin-left: auto;
    background: var(--tgc-od-orange);
    color: #ffffffff;
    font-family: var(--font-text);
    font-size: 11px;
  }
}

.tuc-buff-popover .tuc-buff-detail {
  row-gap: 10px;
}

.tuc-buff-popover .tuc-effect-item {
  row-gap: 4px;
}

.tuc-buff-popover .tuc-effect-title {
  font-size: 14px;
}

.tuc-buff-popover .tuc-effect-desc,
.tuc-buff-popover .tuc-buff-total {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 1.6;
}

.dark .tuc-effect-title img {
  filter: unset;
}
</style>
