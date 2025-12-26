<template>
  <div
    :class="{
      'tp-inline': props.data.attributes === undefined || props.data.attributes.align === undefined,
      'tp-texts-header1': props.data.attributes && props.data.attributes.header === 1,
      'tp-texts-header2': props.data.attributes && props.data.attributes.header === 2,
      'tp-texts-header3': props.data.attributes && props.data.attributes.header === 3,
      'tp-texts-header4': props.data.attributes && props.data.attributes.header === 4,
      'tp-texts-header5': props.data.attributes && props.data.attributes.header === 5,
      'tp-texts-header6': props.data.attributes && props.data.attributes.header === 6,
    }"
    :title="getTitle()"
    class="tp-texts"
  >
    <component
      :is="getComp(text)"
      v-for="(text, index) in props.data.children"
      :key="index"
      :data="text"
    />
  </div>
</template>
<script lang="ts" setup>
import { type Component, toRaw } from "vue";

import TpImage from "./tp-image.vue";
import TpMention, { type TpMention as TpMentionType } from "./tp-mention.vue";
import TpText, { type TpText as TpTextType } from "./tp-text.vue";
import TpUnknown from "./tp-unknown.vue";

type TpTexts = { children: Array<TpTextType | TpMentionType> } & TpTextType;
type TpTextsProps = { data: TpTexts };

const props = defineProps<TpTextsProps>();
console.log("tpTexts", toRaw(props.data));

function getComp(text: TpTextType | TpMentionType): Component {
  if (typeof text.insert === "string") return TpText;
  if ("image" in text.insert) return TpImage;
  if ("mention" in text.insert) return TpMention;
  return TpUnknown;
}

function getTitle(): string {
  if (!props.data.attributes) return "";
  if (props.data.attributes.link) return props.data.attributes.link;
  if (props.data.attributes.header) return `H${props.data.attributes.header}`;
  return "";
}
</script>
<style lang="scss" scoped>
.tp-texts {
  line-break: anywhere;
  text-align: v-bind("props.data.attributes?.align");
  white-space: pre-wrap;
  word-break: break-all;

  &.tp-inline {
    display: inline;
  }
}

@for $i from 1 through 6 {
  .tp-texts-header#{$i} {
    font-family: var(--font-title);
    font-size: calc(26px - $i * 2px);
  }
}
</style>
