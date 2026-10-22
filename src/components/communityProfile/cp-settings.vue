<template>
  <section :aria-busy="loading || saving" aria-labelledby="cp-settings-title" class="cp-settings">
    <header class="cp-settings-header">
      <div class="cp-settings-heading">
        <h2 id="cp-settings-title">
          <v-icon size="20" aria-hidden="true">{{ sectionIcon }}</v-icon>
          {{ sectionTitle }}
        </h2>
        <p>{{ sectionDescription }}</p>
      </div>
    </header>

    <div v-if="!canViewProfile" aria-live="polite" class="cp-settings-state" role="status">
      <v-icon size="32">mdi-account-lock-outline</v-icon>
      <p>当前账号凭据不可用，请重新登录米游社账号。</p>
    </div>
    <div v-else-if="loading" aria-live="polite" class="cp-settings-state" role="status">
      <v-progress-circular indeterminate size="28" />
      <p>正在加载隐私设置…</p>
    </div>
    <div v-else-if="loadError" aria-live="assertive" class="cp-settings-state" role="alert">
      <v-icon size="32">mdi-alert-circle-outline</v-icon>
      <p>{{ loadError }}</p>
      <v-btn variant="tonal" @click="loadSection">重新加载</v-btn>
    </div>
    <form v-else class="cp-settings-form" @submit.prevent="handleSave">
      <div v-if="props.section === 'privacy'" class="cp-settings-list">
        <div class="cp-settings-row">
          <div class="cp-settings-row-copy">
            <h3>个人主页访问权限</h3>
            <p>允许其他用户打开你的米游社个人主页。</p>
          </div>
          <v-switch
            v-model="privacyDraft.showUserCenter"
            aria-label="允许访问个人主页"
            class="cp-settings-switch"
            color="var(--common-text-title)"
            thumbColor="var(--app-page-bg)"
            :disabled="saving"
            hide-details
            inset
          />
        </div>
        <div class="cp-settings-row">
          <div class="cp-settings-row-copy">
            <h3>展示我发布的帖子与动态</h3>
            <p>控制帖子和动态是否出现在个人主页中。</p>
          </div>
          <v-switch
            v-model="privacyDraft.showPosts"
            aria-label="在个人主页展示我发布的帖子与动态"
            class="cp-settings-switch"
            color="var(--common-text-title)"
            thumbColor="var(--app-page-bg)"
            :disabled="saving"
            hide-details
            inset
          />
        </div>
        <div class="cp-settings-row">
          <div class="cp-settings-row-copy">
            <h3>展示我的评论</h3>
            <p>控制评论是否出现在个人中心的评论列表中。</p>
          </div>
          <v-switch
            v-model="privacyDraft.showReplies"
            aria-label="在个人中心展示我的评论"
            class="cp-settings-switch"
            color="var(--common-text-title)"
            thumbColor="var(--app-page-bg)"
            :disabled="saving"
            hide-details
            inset
          />
        </div>
        <div class="cp-settings-row">
          <div class="cp-settings-row-copy">
            <h3>展示我的收藏</h3>
            <p>控制收藏是否出现在个人中心的收藏列表中。</p>
          </div>
          <v-switch
            v-model="privacyDraft.showCollections"
            aria-label="在个人中心展示我的收藏"
            class="cp-settings-switch"
            color="var(--common-text-title)"
            thumbColor="var(--app-page-bg)"
            :disabled="saving"
            hide-details
            inset
          />
        </div>
        <div class="cp-settings-row">
          <div class="cp-settings-row-copy">
            <h3>上传图片时添加水印</h3>
            <p>控制发布图片时是否自动添加米游社水印。</p>
          </div>
          <v-switch
            v-model="privacyDraft.addWatermark"
            aria-label="上传图片时添加水印"
            class="cp-settings-switch"
            color="var(--common-text-title)"
            thumbColor="var(--app-page-bg)"
            :disabled="saving"
            hide-details
            inset
          />
        </div>
      </div>

      <div v-else class="cp-settings-edit">
        <div class="cp-settings-identity">
          <button
            :disabled="saving || isAvatarInAudit || !canWriteProfile"
            aria-label="更换头像"
            class="cp-settings-avatar"
            title="更换头像"
            type="button"
            @click="openAvatarPicker"
          >
            <CpAvatar :size="72" :user="previewUser" />
            <span aria-hidden="true" class="cp-settings-avatar-overlay">
              <v-icon size="20">mdi-camera-outline</v-icon>
            </span>
          </button>
          <div class="cp-settings-identity-copy">
            <h3>{{ editDraft.nickname.trim() || props.profile.nickname }}</h3>
            <p>{{ editDraft.introduce.trim() || "这个人很神秘，什么都没有留下。" }}</p>
            <p v-if="isAvatarInAudit" class="cp-settings-identity-hint">
              <v-icon size="14">mdi-clock-outline</v-icon>
              当前头像正在审核中，暂不可更换。
            </p>
            <p v-else-if="avatarDraft.file" class="cp-settings-identity-hint">
              自定义头像将在保存资料时上传并提交审核。
            </p>
            <p v-else-if="avatarDirty && avatarDraft.assetId" class="cp-settings-identity-hint">
              动态头像将在保存资料时提交米游社。
            </p>
          </div>
          <div class="cp-settings-identity-actions">
            <v-btn
              :disabled="saving || isAvatarInAudit"
              prepend-icon="mdi-account-circle-outline"
              size="small"
              type="button"
              variant="tonal"
              @click="openAvatarPicker"
            >
              更换头像
            </v-btn>
            <v-btn
              :disabled="saving"
              prepend-icon="mdi-image-filter-frames"
              size="small"
              type="button"
              variant="tonal"
              @click="openPendantPicker"
            >
              选择挂件
            </v-btn>
          </div>
        </div>
        <v-text-field
          v-model="editDraft.nickname"
          :disabled="saving"
          label="昵称"
          persistent-hint
          hint="昵称修改可能需要经过米游社审核。"
          variant="outlined"
        />
        <v-textarea
          v-model="editDraft.introduce"
          :disabled="saving"
          auto-grow
          label="简介"
          persistent-hint
          hint="简介可以留空。"
          rows="4"
          variant="outlined"
        />
      </div>

      <div v-if="saveError" aria-live="assertive" class="cp-settings-message is-error" role="alert">
        <v-icon size="18">mdi-alert-circle-outline</v-icon>
        <span>{{ saveError }}</span>
      </div>
      <div
        v-if="saveMessage"
        aria-live="polite"
        class="cp-settings-message is-success"
        role="status"
      >
        <v-icon size="18">mdi-check-circle-outline</v-icon>
        <span>{{ saveMessage }}</span>
      </div>
      <footer class="cp-settings-footer">
        <v-btn
          :disabled="!canSave || saving"
          :loading="saving"
          color="var(--tgc-btn-1)"
          type="submit"
          variant="flat"
        >
          {{ props.section === "privacy" ? "保存隐私设置" : "保存资料" }}
        </v-btn>
      </footer>
    </form>
    <template v-if="props.section === 'edit'">
      <CpAvatarPicker
        v-model="avatarPickerVisible"
        :currentAssetId="avatarDraft.assetId"
        :currentCrop="avatarDraft.crop"
        :currentCustomSource="avatarDraft.sourceFile"
        :currentId="avatarDraft.id"
        :disabled="saving || !canWriteProfile || isAvatarInAudit"
        :dynamicAvatars="dynamicAvatars"
        :dynamicError="dynamicError"
        :dynamicLoading="dynamicLoading"
        :error="avatarError"
        :groups="avatarGroups"
        :loading="avatarLoading"
        @confirm="handleAvatarConfirm"
        @confirm-custom="handleCustomAvatarConfirm"
        @confirm-dynamic="handleDynamicAvatarConfirm"
        @retry="loadAvatars"
        @retry-dynamic="loadDynamicAvatars"
      />
      <CpPendantPicker
        v-model="pendantPickerVisible"
        :commentDecorations="commentDecorations"
        :commentError="commentListError"
        :commentLoading="commentListLoading"
        :currentCommentId="commentDraftId"
        :currentUrl="pendantDraft.url"
        :serverCommentId="commentOriginalId"
        :error="pendantListError"
        :loading="pendantListLoading"
        :pendants="pendants"
        :serverUrl="pendantOriginal.url"
        :user="previewUser"
        @confirm="handlePendantConfirm"
        @confirm-comment="handleCommentConfirm"
        @retry="loadPendants"
        @retry-comment="loadCommentDecorations"
      />
    </template>
  </section>
