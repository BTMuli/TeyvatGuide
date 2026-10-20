<template>
  <section :aria-busy="loading || saving" aria-labelledby="cp-settings-title" class="cp-settings">
    <header class="cp-settings-header">
      <div>
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
          <CpAvatar :size="72" :user="previewUser" />
          <div class="cp-settings-identity-copy">
            <h3>{{ editDraft.nickname.trim() || props.profile.nickname }}</h3>
            <p>{{ editDraft.introduce.trim() || "这个人很神秘，什么都没有留下。" }}</p>
            <p v-if="isAvatarInAudit" class="cp-settings-identity-hint">
              <v-icon size="14">mdi-clock-outline</v-icon>
              当前头像正在审核中，暂不可更换。
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
              选择头像框
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
        :currentId="avatarDraft.id"
        :error="avatarError"
        :groups="avatarGroups"
        :loading="avatarLoading"
        @confirm="handleAvatarConfirm"
        @retry="loadAvatars"
      />
      <CpPendantPicker
        v-model="pendantPickerVisible"
        :currentUrl="pendantDraft.url"
        :error="pendantListError"
        :loading="pendantListLoading"
        :pendants="pendants"
        :serverUrl="pendantOriginal.url"
        :user="previewUser"
        @confirm="handlePendantConfirm"
        @retry="loadPendants"
      />
    </template>
  </section>
</template>

<script lang="ts" setup>
import CpAvatarPicker from "@comp/communityProfile/cp-avatar-picker.vue";
import CpAvatar from "@comp/communityProfile/cp-avatar.vue";
import CpPendantPicker from "@comp/communityProfile/cp-pendant-picker.vue";
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

