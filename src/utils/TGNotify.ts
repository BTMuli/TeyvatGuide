/**
 * 系统通知简单封装
 * @since Beta v.0.9.1
 */
import showSnackbar from "@comp/func/snackbar.js";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

/**
 * 展示通知
 * @param title - 标题
 * @param text - 内容
 */
async function showNormalNotify(title: string, text: string): Promise<void> {
  const check = await isPermissionGranted();
  if (!check) {
    const permission = await requestPermission();
    if (permission !== "granted") {
      showSnackbar.warn("Notify permission is not allowed!");
      return;
    }
  }
  sendNotification({ title: title, body: text });
}

const TGNotify = {
  normal: showNormalNotify,
};

export default TGNotify;
