<!-- 兑换码浮窗组件 -->
<template>
  <TOverlay v-model="visible" class="tolc-overlay">
    <div ref="TolcRef" class="tolc-box">
      <TRedeemCode :gid :liveCodes="data.map((item) => item.code)">
        <template #title>
          <span>{{ gameInfo?.name ?? getRedeemConfig(gid)?.name ?? "" }}兑换码</span>
        </template>
        <template #actions>
          <v-btn
            class="tolc-share"
            icon="mdi-share-variant-outline"
            title="分享兑换码"
            aria-label="分享兑换码"
            :width="32"
            :height="32"
            rounded="lg"
            variant="text"
            @click="shareImg()"
          />
        </template>
        <template #default="{ submit, results, busy, canRedeem, currentCode }">
          <div class="tolc-list">
            <div
              v-for="(item, index) in props.data"
              :key="index"
              class="tolc-list-box"
              :class="resultClass(results.find((result) => result.code === item.code))"
            >
              <div class="tolc-list-icon">
                <img v-if="item.img === ''" alt="" src="/UI/app/empty.webp" />
                <TMiImg v-else :ori="true" :src="item.img" alt="奖励" />
              </div>
              <div class="tolc-list-info">
                <span class="tolc-code" :title="item.code || '暂无兑换码'">{{
                  item.code || "暂无兑换码"
                }}</span>
                <span class="tolc-reward" v-html="item.title" />
              </div>
              <div class="tolc-list-btn" data-html2canvas-ignore>
                <v-btn
                  v-if="getRedeemConfig(gid)"
                  class="tolc-action"
                  :disabled="!item.code || busy || !canRedeem"
                  :loading="busy && currentCode === item.code"
                  icon="mdi-gift-outline"
                  title="兑换此码"
                  aria-label="兑换此码"
                  :width="32"
                  :height="32"
                  rounded="lg"
                  variant="tonal"
                  @click="submit([item.code])"
                />
                <v-btn
                  class="tolc-action"
                  :disabled="!item.code"
                  icon="mdi-content-copy"
                  title="复制兑换码"
                  aria-label="复制兑换码"
                  :width="32"
                  :height="32"
                  rounded="lg"
                  variant="tonal"
                  @click="copy(item.code)"
                />
              </div>
              <div class="tolc-meta">
                <span
                  v-if="!results.some((result) => result.code === item.code)"
                  class="tolc-time"
                  title="开放时间"
                  >{{ fmtUtil.dateTime(Number(item.to_get_time) * 1000) }}</span
                >
                <span
                  v-for="result in results.filter((result) => result.code === item.code)"
                  :key="result.code"
                  class="tolc-result"
                  :title="result.message"
                  role="status"
                >
                  <v-icon
                    :icon="
                      result.retcode === 0
                        ? 'mdi-check-circle-outline'
                        : result.retcode === -1
                          ? 'mdi-help-circle-outline'
                          : result.retcode === -2
                            ? 'mdi-minus-circle-outline'
                            : 'mdi-alert-circle-outline'
                    "
                    size="14"
                  />
                  <span>{{ result.message }}</span>
                </span>
              </div>
            </div>
          </div>
          <div v-if="!props.data.length" class="tolc-empty">
            <v-icon icon="mdi-ticket-outline" size="28" />
            <span>暂无兑换码数据</span>
          </div>
        </template>
      </TRedeemCode>
      <div v-if="actId" class="tolc-info">ActID: {{ actId }}</div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import useBBSStore from "@store/bbs.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import { getRedeemConfig } from "@utils/game/redeemConfig.js";
import { generateShareImg } from "@utils/share/TGShare.js";
import { storeToRefs } from "pinia";
import { computed, useTemplateRef } from "vue";

import TMiImg from "./t-mi-img.vue";
import TOverlay from "./t-overlay.vue";
import TRedeemCode from "./t-redeem-code.vue";

