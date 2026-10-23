<template>
  <TOverlay v-model="visible">
    <div class="vp-ou-box">
      <div v-if="userInfo" class="vp-ou-user" @click="toCurrentUserProfile()">
        <div class="vp-ouu-info">
          <div class="left">
            <div class="avatar">
              <img v-if="avatarUrl.endsWith('.gif')" :src="avatarUrl" alt="avatar" />
              <TMiImg v-else :ori="true" :src="avatarUrl" alt="avatar" />
            </div>
            <div v-if="userInfo.pendant !== ''" class="pendant">
              <TMiImg :ori="true" :src="userInfo.pendant" alt="pendant" />
            </div>
          </div>
          <div class="right">
            <div class="title">
              <div class="nickname">{{ userInfo.nickname }}</div>
              <div class="level">Lv.{{ userInfo.level_exp.level }}</div>
            </div>
            <div v-if="userDesc" :title="userDesc" class="desc">{{ userDesc }}</div>
          </div>
        </div>
      </div>
      <div class="vp-ou-mid">
        <div v-if="userInfo" class="vp-ouu-extra">
          <span>ID:{{ userInfo.uid }}</span>
          <span>IP:{{ userInfo.ip_region }}</span>
        </div>
        <button
          v-if="canFollow && followState"
          :aria-label="followState.label"
          :disabled="followLoading"
          :title="followState.label"
          class="vp-ou-follow"
          type="button"
          @click="toggleFollow()"
        >
          <v-progress-circular v-if="followLoading" indeterminate size="14" width="2" />
          <v-icon v-else aria-hidden="true" size="16">{{ followState.icon }}</v-icon>
        </button>
      </div>
      <div class="vp-ou-divider" />
      <div ref="listRef" class="vp-ou-list">
        <TPostCard
          v-for="post in results"
          :key="post.post.post_id"
          :post
          class="vp-ou-item"
          @user-click="toUserProfile"
        />
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import TOverlay from "@comp/app/t-overlay.vue";
import TPostCard from "@comp/app/t-postcard.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import { useBoxReachBottom } from "@hooks/reachBottom.js";
import bbsReq from "@req/bbsReq.js";
import communityReq from "@req/communityReq.js";
import postReq from "@req/postReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { getUserAvatar } from "@utils/common/toolFunc.js";
import { openCommunityProfile } from "@utils/community/profile.js";
import TGHttps from "@utils/network/TGHttps.js";
import TGLogger from "@utils/system/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, ref, shallowRef, useTemplateRef, watch } from "vue";

type ToPostUserProps = { gid: number; uid: string; postId?: string };
type FollowState = { icon: string; label: string };
type AccountSnapshot = {
  uid: string;
  targetUid: string;
  cookie: TGApp.App.Account.Cookie;
};

const listEl = useTemplateRef<HTMLElement>("listRef");
const { isReachBottom } = useBoxReachBottom(listEl);

const props = defineProps<ToPostUserProps>();
const visible = defineModel<boolean>();
const { isLogin } = storeToRefs(useAppStore());
const { uid: accountUid, cookie } = storeToRefs(useUserStore());
const offset = ref<string>();
const isLast = ref<boolean>(false);
const load = ref<boolean>(false);
const userInfo = shallowRef<TGApp.BBS.User.Info>();
const followRelation = shallowRef<TGApp.BBS.User.FollowRelation>();
const followLoading = ref<boolean>(false);
const results = shallowRef<Array<TGApp.BBS.Post.FullData>>([]);
const canFollow = computed<boolean>(() => getAccountSnapshot() !== undefined);
const followState = computed<FollowState | undefined>(() => {
  const relation = followRelation.value;
  if (relation === undefined) return undefined;
  if (relation.is_following && relation.is_followed)
    return { icon: "mdi-account-multiple-check-outline", label: "互关，点击取关" };
  if (relation.is_following)
    return { icon: "mdi-account-check-outline", label: "已关注，点击取关" };
  if (relation.is_followed) return { icon: "mdi-account-heart-outline", label: "粉丝，点击回关" };
  return { icon: "mdi-account-plus-outline", label: "未关注，点击关注" };
});
const avatarUrl = computed<string>(() => {
  if (!userInfo.value) return "";
  return getUserAvatar(userInfo.value);
});
const userDesc = computed<string>(() => {
  if (!userInfo.value) return "";
  if (userInfo.value.certification.label !== "") return userInfo.value.certification.label;
  return userInfo.value.introduce;
});
const levelColor = computed<string>(() => {
  if (!userInfo.value) return "var(--tgc-od-white)";
  const level = userInfo.value.level_exp.level;
  if (level < 5) return "var(--tgc-od-green)";
  if (level < 9) return "var(--tgc-od-blue)";
  if (level < 13) return "var(--tgc-od-purple)";
  if (level > 12) return "var(--tgc-od-orange)";
  return "var(--tgc-od-white)";
});

