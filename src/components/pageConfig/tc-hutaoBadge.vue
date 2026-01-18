<!-- 胡桃账号 -->
<template>
  <v-card class="tch-box">
    <img alt="logo" class="logo" src="/platforms/other/hutao2.webp" />
    <div class="tch-top">
      <img alt="logo" class="tch-top-logo" src="/platforms/other/hutao.webp" />
      <div class="tch-top-info">
        <span>胡桃云账号({{ getAccountDesc() }})</span>
        <span>{{ userName ?? "未登录" }}</span>
      </div>
    </div>
    <div class="tch-mid">
      <div v-if="isLogin && userInfo" class="info-list">
        <div class="info-item">
          <span>CDN到期时间</span>
          <span>{{ timeStr2str(userInfo.CdnExpireAt) }}</span>
        </div>
        <div class="info-item">
          <span>祈愿到期时间</span>
          <span>{{ timeStr2str(userInfo.GachaLogExpireAt) }}</span>
        </div>
      </div>
      <span v-else>未获取到用户信息</span>
    </div>
    <template #actions>
      <v-spacer />
      <v-btn icon="mdi-login" title="登录胡桃云" variant="outlined" @click="tryLogin()" />
      <v-btn
        :disabled="!userName"
        :loading="loadInfo"
        icon="mdi-refresh"
        title="刷新用户信息"
        variant="outlined"
        @click="refreshInfo()"
      />
      <v-btn icon="mdi-lock-reset" title="重置密码" variant="outlined" @click="showVerify = true" />
      <v-btn icon="mdi-cart" title="胡桃云祈愿记录服务" variant="outlined" @click="toDonate()" />
    </template>
  </v-card>
  <TcoHutaoVerify v-model="showVerify" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import TcoHutaoVerify from "@comp/pageConfig/tco-hutaoVerify.vue";
import useHutaoStore from "@store/hutao.js";
import { openUrl } from "@tauri-apps/plugin-opener";
import { timeStr2str } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";
import { ref } from "vue";

const hutaoStore = useHutaoStore();
const { userName, userInfo, isLogin } = storeToRefs(useHutaoStore());

const showVerify = ref<boolean>(false);
const loadInfo = ref<boolean>(false);

function getAccountDesc(): string {
  if (!isLogin.value) return "未登录";
  if (userInfo.value) {
    if (userInfo.value.IsMaintainer) return "维护者";
    if (userInfo.value.IsLicensedDeveloper) return "开发者";
    return "普通用户";
  }
  return "未知";
}

async function refreshInfo(): Promise<void> {
  loadInfo.value = true;
  await hutaoStore.tryRefreshInfo();
  loadInfo.value = false;
}

async function tryLogin(): Promise<void> {
  if (isLogin.value) {
    const check = await showDialog.check("确认重新登录?");
    if (!check) return;
  }
  isLogin.value = false;
  await hutaoStore.tryLogin();
}

async function toDonate(): Promise<void> {
  await openUrl("https://afdian.com/item/80d3b9decf9011edb5f452540025c377");
}
</script>
<style lang="scss" scoped>
.tch-box {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border-radius: 8px;
  background-image: linear-gradient(to right, #f78ca0 0%, #f9748f 19%, #fd868c 60%, #fe9a8b 100%);
  color: var(--tgc-white-1);
  row-gap: 8px;
}

.logo {
  position: absolute;
  z-index: 0;
  right: -20px;
  bottom: -20px;
  width: 160px;
}

.tch-top {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  column-gap: 8px;
}

.tch-top-logo {
  position: relative;
  width: 48px;
}

.tch-top-info {
  position: relative;
  display: flex;
  flex-direction: column;

  :first-child {
    font-family: var(--font-title);
  }

  :last-child {
    font-size: 12px;
  }
}

.tch-mid {
  position: relative;
  z-index: 2;
  width: 100%;
}

.info-list {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  row-gap: 4px;
}

.info-item {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}
</style>
