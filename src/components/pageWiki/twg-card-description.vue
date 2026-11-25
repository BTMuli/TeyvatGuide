<template>
  <p class="card-description">
    <template v-for="(part, index) in parts" :key="index">
      <img v-if="part.icon" :src="part.icon" alt="" class="card-description-icon" />
      <template v-else>{{ part.text }}</template>
    </template>
  </p>
</template>

<script lang="ts" setup>
import { computed } from "vue";

const { value } = defineProps<{ value: string }>();

const iconUrl =
  /^https:\/\/act-webstatic\.mihoyo\.com\/hk4e\/e20200928calculate\/item_icon\/[\w-]+\/[\w.-]+\.(?:png|webp|gif|jpe?g)$/i;

const parts = computed<Array<{ text?: string; icon?: string }>>(() => {
  const result: Array<{ text?: string; icon?: string }> = [];
  for (const part of value
    .replace(/\\n/g, "\n")
    .trim()
    .split(/(<[^>]+>)/g)) {
    if (!part) continue;
    if (!part.startsWith("<")) {
      result.push({ text: part });
      continue;
    }
    if (/^<br\s*\/?>$/i.test(part)) {
      result.push({ text: "\n" });
      continue;
    }
    if (!/^<img\s/i.test(part)) continue;
    const source = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(part);
    const icon = source?.[1] ?? source?.[2];
    if (icon && iconUrl.test(icon)) result.push({ icon });
  }
  return result;
});
</script>

<style lang="scss" scoped>
.card-description {
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.card-description-icon {
  display: inline-block;
  width: 1.25em;
  height: 1.25em;
  filter: drop-shadow(0 1px 1px var(--common-shadow-4));
  object-fit: contain;
  vertical-align: -0.25em;
}
</style>
