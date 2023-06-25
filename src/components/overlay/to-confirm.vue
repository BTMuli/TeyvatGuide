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
import { computed, inject } from "vue";
import TOverlay from "../main/t-overlay.vue";

const test = inject("hide");

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
  set: (v) => emits("update:modelValue", v),
});

const inputVal = computed({
  get: () => props.modelInput,
  set: (v) => emits("update:modelInput", v),
});

const onCancel = () => {
  visible.value = false;
  emits("cancel");
};

const onConfirm = () => {
  visible.value = false;
  emits("confirm");
  if (props.isInput) {
    inputVal.value = "";
  }
};
</script>

<style scoped>
.confirm-div {
  position: absolute;
  width: 40vw;
  height: 20vh;
  top: 40vh;
  left: 30vw;
  background: var(--content-bg-2);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.confirm-box {
  border-radius: 10px;
  width: 100%;
  height: 100%;
}

.confirm-title {
  font-family: Genshin, serif;
  text-align: center;
  height: 20%;
  width: 100%;
  color: var(--content-text-2);
  margin: 10px;
  font-size: 30px;
}

.confirm-subtitle {
  border-top: 1px solid var(--btn-bg-2);
  font-family: Genshin-Light, serif;
  text-align: center;
  height: 20%;
  width: 100%;
  color: var(--content-text-2);
  font-size: 20px;
}

.confirm-input {
  font-family: Genshin-Light, serif;
  text-align: center;
  height: 20%;
  width: 100%;
  color: var(--content-text-2);
  font-size: 20px;
}

.confirm-btn-box {
  position: absolute;
  height: 40%;
  width: 100%;
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
}

.confirm-btn {
  width: 30%;
  min-width: 150px;
  min-height: 30px;
  background: var(--btn-bg-2);
  color: var(--btn-text-1);
  border-radius: 50px;
  display: flex;
  align-items: center;
}

.btn-icon {
  margin: 5px;
  width: 25px;
  height: 25px;
}

.btn-text {
  width: calc(100% - 70px);
  text-align: center;
  font-family: Genshin-Light, serif;
  font-size: 20px;
}
</style>
