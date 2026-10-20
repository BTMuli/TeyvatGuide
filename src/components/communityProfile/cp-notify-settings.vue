<template>
  <section
    :aria-busy="loading || saving"
    aria-labelledby="cp-notify-settings-title"
    class="cp-notify-settings"
  >
    <header class="cp-notify-settings-header">
      <h2 id="cp-notify-settings-title">
        <v-icon size="20" aria-hidden="true">mdi-bell-cog-outline</v-icon>
        消息设置
      </h2>
      <p>选择接收哪些人的互动消息提醒，以及是否接收系统通知。</p>
    </header>

    <div v-if="!canView" aria-live="polite" class="cp-notify-settings-state" role="status">
      <v-icon size="32">mdi-account-lock-outline</v-icon>
      <p>当前账号凭据不可用，请重新登录米游社账号。</p>
    </div>
    <div v-else-if="loading" aria-live="polite" class="cp-notify-settings-state" role="status">
      <v-progress-circular indeterminate size="28" />
      <p>正在加载消息设置…</p>
    </div>
    <div v-else-if="loadError" aria-live="assertive" class="cp-notify-settings-state" role="alert">
      <v-icon size="32">mdi-alert-circle-outline</v-icon>
      <p>{{ loadError }}</p>
      <v-btn variant="tonal" @click="loadSettings">重新加载</v-btn>
    </div>
    <form v-else-if="original" class="cp-notify-settings-form" @submit.prevent="handleSave">
      <div class="cp-notify-settings-list">
        <div v-for="row in scopeRows" :key="row.key" class="cp-notify-settings-row">
          <div class="cp-notify-settings-row-copy">
            <h3>{{ row.title }}</h3>
            <p>{{ row.description }}</p>
          </div>
          <v-btn-toggle
            v-model="draft[row.key]"
            :aria-label="`${row.title}的接收范围`"
            :disabled="saving"
            :mandatory="true"
            class="cp-notify-settings-toggle"
            variant="outlined"
          >
            <v-btn
              v-for="option in scopeOptions"
              :key="option.value"
              :value="option.value"
              size="small"
            >
              {{ option.title }}
            </v-btn>
          </v-btn-toggle>
        </div>
        <div class="cp-notify-settings-row">
          <div class="cp-notify-settings-row-copy">
            <h3>系统通知</h3>
            <p>接收米游社官方发送的系统通知。</p>
          </div>
          <v-switch
            v-model="draft.system"
            :disabled="saving"
            aria-label="接收系统通知"
            class="cp-notify-settings-switch"
            color="var(--common-text-title)"
            thumbColor="var(--app-page-bg)"
            hide-details
            inset
          />
        </div>
      </div>

      <div v-if="saveError" aria-live="assertive" class="cp-notify-settings-message" role="alert">
        <v-icon size="18">mdi-alert-circle-outline</v-icon>
        <span>{{ saveError }}</span>
      </div>
      <div v-if="saveMessage" aria-live="polite" class="cp-notify-settings-message" role="status">
        <v-icon size="18">mdi-check-circle-outline</v-icon>
        <span>{{ saveMessage }}</span>
      </div>
      <footer class="cp-notify-settings-footer">
        <v-btn
          :disabled="!dirty || saving"
          :loading="saving"
          color="var(--tgc-btn-1)"
          type="submit"
          variant="flat"
        >
          保存消息设置
        </v-btn>
      </footer>
    </form>
  </section>
</template>

<script lang="ts" setup>
import communityReq from "@req/communityReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { matchesCurrentAccount } from "@utils/bbsReplyAccount.js";
import TGHttps from "@utils/TGHttps.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch } from "vue";

/**
 * 可选择接收范围的消息设置键
 * @since Beta v0.12.6
 */
type ScopeKey = "reply" | "active_mention" | "upvote";

/**
 * 消息设置的登录账户快照
 * @since Beta v0.12.6
 */
type AccountSnapshot = { uid: string; cookie: TGApp.App.Account.Cookie };

/**
 * 消息设置草稿
 * @since Beta v0.12.6
 */
type SettingsDraft = Record<ScopeKey, TGApp.BBS.Notification.SettingScope> & { system: boolean };

