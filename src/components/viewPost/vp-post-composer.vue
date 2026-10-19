<!-- 独立页面中的帖子编辑表单 -->
<template>
  <form :id="formId" class="post-composer" @submit.prevent="savePost">
    <div v-if="loading" class="post-composer-state" role="status">正在加载编辑设置…</div>
    <div v-else-if="loadError" class="post-composer-state" role="alert">
      <p>{{ loadError }}</p>
      <v-btn :disabled="busy" size="small" variant="tonal" @click="initialize(true)"
        >重新载入</v-btn
      >
    </div>
    <template v-else>
      <div v-if="error || conflict" class="post-composer-feedback post-composer-feedback-top">
        <p v-if="error" class="post-composer-error" role="alert">{{ error }}</p>
        <v-btn v-if="conflict" :disabled="busy" variant="text" @click="reloadPost"
          >载入最新帖子</v-btn
        >
      </div>
      <section class="post-composer-section">
        <h2 class="post-composer-section-title">内容</h2>
        <div class="post-composer-row">
          <label :for="titleId" class="post-composer-label post-composer-title-label">
            <span>标题</span>
            <span :id="titleCounterId" aria-live="polite" class="post-composer-counter"
              >{{ draft.subject.length }} / 30</span
            >
          </label>
          <v-text-field
            :id="titleId"
            v-model="draft.subject"
            :disabled="busy || !canWrite"
            maxlength="30"
            aria-label="帖子标题"
            :aria-describedby="titleCounterId"
            class="post-composer-title-input"
            density="compact"
            placeholder="标题（必填）"
            variant="outlined"
            hide-details
          />
        </div>
        <div class="post-composer-row">
          <span class="post-composer-label">{{ isPicture ? "图片介绍" : "正文" }}</span>
          <div class="post-composer-content">
            <VpPostEditor
              v-show="!preview"
              ref="editor"
              v-model="draft.nodes"
              :mode="isPicture ? 'picture' : 'article'"
              :disabled="busy || !canWrite"
              @error="handleEditorError"
              @validity-change="editorInvalid = !$event"
              @image-click="tools?.chooseImage()"
              @emoticon-click="tools?.openEmoji($event)"
              @mention-click="tools?.openMention($event)"
            >
              <template #insert-panel>
                <VpPostTools
                  ref="tools"
                  :contextId="contextVersion"
                  :cookie="toolCookie"
                  :disabled="pending || !canWrite"
                  :gid="draft.gid"
                  hideToolbar
                  @image="insertImage"
                  @emoticon="insertEmoticon"
                  @mention="insertMention"
                  @upload-busy="uploading = $event"
                />
              </template>
            </VpPostEditor>
            <div
              v-if="preview"
              class="post-composer-preview"
              aria-label="帖子预览"
              @click.prevent
              v-html="previewHtml"
            />
            <div class="post-composer-content-footer">
              <v-btn
                :disabled="busy || editorInvalid"
                variant="text"
                size="small"
                :prepend-icon="preview ? 'mdi-pencil-outline' : 'mdi-eye-outline'"
                @click="preview = !preview"
                >{{ preview ? "继续编辑" : "预览" }}</v-btn
              >
              <span
                >{{ contentLength }} / {{ isPicture ? 500 : 30000
                }}<template v-if="!isPicture">
                  · {{ previewDocument.images.length }} / 50 张图片</template
                ></span
              >
            </div>
          </div>
        </div>
        <div v-if="isPicture" class="post-composer-row">
          <span class="post-composer-label">上传图片</span>
          <div>
            <div class="post-picture-list" aria-label="帖子图片">
              <figure
                v-for="(url, index) in pictureImages"
                :key="index + ':' + url"
                class="post-picture-item"
              >
                <img :src="url" :alt="'第 ' + (index + 1) + ' 张图片'" />
                <figcaption>
                  <button
                    :disabled="busy || !canWrite"
                    :aria-pressed="draft.cover === url"
                    :aria-label="'将第 ' + (index + 1) + ' 张图片设为封面'"
                    type="button"
                    @click="draft.cover = url"
                  >
                    {{ draft.cover === url ? "封面" : "设为封面" }}
                  </button>
                  <button
                    :disabled="busy || index === 0 || !canWrite"
                    :aria-label="'上移第 ' + (index + 1) + ' 张图片'"
                    title="上移图片"
                    type="button"
                    @click="movePicture(index, -1)"
                  >
                    <v-icon size="16">mdi-arrow-left</v-icon>
                  </button>
                  <button
                    :disabled="busy || index === pictureImages.length - 1 || !canWrite"
                    :aria-label="'下移第 ' + (index + 1) + ' 张图片'"
                    title="下移图片"
                    type="button"
                    @click="movePicture(index, 1)"
                  >
                    <v-icon size="16">mdi-arrow-right</v-icon>
                  </button>
                  <button
                    :disabled="busy || !canWrite"
                    :aria-label="'移除第 ' + (index + 1) + ' 张图片'"
                    title="移除图片"
                    type="button"
                    @click="removePicture(index)"
                  >
                    <v-icon size="16">mdi-close</v-icon>
                  </button>
                </figcaption>
              </figure>
              <button
                v-if="pictureImages.length < maxPictureCount"
                :disabled="busy || !canWrite || preview"
                class="post-picture-add"
                type="button"
                @click="tools?.chooseImage()"
              >
                <v-icon size="32">mdi-plus-circle</v-icon>
                <span>点击添加图片</span>
                <small
                  >{{ pictureImages.length }} / {{ maxPictureCount }} 张 ·
                  JPG、PNG、GIF、WebP</small
                >
              </button>
            </div>
            <p v-if="uploading" class="post-composer-hint" role="status">正在上传图片…</p>
          </div>
        </div>
      </section>
      <section class="post-composer-section">
        <h2 class="post-composer-section-title">发布设置</h2>
        <div class="post-composer-row">
          <span class="post-composer-label">发布版块</span>
          <div>
            <v-radio-group
              v-model="draft.forumId"
              :disabled="busy || !canWrite || !!source"
              inline
              hide-details
              aria-label="发布版块"
              density="compact"
            >
              <v-radio
                v-for="forum in forums"
                :key="forum.id"
                :label="forum.name"
                :value="forum.id"
                color="var(--tgc-btn-1)"
              />
            </v-radio-group>
            <v-select
              v-if="categories.length > 1"
              v-model="draft.cateId"
              :disabled="busy || !canWrite"
              :items="categories"
              item-title="name"
              item-value="id"
              label="版块分类"
              variant="outlined"
              density="compact"
              hide-details
              class="post-composer-select"
            />
          </div>
        </div>
        <div class="post-composer-row">
          <span class="post-composer-label">选择话题</span>
          <div>
            <p class="post-composer-hint">选择相关角色、内容分类，方便其他旅行者发现</p>
            <div class="post-composer-topics">
              <v-chip
                v-for="id in draft.topicIds"
                :key="id"
                :closable="!busy && canWrite"
                size="small"
                @click:close="removeTopic(id)"
                >{{ topicNames.get(id) || "话题 " + id }}</v-chip
              >
            </div>
            <div class="post-composer-topic-input">
              <v-text-field
                v-model="topicLink"
                :disabled="busy || !canWrite || topicLoading"
                density="compact"
                hide-details
                label="米游社话题链接"
                variant="outlined"
                @keydown.enter.prevent="addTopic"
              />
              <v-btn
                :disabled="busy || !canWrite || !topicLink.trim()"
                :loading="topicLoading"
                variant="tonal"
                @click="addTopic"
                >添加</v-btn
              >
            </div>
          </div>
        </div>
        <div v-if="!isPicture && coverItems.length > 1" class="post-composer-row">
          <span class="post-composer-label">帖子封面</span>
          <v-select
            v-model="draft.cover"
            :disabled="busy || !canWrite"
            :items="coverItems"
            item-title="title"
            item-value="value"
            aria-label="帖子封面"
            variant="outlined"
            density="compact"
            hide-details
            class="post-composer-select"
          />
        </div>
      </section>
      <section class="post-composer-section">
        <h2 class="post-composer-section-title">声明与授权</h2>
        <div class="post-composer-row">
          <span class="post-composer-label">我的原创</span>
          <div class="post-composer-original">
            <v-switch
              v-model="draft.isOriginal"
              :disabled="busy || !canWrite"
              :true-value="1"
              :false-value="0"
              aria-label="声明原创"
              color="var(--tgc-od-blue)"
              hide-details
              density="compact"
            />
            <span class="post-composer-hint">声明此帖由我独立创作</span>
          </div>
        </div>
        <div class="post-composer-row">
          <span class="post-composer-label">转载授权</span>
          <v-btn-toggle
            v-model="draft.republishAuthorization"
            :disabled="busy || !canWrite"
            :mandatory="true"
            aria-label="转载授权"
            class="post-composer-toggle"
            variant="outlined"
          >
            <v-tooltip
              v-for="item in authorizationItems"
              :key="item.value"
              :text="item.title"
              location="top"
            >
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  :aria-label="item.title"
                  :icon="item.icon"
                  :value="item.value"
                  size="small"
                />
              </template>
            </v-tooltip>
          </v-btn-toggle>
        </div>
        <div class="post-composer-row">
          <span class="post-composer-label">AI 生成内容</span>
          <v-btn-toggle
            v-model="draft.userAiContentChoice"
            :disabled="busy || !canWrite"
            :mandatory="true"
            aria-label="AI 内容声明"
            class="post-composer-toggle"
            variant="outlined"
          >
            <v-tooltip
              v-for="item in aiContentItems"
              :key="item.value"
              :text="item.title"
              location="top"
            >
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  :aria-label="item.title"
                  :icon="item.icon"
                  :value="item.value"
                  size="small"
                />
              </template>
            </v-tooltip>
          </v-btn-toggle>
        </div>
      </section>
    </template>
  </form>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import postEditReq, { getPostEditSettings } from "@req/postEditReq.js";