</template>

<script lang="ts" setup>
import CpAvatarPicker from "@comp/communityProfile/cp-avatar-picker.vue";
import CpAvatar from "@comp/communityProfile/cp-avatar.vue";
import CpPendantPicker from "@comp/communityProfile/cp-pendant-picker.vue";
import showDialog from "@comp/func/dialog.js";
import bbsEnum from "@enum/bbs.js";
import communitySettingsReq, {
  buildPrivacyUpdate,
  getPrivacyDraft,
} from "@req/communitySettingsReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { matchesCurrentAccount } from "@utils/bbsReplyAccount.js";
import TGHttps from "@utils/TGHttps.js";
import { getUserAvatar } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch } from "vue";

type SettingsSection = "privacy" | "edit";

type SettingsProps = {
  section: SettingsSection;
  profile: TGApp.BBS.User.Info;
  audit?: TGApp.BBS.User.InfoRes["audit_info"];
};

type AccountSnapshot = {
  uid: string;
  profileUid: string;
  cookie: TGApp.App.Account.Cookie;
};

/**
 * 编辑资料时的头像草稿。
 * @since Beta v0.12.6
 */
type AvatarSelection = {
  /** 预设头像编号 */
  id: string;
  /** 动态头像资源编号 */
  assetId: string;
  /** 头像预览链接 */
  url: string;
  /** 等待保存时上传的自定义头像 */
  file?: File;
  /** 自定义头像的原始图片 */
  sourceFile?: File;
  /** 自定义头像的裁切位置 */
  crop?: TGApp.BBS.CommunitySettings.AvatarCrop;
};

type PendantSelection = {
  /** 头像框 ID，0 表示不使用 */
  id: number;
  /** 头像框链接 */
  url: string;
};

