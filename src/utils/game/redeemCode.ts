/**
 * 原神兑换码解析与批量执行
 * @since Beta v0.13.0
 */
let busy = false;

/**
 * 判断兑换码是否由 1 至 128 个允许的 Unicode 字符组成
 * @since Beta v0.13.0
 * @param code - 单个兑换码
 * @returns 是否符合接口输入格式
 */
export function isValidRedeemCode(code: string): boolean {
  const characters = Array.from(code);
  return (
    characters.length > 0 &&
    characters.length <= 128 &&
    characters.every((character) => /^[\p{L}\p{N}_-]$/u.test(character))
  );
}

/**
 * 解析逗号或空白分隔的兑换码并按首次出现顺序去重
 * @since Beta v0.13.0
 * @param input - 用户输入
 * @returns 规范化后的兑换码
 */
export function parseRedeemCodes(input: string): Array<string> {
  return [
    ...new Set(
      input
        .toUpperCase()
        .split(/[,，\s]+/u)
        .filter(Boolean),
    ),
  ];
}

/**
 * 执行单码兑换，将异常转换为不含外部文本的未知结果
 * @since Beta v0.13.0
 * @param code - 兑换码
 * @param redeem - 单码兑换请求
 * @returns 安全的处理结果
 */
async function redeemOne(
  code: string,
  redeem: (code: string) => Promise<Pick<TGApp.BBS.Response.Base, "retcode" | "message">>,
): Promise<TGApp.Game.Redeem.Result> {
  try {
    const response = await redeem(code);
    if (!Number.isInteger(response.retcode)) throw new Error("兑换响应无效");
    return { code, ...response };
  } catch {
    return { code, retcode: -1, message: "兑换结果未知，请先检查游戏邮件后再重试" };
  }
}

/**
 * 串行兑换；发生登录、冷却或结果未知错误时停止，且不自动重试
 * @since Beta v0.13.0
 * @param codes - 待兑换的兑换码
 * @param redeem - 单码兑换请求，应在发送前检查当前账号
 * @param onResult - 每个兑换码处理完毕后的通知
 * @returns 按输入顺序排列的兑换结果；-1 表示结果未知，-2 表示未发送
 */
export async function redeemCodes(
  codes: Array<string>,
  redeem: (code: string) => Promise<Pick<TGApp.BBS.Response.Base, "retcode" | "message">>,
  onResult?: (result: TGApp.Game.Redeem.Result) => void,
): Promise<Array<TGApp.Game.Redeem.Result>> {
  const unique = parseRedeemCodes(codes.join(" "));
  if (!unique.length || unique.length > 20 || !unique.every(isValidRedeemCode)) {
    throw new Error("兑换码列表为空、格式错误或超过 20 个");
  }
  if (busy) throw new Error("已有兑换任务正在进行，请等待完成");
  busy = true;
  const results: Array<TGApp.Game.Redeem.Result> = [];
  let stopped = false;
  try {
    for (const code of unique) {
      let result: TGApp.Game.Redeem.Result;
      if (stopped) {
        result = { code, retcode: -2, message: "未兑换，前序请求异常" };
      } else {
        if (results.length) await new Promise<void>((resolve) => setTimeout(resolve, 5500));
        result = await redeemOne(code, redeem);
        stopped = [-1, -2, -1071, -1033, -1035, -2016].includes(result.retcode);
      }
      results.push(result);
      onResult?.(result);
    }
    return results;
  } finally {
    busy = false;
  }
}
