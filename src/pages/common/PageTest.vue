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
      <v-btn @click="test()" class="test-btn">测试</v-btn>
      <v-btn @click="test2()" class="test-btn">测试2</v-btn>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import hk4eReq from "@req/hk4eReq.js";
import takumiReq from "@req/takumiReq.js";
import useUserStore from "@store/user.js";
import { invoke } from "@tauri-apps/api/core";
import { storeToRefs } from "pinia";
import { ref } from "vue";

const { cookie, account } = storeToRefs(useUserStore());

const authkey = ref<string>("");

async function test(): Promise<void> {
  if (!cookie.value || !account.value) {
    showSnackbar.warn("请先登录账号");
    return;
  }
  const authkeyRes = await takumiReq.bind.authKey(cookie.value, account.value);
  if (typeof authkeyRes === "string") {
    authkey.value = authkeyRes;
  } else {
    showSnackbar.error("获取authkey失败");
    return;
  }
  const list: Array<TGApp.Game.Gacha.GachaBItem> = [];
  let endId = "0";
  while (true) {
    const res = await hk4eReq.gachaB(authkey.value, "1000", endId);
    if (Array.isArray(res)) {
      if (res.length === 0) break;
      list.push(...res);
      endId = res[res.length - 1].id;
    } else {
      showSnackbar.warn(`[${res.retcode}] 获取祈愿记录失败:${res.message}`);
    }
  }
  console.log(list);
}

async function test2(): Promise<void> {
  try {
    await invoke("call_yae_dll", {
      gamePath: "D:\\Games\\Genshin Impact bilibili\\games\\Genshin Impact Game\\YuanShen.exe",
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
