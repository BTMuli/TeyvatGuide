<!-- 重置密码 TODO:其他类似请求通用&UI调整 -->
<template>
  <TOverlay v-model="visible" :outer-close="false" blur-val="4px">
    <v-card
      :disabled="formDisabled"
      class="tco-hutao-verify-container"
      density="compact"
      title="重置胡桃云密码"
    >
      <v-form ref="formEl" class="thvc-mid">
        <v-text-field
          ref="usernameInput"
          v-model="username"
          :disabled="codeDisabled"
          :rules="usernameRules"
          clearable
          color="var(--tgc-od-blue)"
          density="compact"
          label="用户名(邮箱)"
        />
        <v-text-field
          v-model="verifyCode"
          :rules="[(v) => !!v || '请填写验证码']"
          clearable
          color="var(--tgc-od-blue)"
          density="compact"
          label="验证码"
        >
          <template #append>
            <v-btn
              :disabled="codeDisabled"
              :loading="codeLoad"
              color="var(--tgc-od-blue)"
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
          :rules="[(v) => !!v || '请填写新密码']"
          :type="showPwd ? 'text' : 'password'"
          clearable
          color="var(--tgc-od-blue)"
          density="compact"
          label="新密码"
        >
          <template #append-inner>
            <v-icon @click="showPwd = !showPwd">{{ showPwd ? "mdi-eye" : "mdi-eye-off" }}</v-icon>
          </template>
        </v-text-field>
      </v-form>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="var(--tgc-od-white)" @click="onCancel()">
          <v-icon icon="mdi-chevron-right" start></v-icon>
          <span>取消</span>
        </v-btn>
        <v-btn :loading="formLoad" color="success" @click="onSubmit()">
          <v-icon icon="mdi-chevron-right" start></v-icon>
          <span>确认重置</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import hutao from "@Hutao/index.js";
import useHutaoStore from "@store/hutao.js";
import { validEmail } from "@utils/toolFunc.js";
import { onUnmounted, ref, shallowRef, useTemplateRef } from "vue";
import { VForm, VTextField } from "vuetify/components";

type VuetifyRules = VTextField["rules"];

const hutaoStore = useHutaoStore();

// eslint-disable-next-line no-undef
let codeTimer: NodeJS.Timeout | null = null;

const visible = defineModel<boolean>({ default: false });

const formRef = useTemplateRef<VForm>("formEl");
const formDisabled = ref<boolean>(false);
const formLoad = ref<boolean>(false);

const username = ref<string>();
const usernameRef = useTemplateRef<VTextField>("usernameInput");
const usernameRules = shallowRef<VuetifyRules>([
  (v) => !!v || "请填写用户名",
  (v) => (v && validEmail(v)) || "请填写符合格式的邮箱地址",
]);

const verifyCode = ref<string>();
const codeDisabled = ref<boolean>(false);

const pwd = ref<string>();
const showPwd = ref<boolean>(false);

const codeLoad = ref<boolean>(false);
const codeRest = ref<number>(0);

async function tryGetCode(): Promise<void> {
  if (!usernameRef.value) return;
  const check = await usernameRef.value.validate();
  if (check.length > 0) return;
  codeLoad.value = true;
  const resp = await hutao.Account.verify.pwd(username.value!);
  if (resp.retcode !== 0) {
    showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
  } else {
    showSnackbar.success(`${resp.message}`);
  }
  codeLoad.value = false;
  codeDisabled.value = true;
  codeRest.value = 60;
  codeTimer = setInterval(countdownCode, 1000);
}

function countdownCode(): void {
  if (codeRest.value <= 0) {
    if (codeTimer !== null) clearInterval(codeTimer);
    codeTimer = null;
    codeRest.value = 0;
    codeDisabled.value = false;
    return;
  }
  codeRest.value -= 1;
}

function onCancel(): void {
  visible.value = false;
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const check = await formRef.value.validate();
  if (!check.valid) return;
  formDisabled.value = true;
  formLoad.value = true;
  const resp = await hutao.Account.reset.pwd(username.value!, verifyCode.value!, pwd.value!);
  formLoad.value = false;
  if (resp.retcode !== 0) {
    showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
    formDisabled.value = false;
    return;
  }
  showSnackbar.success(`${resp.message}`);
  await hutaoStore.autoLogin(username.value!, pwd.value!);
  formDisabled.value = false;
  visible.value = false;
}

onUnmounted(() => {
  if (codeTimer !== null) {
    clearInterval(codeTimer);
    codeTimer = null;
  }
});
</script>
<style lang="scss" scoped>
.tco-hutao-verify-container {
  position: relative;
  width: 400px;
  padding: 8px;
  border-radius: 4px;
  background-color: var(--box-bg-1);
}

.thvc-mid {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  font-size: 10px;
}
</style>