watch(
  () => isReachBottom.value,
  async () => {
    if (!isReachBottom.value) return;
    await loadPosts();
  },
);
watch(
  () => visible.value,
  async () => {
    if (visible.value && results.value.length === 0) await loadPosts();
  },
);

watch(
  () => props.uid,
  async () => {
    if (visible.value) {
      offset.value = "";
      isLast.value = false;
      results.value = [];
      await loadUser();
      await loadPosts();
    }
  },
);

async function loadUser(): Promise<void> {
  followLoading.value = false;
  followRelation.value = undefined;
  let resp: TGApp.BBS.User.InfoResp | undefined;
  try {
    resp = await bbsReq.otherUserInfo(props.gid.toString(), props.uid, cookie.value);
    if (resp.retcode !== 0) {
      showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
      await TGLogger.Warn(`[vp-overlay-user] 获取用户信息失败：[${resp.retcode}] ${resp.message}`);
      return;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取用户信息失败：${errMsg}`);
    await TGLogger.Error(`[vp-overlay-user] 获取用户信息异常：${errMsg}`);
    return;
  }
  userInfo.value = resp.data.user_info;
  followRelation.value = resp.data.follow_relation;
}

async function toCurrentUserProfile(): Promise<void> {
  await openCommunityProfile(props.uid, props.gid);
}

async function toUserProfile(user: TGApp.BBS.Post.User, gid: number): Promise<void> {
  await openCommunityProfile(user.uid, gid);
}

/**
 * 获取当前账户与目标用户的可关注快照
 * @since Beta v0.13.0
 * @returns 账户快照；未登录、凭据不可用或目标为本人时返回 undefined
 */
function getAccountSnapshot(): AccountSnapshot | undefined {
  const targetUid = userInfo.value?.uid.trim();
  const accountCookie = cookie.value;
  if (!isLogin.value || !accountUid.value || !accountCookie || !targetUid) return undefined;
  if (targetUid === accountUid.value.trim()) return undefined;
  if (accountCookie.account_id.trim() === "" || accountCookie.cookie_token.trim() === "")
    return undefined;
  return { uid: accountUid.value, targetUid, cookie: { ...accountCookie } };
}

/**
 * 校验关注操作前后的账户与目标用户是否一致
 * @since Beta v0.13.0
 * @param snapshot - 操作前的账户快照
 * @returns 账户与目标用户是否仍与快照一致
 */
function isCurrentAccount(snapshot: AccountSnapshot): boolean {
  const accountCookie = cookie.value;
  return (
    isLogin.value &&
    accountUid.value === snapshot.uid &&
    userInfo.value?.uid.trim() === snapshot.targetUid &&
    accountCookie?.account_id === snapshot.cookie.account_id &&
    accountCookie?.cookie_token === snapshot.cookie.cookie_token
  );
}

/**
 * 切换对目标用户的关注状态
 * @since Beta v0.13.0
 * @returns 无返回值
 */
async function toggleFollow(): Promise<void> {
  const relation = followRelation.value;
  const snapshot = getAccountSnapshot();
  if (relation === undefined || snapshot === undefined || followLoading.value) return;
  const follow = !relation.is_following;
  if (!follow) {
    const nickname = userInfo.value?.nickname.trim() || `用户 ${snapshot.targetUid}`;
    const confirmed = await showDialog.checkF({
      cancelLabel: "继续关注",
      confirmLabel: "取消关注",
      text: `确定要取消关注“${nickname}”吗？`,
      title: "取消关注",
    });
    if (!confirmed || !isCurrentAccount(snapshot)) return;
  }
  followLoading.value = true;
  try {
    const response = await communityReq.setFollow(snapshot.cookie, snapshot.targetUid, follow);
    if (!isCurrentAccount(snapshot)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    followRelation.value = { ...relation, is_following: follow };
    showSnackbar.success(follow ? "关注成功" : "已取消关注");
  } catch (cause) {
    if (!isCurrentAccount(snapshot)) return;
    showSnackbar.error(`${follow ? "关注" : "取消关注"}失败：${TGHttps.getErrMsg(cause)}`);
  } finally {
    followLoading.value = false;
  }
}

async function loadPosts(): Promise<void> {
  if (load.value) return;
  load.value = true;
  if (isLast.value) {
    showSnackbar.warn("没有更多了");
    load.value = false;
    return;
  }
  let resp: TGApp.BBS.Post.UserPostResp | undefined;
  try {
    resp = await postReq.user.post(props.uid, 0, offset.value);
    if (resp.retcode !== 0) {
      showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
      load.value = false;
      visible.value = false;
      return;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取用户帖子失败：${errMsg}`);
    await TGLogger.Error(`[VpOverlayUser] 获取用户帖子异常`);
    await TGLogger.Error(`[VpOverlayUser] ${e}`);
    load.value = false;
    visible.value = false;
    return;
  }
  offset.value = resp.data.next_offset;
  isLast.value = resp.data.is_last;
  results.value = results.value.concat(resp.data.list);
  load.value = false;
  showSnackbar.success(`成功加载${resp.data.list.length}条数据`);
}
</script>
<style lang="scss" scoped>
.vp-ou-box {
  position: relative;
  display: flex;
  width: 400px;
  height: 500px;
  box-sizing: border-box;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 10px;
  border-radius: 5px;
  background-color: var(--box-bg-1);
  row-gap: 8px;
}

