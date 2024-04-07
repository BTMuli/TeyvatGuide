<template>
  <div :style="getLineStyle()" class="tp-texts">
    <TpText v-for="(text, indexT) in props.data.children" :data="text" :key="indexT" />
  </div>
</template>
<script lang="ts" setup>
import { onMounted, StyleValue, toRaw } from "vue";

import TpText, { type TpText as TpTextType } from "./tp-text.vue";

interface TpTexts extends TpTextType {
  children: TpTextType[];
}

interface TpTextsProps {
  data: TpTexts;
}

const props = defineProps<TpTextsProps>();

if (props.data.attributes) {
  console.warn("TpTexts", props.data.attributes);
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
    if (props.data.attributes.align !== "center") style.push("display: inline");
    else style.push(ruleAlign);
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
