<template>
  <span class="tp-mention-box" @click="toLink()">
    <v-icon size="small">mdi-account-circle-outline</v-icon>
    <span>{{ props.data.insert.mention.nickname }}</span>
  </span>
</template>
<script lang="ts" setup>
import { toRaw } from "vue";

import TGClient from "../../utils/TGClient";
import showConfirm from "../func/confirm";
import showSnackbar from "../func/snackbar";

interface TpMention {
  insert: {
    mention: {
      uid: string;
      nickname: string;
    };
  };
}

interface TpMentionProps {
  data: TpMention;
  next: unknown;
}

const props = defineProps<TpMentionProps>();

console.log("tpMention", props.data.insert.mention.uid, toRaw(props.data).insert.mention);

async function toLink(): Promise<void> {
  let prefix = "";
  const uid = props.data.insert.mention.uid;
  const confirm = await showConfirm({
    title: "跳转提示",
    text: "是否采用内置 JSBridge 跳转？",
  });
  if (confirm === undefined) {
    showSnackbar({
      text: "已取消跳转",
      color: "info",
    });
    return;
  }
  if (confirm === true) {
    prefix = "https://m.miyoushe.com/ys/#/accountCenter/0?id=";
    await TGClient.open("mention", `${prefix}${uid}`);
    return;
  }
  prefix = "https://www.miyoushe.com/ys/accountCenter/postList?id=";
  window.open(`${prefix}${uid}`);
}
</script>
<style lang="css" scoped>
.tp-mention-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  margin: 0 2px;
  color: #00c3ff;
  cursor: pointer;
  transform: translateY(2px);
}
</style>
