<template>
  <div class="tgpe-editor-shell">
    <div aria-label="帖子格式工具" class="tgpe-toolbar" role="toolbar">
      <button
        v-if="mode === 'article'"
        :disabled
        aria-label="添加图片"
        title="添加图片"
        class="tgpe-tool"
        type="button"
        @click="emits('imageClick')"
        @mousedown.prevent="rememberEditorSelection"
      >
        <v-icon size="20">mdi-image-outline</v-icon>
      </button>
      <button
        v-if="mode === 'article'"
        :disabled
        aria-label="插入表情"
        title="表情"
        class="tgpe-tool"
        type="button"
        @click="emits('emoticonClick')"
        @mousedown.prevent="rememberEditorSelection"
      >
        <v-icon size="20">mdi-emoticon-happy-outline</v-icon>
      </button>
      <button
        :disabled
        aria-label="提及用户"
        title="提及用户"
        class="tgpe-tool"
        type="button"
        @click="emits('mentionClick')"
        @mousedown.prevent="rememberEditorSelection"
      >
        <v-icon size="20">mdi-at</v-icon>
      </button>
      <template v-if="mode === 'article'">
        <span aria-hidden="true" class="tgpe-divider" />
        <button
          :aria-pressed="isLinkActive"
          :disabled
          aria-label="插入或编辑链接"
          title="链接"
          class="tgpe-tool"
          type="button"
          @click="editLink"
          @mousedown.prevent="rememberEditorSelection"
        >
          <v-icon size="20">mdi-link-variant</v-icon>
        </button>
        <button
          :aria-pressed="isInlineActive('bold')"
          :disabled
          aria-label="粗体"
          title="粗体"
          class="tgpe-tool"
          type="button"
          @click="formatInline('bold')"
          @mousedown.prevent="rememberEditorSelection"
        >
          <v-icon size="20">mdi-format-bold</v-icon>
        </button>
        <button
          :aria-pressed="isInlineActive('italic')"
          :disabled
          aria-label="斜体"
          title="斜体"
          class="tgpe-tool"
          type="button"
          @click="formatInline('italic')"
          @mousedown.prevent="rememberEditorSelection"
        >
          <v-icon size="20">mdi-format-italic</v-icon>
        </button>
        <button
          v-for="level in [1, 2]"
          :key="level"
          :aria-pressed="selectedHeader === String(level)"
          :disabled
          :aria-label="'标题 ' + level"
          :title="'标题 ' + level"
          class="tgpe-tool"
          type="button"
          @click="formatHeader(level)"
          @mousedown.prevent="rememberEditorSelection"
        >
          <v-icon size="20">{{
            level === 1 ? "mdi-format-header-1" : "mdi-format-header-2"
          }}</v-icon>
        </button>
        <label
          class="tgpe-color-label"
          title="文字颜色"
          :style="{ borderBottomColor: selectedColor }"
        >
          <v-icon aria-hidden="true" size="20">mdi-format-color-text</v-icon>
          <input
            :disabled
            :value="selectedColor"
            aria-label="文字颜色"
            class="tgpe-color"
            type="color"
            @change="applyColor"
            @mousedown="rememberEditorSelection"
          />
        </label>
        <button
          v-for="alignment in alignments"
          :key="alignment.value"
          :aria-pressed="isAlignmentActive(alignment.value)"
          :aria-label="alignment.label"
          :title="alignment.label"
          :disabled
          class="tgpe-tool"
          type="button"
          @click="formatAlignment(alignment.value)"
          @mousedown.prevent="rememberEditorSelection"
        >
          <v-icon size="20">{{ alignment.icon }}</v-icon>
        </button>
        <span class="tgpe-history">
          <button
            :disabled
            aria-label="撤销"
            title="撤销"
            class="tgpe-tool"
            type="button"
            @click="undo"
            @mousedown.prevent="rememberEditorSelection"
          >
            <v-icon size="20">mdi-undo-variant</v-icon>
          </button>
          <button
            :disabled
            aria-label="重做"
            title="重做"
            class="tgpe-tool"
            type="button"
            @click="redo"
            @mousedown.prevent="rememberEditorSelection"
          >
            <v-icon size="20">mdi-redo-variant</v-icon>
          </button>
        </span>
      </template>
    </div>
    <slot name="insert-panel" />
    <div ref="editorContainer" class="tgpe-editor"></div>
  </div>
