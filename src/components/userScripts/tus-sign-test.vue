<!-- 米社打卡测试浮窗 -->
<template>
  <TopOverlay
    v-model="visible"
    :outerClose="!running"
    panelWidth="600px"
    titleId="sign-test-title"
    topOffset="64px"
  >
    <template #header>
      <div class="tust-header-icon">
        <v-icon color="var(--tgc-od-orange)" size="28">mdi-clipboard-check-outline</v-icon>
      </div>
      <div class="tust-heading">
        <h2 id="sign-test-title" class="tust-title">打卡测试</h2>
        <span class="tust-subtitle">执行打卡会产生实际社区记录</span>
      </div>
    </template>
    <template #actions>
      <v-btn
        :disabled="running"
        aria-label="关闭打卡测试"
        density="comfortable"
        icon="mdi-close"
        title="关闭"
        variant="text"
        @click="visible = false"
      />
    </template>

    <div class="tust-account">
      <span>当前账号</span>
      <strong v-if="account">{{ account.brief.nickname }} · UID {{ account.uid }}</strong>
      <strong v-else>未选择账号</strong>
    </div>
    <fieldset class="tust-choices">
      <legend>测试打卡版块-{{ currentBoard?.name ?? "原神" }}</legend>
      <div v-if="loadingGames" class="tust-loading">
        <v-progress-circular indeterminate size="20" width="2" />
        <span>正在加载版块</span>
      </div>
      <div v-else class="tust-grid">
        <button
          v-for="board in boards"
          :key="board.id"
          :aria-pressed="selectedGid === board.id"
          :aria-label="`测试打卡版块-${board.name}`"
          :class="{
            selected: selectedGid === board.id,
            dimmed: selectedGid !== board.id && !testResults[board.id],
          }"
          :disabled="running"
          :title.attr="`测试打卡版块-${board.name}`"
          class="tust-choice"
          type="button"
          @click="selectedGid = board.id"
        >
          <img v-if="board.icon" :src="board.icon" alt="" />
          <v-icon v-else size="36">mdi-gamepad-variant-outline</v-icon>
          <v-icon
            v-if="testResults[board.id]"
            :class="getResultState(testResults[board.id])"
            class="tust-choice-status"
            size="16"
          >
            {{ getResultIcon(getResultState(testResults[board.id])) }}
          </v-icon>
        </button>
      </div>
    </fieldset>
    <div :class="resultState" aria-live="polite" class="tust-result">
      <div class="tust-result-heading">
        <v-progress-circular
          v-if="running"
          color="var(--tgc-od-blue)"
          indeterminate
          size="20"
          width="2"
        />
        <v-icon v-else size="20">{{ getResultIcon(resultState) }}</v-icon>
        <strong>{{ resultTitle }}</strong>
      </div>
      <span v-if="running">正在发送打卡请求…</span>
      <span v-else-if="result"
        >{{ result.board }} · [{{ result.retcode }}] {{ result.message }}</span
      >
      <span v-else>暂无测试结果</span>
    </div>

    <template #footer>
      <v-btn
        :disabled="!account || busy || loadingGames || boards.length === 0"
        :loading="running"
        class="tust-submit"
        @click="trySign()"
      >
        测试打卡
      </v-btn>
    </template>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import apiHubReq from "@req/apiHubReq.js";
import miscReq from "@req/miscReq.js";
import useBBSStore from "@store/bbs.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, ref, shallowRef, watch } from "vue";

type TusSignTestProps = {
  account: TGApp.App.Account.User | undefined;
  busy: boolean;
};

type SignTestResult = {
  board: string;
  message: string;
  retcode: number | string;
  success: boolean;
};

type ResultState = "idle" | "loading" | "success" | "warning" | "failure";

type SignBoard = {
  id: number;
  name: string;
  icon?: string;
};

const { account, busy } = defineProps<TusSignTestProps>();
const visible = defineModel<boolean>({ required: true });
const running = defineModel<boolean>("running", { required: true });
const bbsStore = useBBSStore();
const { gameList } = storeToRefs(bbsStore);

const selectedGid = ref<number>(2);
const loadingGames = ref<boolean>(false);
const testResults = shallowRef<Record<number, SignTestResult>>({});
const boards = computed<Array<SignBoard>>(() =>
  gameList.value.length > 0
    ? gameList.value.map((item) => ({
        id: item.id,
        name: item.name,
        icon: item.app_icon || item.icon,
      }))
    : [{ id: 2, name: "原神" }],
);
const currentBoard = computed<SignBoard | undefined>(() =>
  boards.value.find((item) => item.id === selectedGid.value),
);
const result = computed<SignTestResult | undefined>(() => testResults.value[selectedGid.value]);
const resultState = computed<ResultState>(() =>
  running.value ? "loading" : getResultState(result.value),
);
const resultTitle = computed<string>(() => {
  if (running.value) return "正在测试打卡";
  if (!result.value) return "测试结果";
  if (result.value.retcode === 1008) return "打卡请求提示";
  return result.value.success ? "打卡请求成功" : "打卡请求失败";
});

function getResultState(value: SignTestResult | undefined): ResultState {
  if (!value) return "idle";
  if (value.retcode === 1008) return "warning";
  return value.success ? "success" : "failure";
}

function getResultIcon(state: ResultState): string {
  if (state === "success") return "mdi-check-circle-outline";
  if (state === "warning") return "mdi-alert-circle-outline";
  if (state === "failure") return "mdi-close-circle-outline";
  return "mdi-information-outline";
}

