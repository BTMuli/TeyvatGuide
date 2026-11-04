<template>
  <div data-html2canvas-ignore class="trc-box">
    <p v-if="canRedeem">兑换至 {{ account.nickname }}（{{ maskUid(account.gameUid) }}）</p>
    <p v-else>请先登录并选择原神国服角色</p>
    <v-textarea
      v-model="input"
      :disabled="busy"
      label="兑换码"
      hint="支持逗号、中文逗号、空格或换行分隔，自动去重，最多 20 个"
      persistentHint
      rows="2"
      variant="outlined"
    />
    <div class="trc-actions">
      <v-btn :disabled="!canRedeem || codes.length === 0 || busy" @click="submit(codes)">
        兑换输入的兑换码
      </v-btn>
      <v-btn
        v-if="liveCodes !== undefined"
        :disabled="!canRedeem || availableCodes.length === 0 || busy"
        @click="submit(availableCodes)"
      >
        一键兑换前瞻码
      </v-btn>
    </div>
    <p v-if="busy" role="status">
      正在逐个兑换，间隔约 5.5 秒。关闭窗口将停止后续兑换，已发送的请求仍可能成功。
    </p>
    <p v-if="errorMessage" role="alert">{{ errorMessage }}</p>
    <p v-if="resultTarget">
      本次兑换角色：{{ resultTarget.nickname }}（{{ maskUid(resultTarget.gameUid) }}）
    </p>
    <ul aria-live="polite">
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
import redeemCode from "@req/redeemReq.js";
import useUserStore from "@store/user.js";
import { maskUid } from "@utils/display/TGUid.js";
import { parseRedeemCodes, redeemCodes } from "@utils/game/redeemCode.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref } from "vue";

const { liveCodes } = defineProps<{ liveCodes?: Array<string> }>();
const { account, cookie } = storeToRefs(useUserStore());
let active = true;
onBeforeUnmount(() => {
  active = false;
});
const input = ref<string>("");
const busy = ref<boolean>(false);
const errorMessage = ref<string>("");
const resultTarget = ref<TGApp.Sqlite.Account.Game>();
const results = ref<Array<TGApp.Game.Redeem.Result>>([]);
const codes = computed<Array<string>>(() => parseRedeemCodes(input.value));
const availableCodes = computed<Array<string>>(() => parseRedeemCodes((liveCodes ?? []).join(" ")));
const canRedeem = computed<boolean>(() =>
  Boolean(
    cookie.value?.account_id &&
    cookie.value?.cookie_token &&
    account.value.gameBiz === "hk4e_cn" &&
    account.value.gameUid &&
    ["cn_gf01", "cn_qd01"].includes(account.value.region),
  ),
);

async function submit(selectedCodes: Array<string>): Promise<void> {
  if (busy.value || !canRedeem.value || !cookie.value || selectedCodes.length === 0) return;
  // 固定本次兑换的账号，避免切换账号影响进行中的批次。
  const target = { ...account.value };
  const credential = { ...cookie.value };
  busy.value = true;
  errorMessage.value = "";
  resultTarget.value = target;
  results.value = [];
  try {
    await redeemCodes(
      selectedCodes,
      async (code) => {
        if (
          !active ||
          !cookie.value ||
          account.value.gameBiz !== target.gameBiz ||
          account.value.gameUid !== target.gameUid ||
          account.value.uid !== target.uid ||
          account.value.region !== target.region ||
          cookie.value?.account_id !== credential.account_id
        ) {
          return { retcode: -2, message: "未兑换，窗口已关闭或当前账号已变更" };
        }
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
  }
}
</script>
<style lang="scss" scoped>
.trc-box {
  width: 100%;
  min-width: 0;
  overflow-wrap: anywhere;
}

.trc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