</template>

<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import { isPostUrl } from "@utils/bbsPostDocument.js";
import { postEditorFormats, registerPostEditorFormats } from "@utils/bbsPostEditor.js";
import Quill from "quill";
import type { Range } from "quill";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";

import "quill/dist/quill.core.css";

type QuillDelta = ReturnType<Quill["getContents"]>;
type DeltaConstructor = {
  new (): QuillDelta;
};
const DeltaClass = <DeltaConstructor>(<unknown>Quill.import("delta"));

type PostEditorProps = {
  disabled: boolean;
  mode?: "article" | "picture";
};

type SelectionRange = {
  index: number;
  length: number;
};

type InlineFormat = "bold" | "italic";

type AlignFormat = "left" | "center" | "right";

type EmoticonValue = {
  src: string;
  name: string;
};

type AlignmentOption = {
  value: AlignFormat;
  label: string;
  icon: string;
};

const props = withDefaults(defineProps<PostEditorProps>(), { mode: "article" });
const model = defineModel<Array<TGApp.BBS.SctPost.Base>>({ required: true });
const emits = defineEmits<{
  error: [message: string];
  validityChange: [valid: boolean];
  imageClick: [];
  emoticonClick: [];
  mentionClick: [];
}>();

const editorContainer = useTemplateRef<HTMLDivElement>("editorContainer");
const quill = shallowRef<Quill>();
const activeFormats = ref<Record<string, unknown>>({});
const selectedColor = ref<string>("#000000");
const alignments: Array<AlignmentOption> = [
  { value: "left", label: "左对齐", icon: "mdi-format-align-left" },
  { value: "center", label: "居中对齐", icon: "mdi-format-align-center" },
  { value: "right", label: "右对齐", icon: "mdi-format-align-right" },
];
const selectedHeader = computed<string>(() => {
  const header = activeFormats.value.header;
  if (typeof header !== "number" || header < 1 || header > 2) return "";
  return String(header);
});
const isLinkActive = computed<boolean>(() => typeof activeFormats.value.link === "string");

let mounted = false;
let applyingModel = false;
let modelSnapshot = "";
let editVersion = 0;
let savedSelection: SelectionRange = { index: 0, length: 0 };

watch(
  model,
  (next) => {
    const current = quill.value;
    if (!current) return;
    const serialized = JSON.stringify(next);
    if (serialized === modelSnapshot) return;
    applyModel(next);
  },
  { deep: true, flush: "sync" },
);

watch(
  () => props.disabled,
  (disabled) => {
    const current = quill.value;
    if (!current) return;
    if (disabled) rememberEditorSelection();
    current.enable(!disabled);
    updateActiveFormats();
  },
);

onMounted(() => {
  const container = editorContainer.value;
  if (!container) {
    emits("error", "帖子编辑器初始化失败");
    return;
  }
  registerPostEditorFormats();
  const instance = new Quill(container, {
    formats: props.mode === "picture" ? ["mention"] : [...postEditorFormats],
    modules: {
      clipboard: false,
      history: { delay: 1000, maxStack: 100, userOnly: true },
    },
    placeholder: props.mode === "picture" ? "请输入图片介绍" : "请尽情发挥吧…",
  });
  quill.value = instance;
  instance.root.setAttribute("aria-label", props.mode === "picture" ? "图片介绍" : "帖子正文");
  instance.root.setAttribute("aria-multiline", "true");
  instance.root.setAttribute("role", "textbox");
  mounted = true;
  instance.on("text-change", handleTextChange);
  instance.on("selection-change", handleSelectionChange);
  instance.root.addEventListener("paste", handlePaste, true);
  instance.root.addEventListener("dragover", preventDrop, true);
  instance.root.addEventListener("drop", preventDrop, true);
  applyModel(model.value);
  instance.enable(!props.disabled);
  updateActiveFormats();
});

