<template>
  <div class="tgb-box">
    <div class="tgb-top">
      <div class="tgb-title">游戏安装</div>
      <div class="tgb-actions">
        <v-btn href="/game" icon="mdi-arrow-right" size="small" variant="text" />
        <v-btn icon="mdi-rocket" size="small" variant="outlined" @click="tryPlayGame()" />
      </div>
    </div>
    <v-list-item v-if="installation">
      <v-list-item-title class="tgb-name">
        {{ gameEnum.installation.schemeDesc(installation.schemeId) }}
      </v-list-item-title>
      <v-list-item-subtitle>
        v{{ installation.version ?? "未知" }} · {{ installation.statusMessage }}
      </v-list-item-subtitle>
      <v-list-item-subtitle class="tgb-path">{{ installation.rootPath }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item v-else>
      <v-list-item-title>尚未登记游戏安装</v-list-item-title>
      <v-list-item-subtitle>前往设置选择 YuanShen.exe</v-list-item-subtitle>
    </v-list-item>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import useUserStore from "@store/user.js";
import { tryLaunchGame } from "@utils/TGGame.js";
import { listGameInstallations } from "@utils/TGGameLauncher.js";
import { storeToRefs } from "pinia";
import { onMounted, ref } from "vue";

const { account, cookie } = storeToRefs(useUserStore());
const installation = ref<TGApp.Game.Installation.Item>();

onMounted(async () => {
  try {
    const installations = await listGameInstallations();
    installation.value = installations.find((item) => item.isChosen) ?? installations[0];
  } catch (error) {
    showSnackbar.error(`读取游戏安装失败：${error}`);
  }
});

async function tryPlayGame(): Promise<void> {
  await tryLaunchGame(account.value, cookie.value);
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

.tgb-actions {
  display: flex;
  gap: 4px;
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

.tgb-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
