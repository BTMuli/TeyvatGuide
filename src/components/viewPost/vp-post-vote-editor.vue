<!-- 帖子投票组件编辑器 -->
<template>
  <div v-if="props.vote" class="vpve-existing">
    <TpVote :data="{ insert: { vote: props.vote } }" />
    <p class="vpve-hint">已有投票的设置保持不变。需要更换时，可移除此组件后创建新投票。</p>
  </div>
  <form v-else class="vpve-form" @submit.prevent="submit">
    <div class="vpve-title-row">
      <v-text-field
        v-model="voteTitle"
        :disabled="fieldsLocked"
        hide-details
        label="投票标题"
        variant="outlined"
      />
      <v-text-field
        v-model="voteLimit"
        :disabled="fieldsLocked"
        :max="options.length"
        hide-details
        hide-spin-buttons
        label="每人最多可选"
        min="1"
        step="1"
        suffix="项"
        type="number"
        variant="outlined"
      />
    </div>
    <div :aria-labelledby="optionsTitleId" class="vpve-options-section" role="group">
      <div class="vpve-options-header">
        <h3 :id="optionsTitleId" class="vpve-label">
          投票选项<span class="vpve-count">共 {{ options.length }} 项</span>
        </h3>
        <v-btn
          :disabled="fieldsLocked"
          class="vpve-add"
          prepend-icon="mdi-plus"
          size="small"
          type="button"
          variant="text"
          @click="addOption"
        >
          添加选项
        </v-btn>
      </div>
      <div class="vpve-options-box">
        <div v-for="(option, index) in options" :key="option.id" class="vpve-option">
          <v-text-field
            v-model="option.text"
            :disabled="fieldsLocked"
            :label="`选项 ${index + 1}`"
            density="compact"
            hide-details
            variant="outlined"
          />
          <button
            v-if="!fieldsLocked && options.length > 2"
            :aria-label="`移除选项 ${index + 1}`"
            class="vpve-close"
            title="移除选项"
            type="button"
            @click="removeOption(option.id)"
          >
            <v-icon size="14">mdi-close</v-icon>
          </button>
        </div>
      </div>
    </div>
    <v-text-field
      v-model="endTime"
      :disabled="fieldsLocked"
      hide-details
      label="截止时间"
      type="datetime-local"
      variant="outlined"
    />
    <p class="vpve-hint">
      {{
        props.voteCreated
          ? "投票已创建，重新尝试会插入同一投票。"
          : "创建后会生成米游社投票并插入正文，帖子仍需单独发布。"
      }}
    </p>
  </form>
</template>

<script lang="ts" setup>
import { computed, ref, useId } from "vue";

import TpVote from "./tp-vote.vue";

/**
 * 投票组件编辑器参数。
 * @since Beta v0.13.1
 */
type VpPostVoteEditorProps = {
  /** 是否禁用操作 */
  disabled: boolean;
  /** 是否正在保存 */
  loading: boolean;
  /** 待编辑的投票 */
  vote?: TGApp.BBS.PostEdit.Vote;
  /** 投票是否已创建 */
  voteCreated?: boolean;
};

type VpPostVoteEditorEmits = {
  /** 请求创建投票 */
  save: [request: TGApp.BBS.Vote.CreateRequest];
  /** 编辑错误信息 */
  error: [message: string];
};

const props = withDefaults(defineProps<VpPostVoteEditorProps>(), {
  vote: undefined,
  voteCreated: false,
});
const emits = defineEmits<VpPostVoteEditorEmits>();

const optionsTitleId = useId();
const voteTitle = ref<string>("");
const options = ref<Array<{ id: number; text: string }>>([]);
const voteLimit = ref<string>("1");
const endTime = ref<string>(defaultEndTime());
const fieldsLocked = computed<boolean>(() => props.disabled || props.loading || props.voteCreated);
const submitLocked = computed<boolean>(() => props.disabled || props.loading);
let nextOptionId = 0;

options.value = [
  { id: nextOptionId++, text: "" },
  { id: nextOptionId++, text: "" },
];

/**
 * 生成默认截止时间，与官方一致取七天后。
 * @since Beta v0.13.1
 * @returns datetime-local 输入框可识别的本地时间
 */
function defaultEndTime(): string {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}T${hours}:${minutes}`;
}

function addOption(): void {
  if (fieldsLocked.value) return;
  options.value.push({ id: nextOptionId++, text: "" });
}

function removeOption(id: number): void {
  if (fieldsLocked.value || options.value.length <= 2) return;
  options.value = options.value.filter((option) => option.id !== id);
  const limit = Number(voteLimit.value);
  if (Number.isSafeInteger(limit) && limit > options.value.length) {
    voteLimit.value = String(options.value.length);
  }
}

/**
 * 校验并向外提交投票创建请求。
 * @since Beta v0.13.1
 */
function submit(): void {
  if (submitLocked.value) return;
  const title = voteTitle.value.trim();
  const values = options.value.map((option) => option.text.trim());
  const end = Math.floor(new Date(endTime.value).getTime() / 1000);
  const limit = Number(voteLimit.value);
  if (!title || values.some((value) => !value)) {
    emits("error", "请填写投票标题和每个选项");
    return;
  }
  if (new Set(values).size !== values.length) {
    emits("error", "投票选项不能重复");
    return;
  }
  if (!Number.isSafeInteger(end) || end <= Date.now() / 1000) {
    emits("error", "请选择未来的截止时间");
    return;
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > values.length) {
    emits("error", "请输入每人可选的数量");
    return;
  }
  emits("error", "");
  emits("save", { title, end_time: end, vote_limit: limit, vote_options: values });
}

defineExpose({ submit });
</script>

<style lang="scss" scoped>
.vpve-existing,
.vpve-form {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 16px;
}

.vpve-existing {
  gap: 12px;
}

.vpve-existing :deep(.tp-vote-box) {
  border-radius: 8px;
  margin: 0;
  background: var(--app-page-bg);
}

.vpve-title-row {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr) 160px;
}

.vpve-options-section {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.vpve-options-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.vpve-label {
  min-width: 0;
  flex: 1 1 auto;
  padding: 0;
  margin: 0;
  color: var(--box-text-1);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.vpve-count {
  margin-left: 8px;
  color: var(--box-text-4);
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
}

.vpve-options-box {
  display: flex;
  overflow: hidden auto;
  max-height: min(40dvh, 320px);
  box-sizing: border-box;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-3);
  gap: 12px;
  overscroll-behavior: contain;
}

.vpve-option {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
}

.vpve-option :deep(.v-input) {
  min-width: 0;
  flex: 1 1 auto;
}

.vpve-close {
  position: absolute;
  z-index: 1;
  top: -8px;
  right: -8px;
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--box-bg-3);
  border-radius: 50%;
  background: var(--tgc-od-red);
  color: var(--tgc-white-1);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }

  &:hover {
    opacity: 0.82;
  }
}

.vpve-add {
  flex: none;
}

.vpve-hint {
  margin: 0;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 20px;
}

@media (width <= 600px) {
  .vpve-form,
  .vpve-title-row {
    gap: 12px;
  }

  .vpve-title-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