onBeforeUnmount(() => {
  mounted = false;
  const current = quill.value;
  if (!current) return;
  current.off("text-change", handleTextChange);
  current.off("selection-change", handleSelectionChange);
  current.root.removeEventListener("paste", handlePaste, true);
  current.root.removeEventListener("dragover", preventDrop, true);
  current.root.removeEventListener("drop", preventDrop, true);
  current.disable();
  quill.value = undefined;
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emitEditorError(error: unknown, fallback: string): void {
  emits("error", error instanceof Error ? error.message : fallback);
}

function normalizeMention(value: unknown): TGApp.BBS.ReplyAsset.Mention {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => key !== "uid" && key !== "nickname") ||
    typeof value.uid !== "number" ||
    !Number.isSafeInteger(value.uid) ||
    value.uid <= 0 ||
    typeof value.nickname !== "string" ||
    !value.nickname.trim() ||
    /[\r\n]/u.test(value.nickname)
  ) {
    throw new TypeError("帖子提及用户无效");
  }
  return { uid: value.uid, nickname: value.nickname };
}

function normalizeEmoticon(value: unknown): EmoticonValue {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => key !== "src" && key !== "name") ||
    typeof value.src !== "string" ||
    !isPostUrl(value.src, true) ||
    typeof value.name !== "string" ||
    value.name.trim() !== value.name ||
    !value.name ||
    /[\r\n]/u.test(value.name)
  ) {
    throw new TypeError("帖子表情无效");
  }
  return { src: value.src, name: value.name };
}

function normalizeAttributes(value: unknown, image: boolean): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new TypeError("帖子格式属性无效");
  const attributes: Record<string, unknown> = {};
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
        if (!Number.isInteger(entry) || Number(entry) < 1 || Number(entry) > 2) {
          throw new TypeError("帖子标题级别无效");
        }
        attributes.header = Number(entry);
        break;
      case "align":
        if (entry !== "left" && entry !== "center" && entry !== "right") {
          throw new TypeError("帖子对齐方式无效");
        }
        attributes.align = entry;
        break;
      case "color":
        if (typeof entry !== "string" || !/^#[\da-f]{6}$/iu.test(entry)) {
          throw new TypeError("帖子文字颜色无效");
        }
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
  if (typeof attributes.link === "string" && "color" in attributes) delete attributes.color;
  return Object.keys(attributes).length > 0 ? attributes : undefined;
}

function createNode(
  insert: string | Record<string, unknown>,
  attributes?: Record<string, unknown>,
): TGApp.BBS.SctPost.Base {
  const node: TGApp.BBS.SctPost.Base = { insert };
  if (attributes && Object.keys(attributes).length > 0) node.attributes = attributes;
  return node;
}

function buildEditorDelta(nodes: Array<TGApp.BBS.SctPost.Base>): QuillDelta {
  if (!Array.isArray(nodes)) throw new TypeError("帖子结构化节点无效");
  const delta = new DeltaClass();
  for (const node of nodes) {
    if (!isRecord(node) || !("insert" in node)) throw new TypeError("帖子结构化节点无效");
    const insert = node.insert;
    if (typeof insert === "string") {
      delta.insert(insert, normalizeAttributes(node.attributes, false));
      continue;
    }
    if (!isRecord(insert) || Object.keys(insert).length !== 1) {
      throw new TypeError("帖子包含暂不支持的卡片或附件，请在米游社网页版编辑");
    }
    if ("image" in insert && isPostUrl(insert.image, true)) {
      delta.insert({ image: insert.image }, normalizeAttributes(node.attributes, true));
      continue;
    }
    if ("mention" in insert) {
      if (node.attributes !== undefined) throw new TypeError("暂不支持带格式的用户提及");
      delta.insert({ mention: normalizeMention(insert.mention) });
      continue;
    }
    if ("emoticon" in insert) {
      if (node.attributes !== undefined) throw new TypeError("暂不支持带格式的帖子表情");
      delta.insert({ emoticon: normalizeEmoticon(insert.emoticon) });
      continue;
    }
    throw new TypeError("帖子包含暂不支持的卡片或附件，请在米游社网页版编辑");
  }
  const last = delta.ops.at(-1)?.insert;
  if (typeof last !== "string" || !last.endsWith("\n")) delta.insert("\n");
  return delta;
}

