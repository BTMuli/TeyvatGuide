/**
 * 使用帖子编辑器同一套 Quill 格式导出正文与 Delta。
 * @since Beta v0.13.0
 */
import Quill from "quill";

import { buildPostDocument, parsePostNodes } from "./bbsPostDocument.js";
import { postEditorFormats, registerPostEditorFormats } from "./bbsPostEditor.js";

/**
 * Quill Delta 的运行时构造器。
 * @since Beta v0.13.0
 */
type DeltaConstructor = { new (): ReturnType<Quill["getContents"]> };

/**
 * 从同一份 Quill 文档导出规范化节点及 HTML；仅用于浏览器环境。
 * @since Beta v0.13.0
 * @param input - 编辑器或来源帖子的正文节点
 * @returns Quill 规范化后的正文与安全预览数据
 */
export function serializePostDocument(input: unknown): TGApp.BBS.PostEdit.Document {
  const nodes = parsePostNodes(input);
  registerPostEditorFormats();
  const DeltaClass = <DeltaConstructor>(<unknown>Quill.import("delta"));
  const delta = new DeltaClass();
  for (const node of nodes) delta.insert(node.insert, node.attributes);
  const container = document.createElement("div");
  let editor: Quill | undefined;
  try {
    editor = new Quill(container, { formats: [...postEditorFormats] });
    editor.setContents(delta, "silent");
    const normalized = buildPostDocument(editor.getContents().ops);
    const html = editor.root.innerHTML.replace(/^(?:<p><br><\/p>)+|(?:<p><br><\/p>)+$/gu, "");
    return { ...normalized, html };
  } finally {
    editor?.disable();
    editor?.scroll.observer.disconnect();
    editor?.scroll.detach();
    container.remove();
  }
}
