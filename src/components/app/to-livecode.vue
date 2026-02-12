<!-- 兑换码浮窗组件 -->
<template>
  <TOverlay v-model="visible" class="tolc-overlay">
    <div class="tolc-box">
      <div class="tolc-title">
        <span>{{ gameInfo?.name ?? "" }}兑换码</span>
        <v-icon
          size="18px"
          title="share"
          @click="shareImg()"
          icon="mdi-share-variant"
          variant="outlined"
          data-html2canvas-ignore
        />
      </div>
      <div class="tolc-info">ActID:{{ props.actId }}</div>
      <div v-for="(item, index) in props.data" :key="index" class="tolc-list-box">
        <div class="tolc-list-icon">
          <img v-if="item.img === ''" src="/UI/app/empty.webp" alt="empty" />
          <TMiImg :src="item.img" :ori="true" v-else alt="award" />
        </div>
        <div class="tolc-list-info">
          <span>{{ item.code === "" ? "暂无兑换码" : item.code }}</span>
          <span v-html="item.title" />
          <span title="开放时间">{{ timestampToDate(Number(item.to_get_time) * 1000) }}</span>
        </div>
        <div class="tolc-list-btn">
          <v-btn
            size="small"
            :disabled="item.code === ''"
            @click="copy(item.code)"
            icon="mdi-content-copy"
            variant="outlined"
            data-html2canvas-ignore
          />
        </div>
      </div>
      <div v-if="props.data.length === 0">暂无兑换码数据</div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import showSnackbar from "@comp/func/snackbar.js";
import useBBSStore from "@store/bbs.js";
import { generateShareImg } from "@utils/TGShare.js";
import { timestampToDate } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";
import { computed } from "vue";

import TMiImg from "./t-mi-img.vue";
import TOverlay from "./t-overlay.vue";

/**
 * 兑换码浮窗组件参数
 */
type ToLiveCodeProps = {
  /* 兑换码数据 */
  data: Array<TGApp.BBS.Navigator.CodeData>;
  /* 前瞻活动ID */
  actId: string | undefined;
  /* 分区ID */
  gid: number;
};

const { gameList } = storeToRefs(useBBSStore());

const props = defineProps<ToLiveCodeProps>();
const visible = defineModel<boolean>({ default: false });
const gameInfo = computed<TGApp.BBS.Game.Item | undefined>(() =>
  gameList.value.find((i) => i.id === props.gid),
);

/**
 * 复制兑换码
 * @param {string} code 兑换码
 * @returns {Promise<void>}
 */
async function copy(code: string): Promise<void> {
  await navigator.clipboard.writeText(code);
  showSnackbar.success("已复制到剪贴板");
}

/**
 * 生成分享图片
 * @returns {Promise<void>}
 */
async function shareImg(): Promise<void> {
  const element = document.querySelector<HTMLElement>(".tolc-box");
  if (element === null) {
    showSnackbar.warn("未获取到分享内容");
    return;
  }
  const fileName = `LiveCode_${props.gid}_${props.actId}_${new Date().getTime()}`;
  await generateShareImg(fileName, element, 4);
}
</script>
<style lang="css" scoped>
.tolc-overlay {
  height: 100vh;
}

.tolc-box {
  position: relative;
  display: flex;
  width: 340px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 10px 20px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 5px;
  background: var(--app-page-bg);
  row-gap: 12px;
}

.tolc-title {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--common-text-title);
  column-gap: 5px;
  font-family: var(--font-title);
  font-size: 20px;
  text-align: center;
}

.tolc-info {
  position: absolute;
  z-index: -1;
  right: 6px;
  bottom: 2px;
  font-size: 10px;
}

.tolc-list-box {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  column-gap: 12px;
}

.tolc-list-icon {
  position: relative;
  display: flex;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.tolc-list-info {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;

  :first-child {
    font-family: var(--font-title);
  }

  :last-child {
    font-size: 12px;
  }
}

.tolc-list-btn {
  margin-left: auto;
}
</style>