type ProfilePreviewUser = Pick<TGApp.BBS.User.Info, "nickname" | "avatar_url" | "pendant"> & {
  avatar_ext: TGApp.BBS.User.AvatarExt | null;
};

const props = defineProps<SettingsProps>();
const emit = defineEmits<{ saved: [warning?: string] }>();
const { isLogin } = storeToRefs(useAppStore());
const { uid, cookie } = storeToRefs(useUserStore());
const privacyDraft = reactive({
  showPosts: true,
  showReplies: true,
  showCollections: true,
  addWatermark: true,
  showUserCenter: true,
});
const privacyOriginal = reactive({
  showPosts: true,
  showReplies: true,
  showCollections: true,
  addWatermark: true,
  showUserCenter: true,
});
const editDraft = reactive({ nickname: "", introduce: "" });
const editOriginal = reactive({ nickname: "", introduce: "" });
const avatarDraft = ref<AvatarSelection>({ id: "", assetId: "", url: "" });
const avatarOriginal = ref<AvatarSelection>({ id: "", assetId: "", url: "" });
const avatarGroups = shallowRef<Array<TGApp.BBS.CommunitySettings.AvatarGroup>>([]);
const avatarPickerVisible = ref<boolean>(false);
const avatarLoading = ref<boolean>(false);
const avatarError = ref<string>("");
const dynamicAvatars = shallowRef<Array<TGApp.BBS.CommunitySettings.DynamicAvatar>>([]);
const dynamicLoading = ref<boolean>(false);
const dynamicError = ref<string>("");
const dynamicLoaded = ref<boolean>(false);
const pendantDraft = ref<PendantSelection>({ id: 0, url: "" });
const pendantOriginal = ref<PendantSelection>({ id: 0, url: "" });
const pendants = shallowRef<Array<TGApp.BBS.CommunitySettings.Pendant>>([]);
const pendantPickerVisible = ref<boolean>(false);
const pendantListLoading = ref<boolean>(false);
const pendantListError = ref<string>("");
const pendantLoaded = ref<boolean>(false);
const commentDecorations = shallowRef<Array<TGApp.BBS.CommunitySettings.CommentDecoration>>([]);
const commentDraftId = ref<string | null>(null);
const commentOriginalId = ref<string | null>(null);
const commentListLoading = ref<boolean>(false);
const commentListError = ref<string>("");
const commentLoaded = ref<boolean>(false);
const loading = ref<boolean>(false);
const saving = ref<boolean>(false);
const privacyLoaded = ref<boolean>(false);
const editLoaded = ref<boolean>(false);
const loadError = ref<string>("");
const saveError = ref<string>("");
const saveMessage = ref<string>("");
let requestVersion = 0;
let avatarRequestVersion = 0;
let avatarAssetsRequestVersion = 0;
let pendantRequestVersion = 0;
let commentRequestVersion = 0;
let active = true;
let avatarPreviewUrl: string | undefined;
let saveController: AbortController | undefined;

const canViewProfile = computed<boolean>(() => {
  const currentUid = uid.value;
  const currentCookie = cookie.value;
  return (
    isLogin.value &&
    currentUid !== undefined &&
    currentUid.trim() !== "" &&
    props.profile.uid === currentUid &&
    currentCookie !== undefined &&
    currentCookie.ltuid === currentUid &&
    currentCookie.ltoken.trim() !== "" &&
    currentCookie.account_id.trim() !== "" &&
    currentCookie.cookie_token.trim() !== ""
  );
});
const canWriteProfile = computed<boolean>(
  () => canViewProfile.value && cookie.value?.account_id === props.profile.uid,
);
const privacyDirty = computed<boolean>(
  () =>
    privacyDraft.showPosts !== privacyOriginal.showPosts ||
    privacyDraft.showReplies !== privacyOriginal.showReplies ||
    privacyDraft.showCollections !== privacyOriginal.showCollections ||
    privacyDraft.addWatermark !== privacyOriginal.addWatermark ||
    privacyDraft.showUserCenter !== privacyOriginal.showUserCenter,
);
const isAvatarInAudit = computed<boolean>(() => props.audit?.is_avatar_in_audit === true);
const avatarDirty = computed<boolean>(
  () =>
    avatarDraft.value.file !== undefined ||
    avatarDraft.value.id !== avatarOriginal.value.id ||
    avatarDraft.value.assetId !== avatarOriginal.value.assetId ||
    avatarDraft.value.url !== avatarOriginal.value.url,
);
const pendantDirty = computed<boolean>(() => pendantDraft.value.url !== pendantOriginal.value.url);
const commentDirty = computed<boolean>(
  () => commentDraftId.value !== null && commentDraftId.value !== commentOriginalId.value,
);
const nicknameDirty = computed<boolean>(
  () => editDraft.nickname.trim() !== editOriginal.nickname.trim(),
);
const introduceDirty = computed<boolean>(
  () => editDraft.introduce.trim() !== editOriginal.introduce.trim(),
);
const editDirty = computed<boolean>(
  () =>
    nicknameDirty.value ||
    introduceDirty.value ||
    avatarDirty.value ||
    pendantDirty.value ||
    commentDirty.value,
);
const previewUser = computed<ProfilePreviewUser>(() => ({
  nickname: editDraft.nickname.trim() || props.profile.nickname,
  avatar_url: avatarDraft.value.url,
  pendant: pendantDraft.value.url,
  avatar_ext: avatarDirty.value || isAvatarInAudit.value ? null : props.profile.avatar_ext,
}));
const canSave = computed<boolean>(() => {
  if (!canWriteProfile.value) return false;
  if (props.section === "privacy") return privacyLoaded.value && privacyDirty.value;
  return editLoaded.value && editDirty.value;
});
const sectionTitle = computed<string>(() =>
  props.section === "privacy" ? "隐私设置" : "编辑资料",
);
const sectionIcon = computed<string>(() =>
  props.section === "privacy" ? "mdi-shield-lock-outline" : "mdi-account-edit-outline",
);
const sectionDescription = computed<string>(() =>
  props.section === "privacy"
    ? "管理个人中心中帖子、评论、收藏和主页访问权限。"
    : "修改当前账号在米游社展示的昵称、简介、头像和挂件。",
);
watch(
  [
    () => props.section,
    () => props.profile.uid,
    isLogin,
    uid,
    () => cookie.value?.account_id,
    () => cookie.value?.cookie_token,
    () => cookie.value?.ltuid,
    () => cookie.value?.ltoken,
    () => cookie.value?.stuid,
    () => cookie.value?.stoken,
    () => cookie.value?.mid,
    () => props.profile.nickname,
    () => props.profile.introduce,
    () => props.profile.avatar,
    () => props.profile.avatar_url,
    () => props.profile.avatar_ext?.avatar_type,
    () => props.profile.avatar_ext?.avatar_assets_id,
    () => props.profile.pendant,
    () => props.audit?.is_avatar_in_audit,
    () => props.audit?.avatar_url,
  ],
  () => void loadSection(),
  { immediate: true, flush: "sync" },
);

