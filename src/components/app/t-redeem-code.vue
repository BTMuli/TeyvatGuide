<template>
  <div class="trc-box">
    <div class="trc-header">
      <div class="trc-title">
        <TMiImg class="trc-game-icon" :src="gameIcon" :ori="true" :size="24" alt="" />
        <slot name="title"
          ><span>{{ config?.name }}兑换码</span></slot
        >
      </div>
      <div class="trc-actions" data-html2canvas-ignore>
        <slot name="actions" />
        <v-btn
          class="trc-action"
          :disabled="!canRedeem || busy || !actionCodes.length"
          :loading="busy"
          :icon="liveCodes === undefined ? 'mdi-check' : 'mdi-gift-open-outline'"
          :title="liveCodes === undefined ? '确认兑换' : '一键兑换'"
          :aria-label="liveCodes === undefined ? '确认兑换' : '一键兑换'"
          :width="32"
          :height="32"
          rounded="lg"
          variant="tonal"
          @click="submit(actionCodes)"
        />
        <v-menu
          v-model="roleMenuOpen"
          :closeOnContentClick="false"
          location="bottom end"
          :offset="8"
        >
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              class="trc-action"
              icon="mdi-account-switch-outline"
              title="切换兑换角色"
              aria-label="切换兑换角色"
              :width="32"
              :height="32"
              rounded="lg"
              variant="tonal"
              :disabled="busy"
            />
          </template>
          <v-list class="trc-role-menu" density="compact" aria-label="选择兑换角色">
            <v-list-item
              v-for="role in roles"
              :key="role.gameUid"
              :active="role.gameUid === selectedUid"
              class="trc-role-item"
              rounded="lg"
              @click="selectRole(role.gameUid)"
            >
              <v-list-item-title>{{ role.nickname }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ maskUidTail(role.gameUid) }} · {{ role.regionName }}
              </v-list-item-subtitle>
              <template #append>
                <v-icon
                  v-if="role.gameUid === selectedUid"
                  class="trc-role-check"
                  icon="mdi-check"
                  size="18"
                />
              </template>
            </v-list-item>
            <v-list-item v-if="!roles.length" class="trc-role-empty" title="当前账号没有可用角色" />
          </v-list>
        </v-menu>
      </div>
    </div>
    <div v-if="selectedRole" class="trc-target">
      <v-icon icon="mdi-account-outline" size="16" />
      <span class="trc-nickname" :title="selectedRole.nickname">{{ selectedRole.nickname }}</span>
      <span class="trc-region">{{ selectedRole.regionName }}</span>
      <span class="trc-uid">{{ maskUid(selectedRole.gameUid) }}</span>
    </div>
    <p v-if="!canRedeem" class="trc-note">请先登录并绑定{{ config?.name }}国服角色</p>
    <div v-if="liveCodes === undefined" class="trc-input">
      <v-textarea
        v-model="input"
        class="trc-textarea"
        :disabled="busy"
        label="兑换码"
        placeholder="输入或粘贴兑换码"
        density="compact"
        hideDetails
        noResize
        rows="2"
        variant="outlined"
      />
      <p class="trc-note">逗号、空格或换行分隔 · 自动去重 · 最多 20 个</p>
    </div>
    <slot
      :submit="submit"
      :results="results"
      :busy="busy"
      :canRedeem="canRedeem"
      :currentCode="currentCode"
    />
    <p v-if="busy" class="trc-note" role="status">
      正在逐个兑换，间隔约 5.5 秒。关闭窗口后停止后续兑换，已发送的请求仍可能成功。
    </p>
    <p v-if="errorMessage" class="trc-error" role="alert">{{ errorMessage }}</p>
    <p v-if="resultTarget && resultTarget.gameUid !== selectedRole?.gameUid" class="trc-note">
      本次兑换角色：{{ resultTarget.nickname }}（{{ maskUid(resultTarget.gameUid) }}）
    </p>
    <TRedeemProgress v-if="liveCodes === undefined" :codes :results :currentCode :busy />
  </div>
</template>
<script lang="ts" setup>
import redeemCode from "@req/redeemReq.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useBBSStore from "@store/bbs.js";
import useUserStore from "@store/user.js";
import { maskUid, maskUidTail } from "@utils/display/TGUid.js";
import { parseRedeemCodes, redeemCodes } from "@utils/game/redeemCode.js";
import { getRedeemConfig, isRedeemRoleSupported } from "@utils/game/redeemConfig.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, watch } from "vue";

import TMiImg from "./t-mi-img.vue";
import TRedeemProgress from "./t-redeem-progress.vue";

