<!-- 独立页面中的帖子发布/编辑表单 -->
<template>
  <form :id="formId" class="post-composer" @submit.prevent="savePost">
    <div v-if="loading" class="post-composer-state" role="status">正在加载帖子设置…</div>
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
              @vote-click="openVoteDialog"
              @fold-click="openFoldDialog"
              @vote-edit="editVote"
              @fold-edit="editFold"
            >
              <template #insert-panel>
                <VpPostTools
                  ref="tools"
                  :contextId="contextVersion"
                  :cookie="toolCookie"
                  :disabled="pending || !canWrite"
                  :gid="draft.gid"
                  :allowCustomEmoticon="!isPicture"
                  hideToolbar
                  @image="insertImage"
                  @emoticon="insertEmoticon"
                  @custom-emoticon="insertCustomEmoticon"
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
          <div class="post-composer-forum-field">
            <div
              v-if="forums.length > 0"
              class="post-composer-forums"
              role="group"
              aria-label="发布版块"
            >
              <button
                v-for="forum in forums"
                :key="forum.id"
                :aria-pressed="draft.forumId === forum.id"
                :class="{ selected: draft.forumId === forum.id }"
                :disabled="!!source || busy || !canWrite"
                :title="forum.name"
                class="post-composer-forum"
                type="button"
                @click="draft.forumId = forum.id"
              >
                <TMiImg
                  v-if="forum.icon"
                  :alt="forum.name"
                  :ori="true"
                  :size="20"
                  :src="forum.icon"
                />
                <v-icon v-else size="18">{{
                  forum.id === 0 ? "mdi-forum-remove-outline" : "mdi-forum-outline"
                }}</v-icon>
                <span>{{ forum.name }}</span>
              </button>
            </div>
            <p v-else class="post-composer-hint">当前分区没有可发布该类型帖子的版块</p>
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
          <div class="post-composer-topic-field">
            <div class="post-composer-topic-head">
              <div class="post-composer-selected-topics">
                <span
                  v-for="id in draft.topicIds"
                  :key="id"
                  :class="{ 'has-close': !busy && canWrite }"
                  :title="topicDescs.get(id) || topicNames.get(id) || '话题 ' + id"
                  class="post-composer-topic-option post-composer-selected-topic"
                >
                  <TMiImg
                    v-if="topicCovers.get(id)"
                    :alt="topicNames.get(id) || ''"
                    :ori="true"
                    :size="20"
                    :src="topicCovers.get(id) ?? ''"
                  />
                  <v-icon v-else size="18">mdi-pound</v-icon>
                  <span>{{ topicNames.get(id) || "话题 " + id }}</span>
                  <button
                    v-if="!busy && canWrite"
                    :aria-label="'移除话题 ' + (topicNames.get(id) || id)"
                    class="post-composer-topic-close"
                    title="移除话题"
                    type="button"
                    @click="removeTopic(id)"
                  >
                    <v-icon size="14">mdi-close</v-icon>
                  </button>
                </span>
              </div>
              <v-text-field
                v-model="topicQuery"
                :clearable="true"
                :disabled="busy || !canWrite"
                :loading="topicLoading"
                append-inner-icon="mdi-magnify"
                autocomplete="off"
                class="post-composer-topic-search"
                density="compact"
                hide-details
                label="搜索话题"
                placeholder="输入话题名称搜索"
                variant="outlined"
                @update:focused="handleTopicFocus"
                @update:model-value="handleTopicSearch"
              />
            </div>
            <p v-if="topicLimitReached" class="post-composer-hint" role="status">
              最多选择 {{ maxTopicCount }} 个话题
            </p>
            <div
              v-if="topicOptions.length > 0"
              :aria-label="topicQuery.trim() ? '搜索结果' : '推荐话题'"
              class="post-composer-topic-options"
              role="group"
            >
              <button
                v-for="topic in topicOptions"
                :key="topic.id"
                :disabled="busy || !canWrite || topicLimitReached"
                :title="
                  topicLimitReached ? `最多选择 ${maxTopicCount} 个话题` : topic.desc || topic.name
                "
                class="post-composer-topic-option"
                type="button"
                @click="selectTopic(topic.id)"
              >
                <TMiImg
                  v-if="topic.cover"
                  :alt="topic.name"
                  :ori="true"
                  :size="20"
                  :src="topic.cover"
                />
                <v-icon v-else size="18">mdi-pound</v-icon>
                <span>{{ topic.name }}</span>
              </button>
            </div>
            <p v-else-if="topicEmptyText" class="post-composer-hint" role="status">
              {{ topicEmptyText }}
            </p>
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
    <VpPostComponentDialog
      v-model="componentDialog.visible"
      :contextId="contextVersion"
      :cookie="toolCookie"
      :disabled="busy || !canWrite"
      :errorMessage="componentDialog.error"
      :fold="componentDialog.fold"
      :gid="draft.gid"
      :kind="componentDialog.kind"
      :loading="componentDialog.loading"
      :vote="componentDialog.vote"
      :voteCreated="componentDialog.pendingVote !== undefined"
      @error="componentDialog.error = $event"
      @remove="removeComponent"
      @save-fold="saveFold"
      @save-vote="saveVote"
    />
  </form>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import bbsReq from "@req/bbsReq.js";
