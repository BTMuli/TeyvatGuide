<!-- 米游社头像选择对话框 -->
<template>
  <TopOverlay
    v-model="visible"
    :showShare="false"
    :titleId="titleId"
    blurVal="10px"
    closeAriaLabel="关闭头像选择"
    contentMaxHeight="none"
    panelMaxHeight="calc(100dvh - 48px)"
    panelWidth="720px"
  >
    <template #header>
      <div class="cpap-heading">
        <div class="cpap-header-avatar" title="当前头像">
          <img v-if="props.currentUrl" :src="props.currentUrl" alt="当前头像" />
          <v-icon v-else size="40">mdi-account-circle-outline</v-icon>
          <span>当前</span>
        </div>
        <div class="cpap-heading-copy">
          <h2 :id="titleId">选择头像</h2>
          <p>从米游社预设头像或已拥有的动态头像中选择，也可以上传自定义头像。</p>
        </div>
      </div>
    </template>
    <template #actions>
      <div class="cpap-header-avatar is-pending" title="更换后的头像预览">
        <img
          v-if="selectedPreviewUrl"
          :src="selectedPreviewUrl"
          :style="{ objectPosition: selectedPreviewPosition }"
          alt="更换后的头像预览"
        />
        <v-icon v-else size="40">mdi-account-circle-outline</v-icon>
        <span>更换后</span>
      </div>
      <v-btn
        aria-label="关闭头像选择"
        density="comfortable"
        icon="mdi-close"
        title="关闭头像选择"
        variant="text"
        @click="visible = false"
      />
    </template>

    <v-tabs
      v-model="activeTab"
      aria-label="头像来源"
      class="cpap-tabs"
      color="var(--common-text-title)"
      density="compact"
      show-arrows
    >
      <v-tab value="preset">预设头像</v-tab>
      <v-tab value="dynamic">动态头像</v-tab>
      <v-tab value="custom">自定义头像</v-tab>
    </v-tabs>
    <div class="cpap-body">
      <CpAvatarCrop
        v-show="activeTab === 'custom'"
        ref="cropPanel"
        :initialCrop="props.currentCrop"
        :disabled="props.disabled"
        :file="props.currentCustomSource"
        @busy="customBusy = $event"
        @confirm="emits('confirmCustom', $event)"
        @ready="customReady = $event"
      />
      <template v-if="activeTab === 'dynamic'">
        <div class="cpap-scroll">
          <TStatePanel
            v-if="props.dynamicLoading"
            fill
            message="正在加载动态头像…"
            variant="loading"
          />
          <TStatePanel
            v-else-if="props.dynamicError"
            fill
            :disabled="props.disabled"
            :message="props.dynamicError"
            variant="error"
            @retry="emits('retryDynamic')"
          />
          <TStatePanel
            v-else-if="props.dynamicAvatars.length === 0"
            fill
            icon="mdi-account-box-outline"
            message="暂无可用的动态头像"
            variant="empty"
          />
          <div v-else aria-label="可选动态头像" class="cpap-grid" role="group">
            <CpAvatarOption
              v-for="avatar in props.dynamicAvatars"
              :key="avatar.id"
              :ariaLabel="`选择动态头像 ${avatar.name || avatar.id}`"
              :disabled="props.disabled"
              :name="avatar.name"
              :selected="selectedDynamicId === avatar.id"
              :src="avatar.url"
              @select="selectedDynamicId = avatar.id"
            />
          </div>
        </div>
      </template>
      <div v-else-if="activeTab === 'preset'" class="cpap-preset">
        <v-tabs
          v-if="!props.loading && !props.error && groups.length > 0"
          v-model="activeGroupName"
          aria-label="头像分组"
          aria-orientation="vertical"
          class="cpap-group-tabs"
          color="var(--common-text-title)"
          density="compact"
          direction="vertical"
          show-arrows
        >
          <v-tab v-for="group in groups" :key="group.name" :title="group.name" :value="group.name">
            <span class="cpap-group-name">{{ group.name }}</span>
          </v-tab>
        </v-tabs>
        <div class="cpap-scroll">
          <TStatePanel v-if="props.loading" fill message="正在加载头像列表…" variant="loading" />
          <TStatePanel
            v-else-if="props.error"
            fill
            :disabled="props.disabled"
            :message="props.error"
            variant="error"
            @retry="emits('retry')"
          />
          <TStatePanel
            v-else-if="groups.length === 0"
            fill
            icon="mdi-image-off-outline"
            message="暂无可选头像"
            variant="empty"
          />
          <div v-else-if="activeGroup" aria-label="可选头像" class="cpap-grid" role="group">
            <CpAvatarOption
              v-for="avatar in activeGroup.list"
              :key="avatar.id"
              :ariaLabel="`选择头像 ${avatar.name || avatar.id}`"
              :disabled="props.disabled"
              :name="avatar.name"
              :selected="selectedId === String(avatar.id)"
              :src="avatar.icon"
              @select="selectedId = String(avatar.id)"
            />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="cpap-footer-actions">
        <v-btn type="button" variant="text" @click="visible = false">取消</v-btn>
        <v-btn
          :disabled="!canConfirm"
          class="cpap-confirm"
          type="button"
          variant="flat"
          @click="handleConfirm"
        >
          {{ activeTab === "custom" ? "使用自定义头像" : "使用该头像" }}
        </v-btn>
      </div>
    </template>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TStatePanel from "@comp/app/t-state-panel.vue";
