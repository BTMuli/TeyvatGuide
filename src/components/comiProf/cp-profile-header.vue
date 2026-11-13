<template>
  <header
    v-if="profile || loading"
    :aria-busy="!profile || headerLevelLoading"
    class="community-profile-header"
  >
    <div class="community-profile-header-content">
      <div class="community-profile-identity">
        <CpAvatar v-if="profile" :user="profile" :size="80" />
        <span v-else aria-hidden="true" class="community-profile-avatar-placeholder" />
        <div class="community-profile-intro">
          <div class="community-profile-name">
            <h2 :title="profile?.nickname">{{ profile?.nickname ?? "加载中…" }}</h2>
            <v-menu
              v-model="gameMenuVisible"
              :close-on-content-click="false"
              location="bottom start"
              offset="4"
            >
              <template #activator="{ props: menuProps }">
                <button
                  :aria-label="`当前分区：${currentGame.name}，${levelLabel}，点击切换分区`"
                  :title="headerLevelError || `当前分区：${currentGame.name}，点击切换分区`"
                  class="community-profile-level"
                  type="button"
                  v-bind="menuProps"
                >
                  <img v-if="currentGame.icon" :src="currentGame.icon" alt="" />
                  <span
                    :class="{
                      'community-profile-level-tag':
                        headerLevel && !headerLevelLoading && !headerLevelError,
                    }"
                    class="community-profile-level-label"
                  >
                    <span aria-live="polite">{{ levelLabel }}</span>
                    <v-icon aria-hidden="true" size="14">mdi-chevron-down</v-icon>
                  </span>
                </button>
              </template>
              <div aria-label="选择分区" class="community-profile-game-menu" role="group">
                <button
                  v-for="game in gameOptions"
                  :key="game.id"
                  :aria-label="`选择分区：${game.name}`"
                  :aria-pressed="selectedGid === game.id"
                  :class="{ dimmed: selectedGid !== game.id }"
                  :disabled="headerLevelLoading"
                  :title.attr="game.name"
                  class="community-profile-game-choice"
                  type="button"
                  @click="selectGame(game.id)"
                >
                  <img v-if="game.icon" :alt="`${game.name}图标`" :src="game.icon" />
                  <v-icon v-else aria-hidden="true" size="24">mdi-gamepad-variant-outline</v-icon>
                </button>
                <div
                  v-if="!headerLevelLoading && headerLevelError"
                  class="community-profile-game-error"
                  role="alert"
                >
                  <span :title="headerLevelError">{{ headerLevelError }}</span>
                  <button type="button" @click="retryHeaderLevel">重试</button>
                </div>
              </div>
            </v-menu>
            <span :title="`米游社 ID：${profileUidText}`" class="community-profile-uid">
              ID: {{ profileUidText }}
            </span>
          </div>
          <p :title="profile?.introduce" class="community-profile-description">
            {{
              profile ? profile.introduce || "这个人很神秘，什么都没有留下。" : "正在加载个人信息…"
            }}
          </p>
        </div>
      </div>
      <div aria-label="个人统计" class="community-profile-stats">
        <div v-for="stat in profileStats" :key="stat.label" class="community-profile-stat">
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </div>
      </div>
    </div>
  </header>
</template>

<script lang="ts" setup>
import CpAvatar from "@comp/comiProf/cp-avatar.vue";
import { useCommunityProfile } from "@hooks/useCommunityProfile.js";
import bbsReq from "@req/bbsReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import {
  getCommunityProfileLevel,
  getCommunityProfileLevelColor,
} from "@utils/community/profileLevel.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import { maskUid } from "@utils/display/TGUid.js";
import TGHttps from "@utils/network/TGHttps.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";

/**
 * 个人中心资料头部的显示状态。
 * @since Beta v0.13.1
 */
type ProfileHeaderProps = {
  loading: boolean;
};

/**
 * 个人中心资料头部的交互事件。
 * @since Beta v0.13.1
 */
type ProfileHeaderEmits = {
  selectGame: [gid: number];
};

/**
 * 查看用户资料时的账户与目标用户快照。
 * @since Beta v0.13.1
 */
type AccountSnapshot = {
  uid: string;
  profileUid: string;
  cookie: TGApp.App.Account.Cookie;
};

const { loading } = defineProps<ProfileHeaderProps>();
const emit = defineEmits<ProfileHeaderEmits>();
const { profileUid, isOwnProfile, canViewProfile, profile, selectedGid, gameOptions, currentGame } =
  useCommunityProfile();
const { isLogin } = storeToRefs(useAppStore());
const { uid, cookie } = storeToRefs(useUserStore());