const scopeRows: ReadonlyArray<{ key: ScopeKey; title: string; description: string }> = [
  { key: "reply", title: "回复我的", description: "其他用户回复你的帖子和评论时提醒。" },
  { key: "active_mention", title: "主动@我", description: "其他用户在帖子或评论中@你时提醒。" },
  { key: "upvote", title: "给我点赞", description: "其他用户点赞你的帖子和评论时提醒。" },
];
const scopeOptions: ReadonlyArray<{ value: TGApp.BBS.Notification.SettingScope; title: string }> = [
  { value: "All", title: "所有人" },
  { value: "Follow", title: "仅关注人" },
  { value: "Never", title: "不接收" },
];

const { isLogin } = storeToRefs(useAppStore());
const { uid, cookie } = storeToRefs(useUserStore());
const original = shallowRef<TGApp.BBS.Notification.Settings>();
const draft = reactive<SettingsDraft>({
  reply: "All",
  active_mention: "All",
  upvote: "All",
  system: true,
});
const loading = ref<boolean>(false);
const saving = ref<boolean>(false);
const loadError = ref<string>("");
const saveError = ref<string>("");
const saveMessage = ref<string>("");
let requestVersion = 0;
let active = true;

const canView = computed<boolean>(() => getSnapshot() !== undefined);
const dirty = computed<boolean>(() => {
  const settings = original.value;
  if (!settings) return false;
  return (
    scopeRows.some((row) => draft[row.key] !== settings[row.key]) ||
    draft.system !== isSystemOn(settings)
  );
});

watch(
  [
    isLogin,
    uid,
    () => cookie.value?.account_id,
    () => cookie.value?.cookie_token,
    () => cookie.value?.ltuid,
    () => cookie.value?.ltoken,
  ],
  () => void loadSettings(),
  { immediate: true },
);

onBeforeUnmount(() => {
  active = false;
  requestVersion += 1;
});

function getSnapshot(): AccountSnapshot | undefined {
  const loginUid = uid.value?.trim() ?? "";
  if (
    !isLogin.value ||
    !loginUid ||
    !cookie.value ||
    cookie.value.ltuid !== loginUid ||
    !cookie.value.cookie_token.trim() ||
    !cookie.value.account_id.trim() ||
    !cookie.value.ltoken.trim()
  )
    return undefined;
  return { uid: loginUid, cookie: { ...cookie.value } };
}

function isCurrent(snapshot: AccountSnapshot, version: number): boolean {
  const current = getSnapshot();
  return (
    active &&
    requestVersion === version &&
    current?.uid === snapshot.uid &&
    current.cookie.account_id === snapshot.cookie.account_id &&
    current.cookie.cookie_token === snapshot.cookie.cookie_token &&
    current.cookie.ltuid === snapshot.cookie.ltuid &&
    current.cookie.ltoken === snapshot.cookie.ltoken
  );
}

function matchesPersisted(snapshot: AccountSnapshot): boolean {
  return matchesCurrentAccount({
    uid: snapshot.uid,
    cookie: { ltoken: snapshot.cookie.ltoken, ltuid: snapshot.cookie.ltuid },
  });
}

function isSystemOn(settings: TGApp.BBS.Notification.Settings): boolean {
  return settings.push_system_v2 !== "OPTION_CLOSED";
}

function applySettings(settings: TGApp.BBS.Notification.Settings): void {
  original.value = settings;
  draft.reply = settings.reply;
  draft.active_mention = settings.active_mention;
  draft.upvote = settings.upvote;
  draft.system = isSystemOn(settings);
}

function buildPayload(settings: TGApp.BBS.Notification.Settings): TGApp.BBS.Notification.Settings {
  let pushSystem = settings.push_system_v2;
  // 未改动系统通知时保留 OPTION_ONLY_IMPORTANT 等原值
  if (draft.system !== isSystemOn(settings)) {
    pushSystem = draft.system ? "OPTION_ALL" : "OPTION_CLOSED";
  }
  return {
    ...settings,
    reply: draft.reply,
    active_mention: draft.active_mention,
    upvote: draft.upvote,
    push_system_v2: pushSystem,
  };
}