import TopOverlay from "@comp/app/top-overlay.vue";
import CpAvatarCrop from "@comp/comiProf/cp-avatar-crop.vue";
import CpAvatarOption from "@comp/comiProf/cp-avatar-option.vue";
import { computed, ref, useId, useTemplateRef, watch } from "vue";

/**
 * 头像选择对话框参数。
 * @since Beta v0.13.1
 */
type AvatarPickerProps = {
  /** 打开选择器时的当前头像链接 */
  currentUrl: string;
  /** 可选预设头像分组 */
  groups: Array<TGApp.BBS.CommunitySettings.AvatarGroup>;
  /** 已拥有的动态头像 */
  dynamicAvatars: Array<TGApp.BBS.CommunitySettings.DynamicAvatar>;
  /** 当前预设头像编号 */
  currentId: string;
  /** 当前动态头像资源编号 */
  currentAssetId: string;
  /** 当前待保存的自定义头像源文件 */
  currentCustomSource?: File;
  /** 当前自定义头像裁切位置 */
  currentCrop?: TGApp.BBS.CommunitySettings.AvatarCrop;
  /** 是否正在加载预设头像 */
  loading: boolean;
  /** 预设头像加载错误 */
  error: string;
  /** 是否正在加载动态头像 */
  dynamicLoading: boolean;
  /** 动态头像加载错误 */
  dynamicError: string;
  /** 是否禁用操作 */
  disabled?: boolean;
};

type AvatarPickerEmits = {
  /** 确认预设头像 */
  confirm: [avatar: TGApp.BBS.CommunitySettings.Avatar];
  /** 确认动态头像 */
  confirmDynamic: [avatar: TGApp.BBS.CommunitySettings.DynamicAvatar];
  /** 确认自定义头像 */
  confirmCustom: [selection: TGApp.BBS.CommunitySettings.CustomAvatarSelection];
  /** 重新加载预设头像 */
  retry: [];
  /** 重新加载动态头像 */
  retryDynamic: [];
};

type AvatarPickerTab = "preset" | "dynamic" | "custom";

const props = withDefaults(defineProps<AvatarPickerProps>(), {
  disabled: false,
});
const visible = defineModel<boolean>({ required: true });
const emits = defineEmits<AvatarPickerEmits>();

const titleId = useId();
const cropPanel = useTemplateRef<InstanceType<typeof CpAvatarCrop>>("cropPanel");
const activeTab = ref<AvatarPickerTab>("preset");
const activeGroupName = ref<string>("");
const selectedId = ref<string>("");
const selectedDynamicId = ref<string>("");
const customReady = ref<boolean>(false);
const customBusy = ref<boolean>(false);
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
const selectedDynamic = computed<TGApp.BBS.CommunitySettings.DynamicAvatar | undefined>(() => {
  return props.dynamicAvatars.find((avatar) => avatar.id === selectedDynamicId.value);
});
const selectedPreviewUrl = computed<string>(() => {
  if (activeTab.value === "custom") return cropPanel.value?.previewUrl || props.currentUrl;
  if (activeTab.value === "dynamic") return selectedDynamic.value?.url || props.currentUrl;
  return selectedAvatar.value?.icon || props.currentUrl;
});
const selectedPreviewPosition = computed<string>(() => {
  return activeTab.value === "custom" ? (cropPanel.value?.previewPosition ?? "50% 50%") : "50% 50%";
});
const canConfirm = computed<boolean>(() => {
  if (props.disabled) return false;
  if (activeTab.value === "custom") {
    return customReady.value && !customBusy.value;
  }
  if (activeTab.value === "dynamic") {
    if (props.dynamicLoading || props.dynamicError) return false;
    return selectedDynamic.value !== undefined && selectedDynamicId.value !== props.currentAssetId;
  }
  if (props.loading || props.error) return false;
  return selectedAvatar.value !== undefined && selectedId.value !== props.currentId;
});

