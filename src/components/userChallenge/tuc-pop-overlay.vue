<!-- 幽境危战赋光之人浮窗 -->
<template>
  <TopOverlay
    ref="overlayPanel"
    v-model="visible"
    contentMaxHeight="none"
    panelWidth="800px"
    :shareCaption
    :titleId
    :topOffset
  >
    <template #header>
      <div class="tucpo-icon">
        <div class="tucpo-icon-main-wrap">
          <img alt="" class="tucpo-icon-main" src="/UI/nav/userChallenge.webp" />
          <img alt="赋光之人" class="tucpo-icon-buff" src="/icon/challenge/buff.webp" />
        </div>
      </div>
      <div class="tucpo-identity">
        <div class="tucpo-title-row">
          <h2 :id="titleId">赋光之人</h2>
          <v-btn-toggle
            v-model="server"
            :disabled="reqPop"
            class="tucpo-toggle"
            color="var(--tgc-od-orange)"
            data-html2canvas-ignore="true"
            density="compact"
            mandatory
            variant="outlined"
          >
            <v-btn v-for="item in serverOptions" :key="item.value" :value="item.value">
              {{ item.text }}
            </v-btn>
          </v-btn-toggle>
        </div>
        <div class="tucpo-meta">
          <span v-if="periodTag" class="tucpo-meta-tag">{{ periodTag }}</span>
          <span class="tucpo-meta-chip">{{ currentServerText }}</span>
          <span v-if="periodRange" class="tucpo-meta-chip">{{ periodRange }}</span>
        </div>
      </div>
    </template>

    <template #actions>
      <v-btn
        :disabled="reqPop"
        :loading="reqPop"
        aria-label="刷新赋光之人"
        density="comfortable"
        icon="mdi-refresh"
        title="刷新赋光之人"
        variant="text"
        @click="refreshPopList(true)"
      />
      <v-btn
        :disabled="shareLoading"
        :loading="shareLoading"
        aria-label="保存分享图"
        density="comfortable"
        icon="mdi-share-variant"
        title="保存分享图"
        variant="text"
        @click="handleShare"
      />
      <v-btn
        aria-label="关闭"
        density="comfortable"
        icon="mdi-close"
        title="关闭"
        variant="text"
        @click="visible = false"
      />
    </template>

    <section class="tucpo-section">
      <div v-if="reqPop && popList.length === 0" class="tucpo-state">
        <v-progress-circular color="var(--tgc-od-orange)" indeterminate size="36" width="3" />
        <span>正在加载赋光之人列表</span>
      </div>
      <div v-else-if="popList.length === 0" class="tucpo-state">
        <img alt="empty" src="/UI/app/empty.webp" />
        <span>暂无数据，请尝试刷新</span>
      </div>
      <TransitionGroup
        v-else
        class="tucpo-grid"
        name="tucpo-pop"
        tag="div"
        @before-leave="onPopBeforeLeave"
      >
        <div v-for="avatar in popList" :key="avatar.avatar_id" class="tucpo-cell">
          <TItemBox :model-value="getPopBox(avatar)" />
        </div>
      </TransitionGroup>
    </section>
  </TopOverlay>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import TopOverlay from "@comp/app/top-overlay.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import recordReq from "@req/recordReq.js";
import fmtUtil from "@utils/fmtUtil.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import TGShare from "@utils/TGShare.js";
import { getRcStar, getZhElement } from "@utils/toolFunc.js";
import { computed, ref, shallowRef, useId, useTemplateRef, watch } from "vue";

import { AppCharacterData } from "@/data/index.js";

type ServerToggle = { text: string; value: TGApp.Game.Base.ServerTypeEnum };
type TucPopOverlayProps = {
  periodName?: string;
  periodRange?: string;
  topOffset?: string;
  uid?: string;
};

const serverOptions: ReadonlyArray<ServerToggle> = [
  { text: "官方服", value: gameEnum.server.CN_GF01 },
  { text: "渠道服", value: gameEnum.server.CN_QD01 },
];

const { periodName, periodRange, topOffset = "64px", uid } = defineProps<TucPopOverlayProps>();
const visible = defineModel<boolean>({ required: true });
const overlayPanel = useTemplateRef<InstanceType<typeof TopOverlay>>("overlayPanel");
const titleId = useId();
const server = ref<TGApp.Game.Base.ServerTypeEnum>(resolveServer(uid));
const reqPop = ref<boolean>(false);
const shareLoading = ref<boolean>(false);
const popList = shallowRef<Array<TGApp.Game.Challenge.PopularityItem>>([]);
const refreshTime = ref<string>();
let popReqId = 0;
const serverLabel = computed<string>(() => gameEnum.serverDesc(server.value));
const currentServerText = computed<string>(() => {
  const find = serverOptions.find((item) => item.value === server.value);
  return find?.text ?? serverLabel.value;
});
const periodTag = computed<string>(() => {
  const parts: Array<string> = [];
  if (periodName) parts.push(periodName);
  if (refreshTime.value) parts.push(refreshTime.value);
  return parts.join(" · ");
});
const shareCaption = computed<string>(() => {
  const period = periodName ? ` · ${periodName}` : "";
  return `幽境危战 · 赋光之人${period} · ${serverLabel.value}`;
});
const shareTitle = computed<string>(() =>
  periodName ? `赋光之人_${periodName}_${serverLabel.value}` : `赋光之人_${serverLabel.value}`,
);

watch(visible, async (isVisible) => {
  if (!isVisible) return;
  const nextServer = resolveServer(uid);
  if (nextServer !== server.value) {
    server.value = nextServer;
    return;
  }
  await refreshPopList(false);
});

