<template>
  <v-app-bar>
    <template #prepend>
      <div class="game-title">
        <img alt="启动器" class="game-title-icon" src="/platforms/mhy/launcher.webp" />
        <span>游戏安装</span>
      </div>
    </template>
    <template #append>
      <v-btn
        :disabled="launching"
        :loading="launching"
        :title="launchTitle"
        class="game-launch-btn"
        prepend-icon="mdi-play"
        variant="elevated"
        @click="handleLaunchGame"
      >
        启动
      </v-btn>
    </template>
  </v-app-bar>

  <div class="game-page">
    <div v-if="!initialized" class="game-empty">
      <v-progress-circular indeterminate />
      <span class="game-empty-title">正在读取本地安装…</span>
    </div>
    <v-list v-else-if="chosen === null" class="game-list">
      <div class="game-list-header">
        <span>本地安装</span>
      </div>
      <v-list-item
        subtitle="从已发现的安装中选择，或手动指定国服 YuanShen.exe"
        title="选择游戏路径"
        @click="pathOverlay = true"
      >
        <template #prepend>
          <div class="game-icon">
            <v-icon>mdi-folder-search-outline</v-icon>
          </div>
        </template>
      </v-list-item>
    </v-list>
    <template v-else>
      <section class="game-list">
        <div class="game-list-header">
          <span>{{ gameEnum.installation.schemeDesc(chosen.schemeId) }}</span>
          <div class="game-list-chips">
            <v-chip size="small" variant="tonal">当前安装</v-chip>
            <v-chip :color="statusColor(chosen.status)" size="small" variant="tonal">
              {{ statusDesc(chosen.status) }}
            </v-chip>
          </div>
        </div>
        <div class="game-path">
          <div class="game-icon">
            <TMiImg :ori="true" :size="40" :src="genshinIcon" alt="原神" />
          </div>
          <div class="game-path-copy">
            <span>安装路径</span>
            <strong>{{ chosen.executablePath }}</strong>
          </div>
          <v-btn
            class="game-path-act"
            color="var(--tgc-od-orange)"
            prepend-icon="mdi-folder-swap-outline"
            variant="tonal"
            @click="pathOverlay = true"
          >
            更换路径
          </v-btn>
        </div>
        <PgVersion
          v-if="chosen.status === gameEnum.installation.status.KNOWN"
          :installation="chosen"
        >
          <template #facts="version">
            <PgScheme :installation="chosen" @switched="refreshRegistered">
              <template #channel="scheme">
                <div class="game-facts">
                  <div class="game-fact">
                    <div class="game-fact-head">
                      <span>版本</span>
                      <v-icon
                        v-if="
                          isLatestOfficial(version.snapshot) && !hasPreDownload(version.snapshot)
                        "
                        color="var(--tgc-od-green)"
                        size="16"
                        title="已是最新正式版本"
                      >
                        mdi-check-circle-outline
                      </v-icon>
                      <v-icon
                        v-else-if="version.snapshot !== null && !isLatestOfficial(version.snapshot)"
                        color="var(--tgc-od-orange)"
                        size="16"
                        :title="`正式 ${version.snapshot.main.tag}`"
                      >
                        mdi-arrow-up-circle-outline
                      </v-icon>
                      <v-icon
                        v-if="preDownloadTag(version.snapshot) !== null"
                        color="var(--tgc-od-orange)"
                        size="16"
                        :title="`预下载 ${preDownloadTag(version.snapshot)}`"
                      >
                        mdi-cloud-download-outline
                      </v-icon>
                      <div class="game-fact-acts">
                        <v-btn
                          :disabled="version.refreshDisabled"
                          :loading="version.loading"
                          aria-label="刷新远端版本"
                          density="compact"
                          icon="mdi-cloud-sync-outline"
                          size="small"
                          title="刷新远端版本"
                          variant="text"
                          @click="handleVersionRefresh(version)"
                        />
                        <v-progress-circular
                          v-if="version.verifyActive || version.verifyPending"
                          color="var(--tgc-od-orange)"
                          indeterminate
                          size="16"
                          :title="version.verifyActive ? '正在校验' : '正在开始校验'"
                          width="2"
                        />
                        <v-btn
                          v-else
                          :aria-label="version.verifyResumeLabel"
                          :disabled="version.verifyBusy"
                          :title="version.verifyResumeLabel"
                          density="compact"
                          icon="mdi-shield-check-outline"
                          size="small"
                          variant="text"
                          @click="handleVersionVerify(version)"
                        />
                      </div>
                    </div>
                    <strong>{{ versionPrimary(version.snapshot) }}</strong>
                  </div>
                  <div class="game-fact">
                    <div class="game-fact-head">
                      <span>渠道参数</span>
                      <v-chip class="game-fact-tag" size="x-small" variant="tonal">
                        {{ schemeTag(chosen.schemeId) }}
                      </v-chip>
                      <div v-if="scheme.canConvert || scheme.taskActive" class="game-fact-acts">
                        <v-btn
                          :aria-label="
                            version.verifyBusy
                              ? '校验进行中，暂时不能换服'
                              : scheme.taskActive
                                ? '取消换服'
                                : scheme.convertLabel
                          "
                          :disabled="
                            version.verifyBusy || (scheme.converting && !scheme.taskActive)
                          "
                          :icon="
                            scheme.taskActive
                              ? 'mdi-stop-circle-outline'
                              : 'mdi-swap-horizontal-bold'
                          "
                          :loading="scheme.converting && !scheme.taskActive"
                          :title="
                            version.verifyBusy
                              ? '校验进行中，暂时不能换服'
                              : scheme.taskActive
                                ? '取消换服'
                                : `可转为${gameEnum.installation.schemeDesc(scheme.targetScheme)}`
                          "
                          density="compact"
                          size="small"
                          variant="text"
                          @click="handleSchemeAction(scheme)"
                        />
                      </div>
                    </div>
                    <strong>{{ channelDesc(chosen) }}</strong>
                  </div>
                  <div class="game-fact">
                    <span>语音包</span>
                    <strong>{{ audioDesc(chosen.audioLanguages) }}</strong>
                  </div>
                  <div class="game-fact">
                    <div class="game-fact-head">
                      <span>渠道 SDK</span>
                      <v-icon
                        :color="chosen.hasChannelSdk ? 'var(--tgc-od-green)' : 'var(--tgc-od-red)'"
                        :icon="
                          chosen.hasChannelSdk
                            ? 'mdi-check-circle-outline'
                            : 'mdi-close-circle-outline'
                        "
                        :title="chosen.hasChannelSdk ? '已安装' : '未安装'"
                        size="16"
                      />
                    </div>
                    <strong>{{ chosen.hasChannelSdk ? "已安装" : "未安装" }}</strong>
                  </div>
                </div>
              </template>
            </PgScheme>
          </template>
        </PgVersion>
        <template v-else>
          <div class="game-facts">
            <div class="game-fact">
              <span>版本</span>
              <strong>{{ chosen.version ?? "未读取" }}</strong>
            </div>
            <div class="game-fact">
              <div class="game-fact-head">
                <span>渠道参数</span>
                <v-chip class="game-fact-tag" size="x-small" variant="tonal">
                  {{ schemeTag(chosen.schemeId) }}
                </v-chip>
              </div>
              <strong>{{ channelDesc(chosen) }}</strong>
            </div>
            <div class="game-fact">
              <span>语音包</span>
              <strong>{{ audioDesc(chosen.audioLanguages) }}</strong>
            </div>
            <div class="game-fact">
              <div class="game-fact-head">
                <span>渠道 SDK</span>
                <v-icon
                  :color="chosen.hasChannelSdk ? 'var(--tgc-od-green)' : 'var(--tgc-od-red)'"
                  :icon="
                    chosen.hasChannelSdk ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline'
                  "
                  :title="chosen.hasChannelSdk ? '已安装' : '未安装'"
                  size="16"
                />
              </div>
              <strong>{{ chosen.hasChannelSdk ? "已安装" : "未安装" }}</strong>
            </div>
          </div>
          <v-alert
            :text="chosen.statusMessage"
            class="game-alert"
            density="compact"
            type="warning"
            variant="tonal"
          />
        </template>
      </section>
      <PgCache />
    </template>
  </div>
  <PgoPath
    v-model="pathOverlay"
    :currentPath="chosen?.executablePath"
    @selected="refreshRegistered"
  />
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import PgCache from "@comp/pageGame/pg-cache.vue";
import PgScheme from "@comp/pageGame/pg-scheme.vue";
import PgVersion from "@comp/pageGame/pg-version.vue";
import PgoPath from "@comp/pageGame/pgo-path.vue";
import gameEnum from "@enum/game.js";
import useAppStore from "@store/app.js";
import useBBSStore from "@store/bbs.js";
import useGameLauncherStore from "@store/gameLauncher.js";
import useUserStore from "@store/user.js";
import { tryLaunchGame } from "@utils/TGGame.js";
import { listGameInstallations } from "@utils/TGGameLauncher.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref } from "vue";