onBeforeUnmount(() => {
  active = false;
  saveController?.abort();
  releaseAvatarPreview();
  requestVersion += 1;
  avatarRequestVersion += 1;
  avatarAssetsRequestVersion += 1;
  pendantRequestVersion += 1;
  commentRequestVersion += 1;
});

function getAccountSnapshot(): AccountSnapshot | undefined {
  if (!canViewProfile.value || uid.value === undefined || cookie.value === undefined)
    return undefined;
  return {
    uid: uid.value,
    profileUid: props.profile.uid,
    cookie: { ...cookie.value },
  };
}

function getWriteSnapshot(): AccountSnapshot | undefined {
  const snapshot = getAccountSnapshot();
  if (!snapshot || snapshot.cookie.account_id !== snapshot.profileUid) return undefined;
  if (!matchesPersistedSnapshot(snapshot)) return undefined;
  return snapshot;
}

function matchesPersistedSnapshot(snapshot: AccountSnapshot): boolean {
  return matchesCurrentAccount({
    uid: snapshot.uid,
    cookie: { ltoken: snapshot.cookie.ltoken, ltuid: snapshot.cookie.ltuid },
  });
}

function matchesAccount(snapshot: AccountSnapshot): boolean {
  const currentCookie = cookie.value;
  return (
    canViewProfile.value &&
    uid.value === snapshot.uid &&
    props.profile.uid === snapshot.profileUid &&
    currentCookie?.account_id === snapshot.cookie.account_id &&
    currentCookie?.cookie_token === snapshot.cookie.cookie_token &&
    currentCookie?.ltuid === snapshot.cookie.ltuid &&
    currentCookie?.ltoken === snapshot.cookie.ltoken &&
    currentCookie?.stuid === snapshot.cookie.stuid &&
    currentCookie?.stoken === snapshot.cookie.stoken &&
    currentCookie?.mid === snapshot.cookie.mid
  );
}

function isCurrentRequest(version: number, snapshot: AccountSnapshot): boolean {
  return active && version === requestVersion && matchesAccount(snapshot);
}

function isCurrentAvatarAssetsRequest(version: number, snapshot: AccountSnapshot): boolean {
  return active && version === avatarAssetsRequestVersion && matchesAccount(snapshot);
}

function isCurrentPendantRequest(version: number, snapshot: AccountSnapshot): boolean {
  return active && version === pendantRequestVersion && matchesAccount(snapshot);
}

function isCurrentCommentRequest(version: number, snapshot: AccountSnapshot): boolean {
  return active && version === commentRequestVersion && matchesAccount(snapshot);
}

function isCurrentWrite(version: number, snapshot: AccountSnapshot): boolean {
  return isCurrentRequest(version, snapshot) && matchesPersistedSnapshot(snapshot);
}

function resetMessages(): void {
  loadError.value = "";
  saveError.value = "";
  saveMessage.value = "";
  avatarError.value = "";
  dynamicError.value = "";
  pendantListError.value = "";
  commentListError.value = "";
}

