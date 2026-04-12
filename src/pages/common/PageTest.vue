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
      <v-btn class="test-btn" @click="testReply()">回复测试</v-btn>
      <v-btn class="test-btn" @click="test()">测试</v-btn>
    </div>
  </div>
  <VpReplyDebug v-model="showReply" />
</template>
<script lang="ts" setup>
import VpReplyDebug from "@comp/viewPost/vp-reply-debug.vue";
import { ref } from "vue";
import { storeToRefs } from "pinia";
import useUserStore from "@store/user.js";
import recordReq from "@req/recordReq.js";
import TGHttps from "@utils/TGHttps.js";
import showSnackbar from "@comp/func/snackbar.js";
import TGLogger from "@utils/TGLogger.js";

const showReply = ref<boolean>(false);
const { account, cookie } = storeToRefs(useUserStore());

function testReply(): void {
  showReply.value = true;
}

async function test() {
  if (!cookie.value) return;
  let dnResp: TGApp.Game.DailyNote.DnResp | undefined;
  try {
    dnResp = await recordReq.daily(cookie.value, account.value);
    console.debug(`dailyNoteResp`, dnResp);
    if (dnResp.retcode !== 0) {
      showSnackbar.warn(`获取实时便笺失败: ${dnResp.retcode}-${dnResp.message}`);
      await TGLogger.Warn(`[PageTest][test] 获取实时便笺失败`);
      await TGLogger.Warn(`[PageTest][test] ${dnResp}`);
      return;
    }
    showSnackbar.success("成功获取实时便笺数据");
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取实时便笺失败：${errMsg}`);
    await TGLogger.Error(`[PageTest][test] 获取实时便笺失败`);
    await TGLogger.Error(`[PageTest][test] ${e}`);
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
