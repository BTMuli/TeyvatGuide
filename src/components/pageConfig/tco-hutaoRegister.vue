<!-- 注册胡桃云账号 -->
<template>
  <TOverlay v-model="visible" :outerClose="!formDisabled && !codeLoad" blurVal="4px">
    <v-card
      :disabled="formDisabled || codeLoad"
      aria-label="注册胡桃云账号"
      aria-modal="true"
      class="tco-hutao-register-container"
      density="compact"
      role="dialog"
      title="注册胡桃云账号"
    >
      <img src="/platforms/other/hutao2.webp" alt="logo" class="thrc-logo" />
      <v-form
        ref="formEl"
        :disabled="formDisabled || codeLoad"
        class="thrc-mid"
        @submit.prevent="onSubmit"
      >
        <div class="thrc-hint">使用邮箱注册胡桃云账号</div>
        <v-text-field
          ref="usernameInput"
          v-model="username"
          :disabled="codeDisabled || formDisabled"
          :rules="usernameRules"
          autocomplete="email"
          clearable
          color="var(--tgc-od-blue)"
          density="compact"
          label="邮箱"
        />
        <v-text-field
          v-model="verifyCode"
          :rules="verifyCodeRules"
          autocomplete="one-time-code"
          clearable
          color="var(--tgc-od-blue)"
          density="compact"
          inputmode="text"
          label="验证码"
        >
          <template #append>
            <v-btn
              :disabled="codeDisabled || formDisabled"
              :loading="codeLoad"
              color="var(--tgc-od-blue)"
              type="button"
              variant="flat"
              @click="tryGetCode()"
            >
              <template v-if="!codeDisabled">获取验证码</template>
              <template v-else>{{ codeRest }}s</template>
            </v-btn>
          </template>
        </v-text-field>
        <v-text-field
          v-model="pwd"
          :rules="passwordRules"
          :type="showPwd ? 'text' : 'password'"
          autocomplete="new-password"
          clearable
          color="var(--tgc-od-blue)"
          density="compact"
          label="密码（至少8位）"
        >
          <template #append-inner>
            <v-icon :aria-label="showPwd ? '隐藏密码' : '显示密码'" @click="showPwd = !showPwd">
              {{ showPwd ? "mdi-eye" : "mdi-eye-off" }}
            </v-icon>
          </template>
        </v-text-field>
        <v-text-field
          v-model="confirmPwd"
          :rules="confirmPasswordRules"
          :type="showConfirmPwd ? 'text' : 'password'"
          autocomplete="new-password"
          clearable
          color="var(--tgc-od-blue)"
          density="compact"
          label="确认密码"
        >
          <template #append-inner>
            <v-icon
              :aria-label="showConfirmPwd ? '隐藏确认密码' : '显示确认密码'"
              @click="showConfirmPwd = !showConfirmPwd"
            >
              {{ showConfirmPwd ? "mdi-eye" : "mdi-eye-off" }}
            </v-icon>
          </template>
        </v-text-field>
        <v-card-actions class="thrc-actions">
          <v-spacer />
          <v-btn :disabled="formDisabled || codeLoad" type="button" @click="onCancel()">
            取消
          </v-btn>
          <v-btn :loading="formLoad" color="var(--tgc-od-blue)" type="submit" variant="flat">
            注册
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import hutao from "@Hutao/index.js";
import useHutaoStore from "@store/hutao.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { validEmail } from "@utils/toolFunc.js";
import { computed, onUnmounted, ref, shallowRef, useTemplateRef, watch } from "vue";
import { VForm, VTextField } from "vuetify/components";

type VuetifyRules = VTextField["rules"];

const hutaoStore = useHutaoStore();
const visible = defineModel<boolean>({ default: false });

const formRef = useTemplateRef<VForm>("formEl");
const usernameRef = useTemplateRef<VTextField>("usernameInput");
const formDisabled = ref<boolean>(false);
const formLoad = ref<boolean>(false);

const username = ref<string>("");
const verifyCode = ref<string>("");
const pwd = ref<string>("");
const confirmPwd = ref<string>("");

const showPwd = ref<boolean>(false);
const showConfirmPwd = ref<boolean>(false);

const codeLoad = ref<boolean>(false);
const codeRest = ref<number>(0);
const codeDisabled = computed<boolean>(() => codeLoad.value || codeRest.value > 0);

const usernameRules = shallowRef<VuetifyRules>([
  (value) => {
    const email = typeof value === "string" ? value.trim() : "";
    return email.length > 0 || "请填写邮箱地址";
  },
  (value) => {
    const email = typeof value === "string" ? value.trim() : "";
    return validEmail(email) || "请填写符合格式的邮箱地址";
  },
]);
const verifyCodeRules = shallowRef<VuetifyRules>([
  (value) => {
    const code = typeof value === "string" ? value.trim() : "";
    return code.length > 0 || "请填写验证码";
  },
]);
const passwordRules = shallowRef<VuetifyRules>([
  (value) => (typeof value === "string" && value.length >= 8) || "密码至少需要8位",
]);
const confirmPasswordRules = shallowRef<VuetifyRules>([
  (value) => (typeof value === "string" && value.length > 0) || "请确认密码",
  (value) => value === pwd.value || "两次输入的密码不一致",
]);

