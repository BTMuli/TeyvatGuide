<template>
  <TOverlay v-model="visible" blur-val="5px">
    <div class="ugo-box">
      <div class="ugo-top">
        <div class="ugo-title">{{ title }}</div>
        <div class="ugo-fp" title="点击选择文件路径" @click="selectFile()">文件路径:{{ fp }}</div>
      </div>
      <div class="ugo-header" v-if="props.mode === 'import' && dataRaw">
        <div class="ugo-header-item">
          <div>应用信息：</div>
          <div>{{ dataRaw.info.export_app }} {{ dataRaw.info.export_app_version }}</div>
        </div>
        <div class="ugo-header-item">
          <div>文件UIGF版本：</div>
          <div>{{ dataRaw.info.version }}</div>
        </div>
        <div class="ugo-header-item">
          <div>导出时间：</div>
          <div>{{ timestampToDate(Number(dataRaw.info.export_timestamp) * 1000) }}</div>
        </div>
      </div>
      <v-item-group multiple v-model="selectedData" class="ugo-content">
        <v-item
          v-for="(item, index) in data"
          :key="index"
          v-slot="{ isSelected, toggle }"
          :value="item"
        >
          <div class="ugo-item" @click="toggle">
            <div class="ugo-item-left">
              <div class="ugo-item-title">{{ item.uid }} - {{ item.length }}条记录</div>
              <div class="ugo-item-sub">{{ item.time }}</div>
            </div>
            <div class="ugo-item-right">
              <v-btn :class="{ active: isSelected }" class="ugo-item-btn">
                <v-icon>{{ isSelected ? "mdi-check" : "mdi-checkbox-blank-outline" }}</v-icon>
              </v-btn>
            </div>
          </div>
        </v-item>
      </v-item-group>
      <div class="ugo-bottom">
        <v-btn class="ugo-item-btn" @click="visible = false" :rounded="true">取消</v-btn>
        <v-btn class="ugo-item-btn" @click="handleSelected()" :rounded="true">确定</v-btn>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TSUserGacha from "@Sqlm/userGacha.js";
import { path } from "@tauri-apps/api";
import { open } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import TGLogger from "@utils/TGLogger.js";
import { timestampToDate } from "@utils/toolFunc.js";
import { getUigf4Header, getUigf4Item, readUigf4Data, verifyUigfData } from "@utils/UIGF.js";
import { computed, onMounted, ref, shallowRef, watch } from "vue";

type UgoUidProps = { mode: "import" | "export" };
type UgoUidItem = { uid: string; length: number; time: string };

const props = defineProps<UgoUidProps>();
const visible = defineModel<boolean>();
const fp = ref<string>("未选择");
const dataRaw = shallowRef<TGApp.Plugins.UIGF.Schema4>();
const data = shallowRef<Array<UgoUidItem>>([]);
const selectedData = shallowRef<Array<UgoUidItem>>([]);
const title = computed<string>(() => (props.mode === "import" ? "导入" : "导出"));

onMounted(async () => {
  if (props.mode === "export") fp.value = await getDefaultSavePath();
});

watch(
  () => visible.value,
  async () => {
    if (visible.value) await refreshData();
  },
);

async function getDefaultSavePath(): Promise<string> {
  const tsNow = new Date().getTime();
  return `${await path.downloadDir()}${path.sep()}UIGFv4.1_${tsNow}.json`;
}

async function refreshData(): Promise<void> {
  selectedData.value = [];
  data.value = [];
  dataRaw.value = undefined;
  if (props.mode === "import") {
    fp.value = "未选择";
    await handleImportData();
  } else {
    fp.value = await getDefaultSavePath();
    await handleExportData();
  }
}

async function selectFile(): Promise<void> {
  const defaultPath =
    props.mode === "import" ? await getDefaultSavePath() : await path.downloadDir();
  const file = await open({
    multiple: false,
    title: "选择文件",
    filters: [{ name: "UIGF JSON", extensions: ["json"] }],
    defaultPath,
    directory: false,
  });
  if (file === null) {
    showSnackbar.cancel("已取消文件选择");
    return;
  }
  fp.value = file;
  if (props.mode === "import") await handleImportData();
}