function initializeEditDraft(): void {
  editDraft.nickname = props.profile.nickname;
  editDraft.introduce = props.profile.introduce;
  editOriginal.nickname = props.profile.nickname;
  editOriginal.introduce = props.profile.introduce;
  const avatarUrl =
    isAvatarInAudit.value && props.audit?.avatar_url
      ? props.audit.avatar_url
      : getUserAvatar(props.profile);
  const avatarExt = props.profile.avatar_ext;
  const assetId =
    avatarExt?.avatar_type === bbsEnum.user.avatarExtType.GIF ? avatarExt.avatar_assets_id : "";
  avatarDraft.value = { id: props.profile.avatar, assetId, url: avatarUrl };
  avatarOriginal.value = { id: props.profile.avatar, assetId, url: avatarUrl };
  pendantDraft.value = { id: 0, url: props.profile.pendant };
  pendantOriginal.value = { id: 0, url: props.profile.pendant };
  editLoaded.value = true;
}

function applyPrivacyResponse(data: TGApp.BBS.CommunitySettings.PrivacyInfo): void {
  const draft = getPrivacyDraft(
    data,
    props.profile.community_info.user_func_status.user_center_view,
  );
  Object.assign(privacyDraft, draft);
  Object.assign(privacyOriginal, draft);
  privacyLoaded.value = true;
}

function buildPrivacyPayload(): TGApp.BBS.CommunitySettings.PrivacyUpdate {
  return buildPrivacyUpdate(privacyDraft);
}

async function loadSection(): Promise<void> {
  saveController?.abort();
  saveController = undefined;
  releaseAvatarPreview();
  avatarDraft.value = { id: "", assetId: "", url: "" };
  const version = ++requestVersion;
  loading.value = false;
  saving.value = false;
  privacyLoaded.value = false;
  editLoaded.value = false;
  avatarPickerVisible.value = false;
  pendantPickerVisible.value = false;
  avatarAssetsRequestVersion += 1;
  dynamicAvatars.value = [];
  dynamicLoading.value = false;
  dynamicLoaded.value = false;
  pendantRequestVersion += 1;
  pendantListLoading.value = false;
  pendantLoaded.value = false;
  pendants.value = [];
  commentRequestVersion += 1;
  commentListLoading.value = false;
  commentLoaded.value = false;
  commentDecorations.value = [];
  commentDraftId.value = null;
  commentOriginalId.value = null;
  resetMessages();
  if (!canViewProfile.value) return;
  if (props.section === "edit") {
    initializeEditDraft();
    return;
  }
  const snapshot = getAccountSnapshot();
  if (!snapshot) return;
  loading.value = true;
  try {
    const response = await communitySettingsReq.getPrivacy(snapshot.cookie);
    if (!isCurrentRequest(version, snapshot)) return;
    if (response.retcode !== 0) {
      throw new Error(`[${response.retcode}] ${response.message}`);
    }
    applyPrivacyResponse(response.data);
  } catch (cause) {
    if (isCurrentRequest(version, snapshot)) loadError.value = TGHttps.getErrMsg(cause);
  } finally {
    if (isCurrentRequest(version, snapshot)) loading.value = false;
  }
}

function buildProfilePayload(): TGApp.BBS.CommunitySettings.ProfileUpdate {
  const payload: TGApp.BBS.CommunitySettings.ProfileUpdate = {};
  const nickname = editDraft.nickname.trim();
  const introduce = editDraft.introduce.trim();
  if (nickname !== editOriginal.nickname.trim()) payload.nickname = nickname;
  if (introduce !== editOriginal.introduce.trim()) payload.introduce = introduce;
  if (avatarDirty.value && !avatarDraft.value.file && !isAvatarInAudit.value) {
    payload.avatar = avatarDraft.value.id;
    payload.avatar_url = avatarDraft.value.url;
    payload.avatar_assets_id = avatarDraft.value.assetId;
    payload.gender = props.profile.gender;
  }
  return payload;
}

