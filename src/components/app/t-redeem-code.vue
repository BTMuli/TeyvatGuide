<template>
  <div class="trc-box">
    <p v-if="preview">模拟预览 · 不发送真实兑换请求</p>
    <div class="trc-header">
      <slot name="title"
        ><span>{{ config?.name }}兑换码</span></slot
      >
      <v-btn
        data-html2canvas-ignore
        :disabled="!canRedeem || busy || !actionCodes.length"
        :loading="busy"
        :icon="liveCodes === undefined ? 'mdi-check' : 'mdi-gift-open-outline'"
        :title="liveCodes === undefined ? '确认兑换' : '一键兑换'"
        size="small"
        variant="tonal"
        @click="submit(actionCodes)"
      />
      <v-menu :closeOnContentClick="true">
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            data-html2canvas-ignore
            icon="mdi-account-switch-outline"
            title="切换兑换角色"
            size="small"
            variant="tonal"
            :disabled="busy"
          />
        </template>
        <v-list density="compact" aria-label="选择兑换角色">
          <v-list-item
            v-for="role in roles"
            :key="role.gameUid"
            :active="role.gameUid === selectedUid"
            :title="role.nickname"
            :subtitle="`${role.regionName} · ${maskUid(role.gameUid)}`"
            @click="selectedUid = role.gameUid"
          />
          <v-list-item v-if="!roles.length" title="当前账号没有可用角色" />
        </v-list>
      </v-menu>
    </div>
    <p v-if="selectedRole" class="trc-target">{{ roleTitle(selectedRole) }}</p>
    <p v-if="!canRedeem">请先登录并绑定{{ config?.name }}国服角色</p>
    <v-textarea
      v-if="liveCodes === undefined"
      v-model="input"
      :disabled="busy"
      label="兑换码"
      hint="支持逗号、中文逗号、空格或换行分隔，自动去重，最多 20 个"
      persistentHint
      rows="2"
      variant="outlined"
    />
    <slot
      :submit="submit"
      :results="results"
      :busy="busy"
      :canRedeem="canRedeem"
      :currentCode="currentCode"
    />
    <p v-if="busy" role="status">
      正在逐个兑换，间隔约 5.5 秒。关闭窗口将停止后续兑换，已发送的请求仍可能成功。
    </p>
    <p v-if="errorMessage" role="alert">{{ errorMessage }}</p>
    <p v-if="resultTarget">
      本次兑换角色：{{ resultTarget.nickname }}（{{ maskUid(resultTarget.gameUid) }}）
    </p>
    <ul v-if="liveCodes === undefined" aria-live="polite">
      <li v-for="result in results" :key="result.code">
        {{ result.code }}：{{
          result.retcode === 0
            ? "兑换成功"
            : result.retcode === -2
              ? "未兑换"
              : result.retcode === -1
                ? "结果未知"
                : "兑换失败"
        }}
        （{{ result.message }}）
      </li>
    </ul>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import redeemCode from "@req/redeemReq.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useUserStore from "@store/user.js";
import { maskUid } from "@utils/display/TGUid.js";
import { parseRedeemCodes, redeemCodes } from "@utils/game/redeemCode.js";
import { getRedeemConfig } from "@utils/game/redeemConfig.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, watch } from "vue";

const { liveCodes, gid, preview } = defineProps<{
  liveCodes?: Array<string>;
  gid: number;
  preview?: TGApp.Game.Redeem.Preview;
}>();
const config = computed(() => getRedeemConfig(gid));
const roles = ref<Array<TGApp.Sqlite.Account.Game>>([]);
const selectedUid = ref<string>("");
const selectedRole = computed(() => roles.value.find((role) => role.gameUid === selectedUid.value));
const { account, cookie, uid } = storeToRefs(useUserStore());
let active = true;
onBeforeUnmount(() => {
  active = false;
});
const input = ref<string>("");
const busy = ref<boolean>(false);
const currentCode = ref<string>("");
const errorMessage = ref<string>("");
const resultTarget = ref<TGApp.Sqlite.Account.Game>();
const results = ref<Array<TGApp.Game.Redeem.Result>>([]);
const codes = computed<Array<string>>(() => parseRedeemCodes(input.value));
const availableCodes = computed<Array<string>>(() => parseRedeemCodes((liveCodes ?? []).join(" ")));
const actionCodes = computed<Array<string>>(() =>
  liveCodes === undefined ? codes.value : availableCodes.value,
);
const canRedeem = computed<boolean>(() =>
  Boolean(selectedRole.value && (preview || cookie.value?.cookie_token)),
);
watch(
  [() => gid, uid, () => preview],
  async (_, __, onCleanup) => {
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });
    roles.value = [];
    selectedUid.value = "";
    try {
      const bound =
        preview?.roles ?? (uid.value ? await TSUserAccount.game.getAccount(uid.value) : []);
      if (cancelled) return;
      roles.value = bound.filter(matchesGame);
      const preferred = roles.value.find((role) => role.gameUid === account.value.gameUid);
      selectedUid.value = (preferred ?? roles.value[0])?.gameUid ?? "";
      results.value = preview?.results.map((result) => ({ ...result })) ?? [];
    } catch {
      if (!cancelled) errorMessage.value = "读取绑定角色失败，请重新打开后重试";
    }
  },
  { immediate: true },
);

function matchesGame(role: TGApp.Sqlite.Account.Game): boolean {
  const game = config.value;
  if (!game) return false;
  return role.gameBiz === game.biz && game.regions.includes(role.region);
}

function roleTitle(role: TGApp.Sqlite.Account.Game): string {
  return `${role.nickname}（${role.regionName} · ${maskUid(role.gameUid)}）`;
}

async function submit(selectedCodes: Array<string>): Promise<void> {
  if (preview) {
    showSnackbar.info("模拟预览，不发送真实兑换请求");
    results.value = selectedCodes.map((code, index) => ({
      code,
      retcode: index === 1 ? -2001 : 0,
      message: index === 1 ? "兑换码已过期（模拟）" : "兑换成功（模拟）",
    }));
    return;
  }
  if (busy.value || !canRedeem.value || selectedCodes.length === 0) return;
  // 固定本次兑换的账号，避免切换账号影响进行中的批次。
  const target = selectedRole.value;
  if (!target || !cookie.value) return;
  const credential = { ...cookie.value };
  busy.value = true;
  errorMessage.value = "";
  resultTarget.value = target;
  results.value = [];
  try {
    await redeemCodes(
      selectedCodes,
      async (code) => {
        currentCode.value = code;
        if (!isCurrentTarget(target, credential.account_id)) {
          return { retcode: -2, message: "未兑换，窗口已关闭或当前账号已变更" };
        }
        if (!cookie.value) return { retcode: -2, message: "未兑换，登录已失效" };
        return await redeemCode(code, target, { ...cookie.value });
      },
      (result) => {
        results.value.push(result);
      },
    );
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "兑换未能开始，请稍后重试";
  } finally {
    busy.value = false;
    currentCode.value = "";
  }
}
function isCurrentTarget(target: TGApp.Sqlite.Account.Game, accountId: string): boolean {
  const current = selectedRole.value;
  if (!active || !current || !cookie.value) return false;
  return (
    current.gameBiz === target.gameBiz &&
    current.gameUid === target.gameUid &&
    uid.value === target.uid &&
    cookie.value.account_id === accountId
  );
}
</script>
<style lang="scss" scoped>
.trc-box {
  width: 100%;
  min-width: 0;
  overflow-wrap: anywhere;
}

.trc-header {
  display: flex;
  align-items: center;
  gap: 8px;

  :first-child {
    margin-right: auto;
  }
}
</style>
