<template>
  <div class="tgb-box">
    <div class="tgb-top">
      <div class="tgb-title">✨原神，启动！</div>
      <v-btn size="small" icon="mdi-rocket" variant="outlined" @click="tryPlayGame()" />
    </div>
    <v-list-item v-if="account.uid">
      <v-list-item-title class="tgb-name">
        {{ account.nickname }}({{ account.regionName }})
      </v-list-item-title>
      <v-list-item-subtitle>{{ account.gameUid }} Lv.{{ account.level }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item v-else>
      <v-list-item-title>未登录，请先登录!</v-list-item-title>
    </v-list-item>
  </div>
</template>
<script lang="ts" setup>
import { path } from "@tauri-apps/api";
import { exists } from "@tauri-apps/plugin-fs";
import { Command } from "@tauri-apps/plugin-shell";
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { useAppStore } from "../../store/modules/app.js";
import { useUserStore } from "../../store/modules/user.js";
import TGLogger from "../../utils/TGLogger.js";
import TGRequest from "../../web/request/TGRequest.js";
import showSnackbar from "../func/snackbar.js";

const userStore = storeToRefs(useUserStore());
const appStore = storeToRefs(useAppStore());
const account = computed<TGApp.Sqlite.Account.Game>(() => userStore.account.value);

async function tryPlayGame(): Promise<void> {
  if (!userStore.uid.value || !userStore.cookie.value) {
    showSnackbar({ text: "请先登录！", color: "warn" });
    return;
  }
  if (account.value.isOfficial === 0) {
    showSnackbar({ text: "仅支持官服用户启动！", color: "warn" });
    return;
  }
  if (appStore.gameDir.value === "未设置") {
    showSnackbar({ text: "未设置游戏安装目录！", color: "warn" });
    return;
  }
  const gamePath = `${appStore.gameDir.value}${path.sep()}YuanShen.exe`;
  if (!(await exists(gamePath))) {
    showSnackbar({ text: "未检测到原神本体应用！", color: "warn" });
    return;
  }
  const resp = await TGRequest.User.getAuthTicket(account.value, userStore.cookie.value);
  if (typeof resp !== "string") {
    showSnackbar({ text: `[${resp.retcode}] ${resp.message}`, color: "error" });
    await TGLogger.Error(
      `[config][gameBadge] 尝试获取authTicket失败，当前用户：${account.value.uid}-${account.value.gameUid}`,
    );
    await TGLogger.Error(`[config][gameBadge] resp: ${JSON.stringify(resp)}`);
    return;
  }
  showSnackbar({ text: `成功获取ticket:${resp}，正在启动应用...` });
  const cmd = Command.create("exec-sh", [`&"${gamePath}" login_auth_ticket=${resp}`], {
    cwd: appStore.gameDir.value,
    encoding: "utf-8",
  });
  console.log(cmd);
  const result = await cmd.execute();
  if (result.stderr) {
    await TGLogger.Error(`[config][gameBadge] 启动游戏本体失败！`);
    console.error(result.stderr);
    showSnackbar({ text: `[config][gameBadge] ${result.stderr}`, color: "error" });
  }
}
</script>
<style lang="css" scoped>
.tgb-box {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 10px;
  border-radius: 10px;
  background-image: linear-gradient(to right, #f78ca0 0%, #f9748f 19%, #fd868c 60%, #fe9a8b 100%);
  color: var(--tgc-white-1);
  row-gap: 10px;
}

.tgb-top {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.tgb-title {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tgc-yellow-1);
  font-family: var(--font-title);
  font-size: 18px;
}

.tgb-btns {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 10px;
}

.tgb-name {
  font-family: var(--font-title);
}
</style>