function readEditorNodes(current: Quill): Array<TGApp.BBS.SctPost.Base> {
  const nodes: Array<TGApp.BBS.SctPost.Base> = [];
  for (const op of current.getContents().ops) {
    if (op.insert === undefined) continue;
    if (typeof op.insert === "string") {
      nodes.push(createNode(op.insert, normalizeAttributes(op.attributes, false)));
      continue;
    }
    if (!isRecord(op.insert) || Object.keys(op.insert).length !== 1) {
      throw new TypeError("帖子包含暂不支持的卡片或附件，请在米游社网页版编辑");
    }
    if ("image" in op.insert && isPostUrl(op.insert.image, true)) {
      nodes.push(createNode({ image: op.insert.image }, normalizeAttributes(op.attributes, true)));
      continue;
    }
    if ("mention" in op.insert) {
      if (op.attributes && Object.keys(op.attributes).length > 0) {
        throw new TypeError("暂不支持带格式的用户提及");
      }
      nodes.push(createNode({ mention: normalizeMention(op.insert.mention) }));
      continue;
    }
    if ("emoticon" in op.insert) {
      if (op.attributes && Object.keys(op.attributes).length > 0) {
        throw new TypeError("暂不支持带格式的帖子表情");
      }
      nodes.push(createNode({ emoticon: normalizeEmoticon(op.insert.emoticon) }));
      continue;
    }
    throw new TypeError("帖子包含暂不支持的卡片或附件，请在米游社网页版编辑");
  }
  if (nodes.length === 0) nodes.push({ insert: "\n" });
  return nodes;
}

function clampSelection(current: Quill, selection: SelectionRange): SelectionRange {
  const maximum = Math.max(current.getLength() - 1, 0);
  const index = Math.min(Math.max(selection.index, 0), maximum);
  const length = Math.min(Math.max(selection.length, 0), Math.max(current.getLength() - index, 0));
  return { index, length };
}

function updateActiveFormats(range?: SelectionRange | null): void {
  const current = quill.value;
  if (!current) return;
  const selection = range ?? current.getSelection(false);
  if (!selection) return;
  activeFormats.value = current.getFormat(selection);
  const color = activeFormats.value.color;
  selectedColor.value =
    typeof color === "string" && /^#[\da-f]{6}$/iu.test(color) ? color : "#000000";
}

function selectionForAction(current: Quill): SelectionRange {
  const selection = current.getSelection(false);
  if (selection) {
    savedSelection = { index: selection.index, length: selection.length };
  }
  return clampSelection(current, selection ?? savedSelection);
}

function rememberEditorSelection(): void {
  const current = quill.value;
  if (!current) return;
  const selection = current.getSelection(false);
  if (selection) {
    savedSelection = { index: selection.index, length: selection.length };
    updateActiveFormats(selection);
  }
}

function applyModel(next: Array<TGApp.BBS.SctPost.Base>): void {
  const current = quill.value;
  if (!current) return;
  let delta: QuillDelta;
  try {
    delta = buildEditorDelta(next);
  } catch (error) {
    emits("validityChange", false);
    emitEditorError(error, "帖子正文无效");
    return;
  }
  const selection = clampSelection(current, savedSelection);
  applyingModel = true;
  try {
    editVersion += 1;
    current.history.clear();
    current.setContents(delta, "silent");
    savedSelection = clampSelection(current, selection);
    current.setSelection(savedSelection, "silent");
    modelSnapshot = JSON.stringify(next);
    emits("validityChange", true);
    updateActiveFormats(savedSelection);
  } catch (error) {
    emits("validityChange", false);
    emitEditorError(error, "帖子正文加载失败");
  } finally {
    applyingModel = false;
  }
}

function handleTextChange(): void {
  const current = quill.value;
  if (!mounted || applyingModel || !current) return;
  editVersion += 1;
  try {
    const next = readEditorNodes(current);
    const serialized = JSON.stringify(next);
    modelSnapshot = serialized;
    if (serialized !== JSON.stringify(model.value)) model.value = next;
    emits("validityChange", true);
    updateActiveFormats();
  } catch (error) {
    emits("validityChange", false);
    emitEditorError(error, "帖子正文无效");
  }
}

function handleSelectionChange(range: Range | null): void {
  if (!range) return;
  savedSelection = { index: range.index, length: range.length };
  updateActiveFormats(range);
}

function handlePaste(event: ClipboardEvent): void {
  event.preventDefault();
  event.stopImmediatePropagation();
  const current = quill.value;
  if (!current || props.disabled) return;
  const text = event.clipboardData?.getData("text/plain") ?? "";
  if (!text) return;
  const selection = selectionForAction(current);
  const delta = new DeltaClass().retain(selection.index).delete(selection.length).insert(text);
  current.updateContents(delta, "user");
  current.setSelection(selection.index + text.length, 0, "silent");
}

