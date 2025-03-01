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
    </div>
  </div>
</template>
<script lang="ts" setup>
import showGeetest from "@comp/func/geetest.js";
import showSnackbar from "@comp/func/snackbar.js";
import { storeToRefs } from "pinia";

import { useUserStore } from "@/store/modules/user.js";
import miscReq from "@/web/request/miscReq.js";

const { cookie } = storeToRefs(useUserStore());

async function test(): Promise<void> {
  if (!cookie.value) return;
  const ck: Record<string, string> = {
    stoken: cookie.value.stoken,
    stuid: cookie.value.stuid,
    mid: cookie.value.mid,
  };
  const resp = await miscReq.create(ck);
  if ("retcode" in resp) {
    showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
    return;
  }
  const gtRes = await showGeetest(resp);
  console.log(gtRes);
  if (gtRes === false) return;
  const verifyResp = await miscReq.verify(gtRes, ck);
  if ("retcode" in verifyResp) {
    showSnackbar.error(`[${verifyResp.retcode}] ${verifyResp.message}`);
    return;
  }
  showSnackbar.success("验证成功");
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
