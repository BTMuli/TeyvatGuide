/**
 * @file types/App/Device.d.ts
 * @description App 设备信息类型定义文件
 * @since Beta v0.4.1
 */

/**
 * @description App 设备信息类型 namespace
 * @since Beta v0.4.1
 * @namespace TGApp.App.Device
 * @memberof TGApp.App
 */
declare namespace TGApp.App.Device {
  /**
   * @description 设备信息
   * @since Beta v0.4.1
   * @interface DeviceInfo
   * @property {string} device_id - 设备 ID
   * @property {string} product - 产品
   * @property {string} device_name - 设备名称
   * @property {string} seed_id - 种子 ID
   * @property {string} seed_time - 种子时间
   * @property {string} device_fp - 设备指纹
   * @return DeviceInfo
   */
  interface DeviceInfo {
    device_id: string;
    product: string;
    device_name: string;
    seed_id: string;
    seed_time: string;
    device_fp: string;
  }
}
