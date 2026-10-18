/**
 * 米游社富文本帖子文档校验与内容统计
 * @since Beta v0.12.6
 */

/**
 * 判断值是否为普通记录。
 * @since Beta v0.12.6
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 校验 HTTP 链接，拒绝脚本、凭据和控制字符。
 * @since Beta v0.12.6
 * @param value - 待校验的地址
 * @param image - 是否仅允许 HTTPS 图片
 * @returns 是否为安全地址
 */
export function isPostUrl(value: unknown, image: boolean = false): value is string {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    Array.from(value).some((character) => character.charCodeAt(0) <= 32)
  ) {
    return false;
  }
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || (!image && url.protocol === "http:")) &&
      !!url.hostname &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

/**
 * 校验富文本颜色，避免向 HTML 样式注入声明。
 * @since Beta v0.12.6
 */
function isPostColor(value: unknown): value is string {
  return typeof value === "string" && /^#[\da-f]{6}$/iu.test(value);
}

/**
 * 校验并复制单个节点的属性。
 * @since Beta v0.12.6
 */
function parseAttributes(value: unknown, image: boolean): TGApp.BBS.PostEdit.Attributes {
  if (!isRecord(value)) throw new TypeError("帖子格式属性无效");
  const attributes: TGApp.BBS.PostEdit.Attributes = {};
  for (const [key, entry] of Object.entries(value)) {
    if (image) {
      if (key !== "link" || !isPostUrl(entry)) throw new TypeError("帖子图片链接属性无效");
      attributes.link = entry;
      continue;
    }
    switch (key) {
      case "bold":
      case "italic":
        if (typeof entry !== "boolean") throw new TypeError("帖子文字格式无效");
        attributes[key] = entry;
        break;
      case "header":
        if (entry !== 1 && entry !== 2) {
          throw new TypeError("帖子标题级别无效");
        }
        attributes.header = entry;
        break;
      case "align":
        if (entry !== "left" && entry !== "center" && entry !== "right") {
          throw new TypeError("帖子对齐方式无效");
        }
        attributes.align = entry;
        break;
      case "color":
        if (!isPostColor(entry)) throw new TypeError("帖子文字颜色无效");
        attributes.color = entry;
        break;
      case "link":
        if (!isPostUrl(entry)) throw new TypeError("帖子链接仅支持 HTTP 或 HTTPS");
        attributes.link = entry;
        break;
      default:
        throw new TypeError(`暂不支持编辑帖子格式：${key}，请在米游社网页版编辑`);
    }
  }
  return attributes;
}

/**
 * 校验并复制富文本节点，未知节点直接拒绝，避免重新编辑时丢失内容。
 * @since Beta v0.12.6
 * @param input - 未知来源的 Delta 节点列表
 * @returns 已校验的节点副本
 */
export function parsePostNodes(input: unknown): Array<TGApp.BBS.PostEdit.Node> {
  if (!Array.isArray(input) || input.length === 0) throw new TypeError("帖子正文不能为空");
  const nodes = input.map((value): TGApp.BBS.PostEdit.Node => {
    if (
      !isRecord(value) ||
      Object.keys(value).some((key) => key !== "insert" && key !== "attributes")
    ) {
      throw new TypeError("帖子结构化节点无效");
    }
    const insert = value.insert;
    let node: TGApp.BBS.PostEdit.Node;
    if (typeof insert === "string") {
      node = { insert };
    } else if (isRecord(insert) && Object.keys(insert).length === 1 && isRecord(insert.emoticon)) {
      const emoticon = insert.emoticon;
      if (
        Object.keys(emoticon).some((key) => key !== "src" && key !== "name") ||
        !isPostUrl(emoticon.src, true) ||
        typeof emoticon.name !== "string" ||
        !emoticon.name.trim() ||
        /[\r\n()]/u.test(emoticon.name)
      )
        throw new TypeError("帖子表情无效");
      node = { insert: `_(${emoticon.name})` };
    } else if (isRecord(insert) && Object.keys(insert).length === 1 && "image" in insert) {
      if (!isPostUrl(insert.image, true)) throw new TypeError("帖子图片必须使用 HTTPS 地址");
      node = { insert: { image: insert.image } };
    } else if (isRecord(insert) && Object.keys(insert).length === 1 && isRecord(insert.mention)) {
      const mention = insert.mention;
      if (
        Object.keys(mention).some((key) => key !== "uid" && key !== "nickname") ||
        typeof mention.uid !== "number" ||
        !Number.isSafeInteger(mention.uid) ||
        mention.uid <= 0 ||
        typeof mention.nickname !== "string" ||
        !mention.nickname.trim() ||
        /[\r\n]/u.test(mention.nickname)
      ) {
        throw new TypeError("帖子提及用户无效");
      }
      node = { insert: { mention: { uid: mention.uid, nickname: mention.nickname } } };
    } else {
      throw new TypeError("帖子包含暂不支持的卡片或附件，请在米游社网页版编辑");
    }
    if (value.attributes !== undefined) {
      if (typeof insert !== "string" && isRecord(insert) && "mention" in insert) {
        throw new TypeError("暂不支持带格式的用户提及，请在米游社网页版编辑");
      }
      const attributes = parseAttributes(value.attributes, typeof node.insert !== "string");
      // 网页规范化时使用链接自身的颜色。
      if (attributes.link) delete attributes.color;
      if (Object.keys(attributes).length > 0) node.attributes = attributes;
    }
    return node;
  });
  const last = nodes.at(-1);
  if (!last || typeof last.insert !== "string" || !last.insert.endsWith("\n")) {
    nodes.push({ insert: "\n" });
  }
  return nodes;
}

/**
 * 校验 Delta 并收集纯文字和图片；HTML 由帖子 Quill 编辑器统一导出。
 * @since Beta v0.12.6
 * @param input - 待发布的富文本节点
 * @returns 可供内容统计与发布校验的文档
 */
export function buildPostDocument(input: unknown): TGApp.BBS.PostEdit.DraftDocument {
  const nodes = parsePostNodes(input);
  const images: Array<string> = [];
  let text = "";
  for (const node of nodes) {
    if (typeof node.insert === "string") {
      text += node.insert;
    } else if ("mention" in node.insert) {
      text += `@${node.insert.mention.nickname}`;
    } else {
      images.push(node.insert.image);
    }
  }
  return { nodes, text: text.replace(/\n$/u, ""), images };
}

/**
 * 校验发布正文的实际内容和长度。
 * @since Beta v0.12.6
 * @param document - 已校验的富文本文档
 */
export function assertPostDocumentContent(document: TGApp.BBS.PostEdit.DraftDocument): void {
  if (!document.text.trim() && document.images.length === 0)
    throw new TypeError("帖子正文不能为空");
  if (document.text.length + document.images.length > 30000)
    throw new TypeError("帖子正文最多 30000 字");
  if (document.images.length > 50) throw new TypeError("帖子最多添加 50 张图片");
  const emoticons = (document.text.match(/_\([^()\r\n]+\)/gu) ?? []).length;
  if (emoticons > 50) throw new TypeError("帖子最多添加 50 个表情");
  const mentions = document.nodes.filter(
    (node) => typeof node.insert !== "string" && "mention" in node.insert,
  ).length;
  if (mentions > 100) throw new TypeError("帖子最多提及 100 位用户");
}
