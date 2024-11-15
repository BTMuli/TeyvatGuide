<template>
  <div class="pc-container">
    <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
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
        size="small"
        class="pc-btn"
        icon="mdi-sort"
        @click="sortPost(!sortId)"
        :title="sortId ? '按更新时间排序' : '按帖子ID排序'"
      />
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
      <v-btn
        size="small"
        class="pc-btn"
        :icon="selectedMode ? 'mdi-folder-move' : 'mdi-pencil'"
        @click="toSelect()"
        title="编辑收藏"
      />
      <v-btn
        :disabled="selectedMode"
        size="small"
        class="pc-btn"
        icon="mdi-plus"
        @click="addCollect"
        title="新建分类"
      />
      <v-btn
        :disabled="selectedMode || curSelect === '未分类'"
        size="small"
        class="pc-btn"
        icon="mdi-information"
        @click="toEdit()"
        title="编辑分类"
      />
      <v-btn
        size="small"
        class="pc-btn"
        icon="mdi-delete"
        @click="deleteOper(false)"
        :title="selectedMode ? '删除帖子分类' : '清空合集'"
      />
      <v-btn
        size="small"
        class="pc-btn"
        icon="mdi-delete-forever"
        @click="deleteOper(true)"
        :title="selectedMode ? '删除帖子' : '删除合集'"
      />
      <v-pagination class="pc-page" v-model="page" :total-visible="view" :length="length" />
    </div>
    <div class="pc-posts">
      <div v-for="item in getPageItems()" :key="item.post.post_id">
        <TPostCard
          @update:selected="selectedPost = $event"
          :model-value="item"
          :selected="selectedPost"
          :select-mode="selectedMode"
        />
      </div>
      <ToCollectPost @submit="load" :post="selectedPost" v-model="showOverlay" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { event } from "@tauri-apps/api";
import { UnlistenFn } from "@tauri-apps/api/event";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import showDialog from "../../components/func/dialog.js";
import showSnackbar from "../../components/func/snackbar.js";
import TPostCard from "../../components/main/t-postcard.vue";
import ToCollectPost from "../../components/overlay/to-collectPost.vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import TSUserCollection from "../../plugins/Sqlite/modules/userCollect.js";
import { useUserStore } from "../../store/modules/user.js";
import TGLogger from "../../utils/TGLogger.js";
import TGRequest from "../../web/request/TGRequest.js";

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
const showOverlay = ref(false);
const sortId = ref<boolean>(false);

let collectListener: UnlistenFn | null = null;

onMounted(async () => {
  collectListener = await event.listen("refreshCollect", async () => await load());
  await load();
});
onUnmounted(() => {
  if (collectListener !== null) {
    collectListener();
    collectListener = null;
  }
});

function sortPost(value: boolean) {
  let ori = sortId.value;
  sortId.value = value;
  selected.value = selected.value.sort((a, b) => {
    if (sortId.value) {
      return Number(b.id) - Number(a.id);
    } else {
      return Number(b.updated) - Number(a.updated);
    }
  });
  if (ori !== sortId.value) {
    showSnackbar.success(`已${sortId.value ? "按帖子ID排序" : "按更新时间排序"}`);
  }
}

async function load(): Promise<void> {
  loadingTitle.value = "获取收藏帖子...";
  loading.value = true;
  loadingTitle.value = "获取收藏合集...";
  collections.value = await TSUserCollection.getCollectList();
  loadingTitle.value = "获取未分类帖子...";
  const postUnCollect = await TSUserCollection.getUnCollectPostList();
  if (curSelect.value === "未分类" || collections.value.length === 0) {
    selected.value = postUnCollect;
  } else if (collections.value.find((c) => c.title === curSelect.value)) {
    selected.value = await TSUserCollection.getCollectPostList(curSelect.value);
  } else {
    selected.value = postUnCollect;
    curSelect.value = "未分类";
  }
  sortPost(sortId.value);
  selectedMode.value = false;
  selectedPost.value = [];
  if (page.value > length.value) page.value = 1;
  loading.value = false;
}

function toSelect() {
  if (selectedMode.value) {
    selectedMode.value = false;
    if (selectedPost.value.length === 0) return;
    showOverlay.value = true;
    return;
  }
  selectedPost.value = [];
  selectedMode.value = true;
}

async function addCollect(): Promise<void> {
  let title, desc;
  const titleC = await showDialog.input("新建分类", "分类名称：");
  if (titleC === undefined || titleC === false) return;
  if (titleC === "未分类") {
    showSnackbar.warn("分类名不可为未分类");
    return;
  }
  if (collections.value.find((i) => i.title === titleC)) {
    showSnackbar.warn("分类已存在");
    return;
  }
  title = titleC;
  const descC = await showDialog.input("新建分类", "分类描述：");
  if (descC === false) return;
  if (descC === undefined) desc = title;
  else desc = descC;
  const res = await TSUserCollection.createCollect(title, desc);
  if (res) {
    showSnackbar.success("成功新建分类");
    await load();
    return;
  }
  showSnackbar.error("新建失败");
}