function saveResult(gid: number, value: SignTestResult): void {
  testResults.value = { ...testResults.value, [gid]: value };
}

async function logTest(
  context: string,
  message: string,
  level: "info" | "warn" | "error" = "info",
): Promise<void> {
  try {
    await TGLogger.Script(`${context}${message}`, level);
  } catch (error) {
    console.warn("[打卡测试]日志写入失败", error);
  }
}

async function finishTest(gid: number, value: SignTestResult, context: string): Promise<void> {
  saveResult(gid, value);
  const state = getResultState(value);
  const level = state === "success" ? "info" : state === "warning" ? "warn" : "error";
  await logTest(context, `结果 [${value.retcode}] ${value.message}`, level);
}

watch(
  () => visible.value,
  async (open) => {
    if (!open) return;
    testResults.value = {};
    if (gameList.value.length > 0) {
      if (!boards.value.some((item) => item.id === selectedGid.value)) {
        selectedGid.value = boards.value[0].id;
      }
      return;
    }
    loadingGames.value = true;
    try {
      await bbsStore.refreshGameList();
      if (!boards.value.some((item) => item.id === selectedGid.value)) {
        selectedGid.value = boards.value[0]?.id ?? 2;
      }
    } finally {
      loadingGames.value = false;
    }
  },
);

watch(
  () => account?.uid,
  () => {
    testResults.value = {};
  },
);

async function trySign(): Promise<void> {
  if (!account || busy || running.value || !currentBoard.value) return;
  const board = currentBoard.value;
  const ck = {
    stoken: account.cookie.stoken,
    stuid: account.cookie.stuid,
    mid: account.cookie.mid,
  };
  const context = `[打卡测试][${board.id}] `;
  const startTime = Date.now();
  running.value = true;
  try {
    await logTest(context, "开始执行");
    let challenge: string | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await logTest(context, `发送第${attempt + 1}次打卡请求`);
      const resp = await apiHubReq.sign(ck, board.id, challenge);
      if (resp.retcode !== 1034) {
        await finishTest(
          board.id,
          {
            board: board.name,
            message: resp.message,
            retcode: resp.retcode,
            success: resp.retcode === 0,
          },
          context,
        );
        return;
      }
      await logTest(context, `触发验证码 [${resp.retcode}] ${resp.message}`, "warn");
      const nextChallenge = await miscReq.challenge(ck);
      if (nextChallenge === false) {
        await finishTest(
          board.id,
          {
            board: board.name,
            message: "验证码验证未完成",
            retcode: resp.retcode,
            success: false,
          },
          context,
        );
        return;
      }
      await logTest(context, "验证码已完成，准备重试打卡");
      challenge = nextChallenge;
    }
    await finishTest(
      board.id,
      {
        board: board.name,
        message: "多次验证后仍需验证码，请稍后重试",
        retcode: 1034,
        success: false,
      },
      context,
    );
  } catch (error) {
    await finishTest(
      board.id,
      {
        board: board.name,
        message: TGHttps.getErrMsg(error),
        retcode: "请求异常",
        success: false,
      },
      context,
    );
  } finally {
    await logTest(context, `执行结束，耗时${Date.now() - startTime}ms`);
    running.value = false;
  }
}
</script>

<style lang="scss" scoped>
.tust-header-icon {
  display: flex;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: var(--box-bg-2);
}

.tust-heading {
  display: flex;
  min-width: 0;
  height: 48px;
  flex-direction: column;
  justify-content: center;
  gap: 0;
}

.tust-title {
  margin: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: normal;
}

.tust-subtitle {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
}

.tust-choices {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;

  legend {
    padding: 0 4px;
    color: var(--box-text-2);
    font-size: 13px;
  }
}

.tust-loading {
  display: flex;
  min-height: 84px;
  align-items: center;
  justify-content: center;
  color: var(--box-text-2);
  gap: 8px;
}

.tust-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tust-choice {
  position: relative;
  display: flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  cursor: pointer;

  &.dimmed {
    opacity: 0.3;
  }

  &:disabled {
    cursor: default;
  }

  &:focus-visible {
    outline: 1px solid var(--tgc-od-orange);
    outline-offset: 1px;
  }

  &:hover:not(:disabled) {
    background: var(--box-bg-2);
  }

  &.selected {
    border: 2px solid var(--tgc-od-orange);
    background: var(--box-bg-2);
  }

  img {
    width: 40px;
    height: 40px;
    object-fit: contain;
  }

  .tust-choice-status {
    position: absolute;
    top: -6px;
    right: -6px;
    border-radius: 50%;
    background: var(--app-page-bg);

    &.success {
      color: var(--tgc-od-green);
    }

    &.warning {
      color: var(--tgc-od-orange);
    }

    &.failure {
      color: var(--tgc-od-red);
    }
  }
}

.tust-account {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  font-size: 13px;
  gap: 4px 12px;

  strong {
    font-size: 14px;
    font-weight: 600;
  }
}

.tust-result {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  gap: 8px;

  &.idle {
    color: var(--box-text-2);
  }

  &.loading {
    color: var(--tgc-od-blue);
  }

  &.success {
    color: var(--tgc-od-green);
  }

  &.warning {
    color: var(--tgc-od-orange);
  }

  &.failure {
    color: var(--tgc-od-red);
  }

  .tust-result-heading {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
  }

  span {
    color: var(--app-page-content);
    font-size: 13px;
    overflow-wrap: anywhere;
  }
}

.tust-submit {
  margin-left: auto;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}
</style>
