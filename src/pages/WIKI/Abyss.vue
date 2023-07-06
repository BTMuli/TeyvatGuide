<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="hta-box">
    <div class="hta-top">
      <v-tabs v-model="tab" align-tabs="start" class="hta-tab">
        <v-tab value="use">角色使用</v-tab>
        <v-tab value="up">角色出场</v-tab>
        <v-tab value="team">队伍出场</v-tab>
        <v-tab value="hold">角色持有</v-tab>
      </v-tabs>
      <v-btn variant="outlined" class="hta-btn" @click="shareWiki">
        <v-icon>mdi-share-variant</v-icon>
        <span>分享</span>
      </v-btn>
      <div class="hta-title">
        <span>胡桃数据库</span>
        <span @click="showDialog = true">更新于 {{ getUpdated() }}</span>
      </div>
    </div>
    <v-window v-model="tab" class="hta-tab-item">
      <v-window-item value="use">
        <HtaTabUse v-if="avatarUse.length > 0" v-model="avatarUse" />
      </v-window-item>
      <v-window-item value="up">
        <HtaTabUp v-if="avatarUp.length > 0" v-model="avatarUp" />
      </v-window-item>
      <v-window-item value="team">
        <HtaTabTeam v-model="teamCombination" />
      </v-window-item>
      <v-window-item value="hold">
        <HtaTabHold v-model="avatarHold" />
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
import { generateShareImg } from "../../utils/TGShare";

// loading
const loading = ref<boolean>(false);
const loadingTitle = ref<string>("");
const loadingSub = ref<string>();

// overview overlay
const showDialog = ref<boolean>(false);

// data
const overview = ref<TGApp.Plugins.Hutao.Abyss.OverviewData>(
  <TGApp.Plugins.Hutao.Abyss.OverviewData>{},
);
const tab = ref<string>("use");
const avatarUse = ref<TGApp.Plugins.Hutao.Abyss.AvatarUse[]>([]);
const avatarUp = ref<TGApp.Plugins.Hutao.Abyss.AvatarUp[]>([]);
const teamCombination = ref<TGApp.Plugins.Hutao.Abyss.TeamCombination[]>([]);
const avatarHold = ref<TGApp.Plugins.Hutao.Abyss.AvatarHold[]>([]);

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
  loading.value = false;
});

function getUpdated(): string {
  return new Date(overview.value.Timestamp)
    .toLocaleString("zh-CN", { hour12: false })
    .replace(/\//g, "-");
}

function getShareTitle(): string {
  switch (tab.value) {
    case "use":
      return `【胡桃】${overview.value.ScheduleId}-角色使用`;
    case "up":
      return `【胡桃】${overview.value.ScheduleId}-角色出场`;
    case "team":
      return `【胡桃】${overview.value.ScheduleId}-队伍出场`;
    case "hold":
      return `【胡桃】${overview.value.ScheduleId}-角色持有`;
  }
  return `【胡桃】${overview.value.ScheduleId}-深渊数据`;
}

async function shareWiki(): Promise<void> {
  const div = <HTMLDivElement>document.querySelector(".hta-tab-item");
  const title = getShareTitle();
  loadingTitle.value = "正在生成分享图";
  loadingSub.value = `${title}.png`;
  loading.value = true;
  await generateShareImg(title, div);
  loadingSub.value = "";
  loading.value = false;
}
</script>
<style lang="css" scoped>
.hta-box {
  overflow: auto;
  width: 100%;
  max-height: calc(100vh - 30px);
  box-sizing: border-box;
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 0 10px var(--common-shadow-4);
}

.hta-top {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  color: var(--common-text-title);
  column-gap: 10px;
  font-family: var(--font-title);
}

.hta-tab {
  height: 50px;
  margin-bottom: 10px;
}

.hta-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  column-gap: 10px;
  font-size: 20px;
}

.hta-title :nth-child(2) {
  font-family: var(--font-text);
}

.hta-title :nth-child(2):hover {
  cursor: pointer;
  text-decoration: underline;
}

.hta-tab-item {
  width: 100%;
  height: calc(100% - 60px);
}
</style>