async function loadSettings(): Promise<void> {
  const version = ++requestVersion;
  original.value = undefined;
  loading.value = false;
  saving.value = false;
  loadError.value = "";
  saveError.value = "";
  saveMessage.value = "";
  const snapshot = getSnapshot();
  if (!snapshot) return;
  loading.value = true;
  try {
    const response = await communityReq.notificationSettings(snapshot.cookie, snapshot.uid);
    if (!isCurrent(snapshot, version)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    applySettings(response.data.settings);
  } catch (cause) {
    if (isCurrent(snapshot, version)) loadError.value = TGHttps.getErrMsg(cause);
  } finally {
    if (isCurrent(snapshot, version)) loading.value = false;
  }
}

async function handleSave(): Promise<void> {
  const settings = original.value;
  if (!settings || !dirty.value || saving.value) return;
  const snapshot = getSnapshot();
  if (!snapshot || !matchesPersisted(snapshot)) {
    saveError.value = "当前账号凭据不可用，请重新加载后重试。";
    saveMessage.value = "";
    return;
  }
  const version = ++requestVersion;
  const payload = buildPayload(settings);
  saving.value = true;
  saveError.value = "";
  saveMessage.value = "";
  try {
    const response = await communityReq.updateNotificationSettings(snapshot.cookie, payload);
    if (!isCurrent(snapshot, version)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    applySettings(payload);
    saveMessage.value = "消息设置已保存。";
  } catch (cause) {
    if (isCurrent(snapshot, version)) saveError.value = TGHttps.getErrMsg(cause);
  } finally {
    if (isCurrent(snapshot, version)) saving.value = false;
  }
}
</script>

<style lang="scss" scoped>
.cp-notify-settings {
  display: flex;
  min-width: 0;
  flex-direction: column;
  color: var(--app-page-content);
}

.cp-notify-settings-header {
  margin-bottom: 16px;

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

.cp-notify-settings-form {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 16px;
}

.cp-notify-settings-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cp-notify-settings-row {
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

.cp-notify-settings-row-copy {
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

.cp-notify-settings-toggle.v-btn-toggle {
  display: inline-flex;
  overflow: hidden;
  max-width: 100%;
  height: 32px;
  flex: none;
  align-items: stretch;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
}

.cp-notify-settings-toggle :deep(.v-btn) {
  height: 30px;
  padding: 0 12px;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  color: var(--box-text-4);
}

.cp-notify-settings-toggle :deep(.v-btn + .v-btn) {
  border-inline-start: 1px solid var(--common-shadow-2) !important;
  margin-inline-start: 0;
}

.cp-notify-settings-toggle :deep(.v-btn__overlay),
.cp-notify-settings-toggle :deep(.v-btn__underlay) {
  opacity: 0 !important;
}

.cp-notify-settings-toggle :deep(.v-btn.v-btn--active),
.cp-notify-settings-toggle :deep(.v-btn.v-btn--selected),
.cp-notify-settings-toggle :deep(.v-btn[aria-pressed="true"]) {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.cp-notify-settings-toggle :deep(.v-btn:focus-visible) {
  z-index: 1;
  outline: 2px solid var(--tgc-od-blue);
  outline-offset: -2px;
}

.cp-notify-settings-switch
  :deep(.v-selection-control--dirty:not(.v-selection-control--disabled) .v-switch__track) {
  opacity: 1;
}

.cp-notify-settings-switch :deep(.v-switch__thumb) {
  background: var(--app-page-content);
}

.cp-notify-settings-switch {
  flex: none;
}

.cp-notify-settings-message,
.cp-notify-settings-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow-wrap: anywhere;
  text-align: center;
}

.cp-notify-settings-message {
  justify-content: flex-start;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--box-bg-2);
  color: var(--common-text-title);
  font-size: 13px;
}

.cp-notify-settings-state {
  min-height: 180px;
  flex-direction: column;
  padding: 24px 16px;
  color: var(--box-text-4);

  p {
    margin: 0;
  }
}

.cp-notify-settings-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;

  .v-btn:not(.v-btn--disabled) {
    color: var(--btn-text);
  }
}

@media (width <= 640px) {
  .cp-notify-settings-row {
    flex-wrap: wrap;
    align-items: flex-start;
    padding: 12px;
  }

  .cp-notify-settings-footer .v-btn {
    width: 100%;
  }
}
</style>
