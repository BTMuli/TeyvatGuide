<template>
  <span
    v-if="mode == 'link'"
    class="tp-text-link"
    @click="toLink()"
    :title="props.data.attributes?.link"
    :style="getTextStyle()"
  >
    {{ props.data.insert }}
  </span>
  <span v-else-if="mode == 'emoji'" class="tp-text-emoji">
    <img :src="getEmojiUrl()" :alt="getEmojiName()" :title="getEmojiName()" />
  </span>
  <TpText
    v-else-if="mode == 'emojis'"
    v-for="(emoji, indexE) in emojis"
    :data="emoji"
    :key="indexE"
  />
  <span v-else :style="getTextStyle()">{{ props.data.insert }}</span>
</template>
<script lang="ts" setup>
import { onMounted, ref, StyleValue, toRaw } from "vue";

import { getEmojis } from "../../plugins/Mys/request/getEmojis.js";
import { parseLink, parsePost } from "../../utils/linkParser.js";
import { isColorSimilar } from "../../utils/toolFunc.js";
import showSnackbar from "../func/snackbar.js";

export interface TpText {
  insert: string;
  attributes?: {
    header?: number;
    link?: string;
    bold?: boolean;
    color?: string;
    align?: string;
    italic?: boolean;
  };
}

interface TpTextProps {
  data: TpText;
}

const props = defineProps<TpTextProps>();
const mode = ref<string>("text");
const localEmojis = ref<string | null>(localStorage.getItem("emojis"));
const emojis = ref<TpText[]>([]);

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
  const style = <Array<StyleValue>>[];
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
async function toLink() {
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
    showSnackbar({ text: `未知链接:${link}`, color: "error", timeout: 3000 });
    return;
  }
  window.open(res);
}

// 解析表情链接
function getEmojiUrl(): string {
  if (localEmojis.value === null || !JSON.parse(localEmojis.value)[getEmojiName()]) {
    console.warn("tpEmoji unknown", getEmojiName());
    getEmojis().then((res) => {
      if ("retcode" in res) {
        console.error(res);
        showSnackbar({ text: "获取表情包失败！", color: "error" });
        mode.value = "text";
        return "";
      }
      localEmojis.value = JSON.stringify(res);
      localStorage.setItem("emojis", localEmojis.value);
    });
  }
  const emojiName = getEmojiName();
  const emojiMap: Record<string, string> = JSON.parse(<string>localEmojis.value);
  if (!Object.keys(emojiMap).includes(emojiName)) mode.value = "text";
  return JSON.parse(<string>localEmojis.value)[emojiName];
}

function getEmojiName() {
  return props.data.insert.slice(2, -1);
}
</script>
<style lang="css" scoped>
.tp-text-link {
  color: #00c3ff;
  cursor: pointer;
  text-decoration: underline solid #00c3ff;
  text-underline-position: under;
}

.tp-text-emoji {
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  transform: translateY(5px);
}

.tp-text-emoji img {
  width: 45px;
  height: 45px;
  margin: 0 5px;
}
</style>
