/**
 * 账号认证相关方法
 * @since Beta v0.9.1
 */
import { commands } from "@skipperndt/plugin-machine-uid";
import { getVersion } from "@tauri-apps/api/app";

let DEVICE_ID: string | null = null;

/**
 * 获取请求头
 * @since Beta v0.9.1
 */
export async function getReqHeader(tk?: string): Promise<Record<string, string>> {
  const version = await getVersion();
  if (DEVICE_ID === null) {
    const deviceRes = await commands.getMachineUid();
    if (deviceRes.status === "ok") DEVICE_ID = deviceRes.data.id;
  }
  const device = DEVICE_ID ?? "";
  return {
    "Content-Type": "application/json",
    "x-hutao-device-id": device,
    Authorization: tk ? `Bearer ${tk}` : "",
    "User-Agent": `TeyvatGuide/${version}`,
  };
}
