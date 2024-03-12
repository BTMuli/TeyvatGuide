<template>
  <span
    v-if="mode == 'link'"
    class="tp-text-link"
    @click="toLink()"
    :title="props.data.attributes?.link"
  >
    <v-icon size="small">mdi-link-variant</v-icon>{{ props.data.insert }}
  </span>
  <span v-else-if="mode == 'emoji'" class="tp-text-emoji">
    <img :src="getEmojiUrl()" :alt="getEmojiName()" :title="getEmojiName()" />
  </span>
  <TpText
    v-else-if="mode == 'emojis'"
    v-for="(emoji, indexE) in emojis"
    :data="emoji"
    :key="indexE"
    :next="indexE === emojis.length - 1 ? undefined : next"
  />
  <TpText
    v-else-if="mode == 'texts'"
    v-for="(text, indexT) in texts"
    :data="text"
    :key="indexT"
    :next="indexT === texts.length - 1 ? next : undefined"
  />
  <div v-else :style="getTextStyle()" class="tp-text-span">
    {{ props.data.insert }}
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, StyleValue, toRaw } from "vue";
import { useRouter } from "vue-router";

import { getEmojis } from "../../plugins/Mys/request/getEmojis";
import { parseLink, parsePost } from "../../utils/linkParser";
import { isColorSimilar } from "../../utils/toolFunc";
import showSnackbar from "../func/snackbar";

interface TpText {
  insert: string;
  attributes?: {
    header?: number;
    link?: string;
    bold?: boolean;
    color?: string;
    align?: string;
  };
}

interface TpTextProps {
  data: TpText;
  next: TGApp.Plugins.Mys.SctPost.Base | undefined;
}

const props = defineProps<TpTextProps>();
const mode = ref<string>("text");
const localEmojis = ref(localStorage.getItem("emojis"));
const emojis = ref<TpText[]>([]);
const texts = ref<TpText[]>([]);
const router = useRouter();

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
  if (props.data.insert.includes("\n") && props.data.insert !== "\n") {
    mode.value = "texts";
    const splits = props.data.insert.split("\n");
    const temp = [];
    for (let i = 0; i < splits.length; i++) {
      if (splits[i] !== "") {
        temp.push({ insert: splits[i], attributes: props.data.attributes });
      }
      if (i !== splits.length - 1) {
        temp.push({ insert: "\n", attributes: props.data.attributes });
      }
    }
    texts.value = temp;
    return;
  }
  mode.value = "text";
});

// 解析文本样式
function getTextStyle(): StyleValue {
  const style = <Array<StyleValue>>[];
  let data: TpText;
  if (props.data.insert === "\n") {
    if (props.data.attributes?.align || props.data.attributes?.header) {
      return "display: none";
    }
    return "display: inline";
  }
  if (props.next?.insert === "\n") {
    data = {
      insert: props.data.insert,
      attributes: {
        ...props.data.attributes,
        ...props.next.attributes,
      },
    };
  } else {
    data = props.data;
  }
  if (data.attributes) {
    const ruleBold: StyleValue = "fontFamily: var(--font-title)";
    const headerFontSizes = ["2rem", "1.75rem", "1.5rem", "1.25rem", "1rem", "0.75rem"];
    if (data.attributes.bold) {
      style.push(ruleBold);
    }
    if (data.attributes.color) {
      let colorGet = data.attributes.color;
      if (isColorSimilar("#000000", data.attributes.color)) {
        colorGet = "var(--app-page-content)";
      }
      const ruleColor: StyleValue = `color: ${colorGet}`;
      style.push(ruleColor);
    }
    if (data.attributes.align) {
      const ruleAlign: StyleValue = `textAlign: ${data.attributes.align}`;
      style.push(ruleAlign);
    }
    if (data.attributes.header) {
      const ruleHeader: StyleValue = `fontSize: ${headerFontSizes[data.attributes.header - 1]}`;
      style.push(ruleHeader);
      style.push(ruleBold);
    }
    if (!data.attributes.align && !data.attributes.header) {
      style.push("display: inline");
    }
  } else {
    style.push("display: inline");
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
    await router.push({
      name: "帖子详情",
      params: {
        post_id: isPost,
      },
    });
    return;
  }
  const res = await parseLink(link);
  if (res === true) return;
  if (res === false) {
    showSnackbar({
      text: `未知链接:${link}`,
      color: "error",
      timeout: 3000,
    });
    return;
  }
  window.open(res);
}

// 解析表情链接
function getEmojiUrl(): string {
  if (localEmojis.value == null || !JSON.parse(localEmojis.value)[getEmojiName()]) {
    console.warn("tpEmoji unknown", getEmojiName());
    getEmojis().then((res) => {
      if ("retcode" in res) {
        console.error(res);
        showSnackbar({
          text: "获取表情包失败！",
          color: "error",
        });
        mode.value = "text";
        return "";
      } else {
        localEmojis.value = JSON.stringify(res);
        localStorage.setItem("emojis", localEmojis.value);
      }
    });
  }
  const emojiName = getEmojiName();
  const emojiMap: Record<string, string> = JSON.parse(<string>localEmojis.value);
  if (!Object.keys(emojiMap).includes(emojiName)) {
    mode.value = "text";
  }
  return JSON.parse(<string>localEmojis.value)[emojiName];
}

function getEmojiName() {
  return props.data.insert.slice(2, -1);
}
</script>
<style lang="css" scoped>
.tp-text-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #00c3ff;
  cursor: pointer;
  transform: translateY(2px);
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

.tp-text-span {
  overflow-wrap: break-word;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