const { liveCodes, gid } = defineProps<{
  liveCodes?: Array<string>;
  gid: number;
}>();
defineSlots<{
  title?(): unknown;
  actions?(): unknown;
  default?(props: {
    submit: (selectedCodes: Array<string>) => Promise<void>;
    results: Array<TGApp.Game.Redeem.Result>;
    busy: boolean;
    canRedeem: boolean;
    currentCode: string;
  }): unknown;
}>();
const config = computed<TGApp.Game.Redeem.Config | undefined>(() => getRedeemConfig(gid));
const { gameList } = storeToRefs(useBBSStore());
const gameIcon = computed<string>(() => {
  const icon = gameList.value.find((game) => game.id === gid)?.app_icon;
  if (icon) return icon;
  if (gid === 1) return "/platforms/mhy/bh3.webp";
  if (gid === 2) return "/platforms/mhy/ys.webp";
  if (gid === 3) return "/platforms/mhy/bh2.webp";
  if (gid === 4) return "/platforms/mhy/wd.webp";
  if (gid === 6) return "/platforms/mhy/sr.webp";
  if (gid === 8) return "/platforms/mhy/zzz.webp";
  return "/platforms/mhy/mys.webp";
});
const roles = ref<Array<TGApp.Sqlite.Account.Game>>([]);
const selectedUid = ref<string>("");
const roleMenuOpen = ref<boolean>(false);
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
  Boolean(selectedRole.value && cookie.value?.cookie_token),
);
watch(
  [() => gid, uid],
  async (_, __, onCleanup) => {
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });
    roles.value = [];
    selectedUid.value = "";
    results.value = [];
    try {
      const bound = uid.value ? await TSUserAccount.game.getAccount(uid.value) : [];
      if (cancelled) return;
      roles.value = bound.filter(matchesGame);
      const preferred = roles.value.find((role) => role.gameUid === account.value.gameUid);
      selectedUid.value = (preferred ?? roles.value[0])?.gameUid ?? "";
    } catch {
      if (!cancelled) errorMessage.value = "读取绑定角色失败，请重新打开后重试";
    }
  },
  { immediate: true },
);

function selectRole(gameUid: string): void {
  selectedUid.value = gameUid;
  roleMenuOpen.value = false;
}

function matchesGame(role: TGApp.Sqlite.Account.Game): boolean {
  const game = config.value;
  if (!game) return false;
  return role.gameBiz === game.biz && isRedeemRoleSupported(role);
}

async function submit(selectedCodes: Array<string>): Promise<void> {
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
  --redeem-success: #107c10ff;
  --redeem-failure: #b10e1cff;
  --redeem-unknown: #8a4b00ff;

  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  color: var(--app-page-content);
  font-family: var(--font-text);
  font-size: 14px;
  gap: 12px;
  line-height: 20px;

  p {
    margin: 0;
  }
}

html.dark .trc-box {
  --redeem-success: var(--tgc-od-green);
  --redeem-failure: var(--tgc-od-red);
  --redeem-unknown: var(--tgc-od-orange);
}

.trc-header {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.trc-title {
  display: flex;
  min-width: 0;
  align-items: center;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  gap: 8px;
  line-height: 24px;
}

.trc-game-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 4px;
}

.trc-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
}

.trc-action {
  min-width: 32px;
  color: var(--app-page-content);

  :deep(.v-icon) {
    font-size: 18px;
  }
}

.trc-target {
  display: flex;
  min-width: 0;
  align-items: center;
  font-size: 12px;
  gap: 8px;
  line-height: 18px;

  > .v-icon {
    flex-shrink: 0;
    opacity: 0.65;
  }
}

.trc-nickname {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trc-region,
.trc-uid {
  flex-shrink: 0;
  white-space: nowrap;
}

.trc-region {
  opacity: 0.7;
}

.trc-uid {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.trc-role-menu {
  width: min(280px, calc(100vw - 32px));
  padding: 4px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 12px !important;
  background: var(--app-side-bg) !important;
  box-shadow: 0 4px 16px var(--common-shadow-t-2) !important;
  color: var(--app-side-content) !important;
  font-family: var(--font-text);
}

.trc-role-item {
  min-height: 52px;
  padding: 8px 12px;

  :deep(.v-list-item-title) {
    font-size: 13px;
    line-height: 20px;
  }

  :deep(.v-list-item-subtitle) {
    font-size: 11px;
    line-height: 16px;
  }

  :deep(.v-list-item__spacer) {
    width: 12px;
  }
}

.trc-role-check {
  color: var(--app-side-content);
}

.trc-role-empty {
  :deep(.v-list-item-title) {
    font-size: 12px;
  }
}

.trc-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trc-textarea {
  :deep(.v-field) {
    border-radius: 8px;
    background: var(--box-bg-1);
    font-size: 14px;
  }

  :deep(.v-field__input) {
    line-height: 22px;
  }
}

.trc-note {
  font-size: 12px;
  line-height: 18px;
  opacity: 0.75;
  overflow-wrap: anywhere;
}

.trc-error {
  color: var(--redeem-failure);
  font-size: 12px;
  line-height: 18px;
}

@media (width <= 380px) {
  .trc-target {
    flex-wrap: wrap;
    gap: 4px 8px;
  }

  .trc-nickname {
    max-width: calc(100% - 24px);
  }
}
</style>