type AvatarSelection = {
  /** 头像编号 */
  id: string;
  /** 头像链接 */
  url: string;
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
const { isLogin, incognito } = storeToRefs(useAppStore());
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
const avatarDraft = ref<AvatarSelection>({ id: "", url: "" });
const avatarOriginal = ref<AvatarSelection>({ id: "", url: "" });
const avatarGroups = shallowRef<Array<TGApp.BBS.CommunitySettings.AvatarGroup>>([]);
const avatarPickerVisible = ref<boolean>(false);
const avatarLoading = ref<boolean>(false);
const avatarError = ref<string>("");
const pendantDraft = ref<PendantSelection>({ id: 0, url: "" });
const pendantOriginal = ref<PendantSelection>({ id: 0, url: "" });
const pendants = shallowRef<Array<TGApp.BBS.CommunitySettings.Pendant>>([]);
const pendantPickerVisible = ref<boolean>(false);
const pendantListLoading = ref<boolean>(false);
const pendantListError = ref<string>("");
const pendantLoaded = ref<boolean>(false);
const loading = ref<boolean>(false);
const saving = ref<boolean>(false);
const privacyLoaded = ref<boolean>(false);
const editLoaded = ref<boolean>(false);
const loadError = ref<string>("");
const saveError = ref<string>("");
const saveMessage = ref<string>("");
let requestVersion = 0;
let avatarRequestVersion = 0;
let pendantRequestVersion = 0;
let active = true;

const canViewProfile = computed<boolean>(() => {
  const currentUid = uid.value;
  const currentCookie = cookie.value;
  return (
    !incognito.value &&
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
const avatarDirty = computed<boolean>(() => avatarDraft.value.id !== avatarOriginal.value.id);
const pendantDirty = computed<boolean>(() => pendantDraft.value.url !== pendantOriginal.value.url);
const nicknameDirty = computed<boolean>(
  () => editDraft.nickname.trim() !== editOriginal.nickname.trim(),
);
const introduceDirty = computed<boolean>(
  () => editDraft.introduce.trim() !== editOriginal.introduce.trim(),
);
const editDirty = computed<boolean>(
  () => nicknameDirty.value || introduceDirty.value || avatarDirty.value || pendantDirty.value,
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
    : "修改当前账号在米游社展示的昵称、简介、头像和头像框。",
);
watch(
  [
    () => props.section,
    () => props.profile.uid,
    isLogin,
    incognito,
    uid,
    () => cookie.value?.account_id,
    () => cookie.value?.cookie_token,
    () => cookie.value?.ltuid,
    () => cookie.value?.ltoken,
    () => props.profile.nickname,
    () => props.profile.introduce,
    () => props.profile.avatar,
    () => props.profile.avatar_url,
    () => props.profile.pendant,
    () => props.audit?.is_avatar_in_audit,
    () => props.audit?.avatar_url,
  ],
  () => void loadSection(),
  { immediate: true, flush: "sync" },
);

onBeforeUnmount(() => {
  active = false;
  requestVersion += 1;
  avatarRequestVersion += 1;
  pendantRequestVersion += 1;
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
    currentCookie?.ltoken === snapshot.cookie.ltoken
  );
}

function isCurrentRequest(version: number, snapshot: AccountSnapshot): boolean {
  return active && version === requestVersion && matchesAccount(snapshot);
}

function isCurrentPendantRequest(version: number, snapshot: AccountSnapshot): boolean {
  return active && version === pendantRequestVersion && matchesAccount(snapshot);
}

function isCurrentWrite(version: number, snapshot: AccountSnapshot): boolean {
  return isCurrentRequest(version, snapshot) && matchesPersistedSnapshot(snapshot);
}

function resetMessages(): void {
  loadError.value = "";
  saveError.value = "";
  saveMessage.value = "";
  avatarError.value = "";
  pendantListError.value = "";
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
  avatarDraft.value = { id: props.profile.avatar, url: avatarUrl };
  avatarOriginal.value = { id: props.profile.avatar, url: avatarUrl };
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
  const version = ++requestVersion;
  loading.value = false;
  saving.value = false;
  privacyLoaded.value = false;
  editLoaded.value = false;
  avatarPickerVisible.value = false;
  pendantPickerVisible.value = false;
  pendantRequestVersion += 1;
  pendantListLoading.value = false;
  pendantLoaded.value = false;
  pendants.value = [];
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
  if (avatarDirty.value && !isAvatarInAudit.value) {
    payload.avatar = avatarDraft.value.id;
    payload.avatar_url = avatarDraft.value.url;
    payload.avatar_assets_id = "";
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
  if (
    props.section === "edit" &&
    Object.keys(profilePayload ?? {}).length === 0 &&
    !pendantChanged
  ) {
    saveError.value = "没有需要保存的修改。";
    saveMessage.value = "";
    return;
  }
  const version = ++requestVersion;
  saving.value = true;
  saveError.value = "";
  saveMessage.value = "";
  let profileSaved = false;
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
    if (Object.keys(profilePayload ?? {}).length > 0) {
      const response = await communitySettingsReq.updateProfile(
        snapshot.cookie,
        profilePayload ?? {},
      );
      if (!isCurrentWrite(version, snapshot)) return;
      if (response.retcode !== 0) {
        throw new Error(`[${response.retcode}] ${response.message}`);
      }
      profileSaved = true;
    }
    if (pendantChanged) {
      const response = await communitySettingsReq.setPendant(
        snapshot.cookie,
        pendantDraft.value.id,
      );
      if (!isCurrentWrite(version, snapshot)) return;
      if (response.retcode !== 0) {
        throw new Error(`[${response.retcode}] ${response.message}`);
      }
    }
    saveMessage.value = "资料已提交保存。";
    emit("saved");
  } catch (cause) {
    if (!isCurrentWrite(version, snapshot)) return;
    if (profileSaved) {
      emit("saved", `资料已保存，但头像框设置失败：${TGHttps.getErrMsg(cause)}`);
      return;
    }
    saveError.value = TGHttps.getErrMsg(cause);
  } finally {
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
  if (avatarGroups.value.length > 0 || avatarLoading.value) return;
  void loadAvatars();
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

function openPendantPicker(): void {
  if (!canWriteProfile.value || saving.value) return;
  pendantPickerVisible.value = true;
  if (pendantLoaded.value || pendantListLoading.value) return;
  void loadPendants();
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

function handleAvatarConfirm(avatar: TGApp.BBS.CommunitySettings.Avatar): void {
  if (!canWriteProfile.value) return;
  avatarDraft.value = { id: String(avatar.id), url: avatar.icon };
  avatarPickerVisible.value = false;
}

function handlePendantConfirm(pendant: TGApp.BBS.CommunitySettings.Pendant | null): void {
  if (!canWriteProfile.value) return;
  pendantDraft.value = { id: pendant?.id ?? 0, url: pendant?.url ?? "" };
  pendantPickerVisible.value = false;
}
</script>

<style lang="scss" scoped>
.cp-settings {
  display: flex;
  min-width: 0;
  flex-direction: column;
  color: var(--app-page-content);
}

.cp-settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
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
    margin: 4px 0 0;
    color: var(--box-text-4);
    font-size: 12px;
  }
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
  min-width: 0;

  h3 {
    margin: 0;
    color: var(--common-text-title);
    font-size: 14px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }

  p {
    margin: 4px 0 0;
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

.cp-settings-identity-copy {
  min-width: 0;
  flex: 1 1 auto;

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
    margin: 4px 0 0;
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
