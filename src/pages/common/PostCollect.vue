<template>
  <v-app-bar>
    <div class="pc-top">
      <div class="pc-title">
        <img src="/source/UI/posts.webp" alt="posts" />
        <span>收藏</span>
      </div>
      <v-select
        :hide-details="true"
        density="compact"
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
    </div>
    <template #append>
      <v-pagination class="pc-page" v-model="page" :total-visible="view" :length="length" />
    </template>
    <template #extension>
      <div class="pc-btns">
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
      </div>
    </template>
  </v-app-bar>
  <div class="pc-posts">
    <div v-for="item in curPosts" :key="item.post.post_id">
      <TPostCard
        @onSelected="handleSelected"
        :model-value="item"
        :select-mode="selectedMode"
        :user-click="true"
        @onUserClick="handleUserClick"
      />
    </div>
  </div>
  <ToCollectPost @submit="load" :post="selectedPost" v-model="showCollect" />
  <VpOverlayUser v-model="showUser" :gid="curGid" :uid="curUid" />
</template>
<script lang="ts" setup>
import TPostCard from "@comp/app/t-postcard.vue";
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import ToCollectPost from "@comp/pageCollect/to-collectPost.vue";
import VpOverlayUser from "@comp/viewPost/vp-overlay-user.vue";
import TSUserCollection from "@Sqlite/modules/userCollect.js";
import { event } from "@tauri-apps/api";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";

import { useUserStore } from "@/store/modules/user.js";
import TGLogger from "@/utils/TGLogger.js";
import postReq from "@/web/request/postReq.js";

const { cookie, briefInfo } = storeToRefs(useUserStore());
let collectListener: UnlistenFn | null = null;

const curSelect = ref<string>("未分类");
const page = ref<number>(1);
const curUid = ref<string>("");
const curGid = ref<number>(2);
const selectedMode = ref<boolean>(false);
const showUser = ref<boolean>(false);
const showCollect = ref<boolean>(false);
const sortId = ref<boolean>(false);

const selectedPost = shallowRef<Array<string>>([]);
const collections = shallowRef<Array<TGApp.Sqlite.UserCollection.UFCollection>>([]);
const selected = shallowRef<Array<TGApp.Sqlite.UserCollection.UFPost>>([]);

const length = computed<number>(() => Math.ceil(selected.value.length / 12));
const view = computed<number>(() => (length.value === 1 ? 1 : length.value > 5 ? 5 : length.value));
const curPosts = computed<Array<TGApp.BBS.Post.FullData>>(() =>
  selected.value.slice((page.value - 1) * 12, page.value * 12).map((i) => JSON.parse(i.content)),
);

onMounted(async () => {
  collectListener = await event.listen<void>("refreshCollect", load);
  await load();
});
onUnmounted(() => {
  if (collectListener !== null) {
    collectListener();
    collectListener = null;
  }
});

function handleSelected(v: string): void {
  if (!selectedPost.value.includes(v)) {
    selectedPost.value = [...selectedPost.value, v];
    return;
  }
  selectedPost.value = selectedPost.value.filter((i) => i !== v);
}

function sortPost(value: boolean): void {
  let ori = sortId.value;
  sortId.value = value;
  selected.value = selected.value.sort((a, b) =>
    sortId.value ? Number(b.id) - Number(a.id) : Number(b.updated) - Number(a.updated),
  );
  if (ori === sortId.value) return;
  showSnackbar.success(`已${sortId.value ? "按帖子ID排序" : "按更新时间排序"}`);
}

async function load(): Promise<void> {
  await showLoading.start("正在加载收藏帖子", "获取收藏合集");
  collections.value = await TSUserCollection.getCollectList();
  await showLoading.update("获取未分类帖子");
  const postUnCollect = await TSUserCollection.getUnCollectPostList();
  if (curSelect.value === "未分类" || collections.value.length === 0)
    selected.value = postUnCollect;
  else if (collections.value.find((c) => c.title === curSelect.value)) {
    selected.value = await TSUserCollection.getCollectPostList(curSelect.value);
  } else {
    selected.value = postUnCollect;
    curSelect.value = "未分类";
  }
  sortPost(sortId.value);
  selectedMode.value = false;
  selectedPost.value = [];
  if (page.value > length.value) page.value = 1;
  await showLoading.end();
}

