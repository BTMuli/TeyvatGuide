<template>
  <div
    :style="getLineStyle()"
    class="tp-texts"
    :class="{
      'tp-texts-header1': props.data.attributes && props.data.attributes.header === 1,
      'tp-texts-header2': props.data.attributes && props.data.attributes.header === 2,
      'tp-texts-header3': props.data.attributes && props.data.attributes.header === 3,
      'tp-texts-header4': props.data.attributes && props.data.attributes.header === 4,
      'tp-texts-header5': props.data.attributes && props.data.attributes.header === 5,
      'tp-texts-header6': props.data.attributes && props.data.attributes.header === 6,
    }"
    :title="getTitle()"
  >
    <component
      :is="getComp(text)"
      v-for="(text, index) in props.data.children"
      :data="text"
      :key="index"
    />
  </div>
</template>
<script lang="ts" setup>
import type { Component, StyleValue } from "vue";

import TpImage from "./tp-image.vue";
import TpMention, { type TpMention as TpMentionType } from "./tp-mention.vue";
import TpText, { type TpText as TpTextType } from "./tp-text.vue";

type TpTexts = { children: Array<TpTextType | TpMentionType> } & TpTextType;
type TpTextsProps = { data: TpTexts };

const props = defineProps<TpTextsProps>();

function getComp(text: TpTextType | TpMentionType): Component {
  if (typeof text.insert === "string") return TpText;
  if ("image" in text.insert) return TpImage;
  return TpMention;
}

function getTitle(): string {
  if (!props.data.attributes) return "";
  if (props.data.attributes.link) return props.data.attributes.link;
  if (props.data.attributes.header) return `H${props.data.attributes.header}`;
  return "";
}

function getLineStyle(): StyleValue {
  const ruleInline: StyleValue = "display: inline";
  if (props.data.attributes === undefined) return ruleInline;
  if (!props.data.attributes.align) return ruleInline;
  return `textAlign: ${props.data.attributes.align}`;
}
</script>
<style lang="css" scoped>
.tp-texts {
  line-break: anywhere;
  white-space: pre-wrap;
  word-break: break-all;
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