function preventDrop(event: DragEvent): void {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function isInlineActive(format: InlineFormat): boolean {
  return activeFormats.value[format] === true;
}

function isAlignmentActive(value: AlignFormat): boolean {
  const current = activeFormats.value.align;
  return current === value || (value === "left" && current === undefined);
}

function formatInline(format: InlineFormat): void {
  const current = quill.value;
  if (!current || props.disabled) return;
  const selection = selectionForAction(current);
  const value = !isInlineActive(format);
  if (selection.length === 0) {
    current.setSelection(selection, "silent");
    current.format(format, value, "user");
  } else {
    current.formatText(selection, format, value, "user");
  }
  current.setSelection(selection, "silent");
  updateActiveFormats(selection);
}

function formatHeader(value: number): void {
  const current = quill.value;
  if (!current || props.disabled) return;
  const selection = selectionForAction(current);
  const level = selectedHeader.value === String(value) ? null : value;
  current.formatLine(selection.index, Math.max(selection.length, 1), "header", level, "user");
  current.setSelection(selection, "silent");
  updateActiveFormats(selection);
}

function formatAlignment(value: AlignFormat): void {
  const current = quill.value;
  if (!current || props.disabled) return;
  const selection = selectionForAction(current);
  current.formatLine(selection.index, Math.max(selection.length, 1), "align", value, "user");
  current.setSelection(selection, "silent");
  updateActiveFormats(selection);
}

function applyColor(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const current = quill.value;
  if (!current || props.disabled) return;
  const value = target.value;
  if (!/^#[\da-f]{6}$/iu.test(value)) {
    emits("error", "帖子文字颜色无效");
    return;
  }
  const selection = selectionForAction(current);
  if (selection.length === 0) {
    current.setSelection(selection, "silent");
    current.format("color", value, "user");
  } else {
    current.formatText(selection, "color", value, "user");
  }
  selectedColor.value = value;
  current.setSelection(selection, "silent");
  updateActiveFormats(selection);
}

async function editLink(): Promise<void> {
  const current = quill.value;
  if (!current || props.disabled) return;
  const selection = selectionForAction(current);
  const version = editVersion;
  const existing = current.getFormat(selection).link;
  const result = await showDialog.inputF({
    cancelLabel: "取消",
    confirmLabel: "应用",
    input: typeof existing === "string" ? existing : undefined,
    text: "请输入 HTTP 或 HTTPS 链接，留空可移除链接",
    title: "编辑链接",
  });
  if (!mounted || quill.value !== current || props.disabled || version !== editVersion) {
    emits("error", "编辑器内容已变化，链接未应用");
    return;
  }
  if (typeof result !== "string") return;
  const link = result.trim();
  if (link && !isPostUrl(link)) {
    emits("error", "帖子链接仅支持 HTTP 或 HTTPS");
    return;
  }
  const safeSelection = clampSelection(current, selection);
  if (safeSelection.length === 0) {
    current.setSelection(safeSelection, "silent");
    current.format("link", link || null, "user");
  } else {
    current.formatText(safeSelection, "link", link || null, "user");
  }
  current.setSelection(safeSelection, "silent");
  updateActiveFormats(safeSelection);
}

function undo(): void {
  const current = quill.value;
  if (!current || props.disabled) return;
  current.history.undo();
  updateActiveFormats();
}

function redo(): void {
  const current = quill.value;
  if (!current || props.disabled) return;
  current.history.redo();
  updateActiveFormats();
}

function insertText(text: string): void {
  const current = quill.value;
  if (!current || props.disabled || !text) return;
  const selection = selectionForAction(current);
  const delta = new DeltaClass().retain(selection.index).delete(selection.length).insert(text);
  current.updateContents(delta, "user");
  current.setSelection(selection.index + text.length, 0, "silent");
}

function insertMention(user: TGApp.BBS.ReplyAsset.Mention): void {
  const current = quill.value;
  if (!current || props.disabled) return;
  let mention: TGApp.BBS.ReplyAsset.Mention;
  try {
    mention = normalizeMention(user);
  } catch (error) {
    emitEditorError(error, "帖子提及用户无效");
    return;
  }
  const selection = selectionForAction(current);
  const delta = new DeltaClass()
    .retain(selection.index)
    .delete(selection.length)
    .insert({ mention });
  current.updateContents(delta, "user");
  current.setSelection(selection.index + 1, 0, "silent");
}

function insertEmoticon(emoji: EmoticonValue): void {
  const current = quill.value;
  if (!current || props.disabled) return;
  let emoticon: EmoticonValue;
  try {
    emoticon = normalizeEmoticon(emoji);
  } catch (error) {
    emitEditorError(error, "帖子表情无效");
    return;
  }
  const selection = selectionForAction(current);
  const delta = new DeltaClass()
    .retain(selection.index)
    .delete(selection.length)
    .insert({ emoticon });
  current.updateContents(delta, "user");
  current.setSelection(selection.index + 1, 0, "silent");
}

function insertImage(image: TGApp.BBS.ReplyAsset.UploadedImage): void {
  const current = quill.value;
  if (!current) return;
  if (!isPostUrl(image.url, true)) {
    emits("error", "帖子图片地址无效");
    return;
  }
  const selection = selectionForAction(current);
  const delta = new DeltaClass()
    .retain(selection.index)
    .delete(selection.length)
    .insert({ image: image.url });
  current.editReadOnly(() => current.updateContents(delta, "user"));
  current.setSelection(selection.index + 1, 0, "silent");
}

defineExpose({ insertEmoticon, insertImage, insertMention, insertText });
</script>

<style lang="scss" scoped>
.tgpe-editor-shell {
  min-width: 0;
}

.tgpe-toolbar {
  display: flex;
  min-height: 56px;
  flex-wrap: wrap;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--common-shadow-2);
  background: var(--box-bg-4);
  gap: 4px;
}