.vp-ou-user {
  position: relative;
  display: flex;
  max-width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  cursor: pointer;
  row-gap: 4px;
}

.vp-ouu-info {
  position: relative;
  display: flex;
  max-width: 100%;
  align-items: center;
  justify-content: center;

  .left {
    position: relative;
    display: flex;
    width: 50px;
    height: 50px;
    box-sizing: border-box;
    align-items: center;
    justify-content: center;
    padding: 5px;

    .avatar {
      position: relative;
      display: flex;
      width: 40px;
      height: 40px;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--common-shadow-1);

      img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: contain;
      }
    }

    .pendant {
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      width: 50px;
      height: 50px;
      align-items: center;
      justify-content: center;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }
  }

  .right {
    position: relative;
    display: flex;
    max-width: calc(100% - 50px);
    height: 50px;
    flex-direction: column;
    align-items: flex-start;
    color: var(--box-text-4);

    .title {
      position: relative;
      display: flex;
      overflow: hidden;
      align-items: center;
      justify-content: center;
      column-gap: 4px;
      font-family: var(--font-title);
      font-size: 16px;
      text-overflow: ellipsis;
      white-space: nowrap;

      .title {
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .level {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 2px;
        border-radius: 2px;
        background: v-bind(levelColor); /* stylelint-disable-line value-keyword-case */
        color: var(--tgc-white-1);
        font-size: 12px;
      }
    }

    .desc {
      overflow: hidden;
      width: 100%;
      max-width: 100%;
      height: 26px;
      border-top: 2px solid var(--common-shadow-2);
      font-size: 14px;
      opacity: 0.7;
      text-align: left;
      text-overflow: ellipsis;
      white-space: nowrap;
      word-break: break-all;
    }
  }
}

.vp-ou-mid {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.vp-ouu-extra {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--box-text-4);
  column-gap: 8px;
  font-size: 12px;
  opacity: 0.6;
}

.vp-ou-follow {
  display: inline-flex;
  width: 28px;
  height: 28px;
  box-sizing: border-box;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
  cursor: pointer;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;

  &:disabled {
    cursor: default;
    opacity: 0.7;
  }

  &:focus-visible {
    outline: 1px solid var(--tgc-od-orange);
    outline-offset: 1px;
  }

  &:hover:not(:disabled) {
    border-color: var(--common-shadow-2);
    background: var(--box-bg-3);
  }
}

.vp-ou-divider {
  position: relative;
  width: 100%;
  height: 1px;
  background-color: var(--common-shadow-2);
}

.vp-ou-list {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  padding-bottom: 8px;
  overflow-y: auto;
  row-gap: 10px;
}

.vp-ou-item {
  height: fit-content;
  flex-shrink: 0;
}
</style>
