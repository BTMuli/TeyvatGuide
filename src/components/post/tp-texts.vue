<template>
  <div :style="getLineStyle()" class="tp-texts">
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

import TpMention, { type TpMention as TpMentionType } from "./tp-mention.vue";
import TpText, { type TpText as TpTextType } from "./tp-text.vue";

interface TpTexts extends TpTextType {
  children: (TpTextType | TpMentionType)[];
}

interface TpTextsProps {
  data: TpTexts;
}

const props = defineProps<TpTextsProps>();

function getComp(text: TpTextType | TpMentionType): string {
  if (typeof text.insert === "string") {
    return TpText;
  }
  return TpMention;
}

function getLineStyle(): StyleValue {
  const style = <Array<StyleValue>>[];
  if (props.data.attributes === undefined) {
    return style;
  }
  const ruleBold: StyleValue = "fontFamily: var(--font-title)";
  const headerFontSizes = ["2rem", "1.75rem", "1.5rem", "1.25rem", "1rem", "0.75rem"];
  if (props.data.attributes.align) {
    const ruleAlign: StyleValue = `textAlign: ${props.data.attributes.align}`;
    style.push(ruleAlign);
  }
  if (props.data.attributes.header) {
    const ruleHeader: StyleValue = `fontSize: ${headerFontSizes[props.data.attributes.header - 1]}`;
    style.push(ruleHeader);
    style.push(ruleBold);
  }
  return style;
}
</script>
<style lang="css" scoped>
.tp-texts {
  white-space: pre-wrap;
}
</style>
