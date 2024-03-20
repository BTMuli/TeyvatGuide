<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="pc-container">
    <div class="pc-top">
      <v-select
        v-model="curSelect"
        class="pc-select"
        :items="collections.map((i) => i.title)"
        :clearable="curSelect !== '未分类'"
        variant="outlined"
        label="合集"
      />
      <v-btn rounded class="pc-btn" prepend-icon="mdi-refresh" @click="freshUser()"
        >获取用户收藏
      </v-btn>
      <v-btn rounded class="pc-btn" prepend-icon="mdi-import" @click="freshOther"
        >导入其他用户收藏
      </v-btn>
      <v-btn rounded class="pc-btn" prepend-icon="mdi-pencil" @click="toEdit()"> 编辑收藏 </v-btn>
      <!-- todo 编辑收藏 -->
      <v-pagination class="pc-page" v-model="page" :total-visible="view" :length="length" />
    </div>
    <div class="pc-posts">
      <div v-for="item in getPageItems()" :key="item.post.post_id">
        <TPostCard :model-value="item" />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { storeToRefs } from "pinia";
import Database from "tauri-plugin-sql-api";
import { computed, onBeforeMount, onMounted, ref, watch } from "vue";

import showConfirm from "../../components/func/confirm";
import showSnackbar from "../../components/func/snackbar";
import TPostCard from "../../components/main/t-postcard.vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import TGSqlite from "../../plugins/Sqlite";
import TSUserCollection from "../../plugins/Sqlite/modules/userCollect";
import { useUserStore } from "../../store/modules/user";
import TGLogger from "../../utils/TGLogger";
import TGRequest from "../../web/request/TGRequest";

const loading = ref(false);
const loadingTitle = ref("加载中...");
const loadingSub = ref("");
const userStore = storeToRefs(useUserStore());
const db = ref<Database | undefined>(undefined);

const collections = ref<TGApp.Sqlite.UserCollection.UFCollection[]>([]);
const selected = ref<TGApp.Sqlite.UserCollection.UFPost[]>([]);
const curSelect = ref<string>("未分类");
const page = ref(1);
const length = computed(() => Math.ceil(selected.value.length / 12));
const view = computed(() => {
  if (length.value === 1) return 0;
  return length.value > 5 ? 5 : length.value;
});

onBeforeMount(async () => {
  if (!(await TGSqlite.checkTableExist("UFPost"))) {
    await TGSqlite.update();
    showSnackbar({
      text: "数据库已更新",
      color: "success",
    });
  }
});

onMounted(async () => {
  loadingTitle.value = "获取收藏帖子...";
  loading.value = true;
  db.value = await TGSqlite.getDB();
  if (!db.value) {
    showSnackbar({
      text: "数据库未初始化",
      color: "error",
    });
    loading.value = false;
    return;
  }
  loadingTitle.value = "获取收藏合集...";
  collections.value = await TSUserCollection.getCollectList();
  loadingTitle.value = "获取未分类帖子...";
  const postUnCollect = await TSUserCollection.getUnCollectPostList();
  if (postUnCollect.length > 0) {
    selected.value = postUnCollect;
  } else {
    selected.value = await TSUserCollection.getCollectPostList(collections.value[0].title);
  }
  page.value = 1;
  loading.value = false;
});

function toEdit() {
  showSnackbar({
    text: "功能开发中",
    color: "info",
  });
}

// 根据合集筛选
async function freshPost(select: string | null): Promise<void> {
  if (select === null) {
    curSelect.value = "未分类";
    return;
  }
  if (!db.value) {
    showSnackbar({
      text: "数据库未初始化",
      color: "error",
    });
    return;
  }
  loadingTitle.value = `获取合集 ${select}...`;
  loading.value = true;
  if (select === "未分类") {
    curSelect.value = "未分类";
    selected.value = await TSUserCollection.getUnCollectPostList();
  } else {
    selected.value = await TSUserCollection.getCollectPostList(select);
  }
  page.value = 1;
  loading.value = false;
  showSnackbar({
    text: `切换合集 ${select}，共 ${selected.value.length} 条帖子`,
    color: "success",
  });
}