async function handleSave(): Promise<void> {
  if (!canSave.value || saving.value) return;
  if (props.section === "edit" && editDraft.nickname.trim() === "") {
    saveError.value = "昵称不能为空。";
    saveMessage.value = "";
    return;
  }
  const snapshot = getWriteSnapshot();
  if (!snapshot) {
    saveError.value = "当前账号凭据与资料不匹配，请重新加载后重试。";
    saveMessage.value = "";
    return;
  }
  const profilePayload = props.section === "edit" ? buildProfilePayload() : undefined;
  const pendantChanged = props.section === "edit" && pendantDirty.value;
  const commentChanged = props.section === "edit" && commentDirty.value;
  const commentId = commentDraftId.value;
  const customAvatarFile =
    props.section === "edit" && !isAvatarInAudit.value ? avatarDraft.value.file : undefined;
  if (
    props.section === "edit" &&
    Object.keys(profilePayload ?? {}).length === 0 &&
    !pendantChanged &&
    !commentChanged &&
    !customAvatarFile
  ) {
    saveError.value = "没有需要保存的修改。";
    saveMessage.value = "";
    return;
  }
  const version = ++requestVersion;
  const controller = new AbortController();
  saveController = controller;
  saving.value = true;
  saveError.value = "";
  saveMessage.value = "";
  let partiallySaved = false;
  let saveOperation = "资料保存";
  try {
    if (props.section === "privacy") {
      const response = await communitySettingsReq.setPrivacy(
        snapshot.cookie,
        buildPrivacyPayload(),
      );
      if (!isCurrentWrite(version, snapshot)) return;
      if (response.retcode !== 0) {
        throw new Error(`[${response.retcode}] ${response.message}`);
      }
      saveMessage.value = "隐私设置已保存。";
      emit("saved");
      return;
    }
    if (customAvatarFile && profilePayload) {
      const policy = await communitySettingsReq.getCustomAvatarPolicy(
        snapshot.cookie,
        controller.signal,
      );
      if (!isCurrentWrite(version, snapshot)) return;
      if (policy.balance < policy.rawCost) {
        throw new Error(
          `米游币余额不足，米游社要求至少持有 ${policy.rawCost} 米游币，当前持有 ${policy.balance} 米游币。`,
        );
      }
      if (policy.cost > 0) {
        const confirmed = await showDialog.checkF({
          title: "更换自定义头像",
          text: `账号 ${snapshot.uid} 更换自定义头像需要花费 ${policy.cost} 米游币，当前持有 ${policy.balance} 米游币。保存后将提交米游社审核。`,
          confirmLabel: `花费 ${policy.cost} 米游币并保存`,
          cancelLabel: "取消",
          otcancel: true,
        });
        if (!confirmed || !isCurrentWrite(version, snapshot)) return;
      }
      const avatarUpdate = await communitySettingsReq.uploadCustomAvatar(
        customAvatarFile,
        snapshot.cookie,
        controller.signal,
      );
      if (!isCurrentWrite(version, snapshot)) return;
      Object.assign(profilePayload, avatarUpdate, {
        nickname: editDraft.nickname.trim(),
        introduce: editDraft.introduce.trim(),
        gender: props.profile.gender,
      });
    }
    const useAppProfile =
      customAvatarFile !== undefined || (avatarDirty.value && avatarDraft.value.assetId !== "");
    if (useAppProfile && profilePayload) {
      Object.assign(profilePayload, {
        nickname: editDraft.nickname.trim(),
        introduce: editDraft.introduce.trim(),
        gender: props.profile.gender,
      });
    }
    if (Object.keys(profilePayload ?? {}).length > 0) {
      const response = useAppProfile
        ? await communitySettingsReq.updateAppProfile(
            snapshot.cookie,
            profilePayload ?? {},
            controller.signal,
          )
        : await communitySettingsReq.updateProfile(
            snapshot.cookie,
            profilePayload ?? {},
            controller.signal,
          );
      if (!isCurrentWrite(version, snapshot)) return;
      if (response.retcode !== 0) {
        throw new Error(`[${response.retcode}] ${response.message}`);
      }
      partiallySaved = true;
    }
    if (pendantChanged) {
      saveOperation = "头像框设置";
      const response = await communitySettingsReq.setPendant(
        snapshot.cookie,
        pendantDraft.value.id,
        controller.signal,
      );
      if (!isCurrentWrite(version, snapshot)) return;
      if (response.retcode !== 0) {
        throw new Error(`[${response.retcode}] ${response.message}`);
      }
      pendantOriginal.value = { id: pendantDraft.value.id, url: pendantDraft.value.url };
      partiallySaved = true;
    }
    if (commentChanged && commentId !== null) {
      saveOperation = "评论装扮设置";
      const response = await communitySettingsReq.setCommentDecoration(
        snapshot.cookie,
        commentId,
        controller.signal,
      );
      if (!isCurrentWrite(version, snapshot)) return;
      if (response.retcode !== 0) {
        throw new Error(`[${response.retcode}] ${response.message}`);
      }
      commentOriginalId.value = commentId;
    }
    saveMessage.value = "资料已提交保存。";
    emit("saved");
  } catch (cause) {
    if (!isCurrentWrite(version, snapshot)) return;
    if (partiallySaved) {
      emit("saved", `部分资料已保存，但${saveOperation}失败：${TGHttps.getErrMsg(cause)}`);
      return;
    }
    saveError.value = TGHttps.getErrMsg(cause);
  } finally {
    if (saveController === controller) saveController = undefined;
    if (isCurrentRequest(version, snapshot)) {
      saving.value = false;
      if (!matchesPersistedSnapshot(snapshot)) {
        saveError.value = "账号已切换，请重新加载后重试。";
      }
    }
  }
}

function openAvatarPicker(): void {
  if (!canWriteProfile.value || isAvatarInAudit.value || saving.value) return;
  avatarPickerVisible.value = true;
  if (avatarGroups.value.length === 0 && !avatarLoading.value) void loadAvatars();
  if (!dynamicLoaded.value && !dynamicLoading.value) void loadDynamicAvatars();
}

async function loadAvatars(): Promise<void> {
  if (avatarLoading.value) return;
  const version = ++avatarRequestVersion;
  avatarLoading.value = true;
  avatarError.value = "";
  try {
    const response = await communitySettingsReq.getAvatars();
    if (!active || version !== avatarRequestVersion) return;
    if (response.retcode !== 0) {
      throw new Error(`[${response.retcode}] ${response.message}`);
    }
    const groups = response.data.list.filter((group) => group.list.length > 0);
    avatarGroups.value = groups;
  } catch (cause) {
    if (active && version === avatarRequestVersion) {
      avatarError.value = TGHttps.getErrMsg(cause);
    }
  } finally {
    if (active && version === avatarRequestVersion) avatarLoading.value = false;
  }
}

