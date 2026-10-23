<!-- 帖子回复表情编辑器 -->
<template>
  <div class="vpr-editor-shell">
    <div ref="editorContainer" class="vpr-editor"></div>
  </div>
</template>

<script lang="ts" setup>
import { registerPostEditorFormats } from "@utils/bbsPostEditor.js";
import { parsePostEmoticonMap } from "@utils/bbsPostEmoticon.js";
import {
  getReplyEditorInsertLength,
  normalizeReplyEditorEmoticon,
  parseReplyEditorText,
  serializeReplyEditorOps,
  type ReplyEditorEmoticon,
  type ReplyEditorOperation,
} from "@utils/bbsReplyEditor.js";
import Quill from "quill";
import type { Range } from "quill";
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from "vue";

import "quill/dist/quill.core.css";

/**
 * 回复编辑器参数。
 * @since Beta v0.12.6
 */
type ReplyEditorProps = {
  disabled: boolean;
  label: string;
};

type ReplyEditorDelta = ReturnType<Quill["getContents"]>;
type DeltaConstructor = {
  new (): ReplyEditorDelta;
};
type SelectionRange = {
  index: number;
  length: number;
};

const DeltaClass = <DeltaConstructor>(<unknown>Quill.import("delta"));
const props = defineProps<ReplyEditorProps>();
const model = defineModel<string>({ required: true });
const emits = defineEmits<{ error: [message: string] }>();
const editorContainer = useTemplateRef<HTMLDivElement>("editorContainer");
const quill = shallowRef<Quill>();
const emoticonMap = shallowRef<Record<string, string>>({});
let mounted = false;
let applyingModel = false;
let modelSnapshot = "";
let savedSelection: SelectionRange = { index: 0, length: 0 };

watch(model, (next) => {
  const current = quill.value;
  if (!current || next === modelSnapshot) return;
  applyModel(next);
});

watch(
  () => props.disabled,
  (disabled) => {
    const current = quill.value;
    if (!current) return;
    if (disabled) rememberSelection();
    current.enable(!disabled);
    current.root.setAttribute("aria-disabled", String(disabled));
    current.root.setAttribute("aria-readonly", String(disabled));
  },
);

watch(
  () => props.label,
  (label) => {
    editorContainer.value?.setAttribute("aria-label", label);
    quill.value?.root.setAttribute("aria-label", label);
  },
);

onMounted(() => {
  const container = editorContainer.value;
  if (!container) {
    emits("error", "回复编辑器初始化失败");
    return;
  }
  registerPostEditorFormats();
  const instance = new Quill(container, {
    formats: ["emoticon"],
    modules: {
      clipboard: false,
      history: { delay: 1000, maxStack: 100, userOnly: true },
      uploader: false,
    },
    placeholder: "输入内容…",
  });
  quill.value = instance;
  instance.root.setAttribute("aria-label", props.label);
  instance.root.setAttribute("aria-multiline", "true");
  instance.root.setAttribute("role", "textbox");
  instance.root.setAttribute("aria-disabled", String(props.disabled));
  instance.root.setAttribute("aria-readonly", String(props.disabled));
  instance.on("text-change", handleTextChange);
  instance.on("selection-change", handleSelectionChange);
  instance.root.addEventListener("copy", handleCopy, true);
  instance.root.addEventListener("cut", handleCut, true);
  instance.root.addEventListener("paste", handlePaste, true);
  instance.root.addEventListener("dragover", preventDrop, true);
  instance.root.addEventListener("drop", preventDrop, true);
  mounted = true;
  emoticonMap.value = readCachedEmoticonMap();
  applyModel(model.value);
  instance.enable(!props.disabled);
});

onBeforeUnmount(() => {
  mounted = false;
  const current = quill.value;
  if (!current) return;
  current.off("text-change", handleTextChange);
  current.off("selection-change", handleSelectionChange);
  current.root.removeEventListener("copy", handleCopy, true);
  current.root.removeEventListener("cut", handleCut, true);
  current.root.removeEventListener("paste", handlePaste, true);
  current.root.removeEventListener("dragover", preventDrop, true);
  current.root.removeEventListener("drop", preventDrop, true);
  current.disable();
  quill.value = undefined;
});

function readCachedEmoticonMap(): Record<string, string> {
  try {
    return parsePostEmoticonMap(localStorage.getItem("emojis"));
  } catch {
    return {};
  }
}

function cacheEmoticon(emoticon: ReplyEditorEmoticon): void {
  emoticonMap.value = { ...emoticonMap.value, [emoticon.name]: emoticon.src };
  try {
    localStorage.setItem("emojis", JSON.stringify(emoticonMap.value));
  } catch {
    // 本地缓存不可用时仍保留当前编辑器映射。
  }
}

function rememberSelection(): void {
  const current = quill.value;
  const selection = current?.getSelection(false);
  if (selection) savedSelection = { index: selection.index, length: selection.length };
}

function clampSelection(current: Quill, selection: SelectionRange): SelectionRange {
  const maximum = Math.max(current.getLength() - 1, 0);
  const index = Math.min(Math.max(selection.index, 0), maximum);
  const length = Math.min(Math.max(selection.length, 0), Math.max(current.getLength() - index, 0));
  return { index, length };
}

function selectionForAction(current: Quill): SelectionRange {
  const selection = current.getSelection(false);
  if (selection) savedSelection = { index: selection.index, length: selection.length };
  return clampSelection(current, selection ?? savedSelection);
}

