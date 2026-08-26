<!-- 配音包语言变更标签：保留、新增与删除，配色参考语音包配置浮窗 -->
<template>
  <span class="audio-lang-tags">
    <v-chip
      v-for="language in keptLanguages"
      :key="language"
      color="var(--tgc-od-green)"
      :size="size"
      :title="`保留 ${audioLanguageLabel(language)}`"
      variant="tonal"
    >
      <v-icon start icon="mdi-check-circle-outline" size="14" />
      {{ audioLanguageLabel(language) }}
    </v-chip>
    <v-chip
      v-for="language in addedLanguages"
      :key="`add-${language}`"
      color="var(--tgc-od-orange)"
      :size="size"
      :title="`新增 ${audioLanguageLabel(language)}`"
      variant="tonal"
    >
      <v-icon start icon="mdi-plus-circle-outline" size="14" />
      {{ audioLanguageLabel(language) }}
    </v-chip>
    <v-chip
      v-for="language in removedLanguages"
      :key="`remove-${language}`"
      color="var(--tgc-od-red)"
      :size="size"
      :title="`删除 ${audioLanguageLabel(language)}`"
      variant="tonal"
    >
      <v-icon start icon="mdi-minus-circle-outline" size="14" />
      {{ audioLanguageLabel(language) }}
    </v-chip>
  </span>
</template>

<script lang="ts" setup>
import { computed } from "vue";

type Props = {
  sourceLanguages: Array<string>;
  targetLanguages: Array<string>;
  size?: "small" | "x-small";
};

const { sourceLanguages, targetLanguages, size = "small" } = defineProps<Props>();
const audioLanguageLabels: Record<string, string> = {
  "zh-cn": "中文",
  "en-us": "英语",
  "ja-jp": "日语",
  "ko-kr": "韩语",
};
const sourceSet = computed<Set<string>>(() => new Set(sourceLanguages));
const targetSet = computed<Set<string>>(() => new Set(targetLanguages));
const keptLanguages = computed<Array<string>>(() => {
  return targetLanguages.filter((language) => sourceSet.value.has(language));
});
const addedLanguages = computed<Array<string>>(() => {
  return targetLanguages.filter((language) => !sourceSet.value.has(language));
});
const removedLanguages = computed<Array<string>>(() => {
  return sourceLanguages.filter((language) => !targetSet.value.has(language));
});

function audioLanguageLabel(language: string): string {
  return audioLanguageLabels[language] ?? language;
}
</script>

<style lang="scss" scoped>
.audio-lang-tags {
  display: inline-flex;
  min-width: 0;
  align-items: center;

  :deep(.v-chip) {
    flex-shrink: 0;
  }

  :deep(.v-chip + .v-chip) {
    margin-inline-start: 6px;
  }
}
</style>