async function handleImportData(): Promise<void> {
  if (fp.value === "未选择") return;
  try {
    await showLoading.start("正在导入数据...", "正在验证数据...");
    const check = await verifyUigfData(fp.value, true);
    if (!check) {
      await showLoading.end();
      return;
    }
    await showLoading.update("数据验证成功，正在读取数据...");
    const uigfData = await readUigf4Data(fp.value);
    dataRaw.value = uigfData;
    data.value = uigfData.hk4e.map(parseData);
    await showLoading.end();
  } catch (e) {
    if (e instanceof Error) {
      showSnackbar.error(`[${e.name}] ${e.message}`);
      await TGLogger.Error(`[UgoUid][handleImportData] ${e.name} ${e.message}`);
    } else {
      showSnackbar.error(`[${e}]`);
      await TGLogger.Error(`[UgoUid][handleImportData] ${e}`);
    }
  }
}

function parseData(data: TGApp.Plugins.UIGF.GachaHk4e): UgoUidItem {
  const timeList = data.list.map((item) => new Date(item.time).getTime());
  return {
    uid: data.uid.toString(),
    length: data.list.length,
    time: `${timestampToDate(Math.min(...timeList))} ~ ${timestampToDate(Math.max(...timeList))}`,
  };
}

async function handleExportData(): Promise<void> {
  const uidList = await TSUserGacha.getUidList();
  const tmpData: Array<UgoUidItem> = [];
  for (const uid of uidList) {
    const dataRaw = await TSUserGacha.getGachaRecords(uid);
    tmpData.push(parseDataRaw(dataRaw));
  }
  data.value = tmpData;
}

function parseDataRaw(data: TGApp.Sqlite.GachaRecords.TableGacha[]): UgoUidItem {
  const timeList = data.map((item) => new Date(item.time).getTime());
  return {
    uid: data[0].uid,
    length: data.length,
    time: `${timestampToDate(Math.min(...timeList))} ~ ${timestampToDate(Math.max(...timeList))}`,
  };
}

async function handleSelected(): Promise<void> {
  if (props.mode === "import") return await handleImport();
  return await handleExport();
}

async function handleImport(): Promise<void> {
  if (!dataRaw.value) {
    showSnackbar.error("未获取到数据!");
    fp.value = "未选择";
    return;
  }
  if (selectedData.value.length === 0) {
    showSnackbar.warn("请至少选择一个!");
    return;
  }
  await showLoading.start("正在导入数据...");
  for (const item of selectedData.value) {
    await showLoading.update(`正在导入UID: ${item.uid}`);
    const dataFind = dataRaw.value.hk4e.find((i) => i.uid.toString() === item.uid);
    if (!dataFind) {
      showSnackbar.error(`未找到UID: ${item.uid}`);
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      continue;
    }
    await TSUserGacha.mergeUIGF4(dataFind);
  }
  await showLoading.end();
  showSnackbar.success("导入成功!");
}

async function handleExport(): Promise<void> {
  if (selectedData.value.length === 0) {
    showSnackbar.warn("请至少选择一个!");
    return;
  }
  await showLoading.start("正在导出数据...", "正在生成文件头");
  const header = await getUigf4Header();
  const data: TGApp.Plugins.UIGF.GachaHk4e[] = [];
  for (const item of selectedData.value) {
    await showLoading.update(`正在导出UID: ${item.uid}`);
    const dataItem = await getUigf4Item(item.uid);
    data.push(dataItem);
  }
  await showLoading.update("正在写入文件...");
  await writeTextFile(fp.value, JSON.stringify({ info: header, hk4e: data }));
  await showLoading.end();
  showSnackbar.success(`导出成功! 文件路径: ${fp.value}`);
  fp.value = await getDefaultSavePath();
}
</script>
<style lang="css" scoped>
.ugo-box {
  position: relative;
  width: 600px;
  padding: 10px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 10px;
  background: var(--app-page-bg);
}

.ugo-top {
  position: relative;
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  column-gap: 10px;
}

.ugo-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.ugo-fp {
  color: var(--tgc-od-white);
  cursor: pointer;
  font-size: 12px;
  word-break: break-all;
}

.ugo-header {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.ugo-header-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  font-size: 16px;
  gap: 5px;

  :first-child {
    color: var(--box-text-7);
    font-family: var(--font-title);
  }

  :last-child {
    color: var(--box-text-5);
  }
}

.ugo-content {
  position: relative;
  display: flex;
  width: 100%;
  max-height: 300px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  margin-top: 10px;
  margin-bottom: 10px;
  gap: 10px;
  overflow-y: auto;
}

.ugo-item {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  cursor: pointer;
}

.ugo-item-title {
  font-family: var(--font-title);
  font-size: 16px;
}

.ugo-item-sub {
  font-size: 12px;
}

.ugo-item-btn {
  height: 40px;
  border: 1px solid var(--common-shadow-2);
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);

  &.active {
    color: var(--tgc-od-green);
  }
}

.ugo-bottom {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}
</style>