import postReq from "@req/postReq.js";
import topicReq from "@req/topicReq.js";
import useAppStore from "@store/app.js";
import useBBSStore from "@store/bbs.js";
import useUserStore from "@store/user.js";
import { assertPostDocumentContent, buildPostDocument } from "@utils/bbsPostDocument.js";
import { serializePostDocument } from "@utils/bbsPostHtml.js";
import { assertPicturePostDocument, buildPicturePostDocument } from "@utils/bbsPostPicture.js";
import { executeReplyForCurrentAccount, matchesCurrentAccount } from "@utils/bbsReplyAccount.js";
import TGHttps from "@utils/TGHttps.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, toRaw, useId, useTemplateRef, watch } from "vue";

import VpPostEditor from "./vp-post-editor.vue";
import VpPostTools from "./vp-post-tools.vue";

const props = defineProps<{
  formId: string;
  gid: number;
  source: TGApp.BBS.Post.FullData;
}>();
const emits = defineEmits<{ saved: [postId: string | undefined] }>();
const titleId = useId();
const titleCounterId = useId();
const editor = useTemplateRef<InstanceType<typeof VpPostEditor>>("editor");
const tools = useTemplateRef<InstanceType<typeof VpPostTools>>("tools");
const bbsStore = useBBSStore();
const { forumList } = storeToRefs(bbsStore);
const { uid, cookie, briefInfo } = storeToRefs(useUserStore());
const { incognito } = storeToRefs(useAppStore());
const loading = ref<boolean>(false);
const pending = ref<boolean>(false);
const uploading = ref<boolean>(false);
const preview = ref<boolean>(false);
const previewHtml = ref<string>("");
const loadError = ref<string>("");
const error = ref<string>("");
const editorInvalid = ref<boolean>(false);
const conflict = ref<boolean>(false);
const maxPictureCount = ref<number>(18);
const topicLink = ref<string>("");
const topicLoading = ref<boolean>(false);
const topicNames = ref<Map<number, string>>(new Map());
const contextVersion = ref<number>(0);
const draft = ref<TGApp.BBS.PostEdit.Settings>(emptyDraft());
let seed: TGApp.BBS.Post.FullData | undefined;
let active = true;

