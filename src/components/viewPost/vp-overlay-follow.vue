<template>
  <TOverlay v-model="visible">
    <div class="vp-of-box">
      <div class="vo-of-top">
        <div class="vo-oft-left">
          <img src="/platforms/mhy/mys.webp" alt="icon" />
          <span>关注动态</span>
        </div>
        <div class="vo-oft-right">已加载：{{ posts.length }}条</div>
      </div>
      <div class="vo-of-actions">
        <v-btn class="vo-of-btn" @click="loadMore(true)" :loading="loading">刷新</v-btn>
        <v-btn class="vo-of-btn" @click="loadMore()" :loading="loading">加载更多</v-btn>
      </div>
      <div class="vp-of-list">
        <TPostcard
          class="vp-of-list-item"
          v-for="(item, index) in posts"
          :key="index"
          :model-value="item"
        />
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import TOverlay from "@comp/app/t-overlay.vue";
import TPostcard from "@comp/app/t-postcard.vue";
import showSnackbar from "@comp/func/snackbar.js";
import painterReq from "@req/painterReq.js";
import useUserStore from "@store/user.js";
import { storeToRefs } from "pinia";
import { ref, shallowRef, watch } from "vue";

const { cookie } = storeToRefs(useUserStore());
const visible = defineModel<boolean>();
const offset = ref<number>();
const isLast = ref<boolean>(false);
const loading = ref<boolean>(false);
const posts = shallowRef<Array<TGApp.BBS.Post.FullData>>([]);

watch(
  () => visible.value,
  async () => {
    if (visible.value) await loadMore();
  },
);

async function loadMore(refresh: boolean = false): Promise<void> {
  if (loading.value) return;
  if (refresh) offset.value = undefined;
  if (!cookie.value) {
    showSnackbar.warn("请登录后再试");
    visible.value = false;
    return;
  }
  if (isLast.value) {
    showSnackbar.warn("没有更多了");
    return;
  }
  loading.value = true;
  const resp = await painterReq.follow(cookie.value, offset.value);
  if ("retcode" in resp) {
    showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
    loading.value = false;
    return;
  }
  offset.value = resp.next_offset;
  isLast.value = resp.is_last;
  if (refresh) posts.value = resp.list;
  else posts.value = posts.value.concat(resp.list);
  loading.value = false;
  showSnackbar.success(`成功加载${resp.list.length}条数据`);
}
</script>
<style lang="scss" scoped>
.vp-of-box {
  position: relative;
  display: flex;
  width: 400px;
  height: 500px;
  box-sizing: border-box;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border-radius: 4px;
  background-color: var(--box-bg-1);
  row-gap: 8px;
}

.vo-of-top {
  position: relative;
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: space-between;
  font-size: 20px;
}

.vo-oft-left {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;

  img {
    width: 32px;
    height: 32px;
    border-radius: 4px;
  }
}

.vo-oft-right {
  font-size: 12px;
}

.vo-of-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
}

.vo-of-btn {
  border-radius: 8px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}

.dark .vo-of-btn {
  border: 1px solid var(--common-shadow-2);
}

.vp-of-list {
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

.vp-of-list-item {
  height: fit-content;
  flex-shrink: 0;
}
</style>