// 获取当前页的帖子
function getPageItems(): TGApp.Plugins.Mys.Post.FullData[] {
  const posts = selected.value.slice((page.value - 1) * 12, page.value * 12);
  const card: TGApp.Plugins.Mys.Post.FullData[] = [];
  for (const post of posts) {
    try {
      card.push(JSON.parse(post.content));
    } catch (e) {
      TGLogger.Error("[PostCollect] getPageItems");
      TGLogger.Error(<string>e);
    }
  }
  return card;
}

watch(curSelect, async () => {
  await freshPost(curSelect.value);
});

async function freshOther(): Promise<void> {
  const input = await showConfirm({
    mode: "input",
    title: "导入其他用户收藏",
    text: "请输入用户米游社UID",
  });
  if (typeof input === "string") {
    if (isNaN(Number(input))) {
      showSnackbar({
        text: "UID 格式错误，请输入数字",
        color: "error",
      });
      return;
    }
    await freshUser(input);
    return;
  }
  showSnackbar({
    text: "取消导入",
    color: "cancel",
  });
}

async function freshUser(uid?: string): Promise<void> {
  if (!userStore.cookie.value) {
    showSnackbar({
      text: "请先登录",
      color: "error",
    });
    return;
  }
  const cookie = {
    cookie_token: userStore.cookie.value.cookie_token,
    account_id: userStore.cookie.value.account_id,
  };
  loadingTitle.value = "获取用户收藏...";
  loading.value = true;
  let res = await TGRequest.User.getCollect(cookie, uid || userStore.briefInfo.value.uid);
  let is_last = false;
  while (!is_last) {
    if ("retcode" in res) {
      if (res.retcode === 1001) {
        showSnackbar({
          text: "用户收藏已设为私密，无法获取",
          color: "error",
        });
      } else {
        showSnackbar({
          text: `[${res.retcode}] ${res.message}`,
          color: "error",
        });
      }
      loading.value = false;
      return;
    }
    let posts = res.list;
    loadingTitle.value = `合并收藏帖子 [offset]${res.next_offset}...`;
    await mergePosts(posts, uid || userStore.briefInfo.value.uid);
    if (res.is_last) {
      is_last = true;
    } else {
      loadingTitle.value = "获取用户收藏...";
      loadingSub.value = `[offset]${res.next_offset} [is_last]${res.is_last}`;
      res = await TGRequest.User.getCollect(
        cookie,
        uid || userStore.briefInfo.value.uid,
        res.next_offset,
      );
    }
  }
  loading.value = false;
  showSnackbar({
    text: "获取用户收藏成功",
    color: "success",
  });
  window.location.reload();
}

// 合并收藏帖子
async function mergePosts(
  posts: TGApp.Plugins.Mys.Post.FullData[],
  collect: string,
): Promise<void> {
  if (!db.value) return;
  const title = `用户收藏-${collect}`;
  for (const post of posts) {
    loadingTitle.value = `收藏帖子 [${post.post.post_id}]...`;
    loadingSub.value = `[POST]${post.post.subject} [collection]${title}`;
    const res = await TSUserCollection.addCollect(post.post.post_id, post, title, true);
    if (!res) {
      await TGLogger.Error(`[PostCollect] mergePosts [${post.post.post_id}]`);
    }
  }
}
</script>
<style lang="css" scoped>
.pc-container {
  position: relative;
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  row-gap: 10px;
}

.pc-top {
  position: relative;
  display: flex;
  width: 100%;
  height: 60px;
  align-items: center;
  justify-content: flex-start;
  column-gap: 10px;
}

.pc-select {
  max-width: 400px;
  max-height: 100%;
}

.pc-page {
  margin-left: auto;
}

/* stylelint-disable-next-line selector-class-pattern */
.pc-page > .v-pagination__list {
  justify-content: flex-end;
}

.pc-btn {
  height: 40px;
  background: var(--btn-bg-1);
  color: var(--btn-text-1);
  font-family: var(--font-title);
}

.dark .pc-btn {
  border: 1px solid var(--common-shadow-2);
}

.pc-posts {
  display: grid;
  font-family: var(--font-title);
  grid-gap: 10px;
  grid-template-columns: repeat(4, minmax(320px, 1fr));
}
</style>