const busy = computed<boolean>(() => pending.value || uploading.value);
const canSubmit = computed<boolean>(
  () =>
    !busy.value &&
    !topicLoading.value &&
    !editorInvalid.value &&
    canWrite.value &&
    !loading.value &&
    !loadError.value,
);
const isPicture = computed<boolean>(() => props.source.post.view_type === 2);
const pictureImages = computed<Array<string>>(() => draft.value.imageUrls ?? []);
const contentLength = computed<number>(() => {
  try {
    return isPicture.value
      ? buildPicturePostDocument(draft.value.nodes, pictureImages.value).length
      : previewDocument.value.text.length;
  } catch {
    return 0;
  }
});
const canWrite = computed<boolean>(
  () =>
    !incognito.value &&
    !!uid.value &&
    cookie.value?.ltuid === uid.value &&
    !!cookie.value?.ltoken.trim(),
);
const toolCookie = computed<Record<string, string> | undefined>(() =>
  canWrite.value && cookie.value
    ? { ltoken: cookie.value.ltoken, ltuid: cookie.value.ltuid }
    : undefined,
);
const forums = computed<Array<{ id: number; name: string }>>(() => {
  const items = (forumList.value.find((item) => item.game_id === props.gid)?.forums ?? [])
    .filter(
      (item) =>
        item.post_limit === 3 && item.visible === 1 && (isPicture.value || item.view_type === 1),
    )
    .map((item) => ({ id: item.id, name: item.name }));
  if (props.source?.forum && !items.some((item) => item.id === draft.value.forumId))
    items.push({ id: draft.value.forumId, name: props.source.forum.name });
  return items;
});
const categories = computed<Array<{ id: number; name: string }>>(() => {
  const items = [
    { id: 0, name: "不选择分类" },
    ...(forumList.value
      .find((item) => item.game_id === props.gid)
      ?.forums.find((item) => item.id === draft.value.forumId)?.forum_cate_list ?? []),
  ];
  if (
    props.source &&
    draft.value.cateId > 0 &&
    !items.some((item) => item.id === draft.value.cateId)
  ) {
    const category = props.source.forum?.forum_cate;
    items.push({
      id: draft.value.cateId,
      name: category?.id === draft.value.cateId ? category.name : `分类 ${draft.value.cateId}`,
    });
  }
  return items;
});
const previewDocument = computed<TGApp.BBS.PostEdit.DraftDocument>(() => {
  try {
    return isPicture.value
      ? buildPicturePostDocument(draft.value.nodes, pictureImages.value)
      : buildPostDocument(draft.value.nodes);
  } catch {
    return { nodes: [], text: "", images: [] };
  }
});
const coverItems = computed<Array<{ title: string; value: string }>>(() => [
  { title: "自动选择封面", value: "" },
  ...previewDocument.value.images.map((value, index) => ({
    title: `正文图片 ${index + 1}`,
    value,
  })),
]);
const aiContentItems = [
  { title: "未设置", value: "USER_AI_CONTENT_CHOICE_UNKNOWN", icon: "mdi-help-circle-outline" },
  {
    title: "不含 AI 生成内容",
    value: "USER_AI_CONTENT_CHOICE_NOT_AI",
    icon: "mdi-robot-off-outline",
  },
  {
    title: "含 AI 生成内容",
    value: "USER_AI_CONTENT_CHOICE_IS_AI",
    icon: "mdi-robot-outline",
  },
];
const authorizationItems = [
  { title: "未设置转载授权", value: 0, icon: "mdi-file-document-outline" },
  { title: "禁止转载或摘编", value: 1, icon: "mdi-share-off-outline" },
  { title: "允许规范转载", value: 2, icon: "mdi-share-variant-outline" },
];