let codeTimer: ReturnType<typeof setInterval> | undefined;
let disposed = false;

function clearCodeTimer(): void {
  if (codeTimer === undefined) return;
  clearInterval(codeTimer);
  codeTimer = undefined;
}

function startCodeCooldown(): void {
  if (disposed) return;
  clearCodeTimer();
  codeRest.value = 60;
  codeTimer = setInterval(() => {
    if (codeRest.value <= 1) {
      codeRest.value = 0;
      clearCodeTimer();
      return;
    }
    codeRest.value -= 1;
  }, 1000);
}

function clearSensitiveFields(): void {
  verifyCode.value = "";
  pwd.value = "";
  confirmPwd.value = "";
  showPwd.value = false;
  showConfirmPwd.value = false;
  formRef.value?.resetValidation();
}

async function tryGetCode(): Promise<void> {
  if (codeLoad.value || formDisabled.value || codeRest.value > 0) return;
  codeLoad.value = true;
  try {
    if (!usernameRef.value) return;
    const check = await usernameRef.value.validate();
    if (check.length > 0) return;
    const email = username.value.trim();
    const resp = await hutao.Account.verify.register(email);
    if (disposed) return;
    if (resp.retcode !== 0) {
      showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
      await TGLogger.Warn(`[tco-hutaoRegister][tryGetCode] 获取验证码失败：${resp.retcode}`);
      return;
    }
    showSnackbar.success(resp.message || "验证码已发送");
    startCodeCooldown();
  } catch (e) {
    if (disposed) return;
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取注册验证码失败：${errMsg}`);
    await TGLogger.Error("[tco-hutaoRegister][tryGetCode] 获取验证码异常");
  } finally {
    if (!disposed) codeLoad.value = false;
  }
}

async function onSubmit(): Promise<void> {
  if (formDisabled.value || codeLoad.value) return;
  formDisabled.value = true;
  formLoad.value = true;
  try {
    if (!formRef.value) return;
    const check = await formRef.value.validate();
    if (!check.valid) return;

    const email = username.value.trim();
    const code = verifyCode.value.trim();
    const password = pwd.value;
    const resp = await hutao.Account.register(email, password, code);
    if (resp.retcode !== 0) {
      showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
      await TGLogger.Warn(`[tco-hutaoRegister][onSubmit] 注册失败：${resp.retcode}`);
      return;
    }

    const session = resp.data;
    if (
      !session ||
      typeof session.AccessToken !== "string" ||
      session.AccessToken.length === 0 ||
      typeof session.RefreshToken !== "string" ||
      session.RefreshToken.length === 0 ||
      !Number.isFinite(session.ExpiresIn) ||
      session.ExpiresIn <= 0
    ) {
      showSnackbar.warn("注册成功，请使用新账号登录");
      visible.value = false;
      return;
    }

    showSnackbar.success(resp.message || "注册胡桃云账号成功");
    hutaoStore.setSession(email, session);
    visible.value = false;
    try {
      await hutaoStore.tryRefreshInfo();
    } catch {
      await TGLogger.Error("[tco-hutaoRegister][onSubmit] 注册成功后刷新用户信息异常");
      showSnackbar.warn("账号已注册，刷新用户信息失败，请稍后重试");
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`注册胡桃云失败：${errMsg}`);
    await TGLogger.Error("[tco-hutaoRegister][onSubmit] 注册请求异常");
  } finally {
    formLoad.value = false;
    formDisabled.value = false;
  }
}

function onCancel(): void {
  if (formDisabled.value || codeLoad.value) return;
  clearSensitiveFields();
  visible.value = false;
}

watch(visible, (isVisible, wasVisible) => {
  if (isVisible || !wasVisible) return;
  clearSensitiveFields();
});

onUnmounted(() => {
  disposed = true;
  clearCodeTimer();
});
</script>
<style lang="scss" scoped>
.tco-hutao-register-container {
  position: relative;
  width: min(400px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  padding: 12px;
  border-radius: 12px;
  background-color: var(--box-bg-1);
  box-shadow: 0 8px 24px var(--common-shadow-2);
  overflow-y: auto;
}

.thrc-logo {
  position: absolute;
  z-index: 0;
  top: 8px;
  right: 8px;
  width: 96px;
  height: 96px;
  opacity: 0.14;
  pointer-events: none;
}

.thrc-mid {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  font-size: 12px;
}

.thrc-hint {
  margin: 0 0 8px;
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
}

.thrc-actions {
  padding: 8px 0 0;
}
</style>