async function toEdit(): Promise<void> {
  const collect = collections.value.find((c) => c.title === curSelect.value);
  if (collect === undefined) {
    showSnackbar.warn("未找到合集信息");
    return;
  }
  let cTc = await showDialog.input("修改分类标题", "分类标题：", collect.title);
  if (cTc === false) {
    showSnackbar.cancel("取消修改分类信息");
    return;
  }
  if (typeof cTc !== "string") cTc = collect.title;
  if (cTc === "未分类") {
    showSnackbar.warn("分类名不可为未分类");
    return;
  }
  if (cTc !== collect.title && collections.value.find((c) => c.title === cTc)) {
    showSnackbar.warn("分类名称重复");
    return;
  }
  let cTd = await showDialog.input("修改分类描述", "分类描述：", collect.desc);
  if (typeof cTd !== "string") cTd = collect.desc;
  const cc = await showDialog.check("确定修改？", `[${cTc}] ${cTd}`);
  if (!cc) {
    showSnackbar.cancel("取消修改分类信息");
    return;
  }
  loadingTitle.value = "正在修改分类信息...";
  loading.value = true;
  const check = await TSUserCollection.updateCollect(collect.title, cTc, cTd);
  loading.value = false;
  if (!check) {
    showSnackbar.warn("修改分类信息失败");
    return;
  }
  showSnackbar.success("成功修改分类信息！");
  await load();
}

async function deleteOper(force: boolean): Promise<void> {
  if (selectedMode.value) await deletePost(force);
  else await deleteCollect(force);
}

async function deletePost(force: boolean = false): Promise<void> {
  if (selectedPost.value.length === 0) {
    showSnackbar.warn("未选择帖子");
    return;
  }
  const title = force ? "删除帖子" : "移除帖子分类";
  const check = await showDialog.check(`确定${title}?`, `共 ${selectedPost.value.length} 条帖子`);
  if (!check) {
    showSnackbar.cancel("取消操作");
    return;
  }
  loadingTitle.value = `正在${title}...`;
  loading.value = true;
  let success = 0;
  for (const post of selectedPost.value) {
    const check = await TSUserCollection.deletePostCollect(post, force);
    if (check) {
      success++;
      continue;
    }
    showSnackbar.warn(`帖子 ${post} 操作失败`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  loading.value = false;
  showSnackbar.success(`成功${title} ${success} 条`);
  await load();
}

async function deleteCollect(force: boolean): Promise<void> {
  if (curSelect.value === "未分类" && force) {
    showSnackbar.warn("未分类不可删除");
    return;
  }
  const title = force ? "删除分类" : "清空分类";
  const check = await showDialog.check(
    `确定${title}?`,
    `该分类下 ${selected.value.length} 条帖子将被${force ? "删除" : "移除分类(未分类将被删除)"}`,
  );
  if (!check) {
    showSnackbar.cancel("取消操作");
    return;
  }
  let resD;
  if (curSelect.value !== "未分类") {
    resD = await TSUserCollection.deleteCollect(curSelect.value, force);
  } else {
    resD = await TSUserCollection.deleteUnCollectPost();
  }
  if (resD) {
    showSnackbar.success(`成功${title}`);
    await load();
    return;
  }
  showSnackbar.warn(`${title} 失败`);
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
  showSnackbar.success(`切换合集 ${select}，共 ${selected.value.length} 条帖子`);
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
      if (typeof e === "string") {
        TGLogger.Error(e);
      } else if (e instanceof Error) {
        TGLogger.Error(e.message);
      }
    }
  }
  return card;
}

watch(
  () => curSelect.value,
  async () => await freshPost(curSelect.value),
);

async function freshOther(): Promise<void> {
  const uidInput = await showDialog.input("导入其他用户收藏", "米游社UID：");
  if (typeof uidInput === "string") {
    if (isNaN(Number(uidInput))) {
      showSnackbar.warn("UID 格式错误，请输入数字");
      return;
    }
    await freshUser(uidInput);
    return;
  }
  showSnackbar.cancel("取消导入");
}

async function freshUser(uid?: string): Promise<void> {
  if (!userStore.cookie.value) {
    showSnackbar.warn("请先登录");
    return;
  }
  const cookie = {
    cookie_token: userStore.cookie.value.cookie_token,
    account_id: userStore.cookie.value.account_id,
  };
  loadingTitle.value = "获取用户收藏...";
  loading.value = true;
  let res = await TGRequest.User.getCollect(cookie, uid || userStore.briefInfo.value.uid);
  while (true) {
    if ("retcode" in res) {
      if (res.retcode === 1001) {
        showSnackbar.warn("用户收藏已设为私密，无法获取");
      } else {
        showSnackbar.error(`[${res.retcode}] ${res.message}`);
      }
      loading.value = false;
      break;
    }
    let posts = res.list;
    loadingTitle.value = `合并收藏帖子 [offset]${res.next_offset}...`;
    await mergePosts(posts, uid || userStore.briefInfo.value.uid);
    if (res.is_last) break;
    loadingTitle.value = "获取用户收藏...";
    loadingSub.value = `[offset]${res.next_offset} [is_last]${res.is_last}`;
    res = await TGRequest.User.getCollect(
      cookie,
      uid || userStore.briefInfo.value.uid,
      res.next_offset,
    );
  }
  loading.value = false;
  showSnackbar.success("获取用户收藏成功");
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

/* stylelint-disable-next-line selector-class-pattern */
.v-btn--disabled.pc-btn {
  background: var(--tgc-dark-1);
  color: var(--tgc-white-1);
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