watch(preview, (value) => {
  if (!value) return;
  try {
    previewHtml.value = serializePostDocument(draft.value.nodes).html;
  } catch (cause) {
    preview.value = false;
    error.value = TGHttps.getErrMsg(cause);
  }
});
watch(
  () => [
    props.gid,
    props.source.post.post_id,
    uid.value,
    cookie.value?.ltoken,
    cookie.value?.ltuid,
    incognito.value,
  ],
  () => {
    contextVersion.value += 1;
    void initialize();
  },
  { flush: "sync", immediate: true },
);
watch(
  () => draft.value.forumId,
  () => {
    if (!categories.value.some((item) => item.id === draft.value.cateId)) draft.value.cateId = 0;
  },
);
watch(
  () => previewDocument.value.images,
  (images) => {
    if (draft.value.cover && !images.includes(draft.value.cover))
      draft.value.cover = isPicture.value ? (images[0] ?? "") : "";
  },
);
onBeforeUnmount(() => {
  active = false;
  contextVersion.value += 1;
});

function emptyDraft(): TGApp.BBS.PostEdit.Settings {
  return {
    gid: props.gid,
    forumId: props.source.post.f_forum_id,
    subject: "",
    nodes: [{ insert: "\n" }],
    topicIds: [],
    cateId: 0,
    isOriginal: 0,
    republishAuthorization: 0,
    cover: "",
    userAiContentChoice: "USER_AI_CONTENT_CHOICE_NOT_AI",
  };
}

