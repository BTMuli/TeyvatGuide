<template>
  <div class="tuso-box">
    <div class="tuso-top">
      <div class="tuso-title">输出日志</div>
      <div class="tuso-top-acts">
        <v-btn class="tuso-btn" @click="clearLog()">清空</v-btn>
      </div>
    </div>
    <div class="tuso-mid" ref="logRef">
      <div class="tuso-log" v-for="log in logs" :key="log">{{ log }}</div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { event } from "@tauri-apps/api";
import type { Event, UnlistenFn } from "@tauri-apps/api/event";
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef } from "vue";

let logListener: UnlistenFn | null = null;
const logs = ref<Array<string>>([]);
const logEl = useTemplateRef<HTMLDivElement>("logRef");

onMounted(async () => {
  logListener = await event.listen<string>("userScriptLog", async (e: Event<string>) => {
    logs.value.push(e.payload);
    await nextTick();
    logEl.value?.scrollTo({ top: logEl.value.scrollHeight, behavior: "smooth" });
  });
});

function clearLog(): void {
  logs.value = [];
}

onUnmounted(() => {
  if (logListener !== null) {
    logListener();
    logListener = null;
  }
});
</script>
<style lang="scss" scoped>
.tuso-box {
  position: relative;
  display: flex;
  width: 800px;
  min-width: 800px;
  height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  margin-left: auto;
  background: var(--box-bg-1);
  gap: 4px;
}

.tuso-top {
  position: relative;
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: space-between;
}

.tuso-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 24px;
}

.tuso-top-acts {
  display: flex;
  gap: 10px;
}

.tuso-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.tuso-mid {
  position: relative;
  display: flex;
  height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-2);
  overflow-y: auto;
}

.tuso-log {
  position: relative;
  height: 24px;
  min-height: 24px;
  white-space: pre;
}
</style>