const taskStore = useGameLauncherStore();
const { isLogin } = storeToRefs(useAppStore());
const { gameList } = storeToRefs(useBBSStore());
const { account, cookie } = storeToRefs(useUserStore());
const initialized = ref<boolean>(false);
const launching = ref<boolean>(false);
const pathOverlay = ref<boolean>(false);
const installations = ref<Array<TGApp.Game.Installation.Item>>([]);

const chosen = computed<TGApp.Game.Installation.Item | null>(() => {
  return installations.value.find((installation) => installation.isChosen) ?? null;
});
const genshinIcon = computed<string>(() => {
  const game = gameList.value.find((item) => item.op_name === "hk4e");
  if (game === undefined || game.app_icon === "") return "/platforms/mhy/ys.webp";
  return game.app_icon;
});

function statusDesc(status: TGApp.Game.Installation.StatusEnum): string {
  switch (status) {
    case gameEnum.installation.status.KNOWN:
      return "可用";
    case gameEnum.installation.status.INCONSISTENT:
      return "状态不一致";
    case gameEnum.installation.status.UNSUPPORTED:
      return "不支持";
  }
}

function statusColor(status: TGApp.Game.Installation.StatusEnum): string {
  switch (status) {
    case gameEnum.installation.status.KNOWN:
      return "success";
    case gameEnum.installation.status.INCONSISTENT:
      return "warning";
    case gameEnum.installation.status.UNSUPPORTED:
      return "error";
  }
}