async function initialize(force: boolean = false): Promise<void> {
  const version = ++contextVersion.value;
  loading.value = true;
  loadError.value = "";
  error.value = "";
  conflict.value = false;
  preview.value = false;
  editorInvalid.value = false;
  try {
    if (
      forumList.value.length === 0 ||
      forumList.value.some((item) => item.forums.some((forum) => forum.view_type === undefined))
    )
      await bbsStore.refreshForumList();
    if (!active || version !== contextVersion.value) return;
    seed = structuredClone(toRaw(props.source));
    if (force && seed && toolCookie.value) {
      const latest = await postReq.post(seed.post.post_id, toolCookie.value);
      if (!active || version !== contextVersion.value) return;
      if (latest.retcode !== 0) throw new Error(`[${latest.retcode}] ${latest.message}`);
      if (
        latest.data.post.post.uid !== uid.value ||
        latest.data.post.post.post_id !== seed.post.post_id
      )
        throw new Error("仅能编辑当前账号发布的帖子");
      seed = latest.data.post;
    }
    const initial = getPostEditSettings(seed);
    maxPictureCount.value = Math.max(18, initial.imageUrls?.length ?? 0);
    draft.value = initial;
    topicNames.value = new Map((seed?.topics ?? []).map((item) => [item.id, item.name]));
  } catch (cause) {
    if (active && version === contextVersion.value) loadError.value = TGHttps.getErrMsg(cause);
  } finally {
    if (version === contextVersion.value) loading.value = false;
  }
}

async function reloadPost(): Promise<void> {
  if (busy.value) return;
  const version = contextVersion.value;
  pending.value = true;
  try {
    const confirmed = await showDialog.checkF({
      title: "载入最新帖子",
      text: "这会用服务器上的最新帖子替换当前未保存的内容。",
      confirmLabel: "载入最新",
      cancelLabel: "继续编辑",
    });
    if (confirmed && active && version === contextVersion.value) await initialize(true);
  } finally {
    pending.value = false;
  }
}

