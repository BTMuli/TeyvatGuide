<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <v-app-bar class="gacha-top-bar">
    <template #prepend>
      <v-app-bar-title> 祈愿记录 </v-app-bar-title>
    </template>
    <template #default>
      <v-select
        v-model="uidCur"
        class="gacha-top-select"
        :items="selectItem"
        variant="underlined"
      />
      <v-spacer />
    </template>
    <template #append>
      <v-btn prepend-icon="mdi-import" class="gacha-top-btn" @click="handleImportBtn"> 导入</v-btn>
      <v-btn prepend-icon="mdi-export" class="gacha-top-btn" @click="handleExportBtn"> 导出</v-btn>
    </template>
  </v-app-bar>
  <div class="gacha-container">
    <v-tabs v-model="tab" align-tabs="start" class="gacha-tab" direction="vertical">
      <v-tab value="echarts">图表概览</v-tab>
      <v-tab value="overview">数据概览</v-tab>
    </v-tabs>
    <v-window v-model="tab" class="gacha-window">
      <v-window-item value="echarts" class="gacha-window-item">
        <gro-echarts v-model="gachaListCur" />
      </v-window-item>
      <v-window-item value="overview" class="gacha-window-item">
        <gro-overview v-model="gachaListCur" />
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref, watch } from "vue";
import showSnackbar from "../../components/func/snackbar";
import showConfirm from "../../components/func/confirm";
import ToLoading from "../../components/overlay/to-loading.vue";
import GroEcharts from "../../components/gachaRecord/gro-echarts.vue";
import GroOverview from "../../components/gachaRecord/gro-overview.vue";
// tauri
import { dialog } from "@tauri-apps/api";
// utils
import { exportUigfData, readUigfData, verifyUigfData } from "../../utils/UIGF";
import TGSqlite from "../../plugins/Sqlite";

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>();

// data
const selectItem = ref<string[]>([]);
const uidCur = ref<string>("");
const gachaListCur = ref<TGApp.Sqlite.GachaRecords.SingleTable[]>([]);
const tab = ref<string>("");

onMounted(async () => {
  loadingTitle.value = `正在获取祈愿 UID 列表`;
  selectItem.value = await TGSqlite.getUidList();
  if (selectItem.value.length === 0) {
    showSnackbar({
      color: "error",
      text: `暂无祈愿数据，请先导入祈愿数据`,
    });
    loading.value = false;
    return;
  }
  uidCur.value = selectItem.value[0];
  loadingTitle.value = `正在获取祈愿数据，默认 UID：${uidCur.value}`;
  gachaListCur.value = await TGSqlite.getGachaRecords(uidCur.value);
  loadingTitle.value = `正在渲染数据`;
  tab.value = "echarts";
  loading.value = false;
  showSnackbar({
    text: `成功获取 ${gachaListCur.value.length} 条祈愿数据`,
  });
});

// 导入按钮点击事件
async function handleImportBtn(): Promise<void> {
  const selectedFile = await dialog.open({
    multiple: false,
    filters: [
      {
        name: "UIGF",
        extensions: ["json"],
      },
    ],
  });
  if (selectedFile) {
    const check = await verifyUigfData(<string>selectedFile);
    if (!check) {
      showSnackbar({
        color: "error",
        text: `读取 UIGF 文件失败，请检查文件是否符合规范`,
      });
      return;
    }
    const remoteData = await readUigfData(<string>selectedFile);
    const res = await showConfirm({
      title: "是否导入祈愿数据？",
      text: `UID：${remoteData.info.uid} 共 ${remoteData.list.length} 条数据`,
    });
    if (!res) {
      showSnackbar({
        color: "grey",
        text: `已取消祈愿数据导入`,
      });
      return;
    }
    loadingTitle.value = "正在导入祈愿数据";
    loading.value = true;
    if (remoteData.list.length === 0) {
      loading.value = false;
      showSnackbar({
        color: "error",
        text: `导入的祈愿数据为空`,
      });
    } else {
      await TGSqlite.mergeUIGF(remoteData.info.uid, remoteData.list);
      loading.value = false;
      showSnackbar({
        text: `成功导入 ${remoteData.list.length} 条祈愿数据`,
      });
    }
  } else {
    showSnackbar({
      color: "grey",
      text: `已取消文件选择`,
    });
  }
}

// 导出按钮点击事件
async function handleExportBtn(): Promise<void> {
  const gachaList = await TGSqlite.getGachaRecords(uidCur.value);
  if (gachaList.length === 0) {
    showSnackbar({
      color: "error",
      text: `UID ${uidCur.value} 暂无祈愿数据`,
    });
    return;
  }
  const res = await showConfirm({
    title: `是否导出祈愿数据？`,
    text: `UID：${uidCur.value}，共 ${gachaList.length} 条数据`,
  });
  if (!res) {
    showSnackbar({
      color: "grey",
      text: `已取消祈愿数据导出`,
    });
    return;
  }
  const file = await dialog.save({
    defaultPath: `UIGF_${uidCur.value}.json`,
    filters: [
      {
        name: `UIGF`,
        extensions: ["json"],
      },
    ],
  });
  if (!file) {
    showSnackbar({
      color: "grey",
      text: `已取消文件保存`,
    });
    return;
  }
  loadingTitle.value = "正在导出祈愿数据";
  loading.value = true;
  await exportUigfData(uidCur.value, gachaList, file);
  loading.value = false;
  showSnackbar({
    text: `祈愿数据已成功导出`,
  });
}

// 监听 UID 变化
watch(uidCur, async (newUid) => {
  gachaListCur.value = await TGSqlite.getGachaRecords(newUid);
  showSnackbar({
    text: `成功获取 ${gachaListCur.value.length} 条祈愿数据`,
  });
});
</script>
<style lang="css" scoped>
.gacha-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgb(0 0 0/50%);
  color: #f4d8a8;
  font-family: var(--font-title);
}

.gacha-top-select {
  height: 60px;
  margin-left: 20px;
}

.gacha-top-btn {
  margin: 0 10px;
  background: #393b40;
  color: #faf7e8 !important;
}

.gacha-container {
  display: flex;
  height: calc(100vh - 100px);
  align-items: center;
  justify-content: left;
  border-radius: 5px;
  box-shadow: 0 0 10px 0 var(--common-shadow-4);
}

.gacha-tab {
  width: 100px;
  height: 100%;
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.gacha-window {
  width: 100%;
  height: 100%;
  padding: 10px;
}

.gacha-window-item {
  height: 100%;
  padding: 5px;
  border: 1px inset var(--common-shadow-8);
  border-radius: 5px;
  overflow-y: auto;
}
</style>
