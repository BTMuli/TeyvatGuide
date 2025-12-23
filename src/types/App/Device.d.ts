/**
 * App 设备信息类型定义文件
 * @since Beta v0.4.1
 */

declare namespace TGApp.App.Device {
  /**
   * 设备信息
   * @since Beta v0.4.1
   */
  type DeviceInfo = {
    /** 设备ID */
    device_id: string;
    /** 产品 */
    product: string;
    /** 设备名称 */
    device_name: string;
    /** 做种ID */
    seed_id: string;
    /** 做种时间 */
    seed_time: string;
    /** 设备指纹 */
    device_fp: string;
  };

  /**
   * 设备信息Key
   * @since Beta v0.9.1
   */
  type DeviceInfoKey = keyof DeviceInfo;
}