function handleEditorError(message: string): void {
  error.value = message;
}
function insertEmoticon(emoticon: { src: string; name: string }): void {
  if (canWrite.value && !busy.value) editor.value?.insertEmoticon(emoticon);
}
function insertMention(user: TGApp.BBS.ReplyAsset.Mention): void {
  if (canWrite.value && !busy.value) editor.value?.insertMention(user);
}
function insertImage(image: TGApp.BBS.ReplyAsset.UploadedImage): void {
  if (!canWrite.value || pending.value) return;
  if (!isPicture.value) {
    editor.value?.insertImage(image);
    return;
  }
  if (pictureImages.value.length >= maxPictureCount.value) {
    error.value = `最多添加 ${maxPictureCount.value} 张图片`;
    return;
  }
  draft.value.imageUrls = [...pictureImages.value, image.url];
  if (!draft.value.cover) draft.value.cover = image.url;
}
function removePicture(index: number): void {
  if (busy.value || !canWrite.value) return;
  draft.value.imageUrls = pictureImages.value.filter((_, current) => current !== index);
}
function movePicture(index: number, offset: number): void {
  if (busy.value || !canWrite.value) return;
  const images = [...pictureImages.value];
  const target = index + offset;
  if (target < 0 || target >= images.length) return;
  [images[index], images[target]] = [images[target], images[index]];
  draft.value.imageUrls = images;
}
function removeTopic(id: number): void {
  if (!busy.value) draft.value.topicIds = draft.value.topicIds.filter((item) => item !== id);
}

async function addTopic(): Promise<void> {
  if (busy.value || !canWrite.value || topicLoading.value) return;
  const id = topicLink.value.match(/(?:topicDetail\/|[?&]topic_id=)([1-9]\d*)/u)?.[1];
  if (!id) {
    error.value = "请输入有效的米游社话题链接";
    return;
  }
  const version = contextVersion.value;
  topicLoading.value = true;
  error.value = "";
  try {
    const response = await topicReq.info(String(draft.value.gid), id);
    if (!active || version !== contextVersion.value) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    const topicId = Number(id);
    if (!draft.value.topicIds.includes(topicId)) draft.value.topicIds.push(topicId);
    topicNames.value.set(topicId, response.data.topic.name);
    topicLink.value = "";
  } catch (cause) {
    if (version === contextVersion.value) error.value = TGHttps.getErrMsg(cause);
  } finally {
    topicLoading.value = false;
  }
}