function getDynamicAvatarUrl(
  resource: TGApp.BBS.CommunitySettings.AvatarAssetItem["resource"],
): string {
  if (!resource) return "";
  const hdResources = resource.avatar_hd_resources ?? [];
  const normalResources = resource.avatar_resources ?? [];
  const formats = [
    bbsEnum.user.avatarResType.GIF,
    bbsEnum.user.avatarResType.WEBP,
    bbsEnum.user.avatarResType.PNG,
  ];
  for (const format of formats) {
    const hdResource = hdResources.find((item) => item.format === format);
    if (hdResource) return hdResource.url;
    const normalResource = normalResources.find((item) => item.format === format);
    if (normalResource) return normalResource.url;
  }
  return "";
}

async function loadDynamicAvatars(): Promise<void> {
  if (dynamicLoading.value) return;
  const snapshot = getAccountSnapshot();
  if (!snapshot) {
    dynamicError.value = "当前账号凭据不可用，请重新登录后重试。";
    return;
  }
  const version = ++avatarAssetsRequestVersion;
  dynamicLoading.value = true;
  dynamicError.value = "";
  try {
    const response = await communitySettingsReq.getAvatarAssets(snapshot.cookie);
    if (!isCurrentAvatarAssetsRequest(version, snapshot)) return;
    if (response.retcode !== 0) {
      throw new Error(`[${response.retcode}] ${response.message}`);
    }
    const list: Array<TGApp.BBS.CommunitySettings.DynamicAvatar> = [];
    for (const asset of response.data.assets_list ?? []) {
      if (asset.assets_type !== 3) continue;
      const url = getDynamicAvatarUrl(asset.resource);
      if (url === "") continue;
      list.push({ id: asset.assets_id, name: asset.name, url });
    }
    dynamicAvatars.value = list;
    dynamicLoaded.value = true;
  } catch (cause) {
    if (isCurrentAvatarAssetsRequest(version, snapshot)) {
      dynamicError.value = TGHttps.getErrMsg(cause);
    }
  } finally {
    if (isCurrentAvatarAssetsRequest(version, snapshot)) dynamicLoading.value = false;
  }
}

function openPendantPicker(): void {
  if (!canWriteProfile.value || saving.value) return;
  pendantPickerVisible.value = true;
  if (!pendantLoaded.value && !pendantListLoading.value) void loadPendants();
  if (!commentLoaded.value && !commentListLoading.value) void loadCommentDecorations();
}

async function loadPendants(): Promise<void> {
  if (pendantListLoading.value) return;
  const snapshot = getAccountSnapshot();
  if (!snapshot) {
    pendantListError.value = "当前账号凭据不可用，请重新登录后重试。";
    return;
  }
  const version = ++pendantRequestVersion;
  pendantListLoading.value = true;
  pendantListError.value = "";
  try {
    const response = await communitySettingsReq.getPendantList(snapshot.cookie);
    if (!isCurrentPendantRequest(version, snapshot)) return;
    if (response.retcode !== 0) {
      throw new Error(`[${response.retcode}] ${response.message}`);
    }
    pendants.value = response.data.list;
    pendantLoaded.value = true;
  } catch (cause) {
    if (isCurrentPendantRequest(version, snapshot)) {
      pendantListError.value = TGHttps.getErrMsg(cause);
    }
  } finally {
    if (isCurrentPendantRequest(version, snapshot)) pendantListLoading.value = false;
  }
}

async function loadCommentDecorations(): Promise<void> {
  if (commentListLoading.value) return;
  const snapshot = getAccountSnapshot();
  if (!snapshot) {
    commentListError.value = "当前账号凭据不可用，请重新登录后重试。";
    return;
  }
  const version = ++commentRequestVersion;
  commentListLoading.value = true;
  commentListError.value = "";
  try {
    const response = await communitySettingsReq.getCommentDecorationList(snapshot.cookie);
    if (!isCurrentCommentRequest(version, snapshot)) return;
    if (response.retcode !== 0) {
      throw new Error(`[${response.retcode}] ${response.message}`);
    }
    commentDecorations.value = response.data.list;
    if (!commentLoaded.value) {
      const usedId = response.data.list.find((decoration) => decoration.is_used)?.id ?? "";
      commentDraftId.value = usedId;
      commentOriginalId.value = usedId;
    }
    commentLoaded.value = true;
  } catch (cause) {
    if (isCurrentCommentRequest(version, snapshot)) {
      commentListError.value = TGHttps.getErrMsg(cause);
    }
  } finally {
    if (isCurrentCommentRequest(version, snapshot)) commentListLoading.value = false;
  }
}

function releaseAvatarPreview(): void {
  if (!avatarPreviewUrl) return;
  URL.revokeObjectURL(avatarPreviewUrl);
  avatarPreviewUrl = undefined;
}

function handleCustomAvatarConfirm(
  selection: TGApp.BBS.CommunitySettings.CustomAvatarSelection,
): void {
  if (!canWriteProfile.value || isAvatarInAudit.value || saving.value) return;
  const previewUrl = URL.createObjectURL(selection.file);
  releaseAvatarPreview();
  avatarPreviewUrl = previewUrl;
  avatarDraft.value = {
    id: "",
    assetId: "",
    url: previewUrl,
    file: selection.file,
    sourceFile: selection.sourceFile,
    crop: selection.crop,
  };
  avatarPickerVisible.value = false;
}

