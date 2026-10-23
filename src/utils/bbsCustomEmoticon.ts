/**
 * 米游社自定义表情校验与列表转换
 * @since Beta v0.12.6
 */

type CustomEmoticonRecord = Record<string, unknown>;

/**
 * 判断值是否为普通对象
 * @since Beta v0.12.6
 * @param value - 待判断的值
 * @returns 是否为普通对象
 */
function isRecord(value: unknown): value is CustomEmoticonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 判断值是否为安全的 HTTPS 图片地址
 * @since Beta v0.12.6
 * @param value - 待判断的地址
 * @returns 是否为安全地址
 */
function isSafeImageUrl(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    value === "" ||
    Array.from(value).some((character) => character.charCodeAt(0) <= 32)
  ) {
    return false;
  }
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" && url.hostname !== "" && url.username === "" && url.password === ""
    );
  } catch {
    return false;
  }
}

/**
 * 判断值是否为正安全整数
 * @since Beta v0.12.6
 * @param value - 待判断的值
 * @returns 是否为正安全整数
 */
function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/**
 * 从服务端字段中选择主字段或兼容字段
 * @since Beta v0.12.6
 * @param value - 服务端对象
 * @param primary - 主字段名
 * @param fallback - 兼容字段名
 * @returns 选中的字段值
 */
function getCompatibleField(
  value: CustomEmoticonRecord,
  primary: string,
  fallback: string,
): unknown {
  if (Object.hasOwn(value, primary)) return value[primary];
  return value[fallback];
}

/**
 * 将列表状态转换为发送节点使用的可用标记。
 * @since Beta v0.12.6
 * @param value - 服务端收藏条目
 * @returns 是否明确可用
 */
function getListItemAvailability(value: CustomEmoticonRecord): boolean {
  let available: boolean | undefined;
  for (const key of ["is_available", "usable"]) {
    if (!Object.hasOwn(value, key)) continue;
    if (typeof value[key] !== "boolean") throw new TypeError("收藏表情可用标记无效");
    if (value[key] === false) return false;
    available = true;
  }
  if (Object.hasOwn(value, "status")) {
    if (typeof value.status !== "string") throw new TypeError("收藏表情状态无效");
    return value.status === "STATUS_ONLINE";
  }
  if (available === true) return true;
  throw new TypeError("收藏表情缺少可用状态");
}

/**
 * 解析并复制单个自定义表情
 * @since Beta v0.12.6
 * @param value - 待解析的自定义表情
 * @returns 已校验且不共享嵌套对象的自定义表情
 */
export function parseCustomEmoticon(value: unknown): TGApp.BBS.CustomEmoticon.Value {
  if (!isRecord(value)) throw new TypeError("自定义表情数据无效");

  if (!Object.hasOwn(value, "id") || typeof value.id !== "string" || value.id.trim() === "") {
    throw new TypeError("自定义表情 ID 无效");
  }
  if (!Object.hasOwn(value, "url") || !isSafeImageUrl(value.url)) {
    throw new TypeError("自定义表情图片必须使用 HTTPS 地址");
  }
  if (!Object.hasOwn(value, "size") || !isRecord(value.size)) {
    throw new TypeError("自定义表情尺寸无效");
  }
  if (!isPositiveInteger(value.size.width) || !isPositiveInteger(value.size.height)) {
    throw new TypeError("自定义表情尺寸必须为正安全整数");
  }

  const size: TGApp.BBS.CustomEmoticon.Size = {
    width: value.size.width,
    height: value.size.height,
  };
  if (Object.hasOwn(value.size, "file_size")) {
    if (!isPositiveInteger(value.size.file_size)) {
      throw new TypeError("自定义表情文件大小必须为正安全整数");
    }
    size.file_size = value.size.file_size;
  }

  const result: TGApp.BBS.CustomEmoticon.Value = {
    id: value.id,
    url: value.url,
    size,
  };
  if (Object.hasOwn(value, "is_available")) {
    if (typeof value.is_available !== "boolean") {
      throw new TypeError("自定义表情可用标记无效");
    }
    result.is_available = value.is_available;
  }
  if (Object.hasOwn(value, "hash")) {
    if (typeof value.hash !== "string") throw new TypeError("自定义表情哈希值无效");
    result.hash = value.hash;
  }
  return result;
}

/**
 * 解析收藏表情列表响应数据
 * @since Beta v0.12.6
 * @param value - 接口响应中的 data
 * @returns 已校验且可用的收藏表情列表
 */
export function parseCustomEmoticonList(value: unknown): Array<TGApp.BBS.CustomEmoticon.Item> {
  if (!isRecord(value)) throw new TypeError("收藏表情列表响应数据无效");
  if (Object.hasOwn(value, "retcode")) {
    if (typeof value.retcode !== "number") throw new TypeError("收藏表情列表响应代码无效");
    if (value.retcode !== 0) {
      const message =
        typeof value.message === "string" && value.message.trim() ? value.message : "未知错误";
      throw new Error(`获取收藏表情失败：${message}`);
    }
  }
  if (!Object.hasOwn(value, "list") || !Array.isArray(value.list)) {
    throw new TypeError("收藏表情列表响应缺少有效 list");
  }

  const items: Array<TGApp.BBS.CustomEmoticon.Item> = [];
  const seenIds = new Set<string>();
  let invalidCount = 0;
  for (const entry of value.list) {
    try {
      if (!isRecord(entry)) throw new TypeError("收藏表情条目无效");
      if (!getListItemAvailability(entry)) continue;
      const candidate: CustomEmoticonRecord = {
        id: entry.id,
        url: getCompatibleField(entry, "icon", "url"),
        size: getCompatibleField(entry, "img_ext", "size"),
        is_available: true,
      };
      if (Object.hasOwn(entry, "hash")) candidate.hash = entry.hash;
      const parsed = parseCustomEmoticon(candidate);
      if (seenIds.has(parsed.id)) continue;
      seenIds.add(parsed.id);
      items.push({ ...parsed, is_available: true });
    } catch {
      invalidCount += 1;
    }
  }
  if (items.length === 0 && invalidCount > 0) {
    throw new TypeError("收藏表情数据格式无效，请稍后重试");
  }
  return items;
}
