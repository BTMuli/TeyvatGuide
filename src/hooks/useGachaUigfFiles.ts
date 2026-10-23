/**
 * 祈愿记录页的 UIGF 导入导出与数据维护。
 * @since Beta v0.13.0
 */

import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TSUserGacha from "@Sqlm/userGacha.js";
import { path } from "@tauri-apps/api";
import { open, save } from "@tauri-apps/plugin-dialog";
import { maskUid, maskUidName, maskUidTail } from "@utils/display/TGUid.js";
import { exportUigfData } from "@utils/gacha/UIGF.js";
import TGLogger from "@utils/system/TGLogger.js";
import { ref } from "vue";
import type { Ref } from "vue";

import { AppCalendarData } from "@/data/index.js";

/** UIGF 文件域依赖的共享状态与跨域回调。 */
type GachaUigfFilesDeps = {
  /** 当前选中的祈愿 UID */
  uidCur: Ref<string | undefined>;
  /** 当前 UID 的祈愿记录 */
  gachaListCur: Ref<Array<TGApp.Sqlite.Gacha.Gacha>>;
  /** Yatta 元数据缓存 */
  yattaData: Ref<Array<TGApp.Plugins.Yatta.ConvertData>>;
  /** 拉取 Yatta 元数据 */
  loadYatta: () => Promise<void>;
  /** 重新汇总 UID 列表并复位选中 UID */
  reloadUid: (uid?: string) => Promise<void>;
  /** 载入当前 UID 的祈愿记录 */
  loadGachaList: () => Promise<void>;
};

/**
 * 创建 UIGF 导入导出与祈愿数据维护。
 * @since Beta v0.13.0
 * @param deps - 共享状态依赖与跨域回调
 * @returns UID 浮层状态与导入导出/删除/检测入口
 */