function handleDynamicAvatarConfirm(avatar: TGApp.BBS.CommunitySettings.DynamicAvatar): void {
  if (!canWriteProfile.value || isAvatarInAudit.value || saving.value) return;
  releaseAvatarPreview();
  avatarDraft.value = { id: "", assetId: avatar.id, url: avatar.url };
  avatarPickerVisible.value = false;
}

function handleAvatarConfirm(avatar: TGApp.BBS.CommunitySettings.Avatar): void {
  if (!canWriteProfile.value || isAvatarInAudit.value || saving.value) return;
  releaseAvatarPreview();
  avatarDraft.value = { id: String(avatar.id), assetId: "", url: avatar.icon };
  avatarPickerVisible.value = false;
}

function handlePendantConfirm(pendant: TGApp.BBS.CommunitySettings.Pendant | null): void {
  if (!canWriteProfile.value || saving.value) return;
  pendantDraft.value = { id: pendant?.id ?? 0, url: pendant?.url ?? "" };
  pendantPickerVisible.value = false;
}

function handleCommentConfirm(
  decoration: TGApp.BBS.CommunitySettings.CommentDecoration | null,
): void {
  if (!canWriteProfile.value || saving.value || !commentLoaded.value) return;
  if (decoration && !decoration.owned) return;
  commentDraftId.value = decoration?.id ?? "";
  pendantPickerVisible.value = false;
}
</script>

<style lang="scss" scoped>
.cp-settings {
  display: flex;
  min-width: 0;
  flex-direction: column;
  color: var(--app-page-content);
  gap: 16px;
}

.cp-settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h2 {
    display: flex;
    align-items: center;
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
    gap: 8px;
  }

  p {
    margin: 0;
    color: var(--box-text-4);
    font-size: 12px;
  }
}

.cp-settings-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.cp-settings-form {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 16px;
}

.cp-settings-list,
.cp-settings-edit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cp-settings-row {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 16px;
}

.cp-settings-row-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;

  h3 {
    margin: 0;
    color: var(--common-text-title);
    font-size: 14px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }

  p {
    margin: 0;
    color: var(--box-text-4);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
}

.cp-settings-switch
  :deep(.v-selection-control--dirty:not(.v-selection-control--disabled) .v-switch__track) {
  opacity: 1;
}

.cp-settings-switch :deep(.v-switch__thumb) {
  background: var(--app-page-content);
}

.cp-settings-edit {
  padding: 4px;
}

.cp-settings-identity {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 16px;
}

.cp-settings-avatar-overlay {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgb(0 0 0 / 45%);
  color: #ffffffff;
  inset: 0;
  opacity: 0;
  transition: opacity 120ms ease;
}

.cp-settings-avatar {
  position: relative;
  display: block;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  cursor: pointer;
  line-height: 0;

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 3px;
  }

  &:disabled {
    cursor: not-allowed;

    .cp-settings-avatar-overlay {
      display: none;
    }
  }

  &:focus-visible .cp-settings-avatar-overlay,
  &:hover:not(:disabled) .cp-settings-avatar-overlay {
    opacity: 1;
  }
}

.cp-settings-identity-copy {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 4px;

  h3 {
    overflow: hidden;
    margin: 0;
    color: var(--common-text-title);
    font-size: 16px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    margin: 0;
    color: var(--box-text-4);
    font-size: 12px;
    line-height: 18px;
    overflow-wrap: anywhere;
  }
}

.cp-settings-identity-copy .cp-settings-identity-hint {
  display: flex;
  align-items: center;
  color: var(--common-text-title);
  gap: 4px;
}

.cp-settings-identity-actions {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  gap: 8px;
}

.cp-settings-message,
.cp-settings-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow-wrap: anywhere;
  text-align: center;
}

.cp-settings-message {
  justify-content: flex-start;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;

  &.is-error {
    background: var(--box-bg-2);
    color: var(--common-text-title);
  }

  &.is-success {
    background: var(--box-bg-2);
    color: var(--common-text-title);
  }
}

.cp-settings-state {
  min-height: 180px;
  flex-direction: column;
  padding: 24px 16px;
  color: var(--box-text-4);

  p {
    margin: 0;
  }
}

.cp-settings-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;

  .v-btn:not(.v-btn--disabled) {
    color: var(--btn-text);
  }
}

@media (width <= 640px) {
  .cp-settings-row {
    align-items: flex-start;
    padding: 12px;
  }

  .cp-settings-row :deep(.v-switch) {
    flex-shrink: 0;
  }

  .cp-settings-identity {
    flex-wrap: wrap;
    align-items: flex-start;
    padding: 12px;
  }

  .cp-settings-identity-copy {
    flex: 1 1 160px;
  }

  .cp-settings-identity-actions {
    width: 100%;

    .v-btn {
      flex: 1 1 auto;
    }
  }

  .cp-settings-footer {
    justify-content: stretch;

    .v-btn {
      width: 100%;
    }
  }
}
</style>
