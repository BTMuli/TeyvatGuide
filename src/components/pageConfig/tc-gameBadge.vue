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
import showSnackbar from "@comp/func/snackbar.js";
import passportReq from "@req/passportReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { path } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import { exists } from "@tauri-apps/plugin-fs";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";

const { gameDir } = storeToRefs(useAppStore());
const { account, uid, cookie } = storeToRefs(useUserStore());

async function tryPlayGame(): Promise<void> {
  if (!uid.value || !cookie.value) {
    showSnackbar.warn("请先登录！");
    return;
  }
  if (account.value.isOfficial === 0) {
    showSnackbar.warn("仅支持官服用户启动！");
    return;
  }
  if (gameDir.value === "未设置") {
    showSnackbar.warn("未设置游戏安装目录！");
    return;
  }
  const gamePath = `${gameDir.value}${path.sep()}YuanShen.exe`;
  if (!(await exists(gamePath))) {
    showSnackbar.warn("未检测到原神本体应用！");
    return;
  }
  const resp = await passportReq.authTicket(account.value, cookie.value);
  if (typeof resp !== "string") {
    showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
    await TGLogger.Error(
      `[config][gameBadge] 尝试获取authTicket失败，当前用户：${account.value.uid}-${account.value.gameUid}`,
    );
    await TGLogger.Error(`[config][gameBadge] resp: ${JSON.stringify(resp)}`);
    return;
  }
  showSnackbar.success(`成功获取ticket:${resp}，正在启动应用...`);
  try {
    await invoke("launch_game", { path: gamePath, ticket: resp });
  } catch (error) {
    showSnackbar.error(`${error}`);
  }
}
</script>
<style lang="css" scoped>
.tgb-box {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  flex-shrink: 0;
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

.tgb-name {
  font-family: var(--font-title);
}
</style>
