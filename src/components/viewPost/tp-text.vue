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
import bbsReq from "@req/bbsReq.js";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isColorSimilar } from "@utils/colorFunc.js";
import { parseLink, parsePost } from "@utils/linkParser.js";
import { decodeRegExp } from "@utils/toolFunc.js";
import { onMounted, ref, shallowRef, StyleValue, toRaw, useTemplateRef } from "vue";

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
const mode = ref<string>("text");
const localEmojis = ref<string | null>(localStorage.getItem("emojis"));

const emojiErr = ref<boolean>(true);
const emojiEl = useTemplateRef<HTMLImageElement>("emojiRef");
const emojis = shallowRef<Array<TpText>>([]);

console.log("tpText", JSON.stringify(props.data.insert), toRaw(props.data)?.attributes);

onMounted(async () => {
  if (props.data.attributes && "link" in props.data.attributes) {
    mode.value = "link";
    return;
  }
  // thanks, @Lightczx & webstorm
  const reg = /(?<=\n|.+?|^)(_\(.+?\)(?=\n|.+?|$))/g;
  const res = props.data.insert.split(reg);
  if (res.length > 2) {
    if (res.length === 3 && res[0] === "" && res[2] === "") {
      mode.value = "emoji";
      return;
    }
    mode.value = "emojis";
    emojis.value = res.map((i) => ({ insert: i, attributes: props.data.attributes }));
    return;
  }
  mode.value = "text";
});

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

// 解析表情链接
function getEmojiUrl(): string {
  if (localEmojis.value === null || !JSON.parse(localEmojis.value)[getEmojiName()]) {
    console.warn("tpEmoji unknown", getEmojiName());
    bbsReq.emojis().then((res) => {
      if ("retcode" in res) {
        console.error(res);
        return "";
      }
      localEmojis.value = JSON.stringify(res);
      localStorage.setItem("emojis", localEmojis.value);
    });
  }
  if (localEmojis.value === null) return "";
  const emojiName = getEmojiName();
  const emojiMap: Record<string, string> = JSON.parse(localEmojis.value);
  if (!Object.keys(emojiMap).includes(emojiName)) mode.value = "text";
  return JSON.parse(localEmojis.value)[emojiName];
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
