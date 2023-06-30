<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <div class="hta-box">
    <div class="hta-top">
      <v-tabs v-model="tab" align-tabs="start" class="hta-tab">
        <v-tab value="use">角色使用</v-tab>
        <v-tab value="up">角色出场</v-tab>
        <v-tab value="team">队伍出场</v-tab>
        <v-tab value="hold">角色持有</v-tab>
      </v-tabs>
      <div class="hta-title">
        <span>胡桃数据库</span>
        <span @click="showDialog = true">更新于 {{ getUpdated() }}</span>
      </div>
    </div>
    <v-window v-model="tab">
      <v-window-item value="use">
        <HtaTabUse v-model="avatarUse" :data="avatarData" />
      </v-window-item>
      <v-window-item value="up">
        <HtaTabUp v-model="avatarUp" :data="avatarData" />
      </v-window-item>
      <v-window-item value="team">
        <HtaTabTeam v-model="teamCombination" :data="avatarData" />
      </v-window-item>
      <v-window-item value="hold">
        <HtaTabHold v-model="avatarHold" :data="avatarData" />
      </v-window-item>
    </v-window>
  </div>
  <HtaOverlayOverview v-model="showDialog" :data="overview" />
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import HtaOverlayOverview from "../../components/hutaoAbyss/hta-overlay-overview.vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import HtaTabUse from "../../components/hutaoAbyss/hta-tab-use.vue";
import HtaTabUp from "../../components/hutaoAbyss/hta-tab-up.vue";
import HtaTabTeam from "../../components/hutaoAbyss/hta-tab-team.vue";
import HtaTabHold from "../../components/hutaoAbyss/hta-tab-hold.vue";
// plugins
import Hutao from "../../plugins/Hutao";
import TGSqlite from "../../plugins/Sqlite";

// loading
const loading = ref<boolean>(false);
const loadingTitle = ref<string>("");

// overview overlay
const showDialog = ref<boolean>(false);

// data
const overview = ref<TGApp.Plugins.Hutao.Abyss.OverviewData>(
  {} as TGApp.Plugins.Hutao.Abyss.OverviewData,
);
const tab = ref<string>("use");
const avatarUse = ref<Array<TGApp.Plugins.Hutao.Abyss.AvatarUse>>([]);
const avatarUp = ref<Array<TGApp.Plugins.Hutao.Abyss.AvatarUp>>([]);
const teamCombination = ref<Array<TGApp.Plugins.Hutao.Abyss.TeamCombination>>([]);
const avatarHold = ref<Array<TGApp.Plugins.Hutao.Abyss.AvatarHold>>([]);
const avatarData = ref<Array<TGApp.Sqlite.Character.AppData>>([]);

onMounted(async () => {
  loadingTitle.value = "正在获取深渊数据";
  loading.value = true;
  loadingTitle.value = "正在获取深渊概览";
  overview.value = await Hutao.Abyss.getOverview();
  loadingTitle.value = "正在获取深渊角色使用";
  avatarUse.value = await Hutao.Abyss.avatar.getUseRate();
  loadingTitle.value = "正在获取深渊角色出场";
  avatarUp.value = await Hutao.Abyss.avatar.getUpRate();
  loadingTitle.value = "正在获取深渊队伍出场";
  teamCombination.value = await Hutao.Abyss.getTeamCollect();
  loadingTitle.value = "正在获取深渊角色持有";
  avatarHold.value = await Hutao.Abyss.avatar.getHoldRate();
  loadingTitle.value = "正在获取角色数据";
  avatarData.value = await TGSqlite.getAllAppCharacter();
  loading.value = false;
});

function getUpdated() {
  return new Date(overview.value.timestamp)
    .toLocaleString("zh-CN", { hour12: false })
    .replace(/\//g, "-");
}
</script>
<style lang="css" scoped>
.hta-box {
  width: 100%;
  height: 100%;
  padding: 10px;
  box-sizing: border-box;
  overflow: auto;
  border-radius: 5px;
  box-shadow: 0 0 10px var(--common-shadow-4);
}

.hta-top {
  display: flex;
  width: 100%;
  justify-content: space-between;
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.hta-tab {
  margin-bottom: 10px;
}

.hta-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 20px;
  column-gap: 10px;
}

.hta-title :nth-child(2) {
  font-family: var(--font-text);
}

.hta-title :nth-child(2):hover {
  cursor: pointer;
  text-decoration: underline;
}
</style>
