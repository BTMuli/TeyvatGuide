<!-- 实用脚本 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="us-top-title">
        <img alt="icon" src="/UI/nav/toolbox.webp" />
        <span>实用脚本</span>
        <v-select
          :disabled="runScript || runAll"
          :hide-details="true"
          :items="accounts"
          :model-value="curAccount"
          class="us-top-select"
          density="compact"
          item-title="uid"
          label="账号"
          variant="outlined"
        >
          <template #selection="{ item }">
            <div class="us-select-main">
              <img :src="item.brief.avatar" alt="icon" />
              <div class="us-sm-content">
                <span>{{ item.brief.nickname }}</span>
                <span>UID:{{ item.uid }}</span>
              </div>
            </div>
          </template>
          <template #item="{ props, item }">
            <div
              :class="{ selected: item.uid === curAccount?.uid }"
              class="us-select-item"
              v-bind="props"
              @click="() => (curAccount = item)"
            >
              <img :src="item.brief.avatar" alt="icon" />
              <div class="us-si-content">
                <span>{{ item.brief.nickname }}</span>
                <span>UID:{{ item.uid }}</span>
              </div>
            </div>
          </template>
        </v-select>
        <template v-if="accounts.length > 1">
          <v-btn :loading="runAll" class="run-all-btn" variant="elevated" @click="tryExecSingle()">
            一键执行当前账号
          </v-btn>
          <v-btn
            :loading="runAll"
            class="run-all-btn"
            variant="elevated"
            @click="tryExecAllAccounts()"
          >
            一键执行全部账号
          </v-btn>
        </template>
        <template v-else>
          <v-btn :loading="runAll" class="run-all-btn" variant="elevated" @click="tryExecSingle()">
            一键执行
          </v-btn>
        </template>
      </div>
    </template>
    <template #append>
      <v-btn class="us-test-btn" title="点击验证" variant="elevated" @click="tryCkVerify()">
        打卡测试
      </v-btn>
    </template>
  </v-app-bar>
  <div class="us-page-container">
    <!-- 左侧脚本列表 -->
    <div class="us-scripts">
      <TusMission ref="mission" v-model="runScript" :ac-cur="curAccount" />
      <TusSign ref="sign" v-model="runScript" :ac-cur="curAccount" />
    </div>
    <!-- 右侧脚本输出 -->
    <TusOutput />
  </div>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TusMission from "@comp/userScripts/tus-mission.vue";
import TusOutput from "@comp/userScripts/tus-output.vue";
import TusSign from "@comp/userScripts/tus-sign.vue";
import apiHubReq from "@req/apiHubReq.js";
import miscReq from "@req/miscReq.js";
import painterReq from "@req/painterReq.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useUserStore from "@store/user.js";
import { exit } from "@tauri-apps/plugin-process";
import TGLogger from "@utils/TGLogger.js";
import TGNotify from "@utils/TGNotify.js";
import { storeToRefs } from "pinia";
import { onBeforeMount, onMounted, ref, shallowRef, useTemplateRef } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const { uid } = storeToRefs(useUserStore());

// 路由参数
const autoRun = ref<boolean>(false);
const exitAfter = ref<boolean>(false);
const skipGeetest = ref<boolean>(false);
const targetUids = shallowRef<Array<string>>([]);

const runScript = ref<boolean>(false);
const runAll = ref<boolean>(false);

const accounts = shallowRef<Array<TGApp.App.Account.User>>([]);
const curAccount = shallowRef<TGApp.App.Account.User>();

const missionEl = useTemplateRef("mission");
const signEl = useTemplateRef("sign");

onBeforeMount(async () => {
  if (Object.keys(route.query).length > 0) {
    exitAfter.value = route.query.exit === "true";
    skipGeetest.value = route.query.skip === "true";
    autoRun.value = route.query.auto === "true";
    if (route.query.uids) {
      if (Array.isArray(route.query.uids)) {
        targetUids.value = <Array<string>>route.query.uids;
      } else {
        targetUids.value = [route.query.uids];
      }
    }
    await router.replace({ path: route.path, query: {} });
  }
});

onMounted(async () => {
  accounts.value = await TSUserAccount.account.getAllAccount();
  targetUids.value = targetUids.value.filter((u) => accounts.value.some((a) => a.uid === u));
  curAccount.value = accounts.value.find((i) => i.uid === uid.value);
  await showLoading.end();
  if (autoRun.value) await tryAutoRun();
});

async function tryAutoRun(): Promise<void> {
  let uids: Array<string> = accounts.value.map((u) => u.uid);
  if (targetUids.value.length === 0) {
    showSnackbar.warn("未接收到合法UID列表，默认全部执行");
  } else {
    uids = targetUids.value;
  }
  const startTime = Date.now();
  for (const uid of uids) {
    const acFind = await TSUserAccount.account.getAccount(uid);
    if (!acFind) {
      await TGLogger.Script(`未检测到 ${uid} 对应账号数据，跳过`);
      continue;
    }
    curAccount.value = acFind;
    await tryExecSingle();
  }
  if (exitAfter.value) {
    showSnackbar.success("任务执行完成，即将自动退出");
    const costTime = Date.now() - startTime;
    await TGNotify.normal("自动脚本执行完成", `耗时${Math.floor(costTime / 1000)}s`);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    await exit();
  }
}