watch(
  () => server.value,
  async () => {
    if (!visible.value) return;
    await TGLogger.Info(`[UserChallenge][watch][server] 切换服务器: ${serverLabel.value}`);
    await refreshPopList(true);
  },
);

async function handleShare(): Promise<void> {
  const panel = overlayPanel.value?.panel ?? null;
  if (panel === null) {
    showSnackbar.warn("分享内容不存在");
    return;
  }
  shareLoading.value = true;
  await showLoading.start("正在生成分享图片", shareTitle.value);
  await TGLogger.Info("[UserChallenge][sharePop] 开始生成赋光之人分享图片");
  try {
    await TGShare.modern(shareTitle.value, panel, 2.0, false, { bakeBackdrop: true, ppx: 16 });
    await TGLogger.Info("[UserChallenge][sharePop] 成功生成分享图片");
  } finally {
    await showLoading.end();
    shareLoading.value = false;
  }
}

function onPopBeforeLeave(el: Element): void {
  if (!(el instanceof HTMLElement)) return;
  el.style.left = `${el.offsetLeft}px`;
  el.style.top = `${el.offsetTop}px`;
}

function resolveServer(gameUid?: string): TGApp.Game.Base.ServerTypeEnum {
  if (gameUid?.startsWith("5")) return gameEnum.server.CN_QD01;
  return gameEnum.server.CN_GF01;
}

function getPopBox(avatar: TGApp.Game.Challenge.PopularityItem): TItemBoxData {
  const find = AppCharacterData.find((i) => i.id === avatar.avatar_id);
  if (!find) {
    return {
      bg: `/icon/bg/${getRcStar(avatar.avatar_id, avatar.rarity)}-Star.webp`,
      clickable: false,
      icon: avatar.image,
      lt: `/icon/element/${getZhElement(avatar.element)}元素.webp`,
      ltSize: "20px",
      size: "80px",
      height: "80px",
      display: "inner",
      innerText: avatar.name,
      innerHeight: 24,
      innerBlur: "4px",
    };
  }
  return {
    bg: `/icon/bg/${find.star}-Star.webp`,
    clickable: false,
    icon: `/WIKI/character/${find.id}.webp`,
    lt: `/icon/element/${find.element}元素.webp`,
    ltSize: "20px",
    size: "80px",
    height: "80px",
    display: "inner",
    innerText: find.name,
    innerHeight: 24,
    innerBlur: "4px",
  };
}

async function refreshPopList(hint: boolean = true): Promise<void> {
  const reqId = ++popReqId;
  reqPop.value = true;
  let resp: TGApp.Game.Challenge.PopularityResp | undefined;
  try {
    resp = await recordReq.challenge.pop(server.value);
    if (reqId !== popReqId) return;
    if (resp.retcode !== 0) {
      reqPop.value = false;
      showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
      await TGLogger.Warn(
        `[UserChallenge][RefreshPopList] Error: ${resp.retcode} - ${resp.message}`,
      );
      return;
    }
  } catch (e) {
    if (reqId !== popReqId) return;
    const errMsg = TGHttps.getErrMsg(e);
    reqPop.value = false;
    showSnackbar.error(`获取赋光之人列表失败：${errMsg}`);
    await TGLogger.Error(`[UserChallenge][RefreshPopList] 获取赋光之人列表异常`);
    await TGLogger.Error(`[UserChallenge][RefreshPopList] ${e}`);
    return;
  }
  popList.value = resp.data.avatar_list;
  refreshTime.value = fmtUtil.dateTime(Date.now());
  reqPop.value = false;
  if (!hint) return;
  showSnackbar.success(`已刷新 ${serverLabel.value} 的 ${popList.value.length} 位赋光之人`);
}
</script>
<style lang="scss" scoped>
.tucpo-icon {
  position: relative;
  display: flex;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--common-shadow-t-2);
}

.tucpo-icon-main-wrap {
  position: relative;
  width: 40px;
  height: 40px;
}

.tucpo-icon-main {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.tucpo-icon-buff {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.tucpo-identity {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.tucpo-title-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;

  h2 {
    overflow: hidden;
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 28px;
    font-weight: normal;
    line-height: 36px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.tucpo-toggle {
  flex-shrink: 0;
  border-radius: 4px;
}

.tucpo-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
  line-height: 16px;
}

.tucpo-meta-tag,
.tucpo-meta-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
}

.tucpo-meta-tag {
  color: var(--tgc-od-orange);
}

.tucpo-meta-chip {
  color: var(--box-text-2);
}

.tucpo-section {
  display: flex;
  flex-direction: column;
  padding: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
}

.tucpo-state {
  display: flex;
  min-height: 180px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: var(--common-text-sub);
  font-size: 14px;
  gap: 12px;
  line-height: 20px;

  img {
    width: 96px;
    height: 96px;
    object-fit: contain;
  }
}

.tucpo-grid {
  position: relative;
  display: grid;
  box-sizing: border-box;
  padding: 16px;
  gap: 16px;
  grid-template-columns: repeat(8, 80px);
}

.tucpo-cell {
  width: 80px;
  height: 80px;
}

.tucpo-pop-move {
  transition: transform 0.4s ease;
}

.tucpo-pop-enter-active,
.tucpo-pop-leave-active {
  transition: opacity 0.4s ease;
}

.tucpo-pop-enter-from,
.tucpo-pop-leave-to {
  opacity: 0;
}

.tucpo-pop-leave-active {
  position: absolute;
  z-index: 0;
}

:deep(.tolp-content) {
  padding: 8px;
}

@media (width <= 720px) {
  .tucpo-title-row h2 {
    font-size: 22px;
    line-height: 32px;
  }
}
</style>
