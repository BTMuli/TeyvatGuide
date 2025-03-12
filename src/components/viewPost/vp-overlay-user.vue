<template>
  <TOverlay v-model="visible">
    <div class="vp-ou-box">
      <div class="vp-ou-user" v-if="userInfo">
        <div class="vp-ouu-info">
          <div class="left">
            <div class="avatar">
              <TMiImg :src="userInfo.avatar_url" alt="avatar" :ori="true" />
            </div>
            <div class="pendant" v-if="userInfo.pendant !== ''">
              <TMiImg :src="userInfo.pendant" alt="pendant" :ori="true" />
            </div>
          </div>
          <div class="right">
            <div class="title">
              <div class="nickname">{{ userInfo.nickname }}</div>
              <div class="level">Lv.{{ userInfo.level_exp.level }}</div>
            </div>
            <div class="desc" :title="userInfo.introduce">{{ userInfo.introduce }}</div>
          </div>
        </div>
      </div>
      <div class="vp-ou-mid">
        <v-btn :loading="load" size="small" class="vp-ou-btn" @click="loadPosts()" rounded>
          加载更多({{ results.length }})
        </v-btn>
        <div class="vp-ouu-extra" v-if="userInfo">
          <span>ID:{{ userInfo.uid }}</span>
          <span>IP:{{ userInfo.ip_region }}</span>
        </div>
      </div>
      <div class="vp-ou-divider" />
      <div class="vp-ou-list">
        <TPostCard
          class="vp-ou-item"
          :model-value="item"
          v-for="item in results"
          :key="item.post.post_id"
        />
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import TMiImg from "@comp/app/t-mi-img.vue";
import TOverlay from "@comp/app/t-overlay.vue";
import TPostCard from "@comp/app/t-postcard.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { computed, ref, shallowRef, watch } from "vue";

import bbsReq from "@/web/request/bbsReq.js";
import postReq from "@/web/request/postReq.js";

type ToPostUserProps = { gid: number; uid: string; postId?: string };

const props = defineProps<ToPostUserProps>();
const visible = defineModel<boolean>();
const offset = ref<string>();
const isLast = ref<boolean>(false);
const load = ref<boolean>(false);
const userInfo = shallowRef<TGApp.BBS.User.Info>();
const results = shallowRef<Array<TGApp.BBS.Post.FullData>>([]);
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
  const resp = await bbsReq.otherUserInfo(props.gid, props.uid);
  if ("retcode" in resp) {
    showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
    return;
  }
  userInfo.value = resp;
  console.log(userInfo.value);
}

async function loadPosts(): Promise<void> {
  if (load.value) return;
  load.value = true;
  if (isLast.value) {
    showSnackbar.warn("没有更多了");
    load.value = false;
    return;
  }
  const resp = await postReq.user.post(props.uid, props.gid, offset.value);
  if ("retcode" in resp) {
    showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
    load.value = false;
    visible.value = false;
    return;
  }
  offset.value = resp.next_offset;
  isLast.value = resp.is_last;
  results.value = results.value.concat(resp.list);
  load.value = false;
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
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  row-gap: 4px;
  max-width: 100%;
}

.vp-ouu-info {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;

  .left {
    position: relative;
    width: 50px;
    height: 50px;
    box-sizing: border-box;
    padding: 5px;
    display: flex;
    align-items: center;
    justify-content: center;

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
        border-radius: 50%;
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
        background: v-bind(levelColor);
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
}

.vp-ou-btn {
  width: fit-content;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.vp-ouu-extra {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
  font-size: 12px;
  color: var(--box-text-4);
  opacity: 0.6;
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
  padding-right: 8px;
  padding-bottom: 8px;
  overflow-y: auto;
  row-gap: 10px;
}

.vp-ou-item {
  height: fit-content;
  flex-shrink: 0;
}
</style>