async function tryCkVerify(): Promise<void> {
  if (!curAccount.value) {
    showSnackbar.warn("未检测到当前登录账号");
    return;
  }
  const check = await showDialog.check("确定验证？", "将通过执行米社社区打卡以验证ck有效性");
  if (!check) {
    showSnackbar.cancel("已取消验证");
    return;
  }
  const ck = {
    stoken: curAccount.value.cookie.stoken,
    stuid: curAccount.value.cookie.stuid,
    mid: curAccount.value.cookie.mid,
  };
  let flag = false;
  let challenge: string | undefined = undefined;
  while (!flag) {
    await showLoading.start("正在验证CK有效性");
    await painterReq.forum.recent(26, 2, 1, undefined, 20, ck);
    const resp = await apiHubReq.sign(ck, 2, challenge);
    await showLoading.update(`[${resp.retcode}] ${resp.message}`);
    if (resp.retcode === -100) {
      await showLoading.end();
      break;
    } else if (resp.retcode === 1034) {
      await showLoading.end();
      const cGet = await miscReq.challenge(ck);
      if (cGet !== false) challenge = cGet;
      else break;
    } else {
      flag = true;
      await showLoading.end();
    }
  }
  if (!flag) showSnackbar.error("CK验证失败");
  else showSnackbar.success("CK验证成功");
}

async function tryExecSingle(): Promise<void> {
  if (!curAccount.value) {
    showSnackbar.warn("当前账号未选择，请先选择账号");
    return;
  }
  if (runScript.value || runAll.value) {
    showSnackbar.warn("脚本正在执行，请稍后");
    return;
  }
  runAll.value = true;
  await missionEl.value?.tryAuto(skipGeetest.value);
  await signEl.value?.tryAuto(skipGeetest.value);
  runAll.value = false;
}

async function tryExecAllAccounts(): Promise<void> {
  if (accounts.value.length === 0) {
    showSnackbar.warn("未检测到可用账号");
    return;
  }
  if (runScript.value || runAll.value) {
    showSnackbar.warn("脚本正在执行，请稍后");
    return;
  }

  runAll.value = true;

  await TGLogger.ScriptSep(`全量执行`);
  for (const account of accounts.value) {
    curAccount.value = account;

    await TGLogger.Script(`账号 UID:${account.uid} 执行开始`);

    if (missionEl.value) await missionEl.value.tryAuto(skipGeetest.value);
    if (signEl.value) await signEl.value.tryAuto(skipGeetest.value);

    await TGLogger.Script(`账号 UID:${account.uid} 执行完毕`);
  }
  await TGLogger.ScriptSep(`全量执行`, false);

  runAll.value = false;
  showSnackbar.success("所有账号均已执行完毕");
}
</script>
<style lang="scss" scoped>
.us-top-title {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  column-gap: 8px;

  img {
    width: 32px;
    height: 32px;
  }

  span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }
}

.us-top-select {
  width: 250px;
  max-width: 250px;
}

.us-select-main {
  position: relative;
  display: flex;
  height: 24px;
  align-items: center;
  justify-content: center;
  column-gap: 4px;

  img {
    width: 24px;
    height: 24px;
  }
}

.us-sm-content {
  position: relative;
  display: flex;
  flex-direction: column;

  :first-child {
    font-family: var(--font-title);
    font-size: 12px;
  }

  :last-child {
    font-size: 10px;
  }
}

.us-select-item {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  justify-content: flex-start;
  padding: 8px;
  column-gap: 4px;
  cursor: pointer;

  &.selected:not(:hover) {
    background: var(--common-shadow-1);
  }

  &:hover {
    background: var(--common-shadow-2);
  }

  img {
    width: 24px;
    height: 24px;
  }
}

.us-si-content {
  position: relative;
  display: flex;
  flex-direction: column;

  :first-child {
    font-family: var(--font-title);
    font-size: 12px;
  }

  :last-child {
    font-size: 10px;
  }
}

.us-si-append {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
}

.top-hint {
  position: relative;
  padding: 8px;
  color: var(--tgc-pink-1);
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 20px;
}

.us-page-container {
  position: relative;
  display: flex;
  height: calc(100vh - 100px);
  align-items: flex-start;
  justify-content: center;
  column-gap: 12px;
}

.us-scripts {
  position: relative;
  display: flex;
  width: 100%;
  max-height: 100%;
  box-sizing: border-box;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-right: 8px;
  overflow-y: auto;
  row-gap: 8px;
}

.run-all-btn + .run-all-btn {
  margin-left: 8px;
}

.run-all-btn,
.us-test-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.us-test-btn {
  margin-right: 12px;
}
</style>
