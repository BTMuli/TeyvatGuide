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
        @click="emits('emoticonClick', $event)"
        @mousedown.prevent="rememberEditorSelection"
      >
        <v-icon size="20">mdi-emoticon-happy-outline</v-icon>
      </button>
      <button
        v-if="mode !== 'fold-title'"
        :disabled
        aria-label="提及用户"
        title="提及用户"
        class="tgpe-tool"
        type="button"
        @click="emits('mentionClick', $event)"
        @mousedown.prevent="rememberEditorSelection"
      >
        <v-icon size="20">mdi-at</v-icon>
      </button>
      <template v-if="mode === 'article'">
        <v-menu v-model="dividerOpen" :disabled location="bottom start" offset="8">
          <template #activator="{ props: menuProps }">
            <button
              v-bind="menuProps"
              :aria-expanded="dividerOpen"
              :disabled
              aria-label="选择分割线"
              title="分割线"
              class="tgpe-tool"
              type="button"
              @mousedown.prevent="rememberEditorSelection"
            >
              <v-icon size="20">mdi-format-page-break</v-icon>
            </button>
          </template>
          <div aria-label="分割线样式" class="tgpe-divider-menu" role="menu">
            <button
              v-for="(divider, index) in dividerOptions"
              :key="divider"
              :aria-label="'插入分割线样式 ' + (index + 1)"
              :disabled
              class="tgpe-divider-option"
              role="menuitem"
              type="button"
              @click="insertDivider(divider)"
              @mousedown.prevent
            >
              <span>样式 {{ index + 1 }}</span>
              <img :src="'/UI/post/divider_' + divider + '.webp'" alt="" />
            </button>
          </div>
        </v-menu>
        <template v-if="allowComponents">
          <button
            v-for="tool in pendingTools"
            :key="tool.label"
            :aria-label="tool.available ? tool.label : tool.label + '（暂不可用）'"
            :title="tool.available ? tool.label : tool.label + '（暂不可用）'"
            :disabled="disabled || !tool.available"
            class="tgpe-tool"
            type="button"
            @click="handlePendingTool(tool.label, $event)"
            @mousedown.prevent="rememberEditorSelection"
          >
            <v-icon size="20">{{ tool.icon }}</v-icon>
          </button>
        </template>
        <button
          :aria-pressed="isLinkActive"
          :disabled
          aria-label="插入或编辑链接"
          title="链接"
          class="tgpe-tool tgpe-format-start"
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
        <label class="tgpe-color-label" :title="'文字颜色 ' + selectedColor.toUpperCase()">
          <v-icon aria-hidden="true" size="20">mdi-format-color-text</v-icon>
          <span
            aria-hidden="true"
            class="tgpe-color-swatch"
            :style="{ backgroundColor: selectedColor }"
          />
          <input
            :disabled
            :value="selectedColor"
            :aria-label="'文字颜色，当前 ' + selectedColor.toUpperCase()"
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
    <div ref="editorContainer" :aria-label="editorLabel" class="tgpe-editor"></div>
  </div>
</template>

<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import bbsReq from "@req/bbsReq.js";
import { parseCustomEmoticon } from "@utils/bbsCustomEmoticon.js";
import {
  assertPostDocumentContent,
  buildPostDocument,
  isPostDivider,
  isPostUrl,
  parsePostFold,
  parsePostVod,
  parsePostVote,
} from "@utils/bbsPostDocument.js";
import { postEditorFormats, registerPostEditorFormats } from "@utils/bbsPostEditor.js";
import { parsePostEmoticonMap, splitPostEmoticonText } from "@utils/bbsPostEmoticon.js";
import Quill from "quill";
import type { Range } from "quill";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";

import "quill/dist/quill.core.css";

type QuillDelta = ReturnType<Quill["getContents"]>;
type QuillOperation = QuillDelta["ops"][number];
type DeltaConstructor = {
  new (): QuillDelta;
};
const DeltaClass = <DeltaConstructor>(<unknown>Quill.import("delta"));

type PostEditorProps = {
  disabled: boolean;
  mode?: "article" | "picture" | "fold-title";
  /** 是否显示投票与折叠工具；折叠子编辑器应关闭以避免递归入口。 */
  allowComponents?: boolean;
  /** 编辑器允许输入的最大字符数。 */
  maxLength?: number;
  /** 编辑器无障碍名称。 */
  ariaLabel?: string;
};

type SelectionRange = {
  index: number;
  length: number;
};

type EmoticonCandidate = {
  index: number;
  length: number;
  name: string;
};

type InlineFormat = "bold" | "italic";

type AlignFormat = "left" | "center" | "right";

type EmoticonValue = {
  src: string;
  name: string;
};

type CustomEmoticonValue = TGApp.BBS.CustomEmoticon.Value;