async function savePost(): Promise<void> {
  if (
    busy.value ||
    editorInvalid.value ||
    topicLoading.value ||
    !canWrite.value ||
    !cookie.value ||
    loading.value ||
    loadError.value
  )
    return;
  const version = contextVersion.value;
  const requestCookie = { ltoken: cookie.value.ltoken, ltuid: cookie.value.ltuid };
  const settings = structuredClone(toRaw(draft.value));
  const source = seed;
  if (!source) return;
  const action = "保存修改";
  pending.value = true;
  error.value = "";
  try {
    const document = isPicture.value
      ? buildPicturePostDocument(settings.nodes, settings.imageUrls)
      : buildPostDocument(settings.nodes);
    if (isPicture.value)
      assertPicturePostDocument(
        buildPicturePostDocument(settings.nodes, settings.imageUrls),
        maxPictureCount.value,
      );
    else assertPostDocumentContent(document);
    if (!settings.subject.trim() || settings.subject.length > 30)
      throw new Error("请输入 1 至 30 字的帖子标题");
    if (!settings.forumId) throw new Error("请选择发布版块");
    const permission = await postEditReq.checkRelease(
      settings.gid,
      settings.forumId,
      requestCookie,
    );
    if (!active || version !== contextVersion.value || !canWrite.value) return;
    if (permission.retcode !== 0) throw new Error(`[${permission.retcode}] ${permission.message}`);
    const confirmed = await showDialog.checkF({
      title: action,
      text: `账号：${briefInfo.value.nickname || uid.value}\n版块：${forums.value.find((item) => item.id === settings.forumId)?.name ?? settings.forumId}\n标题：${settings.subject}\n${document.text.slice(0, 500)}\n图片 ${document.images.length} 张`,
      confirmLabel: action,
      cancelLabel: "继续编辑",
    });
    if (!confirmed || !active || version !== contextVersion.value || !canWrite.value) return;
    let latestSource = source;
    if (source) {
      const latest = await postReq.post(source.post.post_id, requestCookie);
      if (!active || version !== contextVersion.value) return;
      if (latest.retcode !== 0) throw new Error(`[${latest.retcode}] ${latest.message}`);
      if (
        latest.data.post.post.post_id !== source.post.post_id ||
        latest.data.post.post.uid !== requestCookie.ltuid ||
        latest.data.post.post.updated_at !== source.post.updated_at ||
        JSON.stringify(getPostEditSettings(latest.data.post)) !==
          JSON.stringify(getPostEditSettings(source))
      ) {
        conflict.value = true;
        throw new Error("帖子已在其他地方更新，请载入最新帖子后核对");
      }
      latestSource = latest.data.post;
    }
    const execution = await executeReplyForCurrentAccount(
      { uid: requestCookie.ltuid, cookie: requestCookie },
      () => postEditReq.update(latestSource, settings, requestCookie),
    );
    if (!active || version !== contextVersion.value) return;
    if (
      !execution.allowed ||
      !matchesCurrentAccount({ uid: requestCookie.ltuid, cookie: requestCookie })
    )
      throw new Error("账号状态已变化，请重新打开编辑器");
    const response = execution.data;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    const postId = source.post.post_id;
    seed = undefined;
    pending.value = false;
    showSnackbar.success(`${action}成功`);
    emits("saved", postId);
  } catch (cause) {
    if (active && version === contextVersion.value) {
      error.value = TGHttps.getErrMsg(cause);
      showSnackbar.error(error.value);
    }
  } finally {
    pending.value = false;
  }
}

defineExpose({ busy, canSubmit, pending });
</script>
<style lang="scss" scoped>
.post-composer {
  display: flex;
  flex-direction: column;
  padding: 0 0 32px;
  gap: 16px;
}

.post-composer-section {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 12px;
}

.post-composer-section-title {
  margin: 0 0 4px;
  color: var(--common-text-title);
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
}

.post-composer-row {
  display: flex;
  align-items: start;
  gap: 12px;
}

.post-composer-row > :last-child {
  min-width: 0;
  flex: 1 1 auto;
}

.post-composer-label {
  min-width: 0;
  flex: 0 0 88px;
  padding-top: 8px;
  color: var(--box-text-2);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
}

.post-composer-title-label {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-top: 0;
  gap: 4px;
}

.post-composer-counter {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
}

.post-composer-title-input :deep(.v-field) {
  background: var(--app-page-bg);
}

.post-composer-content {
  overflow: hidden;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--app-page-bg);
}

.post-composer-content :deep(.tgpe-editor.ql-container) {
  background: var(--app-page-bg);
}

.post-composer-content-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--box-bg-4);
  color: var(--box-text-4);
  font-size: 12px;
  gap: 12px;
}

