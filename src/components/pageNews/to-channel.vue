<template>
  <TOverlay v-model="visible">
    <div class="toc-box">
      <div class="toc-title">请选择要跳转的频道</div>
      <div class="toc-list">
        <div
          v-for="(item, index) in channelList"
          :key="index"
          :class="props.gid === item.gid.toString() ? 'active' : ''"
          class="toc-list-item"
          @click="toChannel(item)"
        >
          <TMiImg :ori="true" :src="item.icon" alt="icon" />
          <span class="toc-list-title">{{ item.title }}</span>
          <span class="toc-list-id">GID:{{ item.gid }}</span>
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import bbsEnum from "@enum/bbs.js";
import useAppStore from "@store/app.js";
import useBBSStore from "@store/bbs.js";
import { storeToRefs } from "pinia";
import { onMounted, shallowRef } from "vue";

type ChannelItem = { icon: string; title: string; gid: number };
type ToChannelProps = { gid?: string; curType?: string };

const bbsStore = useBBSStore();
const { recentNewsType } = storeToRefs(useAppStore());
const { gameList } = storeToRefs(bbsStore);
const channelList = shallowRef<Array<ChannelItem>>();
const props = defineProps<ToChannelProps>();
const visible = defineModel<boolean>({ default: false });

onMounted(async () => {
  if (gameList.value.length === 0) await bbsStore.refreshGameList();
  channelList.value = gameList.value.map((i) => ({ icon: i.app_icon, title: i.name, gid: i.id }));
});

async function toChannel(item: ChannelItem): Promise<void> {
  if (props.gid === item.gid.toString()) {
    showSnackbar.warn("当前已经在该频道");
    return;
  }
  visible.value = false;
  let link = `/news/${item.gid}/{type}`;
  if (recentNewsType.value satisfies TGApp.BBS.Post.NewsTypeEnum) {
    link = link.replace("{type}", recentNewsType.value.toString());
  } else {
    link = link.replace("{type}", bbsEnum.post.newsType.NOTICE.toString());
    recentNewsType.value = bbsEnum.post.newsType.NOTICE;
  }
  window.location.href = link;
}
</script>
<style lang="css" scoped>
.toc-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 4px;
  background: var(--app-page-bg);
  row-gap: 12px;
}

.toc-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
}

.toc-list {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, 1fr);
}

.toc-list-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: start;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  column-gap: 8px;
  cursor: pointer;
  transition: all 0.5s linear;

  &.active {
    border: 1px solid var(--common-shadow-1);
    background: var(--box-bg-2);
    color: var(--box-text-2);
  }

  img {
    width: 48px;
    height: 48px;
  }

  .toc-list-title {
    margin-right: 8px;
    font-family: var(--font-title);
    font-size: 16px;
  }

  .toc-list-id {
    position: absolute;
    right: 4px;
    bottom: 2px;
    font-size: 6px;
    opacity: 0.3;
  }
}
</style>