type AlignmentOption = {
  value: AlignFormat;
  label: string;
  icon: string;
};

const props = withDefaults(defineProps<PostEditorProps>(), {
  mode: "article",
  allowComponents: true,
});
const model = defineModel<Array<TGApp.BBS.SctPost.Base>>({ required: true });
const emits = defineEmits<{
  error: [message: string];
  validityChange: [valid: boolean];
  imageClick: [];
  emoticonClick: [event: MouseEvent];
  mentionClick: [event: MouseEvent];
  voteClick: [event: MouseEvent];
  foldClick: [event: MouseEvent];
  voteEdit: [value: TGApp.BBS.PostEdit.Vote];
  foldEdit: [value: TGApp.BBS.PostEdit.Fold];
}>();

const editorContainer = useTemplateRef<HTMLDivElement>("editorContainer");
const quill = shallowRef<Quill>();
const activeFormats = ref<Record<string, unknown>>({});
const selectedColor = ref<string>("#000000");
const dividerOpen = ref<boolean>(false);
const dividerOptions: ReadonlyArray<TGApp.BBS.PostEdit.Divider> = [
  "line_1",
  "line_2",
  "line_3",
  "line_4",
];
const emoticonMap = shallowRef<Record<string, string>>({});
const alignments: Array<AlignmentOption> = [
  { value: "left", label: "左对齐", icon: "mdi-format-align-left" },
  { value: "center", label: "居中对齐", icon: "mdi-format-align-center" },
  { value: "right", label: "右对齐", icon: "mdi-format-align-right" },
];
const pendingTools = [
  { label: "视频", icon: "mdi-video-outline", available: false },
  { label: "投票", icon: "mdi-poll", available: true },
  { label: "折叠", icon: "mdi-format-list-group", available: true },
];
const selectedHeader = computed<string>(() => {
  const header = activeFormats.value.header;
  if (typeof header !== "number" || header < 1 || header > 2) return "";
  return String(header);
});
const isLinkActive = computed<boolean>(() => typeof activeFormats.value.link === "string");
const editorLabel = computed<string>(() => {
  if (props.ariaLabel) return props.ariaLabel;
  if (props.mode === "picture") return "图片介绍";
  if (props.mode === "fold-title") return "折叠标题";
  return "帖子正文";
});
const editorPlaceholder = computed<string>(() => {
  if (props.mode === "picture") return "请输入图片介绍";
  if (props.mode === "fold-title") {
    return props.maxLength === undefined
      ? "请输入折叠标题"
      : `请输入折叠标题，最多${props.maxLength}字`;
  }
  return "请尽情发挥吧…";
});

let composing = false;
let mounted = false;
let applyingModel = false;
let modelSnapshot = "";
let editVersion = 0;
let emoticonLoadVersion = 0;
let emoticonCandidates: Array<EmoticonCandidate> = [];
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
    if (disabled) {
      dividerOpen.value = false;
      rememberEditorSelection();
    }
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
    placeholder: editorPlaceholder.value,
  });
  quill.value = instance;
  instance.root.setAttribute("aria-multiline", "true");
  instance.root.setAttribute("role", "textbox");
  mounted = true;
  instance.on("text-change", handleTextChange);
  instance.on("selection-change", handleSelectionChange);
  instance.root.addEventListener("paste", handlePaste, true);
  instance.root.addEventListener("dragover", preventDrop, true);
  instance.root.addEventListener("drop", preventDrop, true);
  instance.root.addEventListener("dblclick", handleComponentDoubleClick, true);
  instance.root.addEventListener("keydown", handleComponentKeydown, true);
  instance.root.addEventListener("compositionstart", handleCompositionStart);
  instance.root.addEventListener("compositionupdate", handleCompositionUpdate);
  instance.root.addEventListener("compositionend", handleCompositionEnd);
  emoticonMap.value = readCachedEmoticonMap();
  applyModel(model.value);
  instance.enable(!props.disabled);
  updateActiveFormats();
  if (emoticonCandidates.some((candidate) => emoticonMap.value[candidate.name] === undefined)) {
    void loadEmoticonMap();
  }
});