.post-composer-preview {
  min-height: 360px;
  padding: 24px;
  background: var(--app-page-bg);
  color: var(--app-page-content);
  font-size: 14px;
  line-height: 24px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.post-composer-preview :deep(img) {
  max-width: 100%;
  height: auto;
}

.post-composer-preview :deep(a) {
  color: var(--common-text-title);
}

.post-composer-preview :deep(.ql-divider) {
  margin: 10px auto;
}

.post-composer-hint {
  margin: 0;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 20px;
}

.post-composer-topics,
.post-composer-topic-input,
.post-composer-original {
  display: flex;
  align-items: center;
  gap: 12px;
}

.post-composer-topics {
  flex-wrap: wrap;
  margin: 8px 0;
}

.post-composer-topic-input {
  max-width: 560px;
}

.post-composer-topic-input > .v-input {
  min-width: 0;
  flex: 1;
}

.post-composer-original :deep(.v-input) {
  flex: 0 0 auto;
}

.post-composer-toggle.v-btn-toggle {
  display: inline-flex;
  overflow: hidden;
  width: max-content;
  max-width: 100%;
  height: 36px;
  flex: none;
  align-items: stretch;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
}

.post-composer-toggle :deep(.v-btn) {
  min-width: 44px;
  height: 34px;
  padding: 0 10px;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  color: var(--box-text-4);
}

.post-composer-toggle :deep(.v-btn + .v-btn) {
  border-inline-start: 1px solid var(--common-shadow-2) !important;
  margin-inline-start: 0;
}

.post-composer-toggle :deep(.v-btn__overlay),
.post-composer-toggle :deep(.v-btn__underlay) {
  opacity: 0 !important;
}

.post-composer-toggle :deep(.v-btn.v-btn--active),
.post-composer-toggle :deep(.v-btn.v-btn--selected),
.post-composer-toggle :deep(.v-btn[aria-pressed="true"]) {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.post-composer-toggle :deep(.v-btn:focus-visible) {
  z-index: 1;
  outline: 2px solid var(--tgc-od-blue);
  outline-offset: -2px;
}

.post-composer-feedback {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.post-composer-feedback-top {
  padding: 12px 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-4);
}

.post-composer-select {
  width: 100%;
  max-width: 440px;
}

.post-composer-error {
  color: var(--tgc-od-red);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.post-composer-state {
  display: flex;
  min-height: 240px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: var(--box-text-4);
  gap: 12px;
  text-align: center;

  p {
    margin: 0;
  }
}

.post-picture-list {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 12px;
}

.post-picture-item,
.post-picture-add {
  min-width: min(160px, 100%);
  flex: 1 1 160px;
}

.post-picture-item {
  overflow: hidden;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  margin: 0;
  background: var(--box-bg-1);
}

.post-picture-item img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.post-picture-item figcaption {
  display: flex;
  min-height: 36px;
  align-items: center;
  padding: 4px;
  background: var(--box-bg-4);
  gap: 4px;
}

.post-picture-item button {
  display: inline-flex;
  min-width: 24px;
  min-height: 28px;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--box-text-2);
  cursor: pointer;
  font-size: 12px;
}

.post-picture-item button[aria-pressed="true"] {
  background: var(--box-bg-2);
  color: var(--common-text-title);
}

.post-picture-add {
  display: flex;
  min-height: 180px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border: 1px dashed var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-4);
  color: var(--box-text-2);
  cursor: pointer;
  gap: 12px;
}

.post-picture-add small {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 20px;
}

.post-picture-add:disabled,
.post-picture-item button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.post-picture-add:focus-visible,
.post-picture-item button:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.post-picture-add:hover:not(:disabled),
.post-picture-item button:hover:not(:disabled) {
  border-color: var(--common-text-title);
  background: var(--box-bg-2);
  color: var(--common-text-title);
}

@media (width <= 800px) {
  .post-composer {
    padding-bottom: 24px;
  }
}

@media (width <= 600px) {
  .post-composer {
    padding-bottom: 16px;
    gap: 12px;
  }

  .post-composer-section {
    padding: 12px;
  }

  .post-composer-row {
    flex-direction: column;
    gap: 8px;
  }

  .post-composer-row > :last-child {
    width: 100%;
  }

  .post-composer-label {
    flex-basis: auto;
    padding-top: 0;
  }

  .post-composer-content-footer {
    flex-wrap: wrap;
  }
}
</style>