watch(
  visible,
  (isOpen) => {
    if (isOpen) {
      initializeSelection();
      return;
    }
    customReady.value = false;
    customBusy.value = false;
  },
  { immediate: true },
);

watch(
  () => props.groups,
  () => {
    if (visible.value) initializePresetSelection();
  },
);

function initializeSelection(): void {
  customReady.value = false;
  customBusy.value = false;
  initializePresetSelection();
  selectedDynamicId.value = props.currentAssetId;
  if (props.currentCustomSource) {
    activeTab.value = "custom";
    return;
  }
  activeTab.value = props.currentAssetId ? "dynamic" : "preset";
}

function initializePresetSelection(): void {
  const matchedGroup = props.groups.find((group) => {
    return group.list.some((item) => String(item.id) === props.currentId);
  });
  activeGroupName.value = matchedGroup?.name ?? props.groups[0]?.name ?? "";
  selectedId.value = matchedGroup ? props.currentId : "";
}

function handleConfirm(): void {
  if (!canConfirm.value) return;
  if (activeTab.value === "custom") {
    void cropPanel.value?.confirm();
    return;
  }
  if (activeTab.value === "dynamic") {
    if (selectedDynamic.value) emits("confirmDynamic", selectedDynamic.value);
    return;
  }
  if (selectedAvatar.value) emits("confirm", selectedAvatar.value);
}
</script>

<style lang="scss" scoped>
@use "@styles/utils.scss" as utils;

.cpap-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.cpap-heading-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;

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

.cpap-tabs {
  flex: none;
  padding: 0;
  border-bottom: 1px solid var(--common-shadow-1);

  :deep(.v-tab) {
    font-size: 13px;
    letter-spacing: 0;
    text-transform: none;
  }
}

.cpap-header-avatar {
  display: flex;
  width: 48px;
  flex: none;
  flex-direction: column;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 4px;
  line-height: 16px;
  white-space: nowrap;

  img {
    display: block;
    width: 40px;
    height: 40px;
    border: 1px solid var(--common-shadow-2);
    border-radius: 50%;
    background: var(--box-bg-2);
    object-fit: cover;
  }

  &.is-pending img {
    border-color: var(--common-text-title);
  }
}

.cpap-preset {
  display: flex;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
}

.cpap-group-tabs {
  width: 128px;
  max-height: 100%;
  flex: none;
  padding: 4px;
  border-right: 1px solid var(--common-shadow-1);

  :deep(.v-tab) {
    width: 100%;
    min-width: 0;
    justify-content: flex-start;
    padding: 0 12px;
    font-size: 13px;
    letter-spacing: 0;
    text-transform: none;
  }

  :deep(.v-btn__content) {
    min-width: 0;
    max-width: 100%;
  }
}

.cpap-group-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cpap-body {
  display: flex;
  overflow: hidden;
  height: min(52dvh, 420px);
  min-height: 0;
  flex: none;
  flex-direction: column;
}

.cpap-scroll {
  overflow: hidden auto;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  flex: 1 1 auto;
  padding: 16px;
  overscroll-behavior: contain;
}

.cpap-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
}

.cpap-footer-actions {
  @include utils.overlay-footer-actions;
}

.cpap-confirm {
  @include utils.overlay-confirm-button;
}

@media (width <= 640px) {
  .cpap-grid {
    gap: 6px;
    grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  }

  .cpap-group-tabs {
    width: 104px;
  }
}

@media (width <= 480px) {
  .cpap-heading {
    gap: 8px;
  }

  .cpap-heading-copy p {
    display: none;
  }
}
</style>