function toSelect(): void {
  if (showUser.value) showUser.value = false;
  if (selectedMode.value) {
    selectedMode.value = false;
    if (selectedPost.value.length === 0) return;
    showCollect.value = true;
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
  await showLoading.start("正在修改分类信息");
  const check = await TSUserCollection.updateCollect(collect.title, cTc, cTd);
  await showLoading.end();
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
  await showLoading.start(`正在${title}`);
  let success = 0;
  for (const post of selectedPost.value) {
    await showLoading.update(`正在处理帖子: ${post}`);
    const check = await TSUserCollection.deletePostCollect(post, force);
    if (check) {
      success++;
      continue;
    }
    showSnackbar.warn(`帖子 ${post} 操作失败`);
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  }
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
  await showLoading.start("正在获取合集帖子", `获取合集 ${select}`);
  if (select === "未分类") {
    curSelect.value = "未分类";
    selected.value = await TSUserCollection.getUnCollectPostList();
  } else selected.value = await TSUserCollection.getCollectPostList(select);
  page.value = 1;
  await showLoading.end();
  showSnackbar.success(`切换合集 ${select}，共 ${selected.value.length} 条帖子`);
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
  if (!cookie.value) {
    showSnackbar.warn("请先登录");
    return;
  }
  const uidReal = uid || briefInfo.value.uid;
  await showLoading.start(`[${uidReal}]获取用户收藏`);
  let res = await postReq.user.collect(cookie.value, uidReal);
  while (true) {
    if ("retcode" in res) {
      await showLoading.end();
      if (res.retcode === 1001) showSnackbar.warn("用户收藏已设为私密，无法获取");
      else showSnackbar.error(`[${res.retcode}] ${res.message}`);
      break;
    }
    let posts = res.list;
    await mergePosts(posts, uid || briefInfo.value.uid);
    if (res.is_last) break;
    await showLoading.update(`[offset]${res.next_offset} [is_last]${res.is_last}`);
    res = await postReq.user.collect(cookie.value, uid || briefInfo.value.uid, res.next_offset);
  }
  await showLoading.end();
  showSnackbar.success("获取用户收藏成功，即将刷新页面");
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  window.location.reload();
}

// 合并收藏帖子
async function mergePosts(posts: Array<TGApp.BBS.Post.FullData>, collect: string): Promise<void> {
  const title = `用户收藏-${collect}`;
  for (const post of posts) {
    await showLoading.update(`[POST]${post.post.subject} [collection]${title}`);
    const res = await TSUserCollection.addCollect(post.post.post_id, post, title, true);
    if (!res) await TGLogger.Error(`[PostCollect] mergePosts [${post.post.post_id}]`);
  }
}

function handleUserClick(user: TGApp.BBS.Post.User, gid: number): void {
  if (showCollect.value) showCollect.value = false;
  curGid.value = gid;
  curUid.value = user.uid;
  showUser.value = true;
}
</script>
<style lang="css" scoped>
.pc-top {
  display: flex;
  margin-left: 12px;
  gap: 8px;
}

.pc-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  img {
    width: 32px;
    height: 32px;
  }

  span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }
}

.pc-select {
  min-width: 150px;
}

.pc-btns {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 16px;
  gap: 8px;
}

.pc-btn {
  height: 40px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}

.dark .pc-btn {
  border: 1px solid var(--common-shadow-2);
}

.pc-posts {
  display: grid;
  grid-auto-rows: auto;
  grid-gap: 8px;
  grid-template-columns: repeat(4, minmax(320px, 1fr));
}
</style>
