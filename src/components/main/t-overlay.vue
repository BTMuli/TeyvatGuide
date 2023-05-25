<template>
  <transition enter-from-class="tolo-enter-from" name="tolo">
    <div v-show="showTolo" class="tolo-box">
      <transition enter-from-class="toli-enter-from" name="toli">
        <slot v-if="showToli" />
      </transition>
    </div>
  </transition>
</template>
<script lang="ts" setup>
// vue
import { ref, watch } from "vue";

interface TolProps {
  modelValue: boolean;
}

const showTolo = ref(false);
const showToli = ref(false);

const props = withDefaults(defineProps<TolProps>(), {
  modelValue: false,
});

watch(
  () => props.modelValue,
  (v) => {
    console.log(v);
    if (v) {
      showTolo.value = true;
      showToli.value = true;
    } else {
      setTimeout(() => {
        showToli.value = false;
      }, 100);
      setTimeout(() => {
        showTolo.value = false;
      }, 300);
    }
  },
);

</script>
<style lang="css" scoped>
.tolo-enter-active,
.tolo-leave-active,
.toli-enter-active {
  transition: all 0.3s;
}

.toli-leave-active {
  transition: all 0.5s ease-in-out;
}

.tolo-enter-from,
.toli-enter-from {
  opacity: 0;
  transform: scale(1.5);
}

.tolo-enter-to,
.toli-enter-to {
  opacity: 1;
  transform: scale(1);
}

.tolo-leave-from {
  opacity: 1;
}

.tolo-leave-to {
  opacity: 0;
}

.toli-leave-from {
  opacity: 1;
  transform: scale(1);
}

.toli-leave-to {
  opacity: 0;
  transform: scale(0);
}

.tolo-box {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgb(0 0 0 / 50%);
  backdrop-filter: blur(20px);
  z-index: 100;
}
</style>
