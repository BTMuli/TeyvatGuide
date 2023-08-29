<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <h1>祈愿数据获取、展示、统计</h1>
  <v-btn @click="handleImportBtn">导入</v-btn>
  <v-btn @click="handleExportBtn">导出</v-btn>
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import showSnackbar from "../../components/func/snackbar";
import showConfirm from "../../components/func/confirm";
import ToLoading from "../../components/overlay/to-loading.vue";
// tauri
import { dialog } from "@tauri-apps/api";
// store
import { useUserStore } from "../../store/modules/user";
// utils
import { exportUigfData, readUigfData, verifyUigfData } from "../../utils/UIGF";
import TGSqlite from "../../plugins/Sqlite";

// store
const userStore = useUserStore();

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>();

// data
const user = userStore.getCurAccount();

onMounted(() => {
  loading.value = false;
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
    if (remoteData.info.uid !== user.gameUid) {
      await showConfirm({
        title: "UID 不匹配，是否继续导入？",
        text: `当前 UID：${user.gameUid}，导入 UID：${remoteData.info.uid}`,
      });
    } else {
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
      await importRemoteData(remoteData);
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

// 导入
async function importRemoteData(data: TGApp.Plugins.UIGF.FullData): Promise<void> {
  if (data.list.length === 0) {
    showSnackbar({
      color: "error",
      text: `导入的祈愿数据为空`,
    });
    return;
  }
  await TGSqlite.mergeUIGF(user.gameUid, data.list);
}

// 导出按钮点击事件
async function handleExportBtn(): Promise<void> {
  const gachaList = await TGSqlite.getGachaRecords(user.gameUid);
  if (gachaList.length === 0) {
    showSnackbar({
      color: "error",
      text: `用户 ${user.gameUid} 暂无祈愿数据`,
    });
    return;
  }
  const res = await showConfirm({
    title: `是否导出祈愿数据？`,
    text: `UID：${user.gameUid}，共 ${gachaList.length} 条数据`,
  });
  if (!res) {
    showSnackbar({
      color: "grey",
      text: `已取消祈愿数据导出`,
    });
    return;
  }
  const file = await dialog.save({
    defaultPath: `UIGF_${user.gameUid}.json`,
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
  await exportUigfData(user.gameUid, gachaList);
  loading.value = false;
  showSnackbar({
    text: `祈愿数据已成功导出`,
  });
}
</script>
