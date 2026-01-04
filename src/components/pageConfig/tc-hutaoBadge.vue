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
        icon="mdi-refresh"
        title="刷新用户信息"
        variant="outlined"
        @click="hutaoStore.tryRefreshInfo()"
      />
    </template>
  </v-card>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import useHutaoStore from "@store/hutao.js";
import { timeStr2str } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";

const hutaoStore = useHutaoStore();
const { userName, userInfo, isLogin } = storeToRefs(useHutaoStore());

function getAccountDesc(): string {
  if (!isLogin.value) return "未登录";
  if (userInfo.value) {
    if (userInfo.value.IsMaintainer) return "维护者";
    if (userInfo.value.IsLicensedDeveloper) return "开发者";
    return "普通用户";
  }
  return "未知";
}

async function tryLogin(): Promise<void> {
  if (isLogin.value) {
    const check = await showDialog.check("确认重新登录?");
    if (!check) return;
  }
  isLogin.value = false;
  await hutaoStore.tryLogin();
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
  z-index: 1;
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
