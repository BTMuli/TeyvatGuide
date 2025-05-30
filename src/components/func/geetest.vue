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
import "https://static.geetest.com/static/js/gt.0.4.9.js";
import { ref, useTemplateRef, watch } from "vue";

const show = ref<boolean>(false);
const showOuter = ref<boolean>(false);
const showInner = ref<boolean>(false);

const geetestEl = useTemplateRef<HTMLDivElement>("geetestRef");

watch(
  () => show.value,
  async () => {
    if (show.value) {
      showOuter.value = true;
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      showInner.value = true;
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    showInner.value = false;
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    showOuter.value = false;
  },
);

declare function initGeetest(
  params: TGApp.BBS.Geetest.InitGeetestParams,
  callback: (captchaObj: TGApp.BBS.Geetest.GeetestCaptcha) => void,
): void;

async function displayBox(
  props: TGApp.BBS.Geetest.CreateRes,
): Promise<TGApp.BBS.Geetest.GeetestVerifyRes | false> {
  return await new Promise<TGApp.BBS.Geetest.GeetestVerifyRes>((resolve) => {
    initGeetest(
      {
        gt: props.gt,
        challenge: props.challenge,
        offline: false,
        new_captcha: true,
        product: "custom",
        area: "#verify",
        width: "250px",
      },
      (captchaObj: TGApp.BBS.Geetest.GeetestCaptcha) => {
        if (geetestEl.value === null) return;
        geetestEl.value.innerHTML = "";
        captchaObj.appendTo("#geetest");
        captchaObj.onReady(() => (show.value = true));
        captchaObj.onSuccess(() => {
          const validate = captchaObj.getValidate();
          resolve(validate);
        });
        captchaObj.onClose(() => (show.value = false));
      },
    );
  });
}

defineExpose({ displayBox });
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
  background: #00000080;
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
