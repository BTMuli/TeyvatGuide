<template>
  <span v-if="mode == 'link'" class="mys-post-link" @click="toLink()" style="cursor: pointer">
    <v-icon size="small">mdi-link-variant</v-icon>{{ props.data.insert }}
  </span>
  <img
    v-else-if="mode == 'emoji'"
    class="mys-post-emoji"
    :src="getEmojiUrl()"
    :alt="getEmojiName()"
    :title="getEmojiName()"
  />
  <span v-else :style="getTextStyle()">
    <span
      v-if="props.data.insert.includes('\n')"
      v-html="props.data.insert.replace(/\n/g, '<br />')"
    />
    <span v-else>{{ props.data.insert }}</span>
  </span>
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { getEmojis } from "../../plugins/Mys/request/getEmojis";
import { isColorSimilar, isMysPost } from "../../plugins/Mys/utils/parsePost";
import { useAppStore } from "../../store/modules/app";
import TGClient from "../../utils/TGClient";
import showConfirm from "../func/confirm";
import showSnackbar from "../func/snackbar";

interface TpText {
  insert: string;
  attributes?: {
    link: string;
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
function getTextStyle(): string {
  const style: CSSStyleDeclaration = <CSSStyleDeclaration>{};
  const data: TpText = <TpText>props.data;
  if (data.attributes) {
    if (data.attributes.bold) {
      style.fontWeight = "bold";
    }
    if (data.attributes.color) {
      let colorGet = data.attributes.color;
      if (isColorSimilar("#000000", data.attributes.color)) {
        colorGet = "var(--app-page-content);";
      }
      style.color = colorGet;
    }
    if (data.attributes.align) {
      style.textAlign = data.attributes.align;
    }
    if (props.data.insert.includes("\n")) {
      style.whiteSpace = "pre-wrap";
    }
  }
  return Object.keys(style)
    .map((key) => `${key}: ${style[key]}`)
    .join(";");
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
  } else if (link.startsWith("https://webstatic.mihoyo.com/ys/event/e20220303-birthday/")) {
    if (useAppStore().isLogin) {
      await TGClient.open("birthday");
    } else {
      const res = await showConfirm({
        title: "跳转确认",
        text: "未登录，是否采用内置 JSBridge 打开？（取消则使用浏览器打开）",
      });
      if (res) {
        await TGClient.open("birthday");
      } else {
        window.open(link);
      }
    }
  } else {
    window.open(props.data.attributes.link);
  }
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
  return JSON.parse(emojis)[emojiName];
}

function getEmojiName() {
  return props.data.insert.slice(2, -1);
}
</script>
