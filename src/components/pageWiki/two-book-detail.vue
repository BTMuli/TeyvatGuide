<!-- 书籍正文 -->
<template>
  <section v-if="props.book.story.length > 0" class="twbd-panel">
    <header class="twbd-title">
      <v-icon size="18">mdi-book-open-page-variant-outline</v-icon>
      <h3>书籍正文</h3>
    </header>
    <div class="twbd-story" v-html="storyHtml" />
  </section>
  <div v-else class="twbd-empty">
    <v-icon size="16">mdi-book-alert-outline</v-icon>
    <span>暂无正文</span>
  </div>
</template>
<script lang="ts" setup>
import { parseBookText } from "@utils/toolFunc.js";
import { computed } from "vue";

type TwoBookDetailProps = { book: TGApp.App.Material.WikiBook };

const props = defineProps<TwoBookDetailProps>();
const storyHtml = computed<string>(() => parseBookText(props.book.story));
</script>
<style lang="scss" scoped>
.twbd-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 12px;
}

.twbd-title {
  display: flex;
  align-items: center;
  color: var(--common-text-title);
  gap: 8px;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
  }
}

.twbd-story {
  min-width: 0;
  color: var(--box-text-2);
  font-size: 14px;
  line-height: 24px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;

  :deep(h4) {
    margin: 16px 0 8px;
    color: var(--common-text-title);
    font-size: 16px;
    font-weight: 600;
    line-height: 24px;
  }

  :deep(h4:first-child) {
    margin-top: 0;
  }

  :deep(.twbd-center) {
    margin: 8px 0;
    color: var(--common-text-title);
    text-align: center;
  }
}

.twbd-empty {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--box-text-4);
  column-gap: 8px;
  font-size: 12px;
  line-height: 16px;
}
</style>