function channelDesc(installation: TGApp.Game.Installation.Item): string {
  if (installation.channel === null || installation.subChannel === null) return "未读取";
  return `${installation.channel} / ${installation.subChannel}`;
}

function schemeTag(schemeId: TGApp.Game.Installation.SchemeEnum): string {
  switch (schemeId) {
    case gameEnum.installation.scheme.CN_OFFICIAL:
      return "官服";
    case gameEnum.installation.scheme.CN_BILIBILI:
      return "渠道服";
  }
}

function audioDesc(languages: Array<string>): string {
  if (languages.length === 0) return "未识别";
  const descriptions: Record<string, string> = {
    "zh-cn": "中文",
    "en-us": "英语",
    "ja-jp": "日语",
    "ko-kr": "韩语",
  };
  return languages.map((language) => descriptions[language] ?? language).join("、");
}

function versionPrimary(snapshot: TGApp.Game.Package.Snapshot | null): string {
  const local = snapshot?.localVersion ?? chosen.value?.version ?? "未读取";
  if (snapshot === null || local === snapshot.main.tag) return local;
  return `${local} → ${snapshot.main.tag}`;
}

function isLatestOfficial(snapshot: TGApp.Game.Package.Snapshot | null): boolean {
  if (snapshot === null) return false;
  const local = snapshot.localVersion ?? chosen.value?.version;
  return local === snapshot.main.tag;
}

function hasPreDownload(snapshot: TGApp.Game.Package.Snapshot | null): boolean {
  return snapshot !== null && snapshot.preDownload !== null;
}

function preDownloadTag(snapshot: TGApp.Game.Package.Snapshot | null): string | null {
  return snapshot?.preDownload?.tag ?? null;
}

function handleVersionRefresh(version: { refreshSnapshot: () => Promise<void> }): void {
  void version.refreshSnapshot();
}

function handleVersionVerify(version: { startVerify: () => Promise<void> }): void {
  void version.startVerify();
}

function handleSchemeAction(scheme: {
  cancelSwitch: () => Promise<void>;
  convertScheme: () => Promise<void>;
  taskActive: boolean;
}): void {
  if (scheme.taskActive) {
    void scheme.cancelSwitch();
    return;
  }
  void scheme.convertScheme();
}

