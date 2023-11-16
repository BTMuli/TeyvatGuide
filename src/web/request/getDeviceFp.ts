/**
 * @file src/web/request/getDeviceFp.ts
 * @description 获取设备指纹
 * @since Beta v0.3.6
 */

import { http } from "@tauri-apps/api";

import { getInitDeviceInfo } from "../../utils/toolFunc";
import TGConstant from "../constant/TGConstant";

/**
 * @description 获取设备指纹
 * @since Beta v0.3.6
 * @param {TGApp.App.Device.DeviceInfo} Info - 设备信息
 * @returns {Promise<string>} 设备指纹
 */
export async function getDeviceFp(
  Info?: TGApp.App.Device.DeviceInfo,
): Promise<TGApp.App.Device.DeviceInfo> {
  const info = Info ?? getInitDeviceInfo();
  const deviceFPHeader = {
    cpuType: "arm64-v8a",
    romCapacity: "512",
    productName: info.model,
    romRemain: "256",
    manufacturer: "Xiaomi",
    appMemory: "512",
    hostname: "dg02-pool03-kvm87",
    screenSize: "1080x1920",
    osVersion: "13",
    aaid: "",
    vendor: "中国移动",
    accelerometer: "true",
    buildTags: "release-keys",
    model: info.model,
    brand: "Xiaomi",
    oaid: "",
    hardware: "qcom",
    deviceType: "OP5913L1",
    devId: "unknown",
    serialNumber: "unknown",
    buildTime: "1588876800000", // 2020-05-08
    buildUser: "root",
    ramCapacity: "2048",
    magnetometer: "true",
    display: `OP5913L1-user ${info.model} 10 QKQ1.190825.002 V12.0.1.0.QFJCNXM release-keys`,
    ramRemain: "1024",
    deviceInfo: "unknown",
    gyroscope: "true",
    vaid: "",
    buildType: "user",
    sdkVersion: "29",
    board: "sdm660",
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
  info.device_fp = await http
    .fetch<TGApp.BBS.Response.getDeviceFp>(url, {
      method: "POST",
      body: http.Body.json(data),
      headers: header,
    })
    .then((res) => {
      if (res.data.data.code === 200) return res.data.data.device_fp;
      return "0000000000000";
    });
  return info;
}