function setEditorCursor(current: Quill, index: number): void {
  savedSelection = clampSelection(current, { index, length: 0 });
  current.setSelection(savedSelection, "silent");
}

function applyModel(next: string): void {
  const current = quill.value;
  if (!current) return;
  const hadFocus = current.hasFocus();
  const selection = clampSelection(current, savedSelection);
  applyingModel = true;
  try {
    const delta = new DeltaClass();
    for (const operation of parseReplyEditorText(next, emoticonMap.value)) {
      delta.insert(operation.insert);
    }
    delta.insert("\n");
    current.history.clear();
    current.setContents(delta, "silent");
    savedSelection = clampSelection(current, selection);
    if (hadFocus && !props.disabled) current.setSelection(savedSelection, "silent");
    modelSnapshot = next;
  } catch (error) {
    emits("error", error instanceof Error ? error.message : "回复内容加载失败");
  } finally {
    applyingModel = false;
  }
}

function updateModelFromEditor(current: Quill): void {
  const next = serializeReplyEditorOps(current.getContents().ops);
  modelSnapshot = next;
  if (next !== model.value) model.value = next;
}

function handleTextChange(
  _change: ReplyEditorDelta,
  _oldChange: ReplyEditorDelta,
  source: string,
): void {
  const current = quill.value;
  if (!mounted || applyingModel || source !== "user" || !current) return;
  try {
    updateModelFromEditor(current);
  } catch (error) {
    emits("error", error instanceof Error ? error.message : "回复内容无效");
  }
}

function handleSelectionChange(range: Range | null): void {
  if (range) savedSelection = { index: range.index, length: range.length };
}

function insertOperations(operations: ReadonlyArray<ReplyEditorOperation>): void {
  const current = quill.value;
  if (!current || props.disabled || operations.length === 0) return;
  const selection = selectionForAction(current);
  const delta = new DeltaClass().retain(selection.index).delete(selection.length);
  let length = 0;
  for (const operation of operations) {
    delta.insert(operation.insert);
    length += getReplyEditorInsertLength(operation.insert);
  }
  current.updateContents(delta, "user");
  setEditorCursor(current, selection.index + length);
}

function insertText(text: string): void {
  if (!text) return;
  insertOperations(parseReplyEditorText(text, emoticonMap.value));
}

function insertEmoticon(value: TGApp.BBS.Emoji.Item): void {
  if (!quill.value || props.disabled) return;
  try {
    const emoticon = normalizeReplyEditorEmoticon({ name: value.name, src: value.icon });
    cacheEmoticon(emoticon);
    insertOperations([{ insert: { emoticon } }]);
  } catch (error) {
    emits("error", error instanceof Error ? error.message : "回复表情无效");
  }
}

function selectedText(current: Quill): { selection: SelectionRange; text: string } | undefined {
  const selection = selectionForAction(current);
  if (selection.length === 0) return undefined;
  const text = serializeReplyEditorOps(
    current.getContents(selection.index, selection.length).ops,
    false,
  );
  return { selection, text };
}

function handleCopy(event: ClipboardEvent): void {
  const current = quill.value;
  if (!current) return;
  const selected = selectedText(current);
  if (!selected || !event.clipboardData) return;
  event.preventDefault();
  event.clipboardData.setData("text/plain", selected.text);
}

function handleCut(event: ClipboardEvent): void {
  const current = quill.value;
  if (!current || props.disabled) return;
  const selected = selectedText(current);
  if (!selected || !event.clipboardData) return;
  event.preventDefault();
  event.clipboardData.setData("text/plain", selected.text);
  current.updateContents(
    new DeltaClass().retain(selected.selection.index).delete(selected.selection.length),
    "user",
  );
  setEditorCursor(current, selected.selection.index);
}

function handlePaste(event: ClipboardEvent): void {
  event.preventDefault();
  event.stopImmediatePropagation();
  const current = quill.value;
  if (!current || props.disabled) return;
  const text = event.clipboardData?.getData("text/plain") ?? "";
  if (text) insertText(text);
}

function preventDrop(event: DragEvent): void {
  event.preventDefault();
  event.stopImmediatePropagation();
}

defineExpose({ focusEditor, insertEmoticon, insertText });

function focusEditor(): void {
  const current = quill.value;
  if (!current || props.disabled) return;
  current.focus({ preventScroll: true });
  current.setSelection(clampSelection(current, savedSelection), "silent");
}
</script>

<style lang="scss" scoped>
.vpr-editor-shell {
  min-width: 0;
}

.vpr-editor.ql-container {
  overflow: hidden;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--app-page-content);
  font-family: var(--font-text);
  font-size: 14px;
}

.vpr-editor :deep(.ql-editor) {
  min-height: 64px;
  max-height: 160px;
  padding: 8px 12px;
  line-height: 20px;
  overflow-y: auto;
}

.vpr-editor :deep(.ql-editor:focus) {
  outline: 2px solid var(--common-text-title);
  outline-offset: -2px;
}

.vpr-editor :deep(.ql-editor.ql-blank::before) {
  right: 12px;
  left: 12px;
  color: var(--box-text-4);
  font-style: normal;
}

.vpr-editor :deep(.quill-emoticon) {
  display: inline-block;
  width: auto;
  max-width: 96px;
  height: 24px;
  object-fit: contain;
  vertical-align: middle;
}
</style>