onBeforeUnmount(() => {
  mounted = false;
  emoticonLoadVersion += 1;
  const current = quill.value;
  if (!current) return;
  current.off("text-change", handleTextChange);
  current.off("selection-change", handleSelectionChange);
  current.root.removeEventListener("paste", handlePaste, true);
  current.root.removeEventListener("dragover", preventDrop, true);
  current.root.removeEventListener("drop", preventDrop, true);
  current.root.removeEventListener("dblclick", handleComponentDoubleClick, true);
  current.root.removeEventListener("keydown", handleComponentKeydown, true);
  current.root.removeEventListener("compositionstart", handleCompositionStart);
  current.root.removeEventListener("compositionupdate", handleCompositionUpdate);
  current.root.removeEventListener("compositionend", handleCompositionEnd);
  current.disable();
  quill.value = undefined;
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emitEditorError(error: unknown, fallback: string): void {
  emits("error", error instanceof Error ? error.message : fallback);
}

function handlePendingTool(label: string, event: MouseEvent): void {
  if (label === "投票") emits("voteClick", event);
  else if (label === "折叠") emits("foldClick", event);
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

function normalizeCustomEmoticon(value: unknown, allowUnavailable: boolean): CustomEmoticonValue {
  let customEmoticon: CustomEmoticonValue;
  try {
    customEmoticon = parseCustomEmoticon(value);
  } catch {
    throw new TypeError("帖子自定义表情无效");
  }
  if (!allowUnavailable && customEmoticon.is_available === false) {
    throw new TypeError("帖子自定义表情已失效");
  }
  return customEmoticon;
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

function readCachedEmoticonMap(): Record<string, string> {
  try {
    return parsePostEmoticonMap(localStorage.getItem("emojis"));
  } catch {
    return {};
  }
}

function collectEmoticonCandidates(operations: ReadonlyArray<QuillOperation>): void {
  const candidates: Array<EmoticonCandidate> = [];
  let index = 0;
  for (const operation of operations) {
    if (typeof operation.insert === "string") {
      const tokenPattern = /_\(([^()\r\n]+)\)/gu;
      let match: RegExpExecArray | null;
      while ((match = tokenPattern.exec(operation.insert)) !== null) {
        candidates.push({ index: index + match.index, length: match[0].length, name: match[1] });
      }
      index += operation.insert.length;
    } else {
      index += 1;
    }
  }
  emoticonCandidates = candidates;
}

function transformEmoticonCandidates(change: QuillDelta): void {
  const candidates: Array<EmoticonCandidate> = [];
  for (const candidate of emoticonCandidates) {
    const end = candidate.index + candidate.length;
    let oldIndex = 0;
    let invalid = false;
    for (const operation of change.ops) {
      if (typeof operation.retain === "number") {
        if (
          operation.attributes !== undefined &&
          candidate.index < oldIndex + operation.retain &&
          end > oldIndex
        ) {
          invalid = true;
        }
        oldIndex += operation.retain;
        continue;
      }
      if (typeof operation.insert !== "undefined") {
        if (oldIndex > candidate.index && oldIndex < end) invalid = true;
        continue;
      }
      if (typeof operation.delete === "number") {
        if (candidate.index < oldIndex + operation.delete && end > oldIndex) invalid = true;
        oldIndex += operation.delete;
      }
    }
    if (invalid) continue;
    const index = change.transformPosition(candidate.index, false);
    const nextEnd = change.transformPosition(end, true);
    candidates.push({ index, length: Math.max(nextEnd - index, 0), name: candidate.name });
  }
  emoticonCandidates = candidates;
}

function mergeEmoticonMap(next: Record<string, string>): void {
  const merged = { ...emoticonMap.value, ...next };
  if (JSON.stringify(merged) === JSON.stringify(emoticonMap.value)) return;
  emoticonMap.value = merged;
  const current = quill.value;
  if (mounted && current && props.mode === "article") hydrateCurrentEmoticons(current, merged);
}

async function loadEmoticonMap(): Promise<void> {
  if (props.mode !== "article") return;
  const version = ++emoticonLoadVersion;
  let response: TGApp.BBS.Emoji.Resp;
  try {
    response = await bbsReq.emojis();
  } catch {
    return;
  }
  if (!mounted || version !== emoticonLoadVersion || response.retcode !== 0) return;
  const values: Record<string, string> = {};
  for (const series of response.data.list) {
    for (const emoji of series.list) values[emoji.name] = emoji.icon;
  }
  const next = parsePostEmoticonMap(values);
  if (Object.keys(next).length === 0) return;
  try {
    localStorage.setItem("emojis", JSON.stringify({ ...emoticonMap.value, ...next }));
  } catch {
    // 缓存不可用时仍使用本次请求结果。
  }
  mergeEmoticonMap(next);
}

function hydrateCurrentEmoticons(
  current: Quill,
  emoticons: Readonly<Record<string, string>>,
): void {
  const operations = current.getContents().ops;
  const update = new DeltaClass();
  const convertedCandidates = new Set<EmoticonCandidate>();
  let changed = false;
  let sourceIndex = 0;
  for (const operation of operations) {
    if (typeof operation.insert !== "string") {
      update.retain(1);
      sourceIndex += 1;
      continue;
    }
    const segments = splitPostEmoticonText(operation.insert, emoticons);
    const attributes = normalizeAttributes(operation.attributes, false);
    let segmentIndex = sourceIndex;
    for (const segment of segments) {
      const emoticon = typeof segment.insert === "string" ? undefined : segment.insert.emoticon;
      const candidate =
        emoticon === undefined
          ? undefined
          : emoticonCandidates.find(
              (item) =>
                item.index === segmentIndex &&
                item.length === segment.sourceLength &&
                item.name === emoticon.name,
            );
      if (typeof segment.insert === "string" || !candidate) {
        update.retain(segment.sourceLength);
      } else {
        changed = true;
        convertedCandidates.add(candidate);
        update.delete(segment.sourceLength);
        update.insert(segment.insert, attributes);
      }
      segmentIndex += segment.sourceLength;
    }
    sourceIndex += operation.insert.length;
  }
  if (!changed) return;
  const selection = current.getSelection(false);
  const sourceSelection = selection ?? savedSelection;
  const mappedSelection = {
    index: update.transformPosition(sourceSelection.index, true),
    length:
      update.transformPosition(sourceSelection.index + sourceSelection.length, true) -
      update.transformPosition(sourceSelection.index, true),
  };
  const remainingCandidates = emoticonCandidates
    .filter((candidate) => !convertedCandidates.has(candidate))
    .map((candidate) => {
      const start = update.transformPosition(candidate.index, false);
      const end = update.transformPosition(candidate.index + candidate.length, true);
      return { ...candidate, index: start, length: Math.max(end - start, 0) };
    });
  current.updateContents(update, "api");
  emoticonCandidates = remainingCandidates;
  const safeSelection = clampSelection(current, mappedSelection);
  savedSelection = safeSelection;
  if (selection) {
    current.setSelection(safeSelection, "silent");
  }
}

function buildEditorDelta(
  nodes: Array<TGApp.BBS.SctPost.Base>,
  emoticons: Readonly<Record<string, string>> = {},
): QuillDelta {
  if (!Array.isArray(nodes)) throw new TypeError("帖子结构化节点无效");
  const delta = new DeltaClass();
  let customEmoticonCount = 0;
  for (const node of nodes) {
    if (!isRecord(node) || !("insert" in node)) throw new TypeError("帖子结构化节点无效");
    const insert = node.insert;
    if (typeof insert === "string") {
      const attributes = normalizeAttributes(node.attributes, false);
      for (const segment of splitPostEmoticonText(insert, emoticons)) {
        delta.insert(segment.insert, attributes);
      }
      continue;
    }
    if (
      !isRecord(insert) ||
      (Object.keys(insert).length !== 1 &&
        !(
          Object.keys(insert).length === 2 &&
          Object.hasOwn(insert, "fold") &&
          Object.hasOwn(insert, "backup_text")
        ))
    ) {
      throw new TypeError("帖子包含暂不支持的卡片或附件，请在米游社网页版编辑");
    }
    if ("divider" in insert) {
      if (!isPostDivider(insert.divider) || node.attributes !== undefined) {
        throw new TypeError("帖子分割线无效");
      }
      delta.insert({ divider: insert.divider });
      continue;
    }
    if ("vote" in insert) {
      if (props.mode === "picture" || node.attributes !== undefined) {
        throw new TypeError("图片帖或带格式的帖子投票无效");
      }
      delta.insert({ vote: parsePostVote(insert.vote) });
      continue;
    }
    if ("vod" in insert) {
      if (props.mode === "picture" || node.attributes !== undefined) {
        throw new TypeError("图片帖或带格式的帖子视频无效");
      }
      delta.insert({ vod: parsePostVod(insert.vod) });
      continue;
    }
    if ("fold" in insert) {
      if (
        props.mode === "picture" ||
        node.attributes !== undefined ||
        (Object.hasOwn(insert, "backup_text") && typeof insert.backup_text !== "string")
      ) {
        throw new TypeError("图片帖或带格式的帖子折叠无效");
      }
      delta.insert({ fold: parsePostFold(insert.fold) });
      continue;
    }
    if ("custom_emoticon" in insert) {
      if (props.mode === "picture") throw new TypeError("图片帖暂不支持收藏表情");
      if (node.attributes !== undefined) {
        throw new TypeError("帖子自定义表情不支持格式属性");
      }
      customEmoticonCount += 1;
      if (customEmoticonCount > 1) throw new TypeError("帖子最多添加一个自定义表情");
      const customEmoticon = normalizeCustomEmoticon(insert.custom_emoticon, true);
      delta.insert({ custom_emoticon: customEmoticon });
      continue;
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
      delta.insert(
        { emoticon: normalizeEmoticon(insert.emoticon) },
        normalizeAttributes(node.attributes, false),
      );
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
  let customEmoticonCount = 0;
  for (const op of current.getContents().ops) {
    if (op.insert === undefined) continue;
    if (typeof op.insert === "string") {
      nodes.push(createNode(op.insert, normalizeAttributes(op.attributes, false)));
      continue;
    }
    if (!isRecord(op.insert) || Object.keys(op.insert).length !== 1) {
      throw new TypeError("帖子包含暂不支持的卡片或附件，请在米游社网页版编辑");
    }
    if ("divider" in op.insert) {
      if (
        !isPostDivider(op.insert.divider) ||
        (op.attributes && Object.keys(op.attributes).length > 0)
      ) {
        throw new TypeError("帖子分割线无效");
      }
      nodes.push(createNode({ divider: op.insert.divider }));
      continue;
    }
    if ("vote" in op.insert) {
      if (props.mode === "picture" || (op.attributes && Object.keys(op.attributes).length > 0)) {
        throw new TypeError("图片帖或带格式的帖子投票无效");
      }
      nodes.push(createNode({ vote: parsePostVote(op.insert.vote) }));
      continue;
    }
    if ("vod" in op.insert) {
      if (props.mode === "picture" || (op.attributes && Object.keys(op.attributes).length > 0)) {
        throw new TypeError("图片帖或带格式的帖子视频无效");
      }
      nodes.push(createNode({ vod: parsePostVod(op.insert.vod) }));
      continue;
    }
    if ("fold" in op.insert) {
      if (props.mode === "picture" || (op.attributes && Object.keys(op.attributes).length > 0)) {
        throw new TypeError("图片帖或带格式的帖子折叠无效");
      }
      nodes.push(createNode({ fold: parsePostFold(op.insert.fold) }));
      continue;
    }
    if ("custom_emoticon" in op.insert) {
      if (props.mode === "picture") throw new TypeError("图片帖暂不支持收藏表情");
      if (op.attributes !== undefined) {
        throw new TypeError("帖子自定义表情不支持格式属性");
      }
      customEmoticonCount += 1;
      if (customEmoticonCount > 1) throw new TypeError("帖子最多添加一个自定义表情");
      const customEmoticon = normalizeCustomEmoticon(op.insert.custom_emoticon, true);
      nodes.push(
        createNode({
          custom_emoticon: customEmoticon,
          backup_text: "[自定义表情]",
        }),
      );
      continue;
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
      nodes.push(
        createNode(
          { emoticon: normalizeEmoticon(op.insert.emoticon) },
          normalizeAttributes(op.attributes, false),
        ),
      );
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
    delta = buildEditorDelta(next, props.mode === "article" ? emoticonMap.value : {});
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
    collectEmoticonCandidates(current.getContents().ops);
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

function enforceMaxLength(current: Quill, change?: QuillDelta): void {
  if (props.maxLength === undefined) return;
  const length = current.getLength() - 1;
  if (length <= props.maxLength) return;
  const overflow = length - props.maxLength;
  let deleteIndex = props.maxLength;
  if (change) {
    let position = 0;
    for (const operation of change.ops) {
      if (typeof operation.retain === "number") {
        position += operation.retain;
        continue;
      }
      if (typeof operation.insert === "string" && operation.insert.length >= overflow) {
        deleteIndex = position + operation.insert.length - overflow;
        break;
      }
    }
  }
  const selection = current.getSelection(false);
  current.deleteText(deleteIndex, overflow, "user");
  if (selection) current.setSelection(Math.min(selection.index, deleteIndex), 0, "silent");
}

function handleCompositionStart(): void {
  composing = true;
}

function handleCompositionUpdate(): void {
  composing = true;
}

function handleCompositionEnd(): void {
  composing = false;
  const current = quill.value;
  if (!mounted || applyingModel || !current) return;
  enforceMaxLength(current);
}

function handleTextChange(change: QuillDelta, _oldChange: QuillDelta, source: string): void {
  const current = quill.value;
  if (!mounted || applyingModel || !current) return;
  if (!composing && props.maxLength !== undefined && current.getLength() - 1 > props.maxLength) {
    enforceMaxLength(current, change);
    return;
  }
  if (source === "user") transformEmoticonCandidates(change);
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
  setEditorCursor(current, Math.min(selection.index + text.length, current.getLength() - 1));
}

function preventDrop(event: DragEvent): void {
  event.preventDefault();
  event.stopImmediatePropagation();
}

/**
 * 从组件 DOM 读取投票或折叠值并通知外层编辑弹窗。
 * @since Beta v0.12.6
 * @param element - 组件根元素
 * @returns 是否识别到可编辑组件
 */
function emitComponentEdit(element: HTMLElement): boolean {
  const current = quill.value;
  const blot = current ? Quill.find(element, true) : null;
  if (current && blot && !(blot instanceof Quill)) {
    const index = current.getIndex(blot);
    savedSelection = { index, length: 1 };
    current.setSelection(savedSelection, "silent");
  }
  try {
    if (element.classList.contains("ql-vote")) {
      const value = parsePostVote({
        id: element.dataset.voteId ?? "",
        uid: element.dataset.voteUid ?? "",
        ...(element.dataset.voteUrl === undefined ? {} : { url: element.dataset.voteUrl }),
      });
      emits("voteEdit", value);
      return true;
    }
    if (element.classList.contains("ql-fold")) {
      const value = parsePostFold({
        title: element.dataset.title ?? "",
        content: element.dataset.content ?? "",
        ...(element.dataset.id === undefined ? {} : { id: element.dataset.id }),
        ...(element.dataset.size === undefined ? {} : { size: element.dataset.size }),
      });
      emits("foldEdit", value);
      return true;
    }
  } catch (error) {
    emitEditorError(error, "帖子组件数据无效");
  }
  return false;
}

/**
 * 双击帖子组件时打开其编辑弹窗。
 * @since Beta v0.12.6
 * @param event - 鼠标事件
 */
function handleComponentDoubleClick(event: MouseEvent): void {
  if (props.disabled || !props.allowComponents || !(event.target instanceof HTMLElement)) return;
  const element = event.target.closest<HTMLElement>(".ql-vote, .ql-fold");
  if (!element || !quill.value?.root.contains(element)) return;
  if (emitComponentEdit(element)) event.preventDefault();
}

/**
 * 在选中帖子组件时用 Enter、空格或 F2 打开编辑弹窗。
 * @since Beta v0.12.6
 * @param event - 键盘事件
 */
function handleComponentKeydown(event: KeyboardEvent): void {
  if (
    props.disabled ||
    !props.allowComponents ||
    (event.key !== "Enter" && event.key !== " " && event.key !== "F2")
  )
    return;
  const current = quill.value;
  const selection = current?.getSelection(false);
  if (!current || !selection || selection.length > 0) return;
  for (const index of [selection.index, selection.index - 1]) {
    if (index < 0 || index >= current.getLength()) continue;
    const operation = current.getContents(index, 1).ops[0];
    if (!operation || !isRecord(operation.insert)) continue;
    const componentSelection = { index, length: 1 };
    if (
      ("vote" in operation.insert &&
        emitComponentEditAtValue(operation.insert.vote, "vote", componentSelection)) ||
      ("fold" in operation.insert &&
        emitComponentEditAtValue(operation.insert.fold, "fold", componentSelection))
    ) {
      event.preventDefault();
      return;
    }
  }
}

/**
 * 从 Quill 嵌入值通知外层编辑弹窗。
 * @since Beta v0.12.6
 * @param value - 嵌入值
 * @param kind - 嵌入类型
 * @returns 是否成功发出编辑事件
 */
function emitComponentEditAtValue(
  value: unknown,
  kind: "vote" | "fold",
  selection?: SelectionRange,
): boolean {
  try {
    if (selection && quill.value) {
      savedSelection = selection;
      quill.value.setSelection(selection, "silent");
    }
    if (kind === "vote") emits("voteEdit", parsePostVote(value));
    else emits("foldEdit", parsePostFold(value));
    return true;
  } catch (error) {
    emitEditorError(error, "帖子组件数据无效");
    return false;
  }
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
  const level = current.getFormat(selection).header === value ? false : value;
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

function setEditorCursor(current: Quill, index: number): void {
  savedSelection = clampSelection(current, { index, length: 0 });
  current.setSelection(savedSelection, "silent");
}

function insertText(text: string): void {
  const current = quill.value;
  if (!current || props.disabled || !text) return;
  const selection = selectionForAction(current);
  const delta = new DeltaClass().retain(selection.index).delete(selection.length).insert(text);
  current.updateContents(delta, "user");
  setEditorCursor(current, Math.min(selection.index + text.length, current.getLength() - 1));
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
  setEditorCursor(current, selection.index + 1);
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
  setEditorCursor(current, selection.index + 1);
}

function insertCustomEmoticon(value: CustomEmoticonValue): void {
  const current = quill.value;
  if (!current || props.disabled) return;
  if (props.mode === "picture") {
    emits("error", "图片帖暂不支持收藏表情");
    return;
  }
  let customEmoticon: CustomEmoticonValue;
  try {
    customEmoticon = normalizeCustomEmoticon(value, false);
  } catch (error) {
    emitEditorError(error, "帖子自定义表情无效");
    return;
  }
  const hasCustomEmoticon = current
    .getContents()
    .ops.some(
      (operation: QuillOperation) =>
        typeof operation.insert === "object" &&
        operation.insert !== null &&
        !Array.isArray(operation.insert) &&
        "custom_emoticon" in operation.insert,
    );
  if (hasCustomEmoticon) {
    emits("error", "帖子最多添加一个自定义表情");
    return;
  }
  const selection = selectionForAction(current);
  const delta = new DeltaClass()
    .retain(selection.index)
    .delete(selection.length)
    .insert({ custom_emoticon: customEmoticon });
  current.updateContents(delta, "user");
  setEditorCursor(current, selection.index + 1);
}

function insertDivider(divider: TGApp.BBS.PostEdit.Divider): void {
  const current = quill.value;
  if (!current || props.disabled || props.mode !== "article") return;
  const selection = selectionForAction(current);
  const delta = new DeltaClass()
    .retain(selection.index)
    .delete(selection.length)
    .insert({ divider });
  current.updateContents(delta, "user");
  setEditorCursor(current, selection.index + 1);
  updateActiveFormats();
  dividerOpen.value = false;
}

function insertVote(value: TGApp.BBS.PostEdit.Vote): boolean {
  const current = quill.value;
  if (!current || props.disabled || props.mode !== "article") return false;
  let vote: TGApp.BBS.PostEdit.Vote;
  try {
    vote = parsePostVote(value);
  } catch (error) {
    emitEditorError(error, "帖子投票信息无效");
    return false;
  }
  const selection = selectionForAction(current);
  const delta = new DeltaClass().retain(selection.index).delete(selection.length).insert({ vote });
  try {
    assertPostDocumentContent(buildPostDocument(current.getContents().compose(delta).ops));
  } catch (error) {
    emitEditorError(error, "帖子正文无效");
    return false;
  }
  current.updateContents(delta, "user");
  setEditorCursor(current, selection.index + 1);
  updateActiveFormats();
  return true;
}

function insertFold(value: TGApp.BBS.PostEdit.Fold): boolean {
  const current = quill.value;
  if (!current || props.disabled || props.mode !== "article") return false;
  let fold: TGApp.BBS.PostEdit.Fold;
  try {
    fold = parsePostFold(value);
  } catch (error) {
    emitEditorError(error, "帖子折叠信息无效");
    return false;
  }
  const selection = selectionForAction(current);
  const delta = new DeltaClass().retain(selection.index).delete(selection.length).insert({ fold });
  try {
    assertPostDocumentContent(buildPostDocument(current.getContents().compose(delta).ops));
  } catch (error) {
    emitEditorError(error, "帖子正文无效");
    return false;
  }
  current.updateContents(delta, "user");
  setEditorCursor(current, selection.index + 1);
  updateActiveFormats();
  return true;
}

function removeComponent(): boolean {
  const current = quill.value;
  if (!current || props.disabled || props.mode !== "article") return false;
  const selection = selectionForAction(current);
  let componentIndex = selection.index;
  let operation = current.getContents(componentIndex, 1).ops[0];
  if (
    (!operation ||
      !isRecord(operation.insert) ||
      (!("vote" in operation.insert) && !("fold" in operation.insert))) &&
    componentIndex > 0
  ) {
    componentIndex -= 1;
    operation = current.getContents(componentIndex, 1).ops[0];
  }
  if (
    !operation ||
    !isRecord(operation.insert) ||
    (!("vote" in operation.insert) && !("fold" in operation.insert))
  ) {
    emits("error", "请选择要移除的投票或折叠组件");
    return false;
  }
  current.deleteText(componentIndex, 1, "user");
  setEditorCursor(current, componentIndex);
  return true;
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
  setEditorCursor(current, selection.index + 1);
}

defineExpose({
  insertCustomEmoticon,
  insertEmoticon,
  insertFold,
  insertImage,
  insertMention,
  removeComponent,
  insertText,
  insertVote,
});
</script>

<style lang="scss" scoped>
.tgpe-editor-shell {
  min-width: 0;
}

.tgpe-toolbar {
  display: flex;
  min-height: 48px;
  flex-wrap: wrap;
  align-items: center;
  padding: 8px 12px;
  background: var(--box-bg-1);
  gap: 4px;
}

.tgpe-tool,
.tgpe-color-label {
  display: inline-flex;
  width: 36px;
  height: 36px;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--app-page-content);
  cursor: pointer;
  transition:
    background-color 120ms ease,
    border-color 120ms ease,
    color 120ms ease;
}

.tgpe-color-label {
  position: relative;
  width: 68px;
  padding: 0 8px;
  gap: 8px;
}

.tgpe-color-swatch {
  width: 20px;
  height: 20px;
  flex: none;
  border: 1px solid var(--app-page-content);
  border-radius: 4px;
}

.tgpe-divider-menu {
  display: flex;
  overflow: auto;
  width: 320px;
  max-width: calc(100vw - 24px);
  max-height: min(320px, 60vh);
  box-sizing: border-box;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  background: var(--app-page-bg);
  box-shadow: 0 8px 24px var(--common-shadow-2);
  gap: 4px;
}

.tgpe-divider-option {
  display: flex;
  min-height: 48px;
  flex: none;
  align-items: center;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--app-page-content);
  cursor: pointer;
  font: inherit;
  gap: 12px;
}

.tgpe-divider-option span {
  flex: none;
  color: var(--box-text-2);
  font-size: 12px;
}

.tgpe-divider-option img {
  min-width: 0;
  max-width: 100%;
  max-height: 32px;
  flex: 1;
  object-fit: contain;
}

.tgpe-divider-option:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: -2px;
}

.tgpe-divider-option:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.tgpe-divider-option:hover:not(:disabled) {
  border-color: var(--common-shadow-2);
  background: var(--box-bg-4);
}

.tgpe-tool[aria-pressed="true"],
.tgpe-tool[aria-expanded="true"] {
  border-color: var(--common-text-title);
  background: color-mix(in srgb, var(--common-text-title) 16%, var(--box-bg-2));
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
  color: var(--common-text-title);
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
  gap: 4px;
}

.tgpe-format-start {
  margin-left: 8px;
}

.tgpe-editor.ql-container {
  min-height: 360px;
  border: 0;
  background: var(--box-bg-1);
  color: var(--app-page-content);
  font-family: var(--font-text);
  font-size: 14px;
}

.tgpe-editor :deep(.ql-editor) {
  min-height: 360px;
  max-height: 640px;
  padding: 20px 24px;
  line-height: 24px;
}

.tgpe-editor :deep(.ql-editor:focus) {
  outline: 1px solid var(--common-shadow-1);
  outline-offset: -1px;
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

.tgpe-editor :deep(.ql-divider) {
  margin: 10px auto;
}

.tgpe-editor :deep(.ql-divider img) {
  max-width: 100%;
  height: auto;
}

.tgpe-editor :deep(.ql-vod) {
  display: block;
  margin: 10px 0;
}

.tgpe-editor :deep(.ql-vod-card) {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  max-width: 480px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  aspect-ratio: 16 / 9;
  background: var(--box-bg-2);
}

.tgpe-editor :deep(.ql-vod-cover) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tgpe-editor :deep(.ql-vod-placeholder) {
  color: var(--box-text-4);
  font-size: 14px;
}

.tgpe-editor :deep(.ql-vod-play) {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 48px;
  height: 48px;
  opacity: 0.85;
  transform: translate(-50%, -50%);
}

.tgpe-editor :deep(.ql-vod-duration) {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 2px 4px;
  border-radius: 4px;
  background: #00000080;
  color: var(--tgc-white-4);
  font-size: 12px;
  line-height: 16px;
}

.tgpe-editor :deep(.ql-vote),
.tgpe-editor :deep(.ql-fold) {
  display: block;
  padding: 10px 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  margin: 10px 0;
  background: var(--box-bg-2);
  color: var(--app-page-content);
}

.tgpe-editor :deep(.ql-vote) {
  color: var(--common-text-title);
  font-weight: 600;
}

.tgpe-editor :deep(.ql-fold-title) {
  color: var(--common-text-title);
  font-weight: 600;
}

.tgpe-editor :deep(.ql-fold-content) {
  margin-top: 4px;
  color: var(--box-text-2);
}

.tgpe-editor :deep(.ql-fold-rich) {
  white-space: pre-wrap;
}

.tgpe-editor :deep(.ql-fold-rich h1),
.tgpe-editor :deep(.ql-fold-rich h2) {
  margin: 0;
  font-size: inherit;
  line-height: inherit;
}

.tgpe-editor :deep(.ql-fold-image) {
  display: inline-block;
  max-width: 100%;
  vertical-align: middle;
}

.tgpe-editor :deep(.ql-fold-image img),
.tgpe-editor :deep(.ql-fold-emoticon) {
  max-width: 100%;
  height: auto;
  vertical-align: middle;
}

.tgpe-editor :deep(.ql-fold-mention),
.tgpe-editor :deep(.ql-fold-vod),
.tgpe-editor :deep(.ql-fold-vote) {
  color: var(--common-text-title);
}

.tgpe-editor :deep(.ql-fold-divider) {
  border: 0;
  border-top: 1px solid var(--common-shadow-2);
}

.tgpe-editor :deep(.quill-mention) {
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--common-text-title);
  cursor: text;
  text-decoration: none;
}

.tgpe-editor :deep(.quill-emoticon) {
  display: inline-block;
  width: auto;
  max-width: 120px;
  height: 32px;
  object-fit: contain;
  vertical-align: middle;
}

.tgpe-editor :deep(.quill-custom-emoticon) {
  display: inline-block;
  width: auto;
  max-width: 120px;
  height: 32px;
  object-fit: contain;
  vertical-align: middle;
}

@media (width <= 600px) {
  .tgpe-toolbar {
    padding: 8px;
    gap: 4px;
  }

  .tgpe-format-start {
    margin-left: 4px;
  }

  .tgpe-history {
    margin-left: 4px;
  }

  .tgpe-editor :deep(.ql-editor) {
    padding: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tgpe-tool,
  .tgpe-color-label {
    transition: none;
  }
}
</style>
