<template>
  <TOverlay v-model="visible" hide blur-val="20px">
    <div class="tog-box">
      <div class="tog-top">
        <div class="tog-title">请完成如下极验测试</div>
      </div>
      <div id="verify" class="tog-mid">
        <div id="geetest"></div>
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
// vue
import { computed, watch } from "vue";
import showSnackbar from "../func/snackbar";
import TOverlay from "../main/t-overlay.vue";
// store
import { useUserStore } from "../../store/modules/user";
// utils
import TGRequest from "../../web/request/TGRequest";

interface ToGeetestProps {
  modelValue: boolean;
}

type ToGeetestEmits = (e: "update:modelValue", value: boolean) => void;

const props = withDefaults(defineProps<ToGeetestProps>(), {
  modelValue: false,
});

const emits = defineEmits<ToGeetestEmits>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});

watch(visible, async (value) => {
  if (value) {
    await getChallenge();
  }
});

const userStore = useUserStore();

// 获取极验验证码
async function getChallenge(): Promise<void> {
  const cookie = userStore.getCookieGroup3();
  const res = await TGRequest.User.verification.get(cookie.ltoken, cookie.ltuid);
  if ("retcode" in res) {
    showSnackbar({
      text: res.message,
      color: "error",
    });
    return;
  }
  // @ts-expect-error Cannot find name 'initGeetest'.ts(2304)
  initGeetest(
    {
      gt: res.gt,
      challenge: res.challenge,
      offline: false,
      new_captcha: true,

      product: "custom", // 产品形式，包括：float，popup, bind
      area: "#verify", // 选择验证码展示的位置
      width: "250px",
    },
    (captchaObj: TGApp.BBS.Geetest.GeetestCaptcha) => {
      captchaObj.appendTo("#geetest");
      captchaObj
        .onReady(() => {
          console.log("ready");
        })
        .onSuccess(() => {
          const validate = captchaObj.getValidate();
          (async () => {
            await doVerify(validate);
          })().catch(() => {}); // 防止报错
        })
        .onError(() => {
          console.log("error");
        })
        .onClose(() => {
          console.log("close");
        });
    },
  );
}

async function doVerify(data: TGApp.BBS.Geetest.GeetestValidate): Promise<void> {
  await TGRequest.User.verification.verify(userStore.cookie, data);
  emits("update:modelValue", false);
}
</script>
<style lang="css" scoped>
.tog-box {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-radius: 5px;
  background-color: var(--box-bg-1);
  color: var(--app-page-content);
  gap: 10px;
}

.tog-top {
  border-bottom: 1px solid var(--common-shadow-4);
  font-family: var(--font-title);
  text-align: center;
}

.tog-title {
  color: var(--common-text-title);
  font-size: 20px;
}

.tog-mid {
  display: flex;
  width: 100%;
  align-items: flex-start;
  justify-content: center;
  padding: 10px;
  border-radius: 5px;
  background: var(--box-bg-2);
}

#verify {
  width: 256px;
  height: 320px;
}
</style>
