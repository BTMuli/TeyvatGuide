<template>
  <div class="tpr-main-box" title="查看回复">
    <v-menu location="end" :close-on-content-click="false">
      <template #activator="{ props }">
        <v-btn
          :loading="loading"
          class="tpr-btn"
          size="38px"
          variant="outlined"
          @click="showReply()"
          icon="mdi-message-text-outline"
          v-bind="props"
        />
      </template>
      <v-list width="300px" height="400px" class="tpr-reply-box">
        <TprReply
          v-for="(item, index) in reply"
          :key="index"
          :modelValue="item"
          @replySub="handleSubReply"
        />
        <v-list-item v-if="isLast" class="text-center">
          <v-chip color="info" label>没有更多了</v-chip>
        </v-list-item>
        <v-list-item v-else-if="loading" class="text-center">
          <v-progress-circular indeterminate color="primary" />
        </v-list-item>
        <v-list-item v-else class="text-center">
          <v-btn @click="loadReply()" color="primary">加载更多</v-btn>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>
<script lang="ts" setup>
import { ref } from "vue";

import Mys from "../../plugins/Mys/index.js";
import showSnackbar from "../func/snackbar.js";

import TprReply from "./tpr-reply.vue";

interface TprMainProps {
  gid: number;
  postId: string;
}

const props = defineProps<TprMainProps>();
const reply = ref<Array<TGApp.Plugins.Mys.Reply.ReplyFull>>([]);
const lastId = ref<string | undefined>(undefined);
const isLast = ref<boolean>(false);
const loading = ref<boolean>(false);

async function showReply(): Promise<void> {
  if (reply.value.length > 0) return;
  if (isLast.value) return;
  await loadReply();
}

async function loadReply(): Promise<void> {
  loading.value = true;
  const resp = await Mys.Post.reply(props.postId, props.gid, true, lastId.value);
  if ("retcode" in resp) {
    showSnackbar({
      text: `[${resp.retcode}] ${resp.message}`,
      color: "warn",
    });
    return;
  }
  isLast.value = resp.is_last;
  lastId.value = resp.last_id;
  reply.value = reply.value.concat(resp.list);
  loading.value = false;
  if (isLast.value) {
    showSnackbar({
      text: "没有更多了",
      color: "info",
    });
  }
}

async function handleSubReply(item: TGApp.Plugins.Mys.Reply.ReplyFull): Promise<void> {
  console.log(item);
}
</script>
<style lang="css" scoped>
.tpr-main-box {
  position: fixed;
  bottom: 20px;
  left: 20px;
}

.tpr-btn {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--common-shadow-8);
}

.tpr-btn:hover {
  opacity: 0.8;
}

.tpr-reply-box {
  margin-left: 5px;
}
</style>
