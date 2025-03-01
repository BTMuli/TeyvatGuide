<template>
  <TOverlay v-model="visible" blur-val="0">
    <div class="tpr-debug-box">
      <div class="tpr-debug-title">
        <span>文件：</span>
        <span :title="filePath">{{ filePath }}</span>
        <v-btn @click="selectFile" color="primary">选择文件</v-btn>
      </div>
      <div class="tpr-debug-reply">
        <TprReply mode="main" :modelValue="replyData" v-if="replyData !== null" pinId="0" />
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { ref, shallowRef } from "vue";

import TprReply from "./vp-reply-item.vue";

import TGLogger from "@/utils/TGLogger.js";

const visible = defineModel<boolean>();
const filePath = ref<string>("");
const replyData = shallowRef<TGApp.BBS.Reply.ReplyFull | null>(null);

async function selectFile(): Promise<void> {
  const file = await open({
    multiple: false,
    directory: false,
    filter: { name: "JSON", extensions: ["json"] },
  });
  if (file === null) {
    showSnackbar.warn("未选择文件");
    return;
  }
  filePath.value = file;
  try {
    const data = await readTextFile(file);
    replyData.value = JSON.parse(data);
  } catch (error) {
    if (error instanceof Error) {
      showSnackbar.error(`解析失败：${error.message}`);
      await TGLogger.Error(`解析失败：${error.message}`);
      return;
    }
    showSnackbar.error("解析失败");
    await TGLogger.Error(`解析失败: ${error}`);
  }
}
</script>
<style lang="css" scoped>
.tpr-debug-box {
  position: relative;
  display: flex;
  width: 400px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 5px;
  background: var(--box-bg-1);
  box-shadow: 0 0 5px var(--common-shadow-1);
}

.tpr-debug-title {
  display: flex;
  overflow: hidden;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 5px;
  border-bottom: 1px solid var(--box-bg-2);
  font-family: var(--font-title);
  text-overflow: ellipsis;
  white-space: nowrap;

  :nth-child(2) {
    overflow: hidden;
    width: 300px;
    color: var(--common-text-title);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.tpr-debug-reply {
  display: flex;
  width: 100%;
  min-height: 50px;
  max-height: 300px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 5px;
  overflow-y: auto;
}
</style>
