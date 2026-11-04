<template>
  <span
    v-if="mode == 'link'"
    :style="getTextStyle()"
    :title="props.data.attributes?.link"
    class="tp-text-link"
    @click="toLink()"
    @contextmenu="copyLink()"
  >
    {{ decodeRegExp(props.data.insert) }}
  </span>
  <span v-else-if="mode == 'emoji'" class="tp-text-emoji">
    <img
      ref="emojiRef"
      :alt="getEmojiName()"
      :src="getEmojiUrl()"
      :title="getEmojiName()"
      @click="handleEmojiClick"
      @error="handleEmojiError"
    />
  </span>
  <TpText
    v-for="(emoji, indexE) in emojis"
    v-else-if="mode == 'emojis'"
    :key="indexE"
    :data="emoji"
  />
  <span v-else :style="getTextStyle()">{{ decodeRegExp(props.data.insert) }}</span>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import { getPostEmoticonNames, usePostEmoticons } from "@hooks/usePostEmoticons.js";
import { openUrl } from "@tauri-apps/plugin-opener";
import { parseLink, parsePost } from "@utils/app/linkParser.js";
import { splitPostEmoticonText } from "@utils/bbs/postEmoticon.js";
import { decodeRegExp } from "@utils/common/toolFunc.js";
import { isColorSimilar } from "@utils/display/colorFunc.js";
import type { StyleValue } from "vue";
import { computed, ref, useTemplateRef, watch } from "vue";

export type TpText = {
  insert: string;
  attributes?: {
    header?: number;
    link?: string;
    bold?: boolean;
    color?: string;
    align?: string;
    italic?: boolean;
  };
};
type TpTextProps = { data: TpText };

const props = defineProps<TpTextProps>();
const { emoticonMap, ensureEmoticons } = usePostEmoticons();
const parsedSegments = computed<ReturnType<typeof splitPostEmoticonText>>(() =>
  splitPostEmoticonText(props.data.insert, emoticonMap.value),
);
const mode = computed<"text" | "link" | "emoji" | "emojis">(() => {
  if (props.data.attributes && "link" in props.data.attributes) return "link";
  const segments = parsedSegments.value;
  if (segments.length === 1 && typeof segments[0].insert !== "string") return "emoji";
  if (segments.some((segment) => typeof segment.insert !== "string")) return "emojis";
  return "text";
});
const emojis = computed<Array<TpText>>(() =>
  parsedSegments.value.map((segment) => ({
    insert:
      typeof segment.insert === "string" ? segment.insert : `_(${segment.insert.emoticon.name})`,
    attributes: props.data.attributes,
  })),
);
const emoticonNames = computed<Array<string>>(() => getPostEmoticonNames(props.data.insert));
const emojiErr = ref<boolean>(true);
const emojiEl = useTemplateRef<HTMLImageElement>("emojiRef");

watch(emoticonNames, (names) => void ensureEmoticons(names), { immediate: true });

// 解析文本样式
function getTextStyle(): StyleValue {
  const style: Array<StyleValue> = [];
  const data: TpText = props.data;
  style.push("white-space: pre-wrap");
  style.push("line-break: anywhere");
  style.push("word-break: break-all");
  if (data.attributes) {
    const ruleBold: StyleValue = "fontFamily: var(--font-title)";
    const ruleItalic: StyleValue = "fontStyle: italic";
    if (data.attributes.bold) style.push(ruleBold);
    if (data.attributes.italic) style.push(ruleItalic);
    if (data.attributes.color) {
      let colorGet = data.attributes.color;
      if (isColorSimilar("#000000", data.attributes.color)) {
        colorGet = "var(--app-page-content)";
      }
      const ruleColor: StyleValue = `color: ${colorGet}`;
      style.push(ruleColor);
    }
  }
  return style;
}

// 解析链接目标
async function toLink(): Promise<void> {
  if (!props.data.attributes) return;
  if (!props.data.attributes.link) return;
  const link = props.data.attributes.link;
  const isPost = await parsePost(link);
  if (isPost !== false) {
    location.href = `/post_detail/${isPost}`;
    return;
  }
  const res = await parseLink(link);
  if (res === true) return;
  if (res === false) {
    showSnackbar.error(`未知链接:${link}`, 3000);
    return;
  }
  await openUrl(res);
}

// 复制链接
async function copyLink(): Promise<void> {
  if (!props.data.attributes) return;
  if (!props.data.attributes.link) return;
  const link = props.data.attributes.link;
  try {
    await navigator.clipboard.writeText(link);
    showSnackbar.success("链接已复制到剪贴板");
  } catch (e) {
    showSnackbar.error(`复制链接失败: ${e}`, 3000);
  }
}

/** 获取共享目录中当前表情的地址。 @since Beta v0.13.0 */
function getEmojiUrl(): string {
  return emoticonMap.value[getEmojiName()] ?? "";
}

function getEmojiName(): string {
  return props.data.insert.slice(2, -1);
}

function handleEmojiClick(): void {
  if (!emojiErr.value || !emojiEl.value) return;
  const name = getEmojiName();
  emojiEl.value.src = getEmojiUrl();
  emojiEl.value.title = name;
  emojiEl.value.alt = name;
  emojiEl.value.style.cursor = "unset";
  emojiErr.value = false;
}

function handleEmojiError(): void {
  if (!emojiEl.value) return;
  emojiErr.value = true;
  emojiEl.value.style.cursor = "pointer";
  emojiEl.value.title = "点击重新加载";
}
</script>
<style lang="css" scoped>
.tp-text-link {
  color: #00c3ffff;
  cursor: pointer;
  text-decoration: underline solid #00c3ffff;
  text-underline-position: under;
}

.tp-text-emoji {
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  margin: 0 4px;
  transform: translateY(2px);
}

.tp-text-emoji img {
  height: 32px;
  object-fit: contain;
}
</style>
