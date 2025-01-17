<template>
  <TOverlay v-model="visible">
    <div class="toc-box">
      <div class="toc-title">请选择要跳转的频道</div>
      <div class="toc-list">
        <div
          v-for="(item, index) in channelList"
          :key="index"
          class="toc-list-item"
          :class="props.gid === item.gid.toString() ? 'active' : ''"
          @click="toChannel(item)"
        >
          <TMiImg :src="item.icon" alt="icon" :ori="true" />
          <span>{{ item.title }}</span>
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { storeToRefs } from "pinia";
import { onMounted, shallowRef } from "vue";

import { type NewsType, useAppStore } from "@/store/modules/app.js";
import apiHubReq from "@/web/request/apiHubReq.js";

type ChannelItem = { icon: string; title: string; gid: number };
type ToChannelProps = { gid?: string; curType?: string };

const { recentNewsType } = storeToRefs(useAppStore());
const channelList = shallowRef<Array<ChannelItem>>();
const props = defineProps<ToChannelProps>();
const visible = defineModel<boolean>({ default: false });

onMounted(async () => {
  const allGames = await apiHubReq.game();
  channelList.value = allGames.map((i) => ({ icon: i.app_icon, title: i.name, gid: i.id }));
});

async function toChannel(item: ChannelItem): Promise<void> {
  if (props.gid === item.gid.toString()) {
    showSnackbar.warn("当前已经在该频道");
    return;
  }
  visible.value = false;
  let link = `/news/${item.gid}/{type}`;
  if (recentNewsType.value satisfies NewsType) {
    link = link.replace("{type}", recentNewsType.value);
  } else {
    link = link.replace("{type}", "notice");
    recentNewsType.value = "notice";
  }
  window.location.href = link;
}
</script>
<style lang="css" scoped>
.toc-box {
  padding: 10px;
  border-radius: 5px;
  background: var(--app-page-bg);
}

.toc-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.toc-list {
  display: grid;
  margin-top: 10px;
  grid-gap: 10px;
  grid-template-columns: repeat(2, 1fr);
}

.toc-list-item {
  display: flex;
  align-items: center;
  justify-content: start;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  cursor: pointer;
  transition: all 0.5s linear;

  &.active {
    border: 1px solid var(--common-shadow-1);
    background: var(--box-bg-2);
    color: var(--box-text-2);
  }

  img {
    width: 45px;
    height: 45px;
    margin-right: 10px;
    border-bottom-left-radius: 5px;
    border-top-left-radius: 5px;
  }

  span {
    margin-right: 10px;
    font-family: var(--font-title);
    font-size: 16px;
  }
}
</style>