import postEditReq, { getPostEditSettings } from "@req/postEditReq.js";
import postReq from "@req/postReq.js";
import postVoteReq from "@req/postVoteReq.js";
import topicReq from "@req/topicReq.js";
import useBBSStore from "@store/bbs.js";
import useUserStore from "@store/user.js";
import { assertPostDocumentContent, buildPostDocument } from "@utils/bbs/postDocument.js";
import { parsePostEmoticonMap } from "@utils/bbs/postEmoticon.js";
import { serializePostDocument } from "@utils/bbs/postHtml.js";
import { assertPicturePostDocument, buildPicturePostDocument } from "@utils/bbs/postPicture.js";
import {
  collectPostPreviewEmoticonMap,
  getMissingPostPreviewEmoticonNames,
  renderPostPreviewEmoticons,
} from "@utils/bbs/postPreview.js";
import { canPublishForumPost } from "@utils/bbs/postPublish.js";
import { executeReplyForCurrentAccount, matchesCurrentAccount } from "@utils/bbs/replyAccount.js";
import TGHttps from "@utils/network/TGHttps.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, onBeforeUnmount, ref, toRaw, useId, useTemplateRef, watch } from "vue";

import VpPostComponentDialog from "./vp-post-component-dialog.vue";
import VpPostEditor from "./vp-post-editor.vue";
import VpPostTools from "./vp-post-tools.vue";

const props = defineProps<{
  formId: string;
  gid: number;
  source?: TGApp.BBS.Post.FullData;
  viewType?: 1 | 2;
  forumId?: number;
  initialTopic?: { id: number; name: string };
}>();
const emits = defineEmits<{ saved: [postId: string | undefined] }>();
const titleId = useId();
const titleCounterId = useId();
const editor = useTemplateRef<InstanceType<typeof VpPostEditor>>("editor");
const tools = useTemplateRef<InstanceType<typeof VpPostTools>>("tools");
const bbsStore = useBBSStore();
const { forumList } = storeToRefs(bbsStore);
const { uid, cookie } = storeToRefs(useUserStore());
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
const maxTopicCount: Readonly<number> = 6;
const topicQuery = ref<string>("");
const topicRecommendations = ref<Array<TopicOption>>([]);
const topicSearchResults = ref<Array<TopicOption>>([]);
const topicRecommendLoading = ref<boolean>(false);
const topicSearchLoading = ref<boolean>(false);
const topicError = ref<string>("");
const topicNames = ref<Map<number, string>>(new Map());
const topicCovers = ref<Map<number, string>>(new Map());
const topicDescs = ref<Map<number, string>>(new Map());
const contextVersion = ref<number>(0);
const draft = ref<TGApp.BBS.PostEdit.Settings>(emptyDraft());
type TopicOption = {
  id: number;
  name: string;
  desc?: string;
  cover?: string;
};
type ForumOption = {
  id: number;
  name: string;
  icon?: string;
};
type ComponentDialogState = {
  visible: boolean;
  kind: "vote" | "fold";
  loading: boolean;
  error: string;
  vote?: TGApp.BBS.PostEdit.Vote;
  pendingVote?: TGApp.BBS.PostEdit.Vote;
  fold?: TGApp.BBS.PostEdit.Fold;
};
const componentDialog = ref<ComponentDialogState>({
  visible: false,
  kind: "fold",
  loading: false,
  error: "",
});
let seed: TGApp.BBS.Post.FullData | undefined;
let active = true;
let previewRenderVersion = 0;
let topicSearchTimer: number | undefined;
let topicSearchVersion = 0;
let topicRecommendVersion = 0;
let loadedTopicRecommendKey = "";

