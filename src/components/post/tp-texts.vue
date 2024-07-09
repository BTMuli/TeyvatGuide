<template>
  <div :style="getLineStyle()" :class="getClass()" :title="getTitle()">
    <component
      :is="getComp(text)"
      v-for="(text, index) in props.data.children"
      :data="text"
      :key="index"
    />
  </div>
</template>
<script lang="ts" setup>
import { StyleValue } from "vue";
import type { Component } from "vue";

import TpMention, { type TpMention as TpMentionType } from "./tp-mention.vue";
import TpText, { type TpText as TpTextType } from "./tp-text.vue";

interface TpTexts extends TpTextType {
  children: (TpTextType | TpMentionType)[];
}

interface TpTextsProps {
  data: TpTexts;
}

const props = defineProps<TpTextsProps>();

function getComp(text: TpTextType | TpMentionType): Component {
  if (typeof text.insert === "string") {
    return TpText;
  }
  return TpMention;
}

function getClass(): string {
  if (props.data.attributes && props.data.attributes.header) {
    return `tp-texts tp-texts-header${props.data.attributes.header}`;
  }
  return "tp-texts";
}

function getTitle(): string {
  if (props.data.attributes && props.data.attributes.link) {
    return props.data.attributes.link;
  }
  if (props.data.attributes && props.data.attributes.header) {
    return `H${props.data.attributes.header}`;
  }
  return "";
}

function getLineStyle(): StyleValue {
  const style = <Array<StyleValue>>[];
  if (props.data.attributes === undefined) {
    return style;
  }
  if (props.data.attributes.align) {
    const ruleAlign: StyleValue = `textAlign: ${props.data.attributes.align}`;
    style.push(ruleAlign);
  }
  return style;
}
</script>
<style lang="css" scoped>
.tp-texts {
  white-space: pre-wrap;
}

.tp-texts-header1,
.tp-texts-header2,
.tp-texts-header3,
.tp-texts-header4,
.tp-texts-header5,
.tp-texts-header6 {
  font-family: var(--font-title);
}

.tp-texts-header1 {
  font-size: 24px;
}

.tp-texts-header2 {
  font-size: 20px;
}

.tp-texts-header3 {
  font-size: 18px;
}

.tp-texts-header4 {
  font-size: 16px;
}

.tp-texts-header5 {
  font-size: 14px;
}

.tp-texts-header6 {
  font-size: 12px;
}
</style>