.tgpe-tool,
.tgpe-color-label {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--box-text-2);
  cursor: pointer;
}

.tgpe-color-label {
  position: relative;
  border-bottom: 2px solid;
}

.tgpe-tool[aria-pressed="true"] {
  background: var(--box-bg-4);
  color: var(--common-text-title);
}

.tgpe-tool:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.tgpe-tool:focus-visible,
.tgpe-color-label:focus-within {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.tgpe-tool:hover:not(:disabled),
.tgpe-color-label:hover {
  background: var(--box-bg-4);
}

.tgpe-color {
  position: absolute;
  width: 100%;
  height: 100%;
  cursor: pointer;
  inset: 0;
  opacity: 0;
}

.tgpe-color-label:has(input:disabled) {
  cursor: not-allowed;
  opacity: 0.45;
}

.tgpe-history {
  display: inline-flex;
  margin-left: auto;
}

.tgpe-divider {
  width: 1px;
  height: 24px;
  margin: 0 8px;
  background: var(--common-shadow-2);
}

.tgpe-editor.ql-container {
  min-height: 360px;
  border: 0;
  color: var(--app-page-content);
  font-family: var(--font-text);
  font-size: 14px;
}

.tgpe-editor :deep(.ql-editor) {
  min-height: 360px;
  max-height: 640px;
  padding: 24px;
  line-height: 24px;
}

.tgpe-editor :deep(.ql-editor.ql-blank::before) {
  right: 24px;
  left: 24px;
  color: var(--box-text-4);
  font-style: normal;
}

.tgpe-editor :deep(.ql-editor a) {
  color: var(--common-text-title);
  text-decoration: underline;
}

.tgpe-editor :deep(.ql-image) {
  display: block;
  margin: 8px 0;
  text-align: left;
}

.tgpe-editor :deep(.ql-image-box) {
  display: block;
}

.tgpe-editor :deep(.ql-image img) {
  display: block;
  max-width: 100%;
  height: auto;
  object-fit: contain;
}

.tgpe-editor :deep(.quill-mention) {
  border-radius: 4px;
  background: var(--box-bg-4);
  color: var(--common-text-title);
  cursor: text;
  text-decoration: none;
}

.tgpe-editor :deep(.quill-emoticon) {
  display: inline-block;
  max-width: 120px;
  height: auto;
  object-fit: contain;
  vertical-align: middle;
}

@media (width <= 600px) {
  .tgpe-toolbar {
    padding: 8px;
    gap: 0;
  }

  .tgpe-divider {
    margin: 0 4px;
  }

  .tgpe-editor :deep(.ql-editor) {
    padding: 16px;
  }
}
</style>
