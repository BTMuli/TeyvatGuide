<template>
  <span class="tp-mention-box" @click="toLink()">
    <v-icon size="small">mdi-account-circle-outline</v-icon>
    <span>{{ props.data.insert.mention.nickname }}</span>
  </span>
</template>
<script lang="ts" setup>
import { emit } from "@tauri-apps/api/event";
import { toRaw } from "vue";

export type TpMention = { insert: { mention: { uid: string; nickname: string } } };
type TpMentionProps = { data: TpMention };

const props = defineProps<TpMentionProps>();

console.log("tpMention", props.data.insert.mention.uid, toRaw(props.data).insert.mention);

async function toLink(): Promise<void> {
  const uid = props.data.insert.mention.uid;
  await emit("userMention", uid);
}
</script>
<style lang="css" scoped>
.tp-mention-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  margin: 2px;
  color: #00c3ffff;
  cursor: pointer;
}
</style>