export function useGachaUigfFiles(deps: GachaUigfFilesDeps) {
  const { uidCur, gachaListCur, yattaData, loadYatta, reloadUid, loadGachaList } = deps;

  const ovMode = ref<"export" | "import">("import");
  const ovShow = ref<boolean>(false);
  const ovFpi = ref<string>();
  const ovFpe = ref<string>();

  /**
   * 导入 UIGF 文件。
   * @since Beta v0.13.0
   */
  async function importUigf(): Promise<void> {
    await TGLogger.Info(`[UserGacha][handleImportBtn] 导入祈愿数据`);
    const selectedFile = await open({
      multiple: false,
      title: "导入UIGF文件",
      filters: [{ name: "UIGF JSON", extensions: ["json"] }],
      defaultPath: await path.downloadDir(),
      directory: false,
    });
    if (selectedFile === null) {
      showSnackbar.cancel("已取消文件选择");
      return;
    }
    ovFpi.value = selectedFile;
    ovMode.value = "import";
    ovShow.value = true;
  }

  /**
   * 导出当前UID的祈愿数据。
   * @since Beta v0.13.0
   */
  async function exportUigf(): Promise<void> {
    if (!uidCur.value) return;
    await TGLogger.Info(`[UserGacha][${uidCur.value}][exportUigf] 导出祈愿数据`);
    const gachaList = await TSUserGacha.record.all(uidCur.value);
    if (gachaList.length === 0) {
      showSnackbar.error(`UID ${maskUid(uidCur.value)} 暂无祈愿数据`);
      return;
    }
    const file = await save({
      title: "导出祈愿数据",
      filters: [{ name: "UIGF JSON", extensions: ["json"] }],
      defaultPath: `${await path.downloadDir()}${path.sep()}UIGF_${maskUidName(uidCur.value)}.json`,
    });
    if (!file) {
      showSnackbar.cancel("已取消文件保存");
      return;
    }
    await TGLogger.Info(
      `[UserGacha][${uidCur.value}][exportUigf] 导出${gachaList.length} 条祈愿数据到 ${file}`,
    );
    await showLoading.start("正在导出祈愿数据", `UID:${maskUid(uidCur.value)}`);
    await exportUigfData(uidCur.value, gachaList, file);
    await showLoading.end();
    showSnackbar.success(`成功导出 ${maskUid(uidCur.value)} 的祈愿数据`);
    await TGLogger.Info(`[UserGacha][${uidCur.value}][exportUigf] 导出祈愿数据完成`);
  }

  /**
   * 导出 UIGF v4 版本的祈愿数据。
   * @since Beta v0.13.0
   */
  async function exportUigf4(): Promise<void> {
    if (!uidCur.value) {
      showSnackbar.error("未获取到 UID");
      return;
    }
    const tsNow = Math.floor(Date.now() / 1000);
    const file = await save({
      title: "导出祈愿数据",
      filters: [{ name: "UIGF JSON", extensions: ["json"] }],
      defaultPath: `${await path.downloadDir()}${path.sep()}UIGFv4.2_${tsNow}.json`,
    });
    if (!file) {
      showSnackbar.cancel("已取消文件保存");
      return;
    }
    await TGLogger.Info(`[UserGacha][${uidCur.value}][exportUigf4] 导出祈愿数据(v4)`);
    ovFpe.value = file;
    ovMode.value = "export";
    ovShow.value = true;
  }

  /**
   * 删除当前 UID 的祈愿数据。
   * @since Beta v0.13.0
   */
  async function deleteGacha(): Promise<void> {
    if (gachaListCur.value.length === 0 || !uidCur.value) {
      showSnackbar.error("暂无祈愿数据");
      return;
    }
    await TGLogger.Info(`[UserGacha][${uidCur.value}][deleteGacha] 删除祈愿数据`);
    const delCheck = await showDialog.check(
      "确定删除祈愿数据？",
      `UID：${maskUidTail(uidCur.value)}，共 ${gachaListCur.value.length} 条数据`,
    );
    if (!delCheck) {
      showSnackbar.cancel("已取消祈愿数据删除");
      await TGLogger.Info(`[UserGacha][${uidCur.value}][deleteGacha] 已取消祈愿数据删除`);
      return;
    }
    const uidList = await TSUserGacha.getUidList();
    if (uidList.length <= 1) {
      const forceCheck = await showDialog.check("删除后数据库将为空，确定删除？");
      if (!forceCheck) {
        showSnackbar.cancel("已取消祈愿数据删除");
        return;
      }
    }
    await showLoading.start("正在删除祈愿数据", `UID:${maskUid(uidCur.value)}`);
    const label = `已成功删除 ${maskUid(uidCur.value)} 的祈愿数据，即将刷新页面`;
    await TSUserGacha.deleteGachaRecords(uidCur.value);
    await reloadUid();
    await loadGachaList();
    await showLoading.end();
    showSnackbar.success(label);
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    window.location.reload();
  }

  /**
   * 检测并补充遗漏的 itemId。
   * @since Beta v0.13.0
   */
  async function checkData(): Promise<void> {
    let cnt = 0;
    let fail = 0;
    await showLoading.start(
      "正在检测数据",
      `UID:${maskUid(uidCur.value)}，共${gachaListCur.value.length}条祈愿数据`,
    );
    for (const data of gachaListCur.value) {
      if (data.itemId === "") {
        // TODO: 如果有名字重复的需要注意
        const find = AppCalendarData.find((i) => i.name === data.name);
        if (find) {
          await showLoading.update(`${data.name} -> ${find.id}`);
          await TSUserGacha.update.itemId(data, find.id.toString());
          cnt++;
          continue;
        }
        if (yattaData.value.length === 0) {
          await showLoading.update(`尝试获取 Yatta 数据`);
          await loadYatta();
        }
        // TODO: 如果有名字重复的需要注意
        const find2 = yattaData.value.find((i) => i.name === data.name);
        if (find2) {
          await showLoading.update(`${data.name} -> ${find2.id}`);
          await TSUserGacha.update.itemId(data, find2.id);
          cnt++;
          continue;
        }
        await showLoading.update(`[${data.id}]${data.type}-${data.name}未找到ID`);
        await TGLogger.Warn(`[${data.id}]${data.type}-${data.name}未找到ID`);
        fail++;
      }
    }
    await showLoading.end();
    if (cnt > 0 || fail > 0) {
      showSnackbar.success(`成功补充遗漏数据${cnt}条，失败${fail}条，即将刷新`);
      await new Promise<void>((resolve) => setTimeout(resolve, 1500));
      window.location.reload();
    } else {
      showSnackbar.success(`成功检测${gachaListCur.value.length}条数据，无需更新`);
    }
  }

  return {
    ovMode,
    ovShow,
    ovFpi,
    ovFpe,
    importUigf,
    exportUigf,
    exportUigf4,
    deleteGacha,
    checkData,
  };
}
