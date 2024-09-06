/**
 * @file src/web/request/getDeviceFp.ts
 * @description 获取设备指纹
 * @since Beta v0.5.5
 */

import TGHttp from "../../utils/TGHttp.js";
import TGLogger from "../../utils/TGLogger.js";
import { getInitDeviceInfo } from "../../utils/toolFunc.js";
import TGConstant from "../constant/TGConstant.js";

/**
 * @description 获取设备指纹
 * @since Beta v0.5.5
 * @param {TGApp.App.Device.DeviceInfo} Info - 设备信息
 * @returns {Promise<TGApp.App.Device.DeviceInfo>} 设备指纹
 */
export async function getDeviceFp(
  Info?: TGApp.App.Device.DeviceInfo,
): Promise<TGApp.App.Device.DeviceInfo> {
  const info = Info ?? getInitDeviceInfo();
  const deviceFPHeader = {
    proxyStatus: 0,
    isRoot: 0,
    romCapacity: "512",
    deviceName: info.device_name,
    productName: info.product,
    romRemain: "512",
    hostname: "dg02-pool03-kvm87",
    screenSize: "1440x2905",
    isTablet: 0,
    aaid: "",
    model: info.device_name,
    brand: "Xiaomi",
    hardware: "qcom",
    deviceType: "OP5913L1",
    devId: "unknown",
    serialNumber: "unknown",
    sdCardCapacity: 512215,
    buildTime: "1693626947000",
    buildUser: "android-build",
    simState: "5",
    ramRemain: "239814",
    appUpdateTimeDiff: 1702604034882,
    deviceInfo: `XiaoMi ${info.device_name} OP5913L1:13 SKQ1.221119.001 T.118e6c7-5aa23-73911:user release-keys`,
    vaid: "",
    buildType: "user",
    sdkVersion: "34",
    ui_mode: "UI_MODE_TYPE_NORMAL",
    isMockLocation: 0,
    cpuType: "arm64-v8a",
    isAirMode: 0,
    ringMode: 2,
    chargeStatus: 1,
    manufacturer: "XiaoMi",
    emulatorStatus: 0,
    appMemory: "512",
    osVersion: "14",
    vendor: "unknown",
    accelerometer: "1.4883357x9.80665x-0.1963501", // 这边与 hutao 数据不一致
    sdRemain: 239600,
    buildTags: "release-keys",
    packageName: "com.mihoyo.hyperion",
    networkType: "WiFi",
    oaid: "",
    debugStatus: 1,
    ramCapacity: "469679",
    magnetometer: "20.081251x-27.457501x2.1937501",
    display: `${info.product}_13.1.0.181(CN01)`,
    appInstallTimeDiff: 1688455751496,
    packageVersion: "2.20.1",
    gyroscope: "0.030226856x-0.014647375x-0.0013732915", // 这边与 hutao 数据不一致
    batteryStatus: 100,
    hasKeyboard: 0,
    board: "taro",
  };
  const url = "https://public-data-api.mihoyo.com/device-fp/api/getFp";
  const data = {
    device_id: info.device_id,
    seed_id: info.seed_id,
    platform: "2",
    seed_time: info.seed_time,
    ext_fields: JSON.stringify(deviceFPHeader),
    app_name: "bbs_cn",
    bbs_device_id: info.device_id,
    device_fp: info.device_fp,
  };
  const header = {
    "User-Agent": `Mozilla/5.0 (Linux; Android 12) Mobile miHoYoBBS/${TGConstant.BBS.VERSION}`,
    "x-rpc-app_version": TGConstant.BBS.VERSION,
    "x-rpc-client_type": "5",
    "x-requested-with": "com.mihoyo.hyperion",
    Referer: "https://webstatic.mihoyo.com/",
  };
  try {
    const resp = await TGHttp<TGApp.BBS.Response.getDeviceFp>(url, {
      method: "POST",
      body: JSON.stringify(data),
      headers: header,
    });
    if (resp.retcode !== 0) {
      info.device_fp = "0000000000000";
    } else {
      info.device_fp = resp.data.device_fp;
    }
  } catch (error) {
    info.device_fp = "0000000000000";
    await TGLogger.Error(`获取设备指纹失败: ${error}`);
  }
  return info;
}
