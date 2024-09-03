<template>
  <div class="tpr-reply-box">
    <div
      class="tpr-bubble"
      v-if="props.modelValue.user.reply_bubble !== null"
      :title="props.modelValue.user.reply_bubble.name"
      :style="{
        backgroundColor: props.modelValue.user.reply_bubble.bg_color,
      }"
    >
      <img :src="props.modelValue.user.reply_bubble.url" alt="bubble" />
    </div>
    <div class="tpr-user">
      <div class="tpru-left">
        <img :src="props.modelValue.user.avatar_url" alt="avatar" class="avatar" />
        <img
          :src="props.modelValue.user.pendant"
          v-if="props.modelValue.user.pendant !== ''"
          alt="pendant"
          class="pendant"
        />
      </div>
      <div class="tpru-right" :title="props.modelValue.user.nickname">
        <span>{{ props.modelValue.user.nickname }}</span>
        <span v-if="props.modelValue.is_lz" class="tpru-lz">楼主</span>
      </div>
    </div>
    <div class="tpr-content">
      <TpParser :data="JSON.parse(props.modelValue.reply.struct_content)" />
    </div>
    <div class="tpr-info">
      <div class="tpri-left">
        <span>{{ getTime() }}</span>
        <span>{{ props.modelValue.user.ip_region }}</span>
      </div>
      <div class="tpri-right">
        <span title="点赞数" class="tpr-like">
          <v-icon size="small">mdi-thumb-up</v-icon>
          {{ props.modelValue.stat.like_num }}
        </span>
        <span
          v-if="props.modelValue.sub_replies.length > 0"
          class="tpr-reply"
          @click="emit('replySub', props.modelValue)"
          title="查看子回复"
        >
          <v-icon size="small">mdi-message-text</v-icon>
          {{ props.modelValue.sub_replies.length }}
        </span>
      </div>
    </div>
    <div class="tpr-extra">
      <span>{{ props.modelValue.reply.reply_id }}</span>
      <span>{{ props.modelValue.reply.floor_id }}F</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { toRaw } from "vue";

import TpParser from "../post/tp-parser.vue";

interface TprReplyProps {
  mode: "main" | "root" | "sub";
  modelValue: TGApp.Plugins.Mys.Reply.ReplyFull;
}

interface TprReplyEmits {
  (e: "update:modelValue", value: TGApp.Plugins.Mys.Reply.ReplyFull): void;

  (e: "replySub", value: TGApp.Plugins.Mys.Reply.ReplyFull): void;
}

const props = defineProps<TprReplyProps>();
const emit = defineEmits<TprReplyEmits>();

console.log("TprReply", toRaw(props.modelValue));

function getTime(): string {
  const time = new Date(props.modelValue.reply.created_at * 1000);
  const now = new Date();
  // 如果是今天，只显示 hh:mm
  if (time.toDateString() === now.toDateString()) {
    return time.toLocaleTimeString();
  }
  // 如果是今年，显示 MM-dd
  if (time.getFullYear() === now.getFullYear()) {
    return time.toLocaleDateString().slice(5);
  }
  // 否则显示 yyyy-MM-dd
  return time.toLocaleDateString();
}
</script>
<style lang="css" scoped>
.tpr-reply-box {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-1);
  row-gap: 5px;
  word-break: break-all;
}

.tpr-bubble {
  position: absolute;
  top: 0;
  right: 0;
  opacity: 0.5;
}

.tpr-bubble img {
  max-width: 100%;
  height: 40px;
  object-fit: contain;
}

.tpr-user {
  position: relative;
  display: flex;
  width: 100%;
  height: 40px;
  align-items: center;
  justify-content: flex-start;
  gap: 5px;
}

.tpru-left {
  position: relative;
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
}

.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}

.pendant {
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 40px;
  object-fit: cover;
}

.tpru-right {
  display: flex;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  column-gap: 5px;
  font-family: var(--font-title);
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tpru-lz {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 2px;
  border-radius: 2px;
  background: var(--tgc-od-blue);
  font-size: 12px;
}

.tpr-content {
  width: 100%;
}

.tpr-info {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  opacity: 0.5;
}

.tpri-left {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.tpri-right {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.tpr-like {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.tpr-reply {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  gap: 5px;
}

.tpr-extra {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-end;
  font-size: 12px;
  gap: 5px;
  opacity: 0.3;
}
</style>
