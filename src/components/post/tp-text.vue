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
  <span v-else :style="getTextStyle()" class="tp-text-span">
    {{ props.data.insert }}
  </span>
</template>
<script lang="ts" setup>
import { onMounted, ref, StyleValue, toRaw } from "vue";
import { useRouter } from "vue-router";

import { getEmojis } from "../../plugins/Mys/request/getEmojis";
import TGClient from "../../utils/TGClient";
import { isColorSimilar, isMysPost } from "../../utils/toolFunc";
import showConfirm from "../func/confirm";
import showSnackbar from "../func/snackbar";

interface TpText {
  insert: string;
  attributes?: {
    link?: string;
    bold?: boolean;
    color?: string;
    align?: string;
  };
}

interface TpTextProps {
  data: TpText;
}

const props = defineProps<TpTextProps>();
const mode = ref<string>("text");
const router = useRouter();

console.log("tpText", JSON.stringify(props.data.insert), toRaw(props.data)?.attributes);

onMounted(() => {
  if (props.data.attributes && "link" in props.data.attributes) {
    mode.value = "link";
  } else if (props.data.insert.startsWith("_(") && props.data.insert.endsWith(")")) {
    mode.value = "emoji";
  } else {
    mode.value = "text";
  }
});

// 解析文本样式
function getTextStyle(): StyleValue {
  const style = <Array<StyleValue>>[];
  const data: TpText = <TpText>props.data;
  if (data.attributes) {
    if (data.attributes.bold) {
      const ruleBold: StyleValue = "fontFamily: var(--font-title)";
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
    // todo 这边效果不是很好
    // refer: 45245869
    if (data.attributes.align) {
      const ruleAlign: StyleValue = `textAlign: ${data.attributes.align}`;
      style.push(ruleAlign);
    }
  }
  return style;
}

// 解析链接目标
async function toLink() {
  if (!props.data.attributes) return;
  if (!props.data.attributes.link) return;
  const link = props.data.attributes.link;
  if (isMysPost(link)) {
    await router.push({
      name: "帖子详情",
      params: {
        post_id: link.split("/").pop(),
      },
    });
  } else if (isMysAct(link)) {
    const resOpen = await showConfirm({
      title: "采用内置 JSBridge？",
      text: "取消则使用外部浏览器打开",
    });
    if (resOpen) {
      const resType = await showConfirm({
        title: "采用宽屏模式？",
        text: "取消则使用默认竖屏",
      });
      if (resType) {
        await TGClient.open("web_act", link);
      } else {
        await TGClient.open("web_act_thin", link);
      }
    } else {
      window.open(link);
    }
  } else {
    window.open(props.data.attributes.link);
  }
}

function isMysAct(url: string): boolean {
  const prefix = ["https://act.mihoyo.com/", "https://mhyurl.cn"];
  // link.startsWith("https://webstatic.mihoyo.com/ys/event/e20220303-birthday/")
  for (const pre of prefix) {
    if (url.startsWith(pre)) return true;
  }
  if (url.startsWith("https://webstatic.mihoyo.com")) {
    return url.includes("event");
  }
  return false;
}

// 解析表情链接
function getEmojiUrl(): string {
  let emojis = localStorage.getItem("emojis");
  if (!emojis) {
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
        emojis = JSON.stringify(res);
        localStorage.setItem("emojis", emojis);
      }
    });
  }
  const emojiName = getEmojiName();
  return JSON.parse(<string>emojis)[emojiName];
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
  white-space: pre-wrap;
}
</style>
