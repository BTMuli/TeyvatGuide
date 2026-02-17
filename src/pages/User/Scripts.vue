<!-- 实用脚本 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="us-top-title">
        <img alt="icon" src="/UI/nav/toolbox.webp" />
        <span>实用脚本</span>
        <v-select
          v-model="curAccount"
          :disabled="runScript || runAll"
          :hide-details="true"
          :items="accounts"
          class="us-top-select"
          density="compact"
          item-title="uid"
          label="账号"
          variant="outlined"
        >
          <template #selection="{ item }">
            <div class="select-main">
              <img :src="item.raw.brief.avatar" alt="icon" />
              <div class="content">
                <span>{{ item.raw.brief.nickname }}</span>
                <span>UID:{{ item.raw.uid }}</span>
              </div>
            </div>
          </template>
          <template #item="{ props, item }">
            <div class="select-item" v-bind="props">
              <img :src="item.raw.brief.avatar" alt="icon" />
              <div class="content">
                <span>{{ item.raw.brief.nickname }}</span>
                <span>UID:{{ item.raw.uid }}</span>
              </div>
              <div class="append">
                <v-icon v-if="item.raw.uid === uid" color="green" title="当前登录账号">
                  mdi-account-check
                </v-icon>
                <v-icon
                  v-else
                  icon="mdi-account-convert"
                  size="small"
                  title="切换用户"
                  @click="loadAccount(item.raw.uid)"
                />
              </div>
            </div>
          </template>
        </v-select>
        <v-btn :loading="runAll" class="run-all-btn" variant="elevated" @click="tryExecAll()">
          一键执行
        </v-btn>
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
      <TusMission ref="mission" v-model="runScript" />
      <TusSign ref="sign" v-model="runScript" />
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
import TGNotify from "@utils/TGNotify.js";
import { storeToRefs } from "pinia";
import { onBeforeMount, onMounted, ref, shallowRef, useTemplateRef } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const { uid, briefInfo, cookie, account } = storeToRefs(useUserStore());

// 路由参数
const autoRun = ref<boolean>(false);
const exitAfter = ref<boolean>(false);
const skipGeetest = ref<boolean>(false);
const targetUids = shallowRef<Array<string>>([]);

const accounts = shallowRef<Array<TGApp.App.Account.User>>([]);
const curAccount = shallowRef<TGApp.App.Account.User>();
const runScript = ref<boolean>(false);
const runAll = ref<boolean>(false);
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
    await loadAccount(uid);
    await tryExecAll();
  }
  if (exitAfter.value) {
    showSnackbar.success("任务执行完成，即将自动退出");
    const costTime = Date.now() - startTime;
    await TGNotify.normal("自动脚本执行完成", `耗时${Math.floor(costTime / 1000)}s`);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    await exit();
  }
}

async function loadAccount(ac: string): Promise<void> {
  if (uid.value && ac === uid.value) {
    showSnackbar.warn("该账户已经登录，无需切换");
    return;
  }
  const accountGet = await TSUserAccount.account.getAccount(ac);
  if (!accountGet) {
    showSnackbar.warn(`未找到${uid}的账号信息，请重新登录`);
    return;
  }
  uid.value = ac;
  briefInfo.value = accountGet.brief;
  cookie.value = accountGet.cookie;
  const gameAccount = await TSUserAccount.game.getCurAccount(ac);
  if (!gameAccount) {
    showSnackbar.warn(`未找到${uid.value}的游戏账号信息，请尝试刷新`);
    return;
  }
  account.value = gameAccount;
  showSnackbar.success(`成功切换到用户${uid.value}`);
}

async function tryCkVerify(): Promise<void> {
  if (!cookie.value) {
    showSnackbar.warn("当前账号未登录，请先登录");
    return;
  }
  const check = await showDialog.check("确定验证？", "将通过执行米社社区打卡以验证ck有效性");
  if (!check) {
    showSnackbar.cancel("已取消验证");
    return;
  }
  const ck = {
    stoken: cookie.value.stoken,
    stuid: cookie.value.stuid,
    mid: cookie.value.mid,
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

async function tryExecAll(): Promise<void> {
  if (!cookie.value) {
    showSnackbar.warn("当前账号未登录，请先登录");
    return;
  }
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

.select-main {
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

  .content {
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
}

.select-item {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  justify-content: flex-start;
  padding: 8px;
  column-gap: 4px;

  img {
    width: 24px;
    height: 24px;
  }

  .content {
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

  .append {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: auto;
  }
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
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-right: 8px;
  overflow-y: auto;
  row-gap: 8px;
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
