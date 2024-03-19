<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="pc-container">
    <div class="pc-top">
      <v-select
        v-model="curSelect"
        class="pc-select"
        :items="Array.from(selects)"
        variant="outlined"
        label="合集"
      />
      <v-btn rounded class="pc-btn" prepend-icon="mdi-refresh" @click="freshUser"
        >获取用户收藏</v-btn
      >
      <!-- todo 编辑收藏 -->
      <v-pagination class="pc-page" v-model="page" :length="length" />
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
import { onMounted, ref, watch } from "vue";

import showSnackbar from "../../components/func/snackbar";
import TPostCard from "../../components/main/t-postcard.vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import TGSqlite from "../../plugins/Sqlite";
import { insertPostCollectData } from "../../plugins/Sqlite/sql/insertData";
import { useUserStore } from "../../store/modules/user";
import TGLogger from "../../utils/TGLogger";
import TGRequest from "../../web/request/TGRequest";

const loading = ref(false);
const loadingTitle = ref("加载中...");
const loadingSub = ref("");
const userStore = storeToRefs(useUserStore());

const collections = ref<TGApp.Sqlite.UserCollection.SingleTable[]>([]);
const selected = ref<TGApp.Sqlite.UserCollection.SingleTable[]>([]);
const selects = ref<Set<string>>(new Set());
const curSelect = ref<string>("default");
const page = ref(1);
const length = ref(5);

onMounted(async () => {
  loadingTitle.value = "检测 UserCollection 表...";
  loading.value = true;
  const check = await TGSqlite.checkTableExist("UserCollection");
  if (!check) {
    loadingTitle.value = "创建 UserCollection 表...";
    await createCollectTable();
  }
  loadingTitle.value = "获取收藏帖子...";
  await getCollect();
  filterBySelect();
  loading.value = false;
});

async function createCollectTable(): Promise<void> {
  const db = await TGSqlite.getDB();
  const sql = `
    create table if not exists UserCollection
    (
      postId  text not null, -- 帖子ID
      title   text not null, -- 帖子标题
      content text,          -- 帖子内容
      collect text,          -- 合集标题
      uid     text,          -- 用户ID
      updated text not null, -- 收藏时间
      primary key (postId)
    );
  `;
  await db.execute(sql);
  showSnackbar({
    text: "创建 UserCollection 表成功",
    color: "success",
  });
}

// 根据合集筛选
function filterBySelect(): void {
  selected.value = collections.value.filter((item) => item.collect.includes(curSelect.value));
  length.value = Math.ceil(selected.value.length / 12);
  showSnackbar({
    text: `筛选合集 ${curSelect.value} 成功，共 ${selected.value.length} 条数据`,
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

watch(curSelect, () => {
  filterBySelect();
});

async function getCollect(): Promise<void> {
  const db = await TGSqlite.getDB();
  const sql = "SELECT * FROM UserCollection";
  collections.value = await db.select(sql);
  for (const item of collections.value) {
    try {
      const parse: string[] = JSON.parse(item.collect);
      for (const p of parse) {
        selects.value.add(p);
      }
    } catch (e) {
      await TGLogger.Error("[PostCollect] getCollect");
      await TGLogger.Error(<string>e);
    }
  }
}

async function freshUser(): Promise<void> {
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
  let res = await TGRequest.User.byCookie.getCollect(cookie);
  let is_last = false;
  while (!is_last) {
    if ("retcode" in res) {
      showSnackbar({
        text: `[${res.retcode}] ${res.message}`,
        color: "error",
      });
      return;
    }
    let posts = res.list;
    loadingTitle.value = `合并收藏帖子 [offset]${res.next_offset}...`;
    await mergePosts(posts);
    if (res.is_last) {
      is_last = true;
    } else {
      loadingTitle.value = "获取用户收藏...";
      loadingSub.value = `[offset]${res.next_offset} [is_last]${res.is_last}`;
      res = await TGRequest.User.byCookie.getCollect(cookie, res.next_offset);
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
async function mergePosts(posts: TGApp.Plugins.Mys.Post.FullData[]): Promise<void> {
  const db = await TGSqlite.getDB();
  const collectTitle = `${userStore.briefInfo.value.nickname} 的收藏`;
  for (const post of posts) {
    loadingSub.value = `合并帖子 ${post.post.post_id} ${post.post.subject}`;
    const postId = post.post.post_id;
    const collect = await TGSqlite.checkPostCollect(postId.toString());
    let collects = new Set<string>();
    if (collect !== false) {
      try {
        const parse: string[] = JSON.parse(collect);
        for (const item of parse) {
          collects.add(item);
        }
      } catch (e) {
        collects.add("default");
        showSnackbar({
          text: `收藏数据解析失败: ${collect}`,
          color: "error",
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      collects.add(collectTitle);
    }
    const sql = insertPostCollectData(post, Array.from(collects), userStore.briefInfo.value.uid);
    await db.execute(sql);
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
