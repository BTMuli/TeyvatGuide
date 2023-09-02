<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <div class="gacha-top-bar">
    <div class="gacha-top-title">祈愿记录</div>
    <v-select v-model="uidCur" class="gacha-top-select" :items="selectItem" variant="outlined" />
    <div class="gacha-top-btns">
      <v-btn prepend-icon="mdi-import" class="gacha-top-btn" @click="handleImportBtn()">
        导入
      </v-btn>
      <v-btn prepend-icon="mdi-export" class="gacha-top-btn" @click="handleExportBtn"> 导出</v-btn>
    </div>
  </div>
  <div class="gacha-container">
    <v-tabs v-model="tab" align-tabs="start" class="gacha-tab" direction="vertical">
      <v-tab value="echarts">图表概览</v-tab>
      <v-tab value="overview">数据概览</v-tab>
      <div class="gacha-tab-bottom">
        <v-btn class="gacha-tab-btn" @click="backupGacha">
          <v-icon>mdi-cloud-download</v-icon>
          <span>备份</span>
        </v-btn>
        <v-btn class="gacha-tab-btn" @click="deleteGacha">
          <v-icon>mdi-delete</v-icon>
          <span>删除</span>
        </v-btn>
        <v-btn class="gacha-tab-btn" @click="restoreGacha">
          <v-icon>mdi-cloud-upload</v-icon>
          <span>恢复</span>
        </v-btn>
      </div>
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
import { dialog, path } from "@tauri-apps/api";
// utils
import { backupUigfData, exportUigfData, readUigfData, verifyUigfData } from "../../utils/UIGF";
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
async function handleImportBtn(savePath?: string): Promise<void> {
  let selectedFile;
  if (savePath) {
    selectedFile = await dialog.open({
      multiple: false,
      filters: [
        {
          name: "UIGF",
          extensions: ["json"],
        },
      ],
      defaultPath: savePath,
    });
  } else {
    selectedFile = await dialog.open({
      multiple: false,
      filters: [
        {
          name: "UIGF",
          extensions: ["json"],
        },
      ],
    });
  }
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
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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

// 恢复UID祈愿数据，相当于导入祈愿数据，不过目录固定
async function restoreGacha(): Promise<void> {
  const backupPath = `${await path.appLocalDataDir()}userData`;
  await handleImportBtn(backupPath);
}

// 备份当前 UID 的祈愿数据
async function backupGacha(): Promise<void> {
  if (gachaListCur.value.length === 0) {
    showSnackbar({
      color: "error",
      text: `暂无祈愿数据`,
    });
    return;
  }
  const res = await showConfirm({
    title: `是否备份祈愿数据？`,
    text: `UID：${uidCur.value}，共 ${gachaListCur.value.length} 条数据`,
  });
  if (!res) {
    showSnackbar({
      color: "grey",
      text: `已取消祈愿数据备份`,
    });
    return;
  }
  loadingTitle.value = "正在备份祈愿数据";
  loading.value = true;
  await backupUigfData(uidCur.value, gachaListCur.value);
  loading.value = false;
  showSnackbar({
    text: `已成功备份 ${uidCur.value} 的祈愿数据`,
  });
}

// 删除当前 UID 的祈愿数据
async function deleteGacha(): Promise<void> {
  if (gachaListCur.value.length === 0) {
    showSnackbar({
      color: "error",
      text: `暂无祈愿数据`,
    });
    return;
  }
  const firstConfirm = await showConfirm({
    title: `是否删除祈愿数据？`,
    text: `UID：${uidCur.value}，共 ${gachaListCur.value.length} 条数据`,
  });
  if (!firstConfirm) {
    showSnackbar({
      color: "grey",
      text: `已取消祈愿数据删除`,
    });
    return;
  }
  const uidList = await TGSqlite.getUidList();
  let secondConfirm: string | boolean = "";
  if (uidList.length <= 1) {
    secondConfirm = await showConfirm({
      title: "删除后数据库将为空，确定删除？",
      text: `UID：${uidCur.value}，共 ${gachaListCur.value.length} 条数据`,
    });
  }
  if (secondConfirm === false) {
    showSnackbar({
      color: "grey",
      text: `已取消祈愿数据删除`,
    });
    return;
  }
  loadingTitle.value = `正在删除${uidCur.value}的祈愿数据`;
  loading.value = true;
  await TGSqlite.deleteGachaRecords(uidCur.value);
  loading.value = false;
  showSnackbar({
    text: `已成功删除 ${uidCur.value} 的祈愿数据`,
  });
  setTimeout(() => {
    window.location.reload();
  }, 1000);
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
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 10px;
  background: var(--box-bg-1);
  column-gap: 50px;
  font-family: var(--font-title);
  font-size: 20px;
}

.gacha-top-title {
  color: var(--common-text-title);
}

.gacha-top-select {
  height: 60px;
}

.gacha-top-btns {
  display: flex;
  column-gap: 10px;
}

.gacha-top-btn {
  border-radius: 5px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.gacha-container {
  display: flex;
  height: calc(100vh - 130px);
  align-items: center;
  justify-content: left;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-1);
}

.gacha-tab {
  width: 100px;
  height: 100%;
  color: var(--box-text-4);
  font-family: var(--font-title);
}

.gacha-tab-bottom {
  position: absolute;
  bottom: 0;
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
}

.gacha-tab-btn {
  border-radius: 5px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.gacha-window {
  width: 100%;
  height: 100%;
  padding: 10px;
}

.gacha-window-item {
  height: 100%;
  border-radius: 5px;
  overflow-y: auto;
}
</style>