const profileUidText = computed<string>(() =>
  isOwnProfile.value ? maskUid(profileUid.value) : profileUid.value,
);
const profileStats = computed<Array<{ label: string; value: string }>>(() => {
  const achieve = profile.value?.achieve;
  const format = (value: string | undefined): string =>
    value === undefined ? "-" : fmtUtil.num(Number(value));
  return [
    { label: "获赞", value: format(achieve?.like_num) },
    { label: "发布", value: format(achieve?.post_num) },
    { label: "评论", value: format(achieve?.replypost_num) },
    { label: "粉丝", value: format(achieve?.followed_cnt) },
    { label: "关注", value: format(achieve?.follow_cnt) },
  ];
});
const headerUserInfo = shallowRef<TGApp.BBS.User.Info>();
const headerLevelLoading = ref<boolean>(false);
const headerLevelError = ref<string>("");
const headerLevel = computed<TGApp.BBS.User.LevelExp | undefined>(() =>
  headerUserInfo.value === undefined
    ? undefined
    : getCommunityProfileLevel(headerUserInfo.value, selectedGid.value, selectedGid.value),
);
const levelColor = computed<string>(() => getCommunityProfileLevelColor(headerLevel.value?.level));
const levelLabel = computed<string>(() => {
  if (headerLevelLoading.value) return "加载中…";
  if (headerLevelError.value) return "加载失败";
  if (headerUserInfo.value === undefined) return "Lv.-";
  return headerLevel.value ? `Lv.${headerLevel.value.level}` : "暂无等级";
});
const gameMenuVisible = ref<boolean>(false);
const defaultProfileGameId = 2;
let headerRequestVersion = 0;
let headerContextKey = "";
let active = true;

watch(
  [
    isLogin,
    uid,
    profileUid,
    () => cookie.value?.account_id,
    () => cookie.value?.cookie_token,
    () => cookie.value?.ltuid,
    () => cookie.value?.ltoken,
    selectedGid,
  ],
  () => {
    const nextContextKey = [
      isLogin.value ? "1" : "0",
      uid.value ?? "",
      profileUid.value,
      cookie.value?.account_id ?? "",
      cookie.value?.cookie_token ?? "",
      cookie.value?.ltuid ?? "",
      cookie.value?.ltoken ?? "",
    ].join("\u001f");
    if (nextContextKey !== headerContextKey) {
      headerContextKey = nextContextKey;
      resetHeaderState();
    }
    if (profile.value === undefined) return;
    if (selectedGid.value === defaultProfileGameId) {
      syncHeaderProfile();
    } else {
      void loadHeaderLevel();
    }
  },
);

