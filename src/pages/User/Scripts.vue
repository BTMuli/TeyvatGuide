<template>
  <v-app-bar>
    <template #prepend>
      <div class="us-top-title">
        <img alt="icon" src="/source/UI/toolbox.webp" />
        <span>实用脚本</span>
        <v-select
          density="compact"
          class="us-top-select"
          variant="outlined"
          v-model="curAccount"
          :items="accounts"
          item-title="uid"
          :hide-details="true"
          label="账号"
        >
          <template #selection="{ item }">
            <div class="select-main">
              <img alt="icon" :src="item.raw.brief.avatar" />
              <div class="content">
                <span>{{ item.raw.brief.nickname }}</span>
                <span>UID:{{ item.raw.uid }}</span>
              </div>
            </div>
          </template>
          <template #item="{ props, item }">
            <div class="select-item" v-bind="props">
              <img alt="icon" :src="item.raw.brief.avatar" />
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
                  size="small"
                  icon="mdi-account-convert"
                  title="切换用户"
                  @click="loadAccount(item.raw.uid)"
                />
              </div>
            </div>
          </template>
        </v-select>
      </div>
    </template>
    <template #append>
      <span class="top-hint" @click="tryCkVerify()" title="点击验证">
        需要验证码登录/游戏扫码登录所需cookie！！！
      </span>
    </template>
  </v-app-bar>
  <div class="us-page-container">
    <!-- 左侧脚本列表 -->
    <div class="us-scripts">
      <div class="us-title">脚本列表</div>
      <TusMission v-model="runScript" />
      <TusSign v-model="runScript" />
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
import TSUserAccount from "@Sqlm/userAccount.js";
import useUserStore from "@store/user.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef } from "vue";

const { uid, briefInfo, cookie, account } = storeToRefs(useUserStore());
const accounts = shallowRef<Array<TGApp.App.Account.User>>([]);
const curAccount = shallowRef<TGApp.App.Account.User>();
const runScript = ref<boolean>(false);

onMounted(async () => {
  accounts.value = await TSUserAccount.account.getAllAccount();
  curAccount.value = accounts.value.find((i) => i.uid === uid.value);
});

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
    showSnackbar.warn(`未找到${uid}的游戏账号信息，请尝试刷新`);
    return;
  }
  account.value = gameAccount;
  showSnackbar.success(`成功切换到用户${uid}`);
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
    const resp = await apiHubReq.sign(ck, 2, challenge);
    await showLoading.update(`[${resp.retcode}] ${resp.message}`);
    if (resp.retcode === -100) {
      await showLoading.end();
      break;
    } else if (resp.retcode === 1034) {
      await showLoading.end();
      const cGet = await miscReq.challenge(ck);
      if (cGet !== false) challenge = cGet;
    } else {
      flag = true;
      await showLoading.end();
    }
  }
  if (!flag) showSnackbar.error("CK验证失败，请通过验证码登录重新获取CK");
  else showSnackbar.success("CK验证成功");
}
</script>
<style lang="scss" scoped>
.us-top-title {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  gap: 10px;

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
  align-items: center;
  justify-content: center;
  column-gap: 4px;
  height: 24px;

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
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 4px;
  padding: 8px;
  box-sizing: border-box;

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
  font-size: 20px;
  color: var(--tgc-pink-1);
  font-family: var(--font-title);
  cursor: pointer;
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
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  overflow-y: auto;
  row-gap: 8px;
  max-height: 100%;
  padding-right: 8px;
  box-sizing: border-box;
}

.us-title {
  position: sticky;
  width: 100%;
  background: var(--app-page-bg);
  top: 0;
  z-index: 2;
  margin-right: auto;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 24px;
}
</style>
