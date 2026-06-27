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
import bbsReq from "@req/bbsReq.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { onMounted, shallowRef } from "vue";

const EMOJI_REGEX = /(?<=\n|.+?|^)(_\(.+?\)(?=\n|.+?|$))/g;

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

const titleSegments = shallowRef<Array<EmojiSegment>>([]);

let emojiMapCache: Record<string, string> | null = null;

async function loadEmojiMap(): Promise<Record<string, string>> {
  if (emojiMapCache !== null) return emojiMapCache;

  const localEmojis = localStorage.getItem("emojis");
  if (localEmojis !== null) {
    const parsed = <Record<string, string>>JSON.parse(localEmojis);
    emojiMapCache = parsed;
    return parsed;
  }

  try {
    const res = await bbsReq.emojis();
    if (res.retcode !== 0) {
      console.error("[TpTitle] Failed to load emojis:", res);
      emojiMapCache = {};
      return emojiMapCache;
    }
    const emojis: Record<string, string> = {};
    for (const series of res.data.list) {
      for (const emoji of series.list) {
        emojis[emoji.name] = emoji.icon;
      }
    }
    emojiMapCache = emojis;
    localStorage.setItem("emojis", JSON.stringify(emojis));
    return emojis;
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await TGLogger.Error(`[TpTitle] ${errMsg}`);
    emojiMapCache = {};
    return emojiMapCache;
  }
}

function getEmojiName(emojiText: string): string {
  return emojiText.slice(2, -1);
}

async function parseEmojiText(text: string): Promise<Array<EmojiSegment>> {
  const segments: Array<EmojiSegment> = [];
  const parts = text.split(EMOJI_REGEX);

  if (parts.length === 1) {
    segments.push({ type: "text", content: text });
    return segments;
  }

  const emojiMap = await loadEmojiMap();

  for (const part of parts) {
    if (part === "") continue;
    if (EMOJI_REGEX.test(part)) {
      const emojiName = getEmojiName(part);
      const emojiUrl = emojiMap[emojiName] || "";
      segments.push({
        type: "emoji",
        content: emojiName,
        emojiUrl,
      });
    } else {
      segments.push({ type: "text", content: part });
    }
  }

  return segments;
}

onMounted(async () => {
  titleSegments.value = await parseEmojiText(props.text);
});

function handleEmojiClick(e: Event, segment: EmojiSegment): void {
  if (!segment.emojiUrl) return;
  const target = <HTMLImageElement>e.target;
  target.src = segment.emojiUrl;
  target.style.cursor = "unset";
}

function handleEmojiError(e: Event): void {
  const target = <HTMLImageElement>e.target;
  target.style.cursor = "pointer";
  target.title = `点击重新加载: ${target.alt}`;
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
