<template>
  <TOverlay v-model="visible" :to-click="onCancel" :blur-val="'3px'" hide>
    <div class="confirm-div">
      <div class="confirm-box">
        <div class="confirm-title">
          {{ title }}
        </div>
        <div v-show="subtitle !== '' && !isInput" class="confirm-subtitle">
          {{ subtitle }}
        </div>
        <div v-show="isInput" class="confirm-input">
          <v-text-field
            v-model="inputVal"
            :label="subtitle || ''"
            hide-details="auto"
            @keyup.enter="onConfirm"
          />
        </div>
        <div class="confirm-btn-box">
          <button class="confirm-btn" @click="onCancel">
            <img class="btn-icon" src="../../assets/icons/circle-cancel.svg" alt="cancel" />
            <span class="btn-text">
              {{ cancel }}
            </span>
          </button>
          <button class="confirm-btn" @click="onConfirm">
            <img class="btn-icon" src="../../assets/icons/circle-check.svg" alt="confirm" />
            <span class="btn-text">
              {{ confirm }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </TOverlay>
</template>

<script lang="ts" setup>
// vue
import { computed } from "vue";
import TOverlay from "../main/t-overlay.vue";

interface TOConfirmProps {
  title: string;
  subtitle?: string;
  isInput?: boolean;
  cancel?: string;
  confirm?: string;
  /** 此值为 true 时显示对话框 */
  modelValue: boolean;
  modelInput: string;
}

interface TOConfirmEmits {
  (e: "update:modelValue", v: boolean): void;
  (e: "update:modelInput", v: string): void;
  (e: "confirm"): void;
  (e: "cancel"): void;
}

const emits = defineEmits<TOConfirmEmits>();
const props = withDefaults(defineProps<TOConfirmProps>(), {
  modelValue: false,
  title: "确认",
  subtitle: "",
  isInput: false,
  cancel: "取消",
  confirm: "确定",
});

const visible = computed({
  get: () => props.modelValue,
  set: (v) => {
    emits("update:modelValue", v);
  },
});

const inputVal = computed({
  get: () => props.modelInput,
  set: (v) => {
    emits("update:modelInput", v);
  },
});

function onCancel(): void {
  visible.value = false;
  emits("cancel");
}

function onConfirm(): void {
  visible.value = false;
  emits("confirm");
}
</script>

<style scoped>
.confirm-div {
  position: absolute;
  top: 40vh;
  left: 30vw;
  display: flex;
  width: 40vw;
  height: 20vh;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border-radius: 10px;
  background: var(--content-bg-2);
}

.confirm-box {
  width: 100%;
  height: 100%;
  border-radius: 10px;
}

.confirm-title {
  width: 100%;
  height: 20%;
  margin: 10px;
  color: var(--content-text-2);
  font-family: Genshin, serif;
  font-size: 30px;
  text-align: center;
}

.confirm-subtitle {
  width: 100%;
  height: 20%;
  border-top: 1px solid var(--btn-bg-2);
  color: var(--content-text-2);
  font-family: Genshin-Light, serif;
  font-size: 20px;
  text-align: center;
}

.confirm-input {
  width: 100%;
  height: 20%;
  color: var(--content-text-2);
  font-family: Genshin-Light, serif;
  font-size: 20px;
  text-align: center;
}

.confirm-btn-box {
  position: absolute;
  display: flex;
  width: 100%;
  height: 40%;
  align-items: flex-end;
  justify-content: space-around;
}

.confirm-btn {
  display: flex;
  width: 30%;
  min-width: 150px;
  min-height: 30px;
  align-items: center;
  border-radius: 50px;
  background: var(--btn-bg-2);
  color: var(--btn-text-1);
}

.btn-icon {
  width: 25px;
  height: 25px;
  margin: 5px;
}

.btn-text {
  width: calc(100% - 70px);
  font-family: Genshin-Light, serif;
  font-size: 20px;
  text-align: center;
}
</style>
