<template>
  <transition name="func-geetest-outer">
    <div v-show="show || showOuter" class="geetest-overlay" @click.self.prevent>
      <transition name="func-geetest-inner">
        <div v-show="showInner" class="geetest-box">
          <div class="geetest-top">
            <div class="geetest-title">请完成如下极验测试</div>
          </div>
          <div id="verify" class="geetest-mid">
            <div id="geetest" ref="geetestRef"></div>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";

import showSnackbar from "./snackbar";
import { useUserStore } from "../../store/modules/user";
import TGRequest from "../../web/request/TGRequest";

const show = ref<boolean>(false);
const showOuter = ref<boolean>(false);
const showInner = ref<boolean>(false);

const userStore = useUserStore();

const geetestRef = ref<HTMLElement>(<HTMLElement>document.getElementById("geetest"));

watch(show, () => {
  if (show.value) {
    showOuter.value = true;
    setTimeout(() => {
      showInner.value = true;
    }, 100);
  } else {
    setTimeout(() => {
      showInner.value = false;
    }, 100);
    setTimeout(() => {
      showOuter.value = false;
    }, 300);
  }
});

async function displayBox(): Promise<void> {
  const cookieGet = userStore.getCookieGroup3();
  const resGet = await TGRequest.User.verification.get(cookieGet.ltoken, cookieGet.ltuid);
  if ("retcode" in resGet) {
    showSnackbar({
      text: `[${resGet.retcode}]${resGet.message}`,
      color: "error",
    });
    return;
  }
  show.value = true;
  initGeetest(
    {
      gt: resGet.gt,
      challenge: resGet.challenge,
      offline: false,
      new_captcha: true,
      product: "custom",
      area: "#verify",
      width: "250px",
    },
    (captchaObj: TGApp.BBS.Geetest.GeetestCaptcha) => {
      geetestRef.value.innerHTML = "";
      captchaObj.appendTo("#geetest");
      captchaObj.onSuccess(async () => {
        const validate = captchaObj.getValidate();
        const cookie = {
          account_id: userStore.cookie.account_id,
          cookie_token: userStore.cookie.cookie_token,
          ltoken: userStore.cookie.ltoken,
          ltuid: userStore.cookie.ltuid,
        };
        const resVerify = await TGRequest.User.verification.verify(cookie, validate);
        if (resVerify.retcode !== 0) {
          showSnackbar({
            text: `[${resVerify.retcode}]${resVerify.message}`,
            color: "error",
          });
        }
      });
      captchaObj.onClose(() => {
        show.value = false;
      });
    },
  );
}

defineExpose({
  displayBox,
});
</script>
<style lang="css" scoped>
.func-geetest-outer-enter-active,
.func-geetest-outer-leave-active,
.func-geetest-inner-enter-active {
  transition: all 0.3s;
}

.func-geetest-inner-leave-active {
  transition: all 0.5s ease-in-out;
}

.func-geetest-inner-enter-from {
  opacity: 0;
  transform: scale(1.5);
}

.func-geetest-inner-enter-to,
.func-geetest-inner-leave-from {
  opacity: 1;
  transform: scale(1);
}

.func-geetest-outer-enter-to,
.func-geetest-outer-leave-from {
  opacity: 1;
}

.func-geetest-outer-enter-from,
.func-geetest-outer-leave-to {
  opacity: 0;
}

.func-geetest-inner-leave-to {
  opacity: 0;
  transform: scale(0);
}

.geetest-overlay {
  position: fixed;
  z-index: 100;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(20px);
  background: rgb(0 0 0 / 50%);
}

.geetest-box {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-radius: 5px;
  background-color: var(--box-bg-1);
  color: var(--app-page-content);
  gap: 10px;
}

.geetest-top {
  border-bottom: 1px solid var(--common-shadow-4);
  font-family: var(--font-title);
  text-align: center;
}

.geetest-title {
  color: var(--common-text-title);
  font-size: 20px;
}

.geetest-mid {
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
