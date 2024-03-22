<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="pc-container">
    <div class="pc-top">
      <v-select
        v-model="curSelect"
        class="pc-select"
        :items="collections"
        :clearable="curSelect !== '未分类'"
        variant="outlined"
        label="合集"
      >
        <template v-slot:item="{ props, item }">
          <v-list-item v-bind="props" :title="item.raw.title" :subtitle="item.raw.desc" />
        </template>
      </v-select>
      <v-btn
        :disabled="selectedMode"
        size="small"
        class="pc-btn"
        icon="mdi-refresh"
        title="获取用户收藏"
        @click="freshUser()"
      />
      <v-btn
        :disabled="selectedMode"
        size="small"
        class="pc-btn"
        icon="mdi-import"
        @click="freshOther"
        title="导入其他用户收藏"
      />
      <v-btn size="small" class="pc-btn" icon="mdi-pencil" @click="toSelect()" title="编辑收藏" />
      <v-btn
        :disabled="selectedMode"
        size="small"
        v-if="curSelect !== '未分类'"
        class="pc-btn"
        icon="mdi-info"
        @click="toEdit()"
        title="编辑分类"
      />
      <v-btn
        :disabled="selectedMode"
        size="small"
        v-if="curSelect !== '未分类'"
        class="pc-btn"
        icon="mdi-delete"
        @click="deleteCollect()"
        title="删除合集"
      />
      <v-pagination class="pc-page" v-model="page" :total-visible="view" :length="length" />
    </div>
    <div class="pc-posts">
      <div v-for="item in getPageItems()" :key="item.post.post_id">
        <TPostCard :model-value="item" :selected="selectedPost" :select-mode="selectedMode" />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { storeToRefs } from "pinia";
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

const collections = ref<TGApp.Sqlite.UserCollection.UFCollection[]>([]);
const selected = ref<TGApp.Sqlite.UserCollection.UFPost[]>([]);
const curSelect = ref<string>("未分类");
const page = ref(1);
const length = computed(() => Math.ceil(selected.value.length / 12));
const view = computed(() => {
  if (length.value === 1) return 0;
  return length.value > 5 ? 5 : length.value;
});

const selectedMode = ref<boolean>(false);
const selectedPost = ref<Array<string>>([]);

onBeforeMount(async () => {
  if (!(await TGSqlite.checkTableExist("UFPost"))) {
    await TGSqlite.update();
    showSnackbar({
      text: "数据库已更新",
      color: "success",
    });
  }
});

onMounted(async () => await load());

async function load(): Promise<void> {
  loadingTitle.value = "获取收藏帖子...";
  loading.value = true;
  loadingTitle.value = "获取收藏合集...";
  collections.value = await TSUserCollection.getCollectList();
  loadingTitle.value = "获取未分类帖子...";
  const postUnCollect = await TSUserCollection.getUnCollectPostList();
  if (postUnCollect.length > 0) {
    selected.value = postUnCollect;
    curSelect.value = "未分类";
  } else {
    selected.value = await TSUserCollection.getCollectPostList(collections.value[0].title);
    curSelect.value = collections.value[0].title;
  }
  page.value = 1;
  loading.value = false;
}

function toSelect() {
  if (!selectedMode.value) {
    selectedMode.value = true;
  } else {
    // todo
    console.log(selectedPost.value);
  }
}

async function toEdit(): Promise<void> {
  const collect = collections.value.find((c) => c.title === curSelect.value);
  if (collect === undefined) {
    showSnackbar({
      text: "未找到合集信息！",
      color: "error",
    });
    return;
  }
  let cTc = await showConfirm({
    title: "修改分类标题",
    mode: "input",
    text: "请输入分类标题",
    input: collect.title,
  });
  if (typeof cTc !== "string") cTc = collect.title;
  if (cTc === "未分类") {
    showSnackbar({
      text: "该名称为保留名称，不可用于作为分类名！",
      color: "error",
    });
    return;
  }
  if (cTc !== collect.title && collections.value.find((c) => c.title === cTc)) {
    showSnackbar({
      text: "分类名称重复！",
      color: "error",
    });
    return;
  }
  let cTd = await showConfirm({
    title: "修改分类描述",
    mode: "input",
    text: "请输入分类描述",
    input: collect.desc,
  });
  if (typeof cTd !== "string") cTd = collect.desc;
  const cc = await showConfirm({
    title: "确定修改？",
    text: `[${cTc}] ${cTd}`,
  });
  if (!cc) {
    showSnackbar({
      text: "取消修改分类信息",
      color: "cancel",
    });
    return;
  }
  loadingTitle.value = "正在修改分类信息...";
  loading.value = true;
  const check = await TSUserCollection.updateCollect(collect.title, cTc, cTd);
  loading.value = false;
  if (!check) {
    showSnackbar({
      text: "修改分类信息失败!",
      color: "error",
    });
    return;
  }
  showSnackbar({
    text: "成功修改分类信息！",
  });
  await load();
}

async function deleteCollect(): Promise<void> {
  const res = await showConfirm({
    title: "确定删除分类?",
    text: selected.value.length > 0 ? `该分类下 ${selected.value.length} 条帖子将变为未分类` : "",
  });
  if (!res) {
    showSnackbar({
      text: "取消删除",
      color: "cancel",
    });
    return;
  }
  const resD = await TSUserCollection.deleteCollect(curSelect.value);
  if (resD) {
    showSnackbar({
      text: "删除成功",
      color: "success",
    });
    await load();
  } else {
    showSnackbar({
      text: "删除失败",
      color: "error",
    });
  }
}

// 根据合集筛选
async function freshPost(select: string | null): Promise<void> {
  if (select === null) {
    curSelect.value = "未分类";
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
