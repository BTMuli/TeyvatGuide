<template>
  <TOverlay v-model="visible">
    <div class="toc-box">
      <div class="toc-title">请选择要跳转的频道</div>
      <div class="toc-list">
        <div
          v-for="(item, index) in channelList"
          :key="index"
          class="toc-list-item"
          :class="{ active: props.gid === item.gid }"
          @click="toChannel(item)"
        >
          <img :src="item.icon" alt="icon" />
          <span>{{ item.title }}</span>
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import { type NewsType, useAppStore } from "@/store/modules/app.js";
import type { ToChannelItem } from "@/web/constant/bbs.js";
import TGConstant from "@/web/constant/TGConstant.js";

type ToChannelProps = { gid?: string; curType?: string };

const router = useRouter();
const { recentNewsType } = storeToRefs(useAppStore());
const channelList = TGConstant.BBS.CHANNELS;
const props = defineProps<ToChannelProps>();
const visible = defineModel<boolean>({ default: false });

async function toChannel(item: ToChannelItem): Promise<void> {
  if (props.gid === item.gid) {
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
  await router.push(link);
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
