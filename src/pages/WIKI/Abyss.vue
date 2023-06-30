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
      <v-window-item value="use"> 角色使用 </v-window-item>
      <v-window-item value="up"> 角色出场 </v-window-item>
      <v-window-item value="team"> 队伍出场 </v-window-item>
      <v-window-item value="hold"> 角色持有 </v-window-item>
    </v-window>
  </div>
  <HtaOverlayOverview v-model="showDialog" :data="overview" />
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import ToLoading from "../../components/overlay/to-loading.vue";
// utils
import Hutao from "../../plugins/Hutao";
import HtaOverlayOverview from "../../components/hutaoAbyss/hta-overlay-overview.vue";

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

onMounted(async () => {
  loadingTitle.value = "正在获取深渊数据";
  loading.value = true;
  overview.value = await Hutao.Abyss.getOverview();
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
