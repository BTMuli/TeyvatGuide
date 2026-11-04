<!-- 帖子标题解析，支持表情包 -->
<template>
  <span :class="['tp-title', { 'tp-title--single-line': props.singleLine }]">
    <template v-for="(segment, index) in titleSegments" :key="index">
      <template v-if="segment.type === 'text'">{{ segment.content }}</template>
      <img
        v-else
        :alt="segment.content"
        :src="segment.emojiUrl"
        :title="segment.content"
        class="tp-title-emoji"
        @click="handleEmojiClick($event, segment)"
        @error="handleEmojiError($event)"
      />
    </template>
  </span>
</template>
<script lang="ts" setup>
import { getPostEmoticonNames, usePostEmoticons } from "@hooks/usePostEmoticons.js";
import { splitPostEmoticonText } from "@utils/bbs/postEmoticon.js";
import { computed, watch } from "vue";

type EmojiSegment = {
  type: "text" | "emoji";
  content: string;
  emojiUrl?: string;
};

type TpTitleProps = {
  text: string;
  singleLine?: boolean;
};

const props = withDefaults(defineProps<TpTitleProps>(), { singleLine: false });

const { emoticonMap, ensureEmoticons } = usePostEmoticons();
const titleSegments = computed<Array<EmojiSegment>>(() =>
  splitPostEmoticonText(props.text, emoticonMap.value).map((segment) => {
    if (typeof segment.insert === "string") return { type: "text", content: segment.insert };
    return {
      type: "emoji",
      content: segment.insert.emoticon.name,
      emojiUrl: segment.insert.emoticon.src,
    };
  }),
);
const emoticonNames = computed<Array<string>>(() => getPostEmoticonNames(props.text));
watch(emoticonNames, (names) => void ensureEmoticons(names), { immediate: true });

function handleEmojiClick(e: Event, segment: EmojiSegment): void {
  if (!segment.emojiUrl) return;
  if (!(e.target instanceof HTMLImageElement)) return;
  e.target.src = segment.emojiUrl;
  e.target.style.cursor = "unset";
}

function handleEmojiError(e: Event): void {
  if (!(e.target instanceof HTMLImageElement)) return;
  e.target.style.cursor = "pointer";
  e.target.title = `点击重新加载: ${e.target.alt}`;
}
</script>
<style lang="scss" scoped>
.tp-title {
  display: inline;
  white-space: pre-wrap;
  word-break: break-all;

  &--single-line {
    display: inline-block;
    overflow: hidden;
    max-width: 100%;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: normal;
  }
}

.tp-title-emoji {
  height: 1.2em;
  margin: 0 2px;
  object-fit: contain;
  vertical-align: text-bottom;
}
</style>