function taskBlocksLaunch(state: TGApp.Game.Package.TaskStateEnum): boolean {
  return (
    gameEnum.package.taskApplying(state) ||
    state === gameEnum.package.taskState.RECOVERY_REQUIRED ||
    state === gameEnum.package.taskState.REPAIR_REQUIRED
  );
}

const launchBlockReason = computed<string | null>(() => {
  if (!initialized.value) return "正在读取本地安装…";
  if (chosen.value === null) return "请先选择游戏路径";
  if (chosen.value.status !== gameEnum.installation.status.KNOWN) {
    return chosen.value.statusMessage;
  }
  if (chosen.value.schemeId === gameEnum.installation.scheme.CN_OFFICIAL) {
    if (!isLogin.value) return "启动国服官服前请先登录米游社";
    if (account.value.isOfficial !== 1) return "当前米游社账号不是官服账号";
  }
  const task = taskStore.tasksByInstallation[chosen.value.id];
  if (task !== undefined && taskBlocksLaunch(task.state)) {
    return "存在进行中或等待恢复的资源提交，暂时不能启动";
  }
  return null;
});
const launchTitle = computed<string>(() => launchBlockReason.value ?? "启动游戏");

async function handleLaunchGame(): Promise<void> {
  const reason = launchBlockReason.value;
  if (reason !== null) {
    await showDialog.checkF({
      title: "暂时无法启动",
      text: reason,
      confirmLabel: "知道了",
    });
    return;
  }
  launching.value = true;
  try {
    await tryLaunchGame(account.value, cookie.value);
  } finally {
    launching.value = false;
  }
}

async function refreshRegistered(): Promise<void> {
  try {
    installations.value = await listGameInstallations();
  } catch (error) {
    showSnackbar.error(`读取游戏安装失败：${error}`);
  }
}

async function initializePage(): Promise<void> {
  try {
    await taskStore.startListening();
    await Promise.all([refreshRegistered(), taskStore.hydrateTasks()]);
  } catch (error) {
    showSnackbar.error(`读取游戏资源任务失败：${error}`);
  } finally {
    initialized.value = true;
  }
}

onMounted(initializePage);
onUnmounted(taskStore.stopListening);
</script>

<style lang="scss" scoped>
.game-title {
  display: flex;
  align-items: center;
  margin-left: 12px;
  gap: 8px;

  span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
  }
}

.game-title-icon {
  width: 24px;
  height: 24px;
  border-radius: 4px;
}

.game-launch-btn {
  border-radius: 4px;
  margin-right: 12px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-text);
}

.game-page {
  display: flex;
  height: calc(100vh - 100px);
  flex-direction: column;
  color: var(--app-page-content);
  font-family: var(--font-text);
  overflow-y: auto;
  row-gap: 8px;
}

.game-list {
  width: 100%;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-4);
  font-family: var(--font-text);
}

.game-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 8px;
  gap: 8px;

  > span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: large;
    font-weight: normal;
  }
}

.game-list-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.game-path-act {
  flex-shrink: 0;
}

.game-path {
  display: flex;
  align-items: center;
  padding: 8px 16px;
}

.game-path-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  strong {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 14px;
    font-weight: normal;
    line-height: 20px;
    overflow-wrap: anywhere;
  }
}

.game-facts {
  display: grid;
  padding: 8px 16px 12px;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.game-fact {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-2);
  gap: 4px;

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  strong {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 14px;
    font-weight: normal;
    line-height: 20px;
    overflow-wrap: anywhere;
  }
}

.game-fact-head {
  display: flex;
  align-items: center;
  gap: 2px;

  > span {
    margin-inline-end: 4px;
  }
}

.game-fact-acts {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
  margin-inline-start: auto;
}

.game-fact-tag {
  flex-shrink: 0;
}

.game-icon {
  display: flex;
  overflow: hidden;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  margin-right: 15px;
  background: var(--box-bg-2);
  color: var(--box-text-2);

  :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.game-alert {
  margin: 8px 16px 16px;
}

.game-empty {
  display: flex;
  min-height: 240px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: var(--box-text-2);
  gap: 12px;
}

.game-empty-title {
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;
}
</style>
