/**
 * 账号认证相关方法
 * @since Beta v0.9.1
 */
import { commands } from "@skipperndt/plugin-machine-uid";
import { getVersion } from "@tauri-apps/api/app";
import { importPublicKey, sha1 } from "rsa-oaep-encryption";

let DEVICE_ID: string | null = null;
/** 加密公钥 */
const HUTAO_PUB_KEY: Readonly<string> = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5W2SEyZSlP2zBI1Sn8Gd
TwbZoXlUGNKyoVrY8SVYu9GMefdGZCrUQNkCG/Np8pWPmSSEFGd5oeug/oIMtCZQ
NOn0drlR+pul/XZ1KQhKmj/arWjN1XNok2qXF7uxhqD0JyNT/Fxy6QvzqIpBsM9S
7ajm8/BOGlPG1SInDPaqTdTRTT30AuN+IhWEEFwT3Ctv1SmDupHs2Oan5qM7Y3uw
b6K1rbnk5YokiV2FzHajGUymmSKXqtG1USZzwPqImpYb4Z0M/StPFWdsKqexBqMM
mkXckI5O98GdlszEmQ0Ejv5Fx9fR2rXRwM76S4iZTfabYpiMbb4bM42mHMauupj6
9QIDAQAB
-----END PUBLIC KEY-----`;
const encrypt = importPublicKey(HUTAO_PUB_KEY);

/**
 * rsa 加密
 * @since Beta v0.9.1
 * @param data - 待加密数据
 * @returns 加密后数据
 */
export function rsaEncrypt(data: string): string {
  const res = encrypt.encrypt(data, sha1.create());
  const bytes = new Uint8Array(res);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

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