const busy = computed<boolean>(() => pending.value || uploading.value);
const topicLoading = computed<boolean>(
  () => topicRecommendLoading.value || topicSearchLoading.value,
);
const canSubmit = computed<boolean>(
  () =>
    !busy.value &&
    !componentDialog.value.visible &&
    !componentDialog.value.loading &&
    !editorInvalid.value &&
    canWrite.value &&
    !loading.value &&
    !loadError.value,
);
const isPicture = computed<boolean>(() => draft.value.viewType === 2);
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
  () => !!uid.value && cookie.value?.ltuid === uid.value && !!cookie.value?.ltoken.trim(),
);
const toolCookie = computed<TGApp.App.Account.EditorCookie | undefined>(() =>
  canWrite.value && cookie.value
    ? {
        ltoken: cookie.value.ltoken,
        ltuid: cookie.value.ltuid,
        stoken: cookie.value.stoken,
        stuid: cookie.value.stuid,
        mid: cookie.value.mid,
      }
    : undefined,
);
const eligibleForums = computed<Array<ForumOption>>(() => {
  const viewType = isPicture.value ? 2 : 1;
  return (forumList.value.find((item) => item.game_id === props.gid)?.forums ?? [])
    .filter((item) => canPublishForumPost(item, viewType))
    .map((item) => ({ id: item.id, name: item.name, icon: item.icon_pure || item.icon }));
});
const forums = computed<Array<ForumOption>>(() => {
  const items = [...eligibleForums.value];
  if (
    !props.source &&
    props.initialTopic &&
    (props.forumId === undefined ||
      props.forumId === 0 ||
      !items.some((item) => item.id === props.forumId))
  )
    items.push({ id: 0, name: "不发布到版块" });
  if (props.source?.forum && !items.some((item) => item.id === props.source?.post.f_forum_id)) {
    items.push({
      id: props.source.post.f_forum_id,
      name: props.source.forum.name,
      icon: props.source.forum.icon,
    });
  }
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
const topicOptions = computed<Array<TopicOption>>(() => {
  const items = topicQuery.value.trim() ? topicSearchResults.value : topicRecommendations.value;
  return items.filter((item) => !draft.value.topicIds.includes(item.id));
});
const topicLimitReached = computed<boolean>(() => draft.value.topicIds.length >= maxTopicCount);
const topicEmptyText = computed<string>(() => {
  if (topicLoading.value) return "正在加载话题…";
  if (topicError.value) return topicError.value;
  return topicQuery.value.trim() ? "未找到相关话题" : "暂无推荐话题";
});
const topicRecommendationKey = computed<string>(() => {
  const text = previewDocument.value.text;
  return `${draft.value.gid}\u0000${draft.value.forumId}\u0000${draft.value.viewType ?? 1}\u0000${draft.value.topicIds.join(",")}\u0000${draft.value.subject}\u0000${text}`;
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
  const version = ++previewRenderVersion;
  if (!value) {
    previewHtml.value = "";
    return;
  }
  void renderPreview(version, contextVersion.value);
});
watch(
  () => [
    props.source,
    props.source?.post.post_id,
    props.source?.post.uid,
    props.source?.post.subject,
    props.source?.post.structured_content,
    props.gid,
    props.viewType,
    props.forumId,
    props.initialTopic?.id,
    uid.value,
    cookie.value?.ltoken,
    cookie.value?.ltuid,
  ],
  () => {
    closeComponentDialog();
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
  if (topicSearchTimer !== undefined) window.clearTimeout(topicSearchTimer);
  topicSearchTimer = undefined;
  topicSearchVersion += 1;
  topicRecommendVersion += 1;
  closeComponentDialog();
  contextVersion.value += 1;
});

function emptyDraft(): TGApp.BBS.PostEdit.Settings {
  const viewType = getInitialViewType();
  return {
    gid: props.gid,
    forumId: props.source?.post.f_forum_id ?? props.forumId ?? 0,
    subject: "",
    nodes: [{ insert: "\n" }],
    viewType,
    ...(viewType === 2 ? { imageUrls: [] } : {}),
    topicIds: props.source ? [] : props.initialTopic ? [props.initialTopic.id] : [],
    cateId: 0,
    isOriginal: 0,
    republishAuthorization: 0,
    cover: "",
    userAiContentChoice: "USER_AI_CONTENT_CHOICE_NOT_AI",
  };
}

function getInitialViewType(): 1 | 2 {
  if (props.source) return props.source.post.view_type === 2 ? 2 : 1;
  return props.viewType === 2 ? 2 : 1;
}

function normalizeForumId(): void {
  if (props.source) return;
  if (
    props.forumId !== undefined &&
    eligibleForums.value.some((item) => item.id === props.forumId)
  ) {
    draft.value.forumId = props.forumId;
    return;
  }
  draft.value.forumId = props.initialTopic ? 0 : (eligibleForums.value[0]?.id ?? 0);
}

function readPreviewEmoticonMap(): Record<string, string> {
  try {
    return parsePostEmoticonMap(localStorage.getItem("emojis"));
  } catch {
    return {};
  }
}

function cachePreviewEmoticonMap(emoticons: Readonly<Record<string, string>>): void {
  if (Object.keys(emoticons).length === 0) return;
  try {
    localStorage.setItem("emojis", JSON.stringify({ ...readPreviewEmoticonMap(), ...emoticons }));
  } catch {
    // 缓存不可用时仍使用本次请求结果。
  }
}

function isCurrentPreview(version: number, context: number): boolean {
  return (
    active && preview.value && version === previewRenderVersion && context === contextVersion.value
  );
}

async function renderPreview(version: number, context: number): Promise<void> {
  try {
    const serialized = serializePostDocument(draft.value.nodes);
    let emoticons = {
      ...readPreviewEmoticonMap(),
      ...collectPostPreviewEmoticonMap(draft.value.nodes),
    };
    let html = renderPostPreviewEmoticons(serialized.html, emoticons);
    const missing = getMissingPostPreviewEmoticonNames(draft.value.nodes, emoticons);
    if (missing.length > 0) {
      try {
        const response = await bbsReq.emojis();
        if (isCurrentPreview(version, context) && response.retcode === 0) {
          const values: Record<string, string> = {};
          for (const series of response.data.list)
            for (const emoji of series.list) values[emoji.name] = emoji.icon;
          const next = parsePostEmoticonMap(values);
          cachePreviewEmoticonMap(next);
          emoticons = { ...emoticons, ...next };
          html = renderPostPreviewEmoticons(serialized.html, emoticons);
        }
      } catch {
        // 目录请求失败时保留已知表情，未知令牌继续显示为文本。
      }
    }
    if (isCurrentPreview(version, context)) previewHtml.value = html;
  } catch (cause) {
    if (isCurrentPreview(version, context)) {
      preview.value = false;
      error.value = TGHttps.getErrMsg(cause);
    }
  }
}

function resetTopicPicker(): void {
  if (topicSearchTimer !== undefined) window.clearTimeout(topicSearchTimer);
  topicSearchTimer = undefined;
  topicSearchVersion += 1;
  topicRecommendVersion += 1;
  loadedTopicRecommendKey = "";
  topicQuery.value = "";
  topicRecommendations.value = [];
  topicSearchResults.value = [];
  topicRecommendLoading.value = false;
  topicSearchLoading.value = false;
  topicError.value = "";
}

async function initialize(force: boolean = false): Promise<void> {
  const version = ++contextVersion.value;
  loading.value = true;
  loadError.value = "";
  error.value = "";
  conflict.value = false;
  preview.value = false;
  editorInvalid.value = false;
  resetTopicPicker();
  try {
    if (
      forumList.value.length === 0 ||
      !forumList.value.some((item) => item.game_id === props.gid) ||
      forumList.value.some((item) => item.forums.some((forum) => forum.view_type === undefined))
    )
      await bbsStore.refreshForumList();
    if (!active || version !== contextVersion.value) return;
    if (props.source) {
      seed = structuredClone(toRaw(props.source));
      if (force && toolCookie.value) {
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
      topicNames.value = new Map((seed.topics ?? []).map((item) => [item.id, item.name]));
      topicCovers.value = new Map(
        (seed.topics ?? []).filter((item) => item.cover).map((item) => [item.id, item.cover]),
      );
      topicDescs.value = new Map();
    } else {
      seed = undefined;
      maxPictureCount.value = 18;
      draft.value = emptyDraft();
      topicNames.value = new Map();
      topicCovers.value = new Map();
      topicDescs.value = new Map();
      if (props.initialTopic) topicNames.value.set(props.initialTopic.id, props.initialTopic.name);
      normalizeForumId();
    }
  } catch (cause) {
    if (active && version === contextVersion.value) loadError.value = TGHttps.getErrMsg(cause);
  } finally {
    if (version === contextVersion.value) loading.value = false;
  }
  if (active && version === contextVersion.value && !loadError.value) {
    void loadTopicDescriptions(version);
    void loadTopicRecommendations();
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

function closeComponentDialog(): void {
  componentDialog.value = {
    visible: false,
    kind: "fold",
    loading: false,
    error: "",
  };
}

function openVoteDialog(): void {
  if (busy.value || preview.value || !canWrite.value) return;
  componentDialog.value = {
    visible: true,
    kind: "vote",
    loading: false,
    error: "",
  };
}

function openFoldDialog(): void {
  if (busy.value || preview.value || !canWrite.value) return;
  componentDialog.value = {
    visible: true,
    kind: "fold",
    loading: false,
    error: "",
  };
}

function editVote(value: TGApp.BBS.PostEdit.Vote): void {
  if (busy.value || preview.value || !canWrite.value) return;
  componentDialog.value = {
    visible: true,
    kind: "vote",
    loading: false,
    error: "",
    vote: value,
  };
}

function editFold(value: TGApp.BBS.PostEdit.Fold): void {
  if (busy.value || preview.value || !canWrite.value) return;
  componentDialog.value = {
    visible: true,
    kind: "fold",
    loading: false,
    error: "",
    fold: value,
  };
}

function handleEditorError(message: string): void {
  error.value = message;
  if (componentDialog.value.visible) componentDialog.value.error = message;
}

async function saveVote(request: TGApp.BBS.Vote.CreateRequest): Promise<void> {
  const pendingVote = componentDialog.value.pendingVote;
  if (
    componentDialog.value.loading ||
    !componentDialog.value.visible ||
    componentDialog.value.kind !== "vote" ||
    componentDialog.value.vote ||
    busy.value ||
    preview.value ||
    !canWrite.value
  )
    return;
  if (pendingVote) {
    componentDialog.value.error = "";
    if (editor.value?.insertVote(pendingVote)) closeComponentDialog();
    return;
  }
  const requestCookie = toolCookie.value;
  const snapshotUid = uid.value;
  if (!requestCookie || !snapshotUid) {
    componentDialog.value.error = "账号状态已变化，请重新登录后重试";
    return;
  }
  const version = contextVersion.value;
  const snapshot: TGApp.BBS.Reply.AccountSnapshot = {
    uid: snapshotUid,
    cookie: { ltoken: requestCookie.ltoken, ltuid: requestCookie.ltuid },
  };
  componentDialog.value.loading = true;
  componentDialog.value.error = "";
  try {
    const execution = await executeReplyForCurrentAccount(snapshot, () =>
      postVoteReq.create(request, requestCookie, snapshotUid),
    );
    if (!active || version !== contextVersion.value) return;
    if (
      !execution.allowed ||
      !matchesCurrentAccount(snapshot) ||
      !canWrite.value ||
      uid.value !== snapshotUid
    )
      throw new Error("账号状态已变化，请重新打开编辑器");
    const response = execution.data;
    if (!response || response.retcode !== 0)
      throw new Error(`[${response?.retcode ?? "unknown"}] ${response?.message ?? "创建投票失败"}`);
    const voteId = response.data?.vote_id;
    if (typeof voteId !== "string" || !voteId.trim()) throw new Error("创建投票响应缺少投票 ID");
    const createdVote = { id: voteId, uid: snapshotUid };
    componentDialog.value.pendingVote = createdVote;
    const inserted = editor.value?.insertVote(createdVote) ?? false;
    if (!inserted) return;
    closeComponentDialog();
  } catch (cause) {
    if (active && version === contextVersion.value)
      componentDialog.value.error = `创建投票失败：${TGHttps.getErrMsg(cause)}。若请求结果不明确，请先核对米游社投票状态，再决定是否重试。`;
  } finally {
    if (active && version === contextVersion.value) componentDialog.value.loading = false;
  }
}

function saveFold(value: TGApp.BBS.PostEdit.Fold): void {
  if (
    componentDialog.value.loading ||
    !componentDialog.value.visible ||
    componentDialog.value.kind !== "fold" ||
    busy.value ||
    preview.value ||
    !canWrite.value
  )
    return;
  const inserted = editor.value?.insertFold(value) ?? false;
  if (!inserted) return;
  closeComponentDialog();
}

function removeComponent(): void {
  if (
    componentDialog.value.loading ||
    !componentDialog.value.visible ||
    busy.value ||
    preview.value ||
    !canWrite.value
  )
    return;
  const removed = editor.value?.removeComponent() ?? false;
  if (removed) closeComponentDialog();
}
function insertEmoticon(emoticon: { src: string; name: string }): void {
  if (canWrite.value && !busy.value) editor.value?.insertEmoticon(emoticon);
}
function insertCustomEmoticon(value: TGApp.BBS.CustomEmoticon.Value): void {
  if (canWrite.value && !busy.value && !isPicture.value) editor.value?.insertCustomEmoticon(value);
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
  if (busy.value) return;
  draft.value.topicIds = draft.value.topicIds.filter((item) => item !== id);
  if (!topicQuery.value.trim()) void loadTopicRecommendations(true);
}

function readTopicText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text || undefined;
}

function readTopicOptions(items: Array<TGApp.BBS.Topic.Summary> | undefined): Array<TopicOption> {
  const options: Array<TopicOption> = [];
  const seen = new Set<number>();
  for (const item of items ?? []) {
    const id = Number(item.id);
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) continue;
    const name = readTopicText(item.name);
    if (!name) continue;
    seen.add(id);
    options.push({
      id,
      name,
      desc: readTopicText(item.desc),
      cover: readTopicText(item.cover),
    });
  }
  return options;
}

async function loadTopicDescriptions(version: number): Promise<void> {
  const gid = String(draft.value.gid);
  const ids = draft.value.topicIds.filter((id) => !topicDescs.value.has(id));
  await Promise.all(
    ids.map(async (id) => {
      try {
        const response = await topicReq.info(gid, String(id));
        if (!active || version !== contextVersion.value || response.retcode !== 0) return;
        const topic = response.data?.topic;
        const desc = readTopicText(topic?.desc);
        if (desc) topicDescs.value.set(id, desc);
        const cover = readTopicText(topic?.cover);
        if (cover && !topicCovers.value.has(id)) topicCovers.value.set(id, cover);
      } catch {
        // 简介仅用于悬停提示，获取失败时回退到话题名称。
      }
    }),
  );
}

async function loadTopicRecommendations(force: boolean = false): Promise<void> {
  if (!active) return;
  const key = topicRecommendationKey.value;
  if (!force && (topicRecommendLoading.value || key === loadedTopicRecommendKey)) return;
  const version = ++topicRecommendVersion;
  topicRecommendLoading.value = true;
  topicError.value = "";
  try {
    const response = await topicReq.recommend(
      draft.value.gid,
      draft.value.forumId,
      draft.value.viewType ?? 1,
      draft.value.subject,
      previewDocument.value.text,
      draft.value.topicIds.map(String),
    );
    if (!active || version !== topicRecommendVersion) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    topicRecommendations.value = readTopicOptions(response.data?.topics);
    loadedTopicRecommendKey = key;
  } catch (cause) {
    if (active && version === topicRecommendVersion && !topicQuery.value.trim())
      topicError.value = TGHttps.getErrMsg(cause);
  } finally {
    if (version === topicRecommendVersion) topicRecommendLoading.value = false;
  }
}

async function searchTopics(keyword: string, version: number): Promise<void> {
  try {
    const response = await topicReq.search(keyword);
    if (!active || version !== topicSearchVersion) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    topicSearchResults.value = readTopicOptions(response.data?.topics);
  } catch (cause) {
    if (active && version === topicSearchVersion && topicQuery.value.trim())
      topicError.value = TGHttps.getErrMsg(cause);
  } finally {
    if (version === topicSearchVersion) topicSearchLoading.value = false;
  }
}

function handleTopicSearch(value: string): void {
  topicError.value = "";
  if (topicSearchTimer !== undefined) window.clearTimeout(topicSearchTimer);
  topicSearchTimer = undefined;
  const version = ++topicSearchVersion;
  const keyword = value.trim();
  if (!keyword) {
    topicSearchLoading.value = false;
    topicSearchResults.value = [];
    if (loadedTopicRecommendKey !== topicRecommendationKey.value) void loadTopicRecommendations();
    return;
  }
  topicSearchResults.value = [];
  topicSearchLoading.value = true;
  topicSearchTimer = window.setTimeout(() => {
    topicSearchTimer = undefined;
    void searchTopics(keyword, version);
  }, 300);
}

function handleTopicFocus(focused: boolean): void {
  if (!focused || topicQuery.value.trim()) return;
  void loadTopicRecommendations();
}

function selectTopic(value: number): void {
  const topic = [...topicRecommendations.value, ...topicSearchResults.value].find(
    (item) => item.id === value,
  );
  if (!topic || draft.value.topicIds.length >= maxTopicCount) return;
  if (!draft.value.topicIds.includes(value)) draft.value.topicIds.push(value);
  topicNames.value.set(value, topic.name);
  if (topic.desc) topicDescs.value.set(value, topic.desc);
  if (topic.cover) topicCovers.value.set(value, topic.cover);
  topicError.value = "";
  void nextTick(() => {
    topicQuery.value = "";
  });
}

async function savePost(): Promise<void> {
  if (
    busy.value ||
    componentDialog.value.visible ||
    componentDialog.value.loading ||
    editorInvalid.value ||
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
  const action = source ? "保存修改" : isPicture.value ? "发布图片帖" : "发布长文";
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
    if (source) {
      if (!settings.forumId) throw new Error("请选择发布版块");
    } else {
      if (settings.forumId < 0) throw new Error("发布版块无效");
      if (settings.forumId === 0 && settings.topicIds.length === 0)
        throw new Error("请选择发布版块或至少一个话题");
    }
    if (settings.forumId > 0) {
      const permission = await postEditReq.checkRelease(
        settings.gid,
        settings.forumId,
        requestCookie,
      );
      if (!active || version !== contextVersion.value || !canWrite.value) return;
      if (permission.retcode !== 0)
        throw new Error(`[${permission.retcode}] ${permission.message}`);
      if (permission.data?.can_release === false)
        throw new Error(permission.data.msg?.trim() || "当前账号暂时无法在该版块发帖");
    }
    if (!active || version !== contextVersion.value || !canWrite.value) return;
    const snapshot: TGApp.BBS.Reply.AccountSnapshot = {
      uid: requestCookie.ltuid,
      cookie: requestCookie,
    };
    if (!source) {
      const execution = await executeReplyForCurrentAccount(snapshot, () =>
        postEditReq.create(settings, requestCookie),
      );
      if (!active || version !== contextVersion.value) return;
      if (!execution.allowed) throw new Error("账号状态已变化，请重新打开编辑器");
      const response = execution.data;
      if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
      const releaseCheck = response.data?.release_check_result;
      if (releaseCheck?.can_release === false)
        throw new Error(releaseCheck.msg?.trim() || "当前账号暂时无法在该版块发帖");
      const rawPostId = response.data?.post_id;
      const postId =
        typeof rawPostId === "number"
          ? String(rawPostId)
          : typeof rawPostId === "string" && /^[1-9]\d*$/u.test(rawPostId)
            ? rawPostId
            : undefined;
      pending.value = false;
      showSnackbar.success(`${action}成功`);
      emits("saved", postId);
      return;
    }
    let latestSource = source;
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
    const execution = await executeReplyForCurrentAccount(snapshot, () =>
      postEditReq.update(latestSource, settings, requestCookie),
    );
    if (!active || version !== contextVersion.value) return;
    if (!execution.allowed || !matchesCurrentAccount(snapshot))
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

.post-composer-preview :deep(.post-preview-emoticon),
.post-composer-preview :deep(.quill-emoticon),
.post-composer-preview :deep(.quill-custom-emoticon) {
  display: inline-block;
  width: auto;
  max-width: 120px;
  height: 32px;
  object-fit: contain;
  vertical-align: middle;
}

.post-composer-preview :deep(a) {
  color: var(--common-text-title);
}

.post-composer-preview :deep(.ql-divider) {
  margin: 10px auto;
}

.post-composer-preview :deep(.ql-vod) {
  display: block;
  margin: 10px 0;
}

.post-composer-preview :deep(.ql-vod-card) {
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

.post-composer-preview :deep(.ql-vod-cover) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-composer-preview :deep(.ql-vod-placeholder) {
  color: var(--box-text-4);
  font-size: 14px;
}

.post-composer-preview :deep(.ql-vod-play) {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 48px;
  height: 48px;
  opacity: 0.85;
  transform: translate(-50%, -50%);
}

.post-composer-preview :deep(.ql-vod-duration) {
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

.post-composer-hint {
  margin: 0;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 20px;
}

.post-composer-original {
  display: flex;
  align-items: center;
  gap: 12px;
}

.post-composer-forum-field,
.post-composer-topic-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.post-composer-topic-head {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 12px;
}

.post-composer-selected-topics {
  display: flex;
  min-width: 0;
  flex: 1 1 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.post-composer-selected-topic {
  position: relative;
  min-width: 0;
}

.post-composer-topic-close {
  position: absolute;
  top: -10px;
  right: -10px;
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--box-bg-1);
  border-radius: 50%;
  background: var(--tgc-od-red);
  color: var(--tgc-white-1);
  cursor: pointer;
}

.post-composer-topic-close:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.post-composer-topic-close:hover {
  opacity: 0.82;
}

.post-composer-forums,
.post-composer-topic-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.post-composer-forum,
.post-composer-topic-option {
  display: inline-flex;
  max-width: 100%;
  min-height: 32px;
  align-items: center;
  padding: 6px 10px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-2);
  cursor: pointer;
  font-size: 13px;
  gap: 6px;
  line-height: 20px;
}

.post-composer-forum img,
.post-composer-topic-option img {
  width: 20px;
  height: 20px;
  flex: none;
  border-radius: 4px;
  object-fit: cover;
}

.post-composer-forum span,
.post-composer-topic-option span {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-composer-topic-options .post-composer-topic-option {
  background: var(--box-bg-4);
}

.post-composer-forum:not(.selected) {
  opacity: 0.55;
}

.post-composer-forum.selected {
  border-color: var(--common-shadow-2);
  background: var(--box-bg-4);
  color: var(--common-text-title);
}

.post-composer-forum:disabled,
.post-composer-topic-option:disabled {
  cursor: default;
}

.post-composer-forum:focus-visible,
.post-composer-topic-option:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.post-composer-forum:hover:not(:disabled, .selected),
.post-composer-topic-option:hover:not(:disabled) {
  border-color: var(--common-shadow-2);
  background: var(--box-bg-4);
  color: var(--common-text-title);
  opacity: 0.85;
}

.post-composer-topic-option.post-composer-selected-topic,
.post-composer-topic-option.post-composer-selected-topic:hover {
  border-color: var(--common-shadow-2);
  background: var(--box-bg-4);
  color: var(--common-text-title);
  cursor: default;
  opacity: 1;
}

.post-composer-topic-search {
  width: 280px;
  min-width: 0;
  max-width: 45%;
  flex: none;
  margin-left: auto;
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
