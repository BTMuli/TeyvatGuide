<!-- 米游社预设头像选择对话框 -->
<template>
  <v-dialog
    v-model="visible"
    :aria-labelledby="titleId"
    class="cpap-dialog"
    eager
    max-height="calc(100dvh - 48px)"
    max-width="calc(100vw - 32px)"
    :width="720"
    z-index="80"
  >
    <section class="cpap-panel">
      <header class="cpap-header">
        <div class="cpap-heading">
          <h2 :id="titleId">选择头像</h2>
          <p>从米游社预设头像中选择，保存资料后生效。</p>
        </div>
        <v-btn
          aria-label="关闭头像选择"
          icon="mdi-close"
          size="32"
          title="关闭"
          type="button"
          variant="text"
          @click="visible = false"
        />
      </header>

      <div v-if="loading" aria-live="polite" class="cpap-state" role="status">
        <v-progress-circular indeterminate size="28" />
        <p>正在加载头像列表…</p>
      </div>
      <div v-else-if="error" aria-live="assertive" class="cpap-state" role="alert">
        <v-icon size="32">mdi-alert-circle-outline</v-icon>
        <p>{{ error }}</p>
        <v-btn type="button" variant="tonal" @click="emits('retry')">重新加载</v-btn>
      </div>
      <div v-else-if="groups.length === 0" class="cpap-state" role="status">
        <v-icon size="32">mdi-image-off-outline</v-icon>
        <p>暂无可选头像</p>
      </div>
      <template v-else>
        <v-tabs
          v-model="activeGroupName"
          aria-label="头像分组"
          class="cpap-tabs"
          color="var(--common-text-title)"
          density="compact"
          show-arrows
        >
          <v-tab v-for="group in groups" :key="group.name" :value="group.name">
            {{ group.name }}
          </v-tab>
        </v-tabs>
        <div class="cpap-body">
          <div v-if="activeGroup" aria-label="可选头像" class="cpap-grid" role="group">
            <button
              v-for="avatar in activeGroup.list"
              :key="avatar.id"
              :aria-label="`选择头像 ${avatar.name || avatar.id}`"
              :aria-pressed="selectedId === String(avatar.id)"
              :class="{ 'is-selected': selectedId === String(avatar.id) }"
              class="cpap-avatar"
              :title="avatar.name"
              type="button"
              @click="selectedId = String(avatar.id)"
            >
              <img :alt="avatar.name" decoding="async" loading="lazy" :src="avatar.icon" />
              <span v-if="selectedId === String(avatar.id)" aria-hidden="true" class="cpap-check">
                <v-icon size="14">mdi-check</v-icon>
              </span>
            </button>
          </div>
        </div>
      </template>

      <footer class="cpap-footer">
        <v-btn type="button" variant="text" @click="visible = false">取消</v-btn>
        <v-btn
          :disabled="!canConfirm"
          color="var(--tgc-btn-1)"
          type="button"
          variant="flat"
          @click="handleConfirm"
        >
          使用该头像
        </v-btn>
      </footer>
    </section>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, useId, watch } from "vue";

/**
 * 头像选择对话框参数。
 * @since Beta v0.12.6
 */
type AvatarPickerProps = {
  /** 可选头像分组 */
  groups: Array<TGApp.BBS.CommunitySettings.AvatarGroup>;
  /** 当前头像编号 */
  currentId: string;
  /** 是否正在加载 */
  loading: boolean;
  /** 加载错误 */
  error: string;
};

const props = defineProps<AvatarPickerProps>();
const visible = defineModel<boolean>({ required: true });
const emits = defineEmits<{
  confirm: [avatar: TGApp.BBS.CommunitySettings.Avatar];
  retry: [];
}>();

const titleId = useId();
const activeGroupName = ref<string>("");
const selectedId = ref<string>("");
const activeGroup = computed<TGApp.BBS.CommunitySettings.AvatarGroup | undefined>(() => {
  return props.groups.find((group) => group.name === activeGroupName.value) ?? props.groups[0];
});
const selectedAvatar = computed<TGApp.BBS.CommunitySettings.Avatar | undefined>(() => {
  if (!selectedId.value) return undefined;
  for (const group of props.groups) {
    const avatar = group.list.find((item) => String(item.id) === selectedId.value);
    if (avatar) return avatar;
  }
  return undefined;
});
const canConfirm = computed<boolean>(() => {
  if (props.loading || props.error) return false;
  return selectedAvatar.value !== undefined && selectedId.value !== props.currentId;
});

watch(
  visible,
  (isOpen) => {
    if (isOpen) initializeSelection();
  },
  { immediate: true },
);

watch(
  () => props.groups,
  () => {
    if (visible.value) initializeSelection();
  },
);

function initializeSelection(): void {
  const matchedGroup = props.groups.find((group) => {
    return group.list.some((item) => String(item.id) === props.currentId);
  });
  activeGroupName.value = matchedGroup?.name ?? props.groups[0]?.name ?? "";
  selectedId.value = matchedGroup ? props.currentId : "";
}

function handleConfirm(): void {
  if (!canConfirm.value || !selectedAvatar.value) return;
  emits("confirm", selectedAvatar.value);
}
</script>

<style lang="scss" scoped>
.cpap-panel {
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 600px;
  max-height: calc(100dvh - 48px);
  box-sizing: border-box;
  flex-direction: column;
  border: 1px solid var(--common-shadow-1);
  border-radius: 12px;
  background: var(--box-bg-1);
  color: var(--app-page-content);
}

.cpap-header {
  display: flex;
  flex: none;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--common-shadow-1);
  gap: 16px;

  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 18px;
    font-weight: normal;
  }

  p {
    margin: 0;
    color: var(--box-text-4);
    font-size: 12px;
  }
}

.cpap-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.cpap-tabs {
  flex: none;
  padding: 0 16px;
  border-bottom: 1px solid var(--common-shadow-1);

  :deep(.v-tab) {
    font-size: 13px;
    letter-spacing: 0;
    text-transform: none;
  }
}

.cpap-body {
  min-height: 0;
  box-sizing: border-box;
  flex: 1 1 auto;
  padding: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.cpap-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
}

.cpap-avatar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 2px solid transparent;
  border-radius: 50%;
  margin: 0;
  aspect-ratio: 1;
  background: var(--box-bg-2);
  cursor: pointer;
  transition:
    border-color 120ms ease,
    background-color 120ms ease;

  img {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  &:hover {
    border-color: var(--common-shadow-2);
    background: var(--box-bg-3);
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }

  &.is-selected {
    border-color: var(--common-text-title);
    background: var(--box-bg-3);
  }
}

.cpap-check {
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--common-text-title);
  color: var(--box-bg-1);
}

.cpap-state {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  color: var(--box-text-4);
  gap: 8px;
  text-align: center;

  p {
    margin: 0;
  }
}

.cpap-footer {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 8px;
}

@media (width <= 640px) {
  .cpap-header,
  .cpap-body,
  .cpap-footer {
    padding: 12px;
  }

  .cpap-grid {
    gap: 6px;
    grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  }
}
</style>
<style lang="scss">
/* Vuetify 的遮罩由内部节点渲染，需使用全局选择器添加背景模糊 */

.cpap-dialog .v-overlay__scrim {
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: rgb(0 0 0 / 32%);
  opacity: 1;
}
</style>