watch(
  profile,
  (value, previousValue) => {
    if (value === undefined) {
      resetHeaderState();
      return;
    }
    if (previousValue !== undefined) return;
    resetHeaderState();
    if (selectedGid.value === defaultProfileGameId) {
      syncHeaderProfile();
    } else {
      void loadHeaderLevel();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  active = false;
  headerRequestVersion += 1;
});

function getAccountSnapshot(): AccountSnapshot | undefined {
  if (!canViewProfile.value || uid.value === undefined || cookie.value === undefined)
    return undefined;
  return { uid: uid.value, profileUid: profileUid.value, cookie: { ...cookie.value } };
}

function isCurrentAccount(snapshot: AccountSnapshot): boolean {
  const currentCookie = cookie.value;
  return (
    active &&
    canViewProfile.value &&
    uid.value === snapshot.uid &&
    profileUid.value === snapshot.profileUid &&
    currentCookie?.account_id === snapshot.cookie.account_id &&
    currentCookie?.cookie_token === snapshot.cookie.cookie_token &&
    currentCookie?.ltuid === snapshot.cookie.ltuid &&
    currentCookie?.ltoken === snapshot.cookie.ltoken
  );
}

function isCurrentHeaderRequest(version: number, snapshot: AccountSnapshot, gid: number): boolean {
  return (
    version === headerRequestVersion &&
    selectedGid.value === gid &&
    profile.value !== undefined &&
    isCurrentAccount(snapshot)
  );
}

function resetHeaderState(): void {
  headerRequestVersion += 1;
  headerUserInfo.value = undefined;
  headerLevelError.value = "";
  headerLevelLoading.value = false;
}

function syncHeaderProfile(): void {
  if (profile.value === undefined) return;
  headerRequestVersion += 1;
  headerUserInfo.value = profile.value;
  headerLevelError.value = "";
  headerLevelLoading.value = false;
}

async function loadHeaderLevel(): Promise<void> {
  const version = ++headerRequestVersion;
  const gid = selectedGid.value;
  if (profile.value === undefined) return;
  if (gid === defaultProfileGameId) {
    syncHeaderProfile();
    return;
  }
  headerUserInfo.value = undefined;
  headerLevelError.value = "";
  headerLevelLoading.value = false;
  const snapshot = getAccountSnapshot();
  if (snapshot === undefined) return;
  if (!/^[1-9]\d*$/.test(snapshot.profileUid)) {
    headerLevelError.value = "用户 ID 无效。";
    return;
  }
  headerLevelLoading.value = true;
  try {
    const userResponse =
      snapshot.profileUid === snapshot.uid
        ? await bbsReq.userInfo(snapshot.cookie, gid.toString())
        : await bbsReq.otherUserInfo(gid.toString(), snapshot.profileUid);
    if (!isCurrentHeaderRequest(version, snapshot, gid)) return;
    if (userResponse.retcode !== 0) {
      throw new Error(`[${userResponse.retcode}] ${userResponse.message}`);
    }
    if (userResponse.data.user_info.uid !== snapshot.profileUid) {
      throw new Error("用户信息与当前查看的用户不一致");
    }
    headerUserInfo.value = userResponse.data.user_info;
  } catch (cause) {
    if (isCurrentHeaderRequest(version, snapshot, gid)) {
      headerLevelError.value = TGHttps.getErrMsg(cause);
    }
  } finally {
    if (isCurrentHeaderRequest(version, snapshot, gid)) headerLevelLoading.value = false;
  }
}

function retryHeaderLevel(): void {
  void loadHeaderLevel();
}

function selectGame(gid: number): void {
  gameMenuVisible.value = false;
  emit("selectGame", gid);
}
</script>

<style lang="scss" scoped>
.community-profile-header {
  display: flex;
  min-width: 0;
  flex-direction: column;
  flex-shrink: 0;
  align-items: stretch;
  padding: 24px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 16px;
}

.community-profile-header-content {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.community-profile-identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 16px;
}

.community-profile-intro {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.community-profile-avatar-placeholder {
  display: inline-flex;
  width: 80px;
  height: 80px;
  flex: 0 0 80px;
  align-items: center;
  justify-content: center;

  &::before {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--box-bg-3);
    content: "";
  }
}

.community-profile-name {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;

  h2 {
    overflow: hidden;
    min-width: 0;
    flex: 0 1 auto;
    padding: 0;
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.community-profile-level {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  padding: 0 2px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--box-text-4);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  gap: 4px;
  line-height: 16px;
  white-space: nowrap;

  &:hover {
    background: var(--box-bg-2);
  }

  &:focus-visible {
    outline: 1px solid var(--tgc-od-orange);
    outline-offset: 1px;
  }

  img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
}

.community-profile-level-label {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.community-profile-level-tag {
  padding: 2px 4px 2px 6px;
  border-radius: 4px;
  background: v-bind(levelColor); /* stylelint-disable-line value-keyword-case */
  color: var(--tgc-white-1);
}

.community-profile-uid {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}

.community-profile-description {
  overflow: hidden;
  max-width: 560px;
  padding: 0;
  margin: 0;
  color: var(--app-page-content);
  font-size: 14px;
  overflow-wrap: anywhere;
}

.community-profile-game-menu {
  display: flex;
  width: fit-content;
  max-width: min(320px, calc(100vw - 32px));
  box-sizing: border-box;
  flex-wrap: wrap;
  padding: 4px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--box-bg-1);
  box-shadow: 0 4px 12px var(--common-shadow-4);
  gap: 4px;
}

.community-profile-game-choice {
  display: flex;
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  flex: 0 0 24px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--box-text-1);
  cursor: pointer;

  &.dimmed {
    opacity: 0.3;
  }

  &.dimmed:not(:disabled):hover {
    opacity: 0.7;
  }

  &:disabled {
    cursor: default;
  }

  &:focus-visible {
    outline: 1px solid var(--tgc-od-orange);
    outline-offset: 1px;
  }

  img {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }
}

.community-profile-game-error {
  display: flex;
  min-width: 0;
  flex: 1 0 100%;
  align-items: center;
  color: var(--tgc-od-red);
  font-size: 12px;
  gap: 4px;
  line-height: 16px;

  span {
    overflow: hidden;
    min-width: 0;
    flex: 1 1 auto;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  button {
    flex-shrink: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--tgc-od-orange);
    cursor: pointer;
    font: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
}

.community-profile-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 24px;
}

.community-profile-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--box-text-4);
  gap: 4px;

  strong {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 18px;
    font-weight: normal;
  }

  span {
    font-size: 12px;
  }
}

@media (width <= 900px) {
  .community-profile-header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .community-profile-stats {
    width: 100%;
  }
}

@media (width <= 640px) {
  .community-profile-header {
    padding: 16px;
  }
}
</style>
