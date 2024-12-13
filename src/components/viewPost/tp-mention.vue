<template>
  <span class="tp-mention-box" @click="toLink()">
    <v-icon size="small">mdi-account-circle-outline</v-icon>
    <span>{{ props.data.insert.mention.nickname }}</span>
  </span>
</template>
<script lang="ts" setup>
import { toRaw } from "vue";

export type TpMention = { insert: { mention: { uid: string; nickname: string } } };
type TpMentionProps = { data: TpMention };

const props = defineProps<TpMentionProps>();

console.log("tpMention", props.data.insert.mention.uid, toRaw(props.data).insert.mention);

// todo 个人主页
function toLink(): void {
  const uid = props.data.insert.mention.uid;
  const link = `https://www.miyoushe.com/ys/accountCenter/postList?id=${uid}`;
  window.open(link);
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
