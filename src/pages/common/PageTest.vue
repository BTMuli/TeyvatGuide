<template>
  <div class="test-box">
    <h1>颜色测试</h1>
    <div class="test-item">
      <div class="test-1">
        Box 1
        <div class="test-2">
          Box 2
          <div class="test-3">
            Box 3
            <div class="test-4">Box 4</div>
          </div>
        </div>
      </div>
    </div>
    <div class="btn-list">
      <v-btn class="test-btn" @click="test()">测试</v-btn>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import TSUserBagMaterial from "@Sqlm/userBagMaterial.js";
import { event } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import type { Event, UnlistenFn } from "@tauri-apps/api/event";
import { onMounted, onUnmounted } from "vue";

let listener: UnlistenFn | null = null;

onMounted(async () => {
  listener = await event.listen<string>("yae_store_list", async (e: Event<string>) => {
    console.log(e.payload, typeof e.payload);
    const parse: TGApp.Plugins.Yae.BagListRes = JSON.parse(e.payload);
    const materialList = parse.filter((i) => i.kind === "material");
    const now = new Date();
    if (materialList && materialList.length > 0) {
      await TSUserBagMaterial.saveYaeData(500299765, materialList);
    }
    const cost = new Date().getTime() - now.getTime();
    showSnackbar.success(
      `成功导入 ${materialList.length} 条数据，耗时 ${Math.floor(cost / 1000)}s`,
    );
  });
});
onUnmounted(() => {
  if (listener !== null) {
    listener();
    listener = null;
  }
});

async function test(): Promise<void> {
  try {
    await invoke("call_yae_dll", {
      gamePath: "D:\\Games\\Genshin Impact bilibili\\games\\Genshin Impact Game\\YuanShen.exe",
      uid: "500299765",
    });
  } catch (e) {
    console.error(e);
  }
}
</script>
<style lang="css" scoped>
.test-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.test-item {
  padding: 10px;
  border-radius: 5px;
}

.btn-list {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 20px;
  gap: 10px;
}

.test-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 5px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.test-1,
.test-2,
.test-3,
.test-4 {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 5px;
}

.test-1 {
  background: var(--box-bg-1);
}

.test-2 {
  background: var(--box-bg-2);
}

.test-3 {
  background: var(--box-bg-3);
}

.test-4 {
  background: var(--box-bg-4);
}
</style>