/**
 * 兑换码浮窗组件参数
 * @since Beta v0.13.0
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
const tolcEl = useTemplateRef<HTMLDivElement>("TolcRef");
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

function resultClass(result?: TGApp.Game.Redeem.Result): string {
  if (!result) return "";
  if (result.retcode === 0) return "tolc-success";
  if (result.retcode === -1) return "tolc-unknown";
  if (result.retcode === -2) return "tolc-pending";
  return "tolc-failure";
}

async function shareImg(): Promise<void> {
  const element = tolcEl.value;
  if (element === null) {
    showSnackbar.warn("未获取到分享内容");
    return;
  }
  // 仅展开截图副本，屏幕上的浮窗继续保持滚动和原有位置。
  const clone = element.cloneNode(true);
  if (!(clone instanceof HTMLElement)) return;
  Object.assign(clone.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: element.getBoundingClientRect().width + "px",
    height: "auto",
    maxHeight: "none",
    overflow: "visible",
    zIndex: "-1",
    pointerEvents: "none",
  });
  clone.inert = true;
  document.body.append(clone);
  try {
    const fileName = "LiveCode_" + props.gid + "_" + props.actId + "_" + Date.now();
    await generateShareImg(fileName, clone, 4);
  } finally {
    clone.remove();
  }
}
</script>
<style lang="scss" scoped>
.tolc-overlay {
  position: fixed;
  z-index: 1;
  height: 100vh;
  color: var(--app-page-content);
}

.tolc-box {
  overflow: auto;
  width: min(440px, calc(100vw - 32px));
  max-height: 85vh;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  background: var(--app-page-bg);
  box-shadow: 0 8px 32px var(--common-shadow-t-4);
}

.tolc-info {
  margin-top: 8px;
  font-size: 10px;
  line-height: 16px;
  opacity: 0.6;
  text-align: right;
  white-space: nowrap;
}

.tolc-share,
.tolc-action {
  min-width: 32px;
  color: var(--app-page-content);

  :deep(.v-icon) {
    font-size: 18px;
  }
}

.tolc-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tolc-list-box {
  display: grid;
  min-width: 0;
  align-items: start;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  gap: 4px 8px;
  grid-template-columns: 32px minmax(0, 1fr) auto;
}

.tolc-list-icon {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.tolc-list-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  overflow-wrap: anywhere;
}

.tolc-code {
  overflow: hidden;
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tolc-reward {
  font-size: 13px;
  line-height: 20px;

  :deep(p) {
    margin: 0;
  }
}

.tolc-meta {
  min-width: 0;
  height: 18px;
  grid-column: 2 / -1;
  line-height: 18px;
}

.tolc-time {
  font-size: 11px;
  opacity: 0.7;
  white-space: nowrap;
}

.tolc-list-btn {
  display: flex;
  gap: 4px;
}

.tolc-result {
  display: flex;
  overflow: hidden;
  min-width: 0;
  height: 18px;
  align-items: center;
  font-size: 12px;
  gap: 4px;
  line-height: 18px;

  > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .v-icon {
    height: 18px;
    flex-shrink: 0;
    line-height: 1;
  }
}

.tolc-success {
  .tolc-result .v-icon {
    color: var(--redeem-success);
  }
}

.tolc-failure {
  .tolc-result .v-icon {
    color: var(--redeem-failure);
  }
}

.tolc-unknown {
  .tolc-result .v-icon {
    color: var(--redeem-unknown);
  }
}

.tolc-pending {
  .tolc-result {
    opacity: 0.7;
  }
}

.tolc-empty {
  display: flex;
  min-height: 120px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  gap: 8px;
  opacity: 0.7;
}

@media (width <= 380px) {
  .tolc-list-box {
    padding: 8px;
    grid-template-columns: 28px minmax(0, 1fr) auto;
  }

  .tolc-list-icon {
    width: 28px;
    height: 28px;
  }

  .tolc-list-btn {
    flex-direction: column;
  }
}
</style>
