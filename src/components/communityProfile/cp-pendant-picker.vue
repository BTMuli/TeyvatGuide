<!-- 米游社头像框选择对话框 -->
<template>
  <v-dialog
    v-model="visible"
    :aria-labelledby="titleId"
    class="cppp-dialog"
    eager
    max-height="calc(100dvh - 48px)"
    max-width="calc(100vw - 32px)"
    :width="720"
    z-index="80"
  >
    <section class="cppp-panel">
      <header class="cppp-header">
        <div>
          <h2 :id="titleId">选择头像框</h2>
          <p>头像框会显示在个人中心与帖子头像外圈，保存资料后生效。</p>
        </div>
        <v-btn
          aria-label="关闭头像框选择"
          icon="mdi-close"
          size="32"
          title="关闭"
          type="button"
          variant="text"
          @click="visible = false"
        />
      </header>

      <div v-if="loading" aria-live="polite" class="cppp-state" role="status">
        <v-progress-circular indeterminate size="28" />
        <p>正在加载头像框列表…</p>
      </div>
      <div v-else-if="error" aria-live="assertive" class="cppp-state" role="alert">
        <v-icon size="32">mdi-alert-circle-outline</v-icon>
        <p>{{ error }}</p>
        <v-btn type="button" variant="tonal" @click="emits('retry')">重新加载</v-btn>
      </div>
      <div v-else class="cppp-body">
        <div class="cppp-preview">
          <CpAvatar :size="96" :user="previewUser" />
          <div class="cppp-preview-copy">
            <div class="cppp-preview-title">
              <h3>
                {{
                  selectedPendant?.name ??
                  (selectedId === unavailablePendantId ? "当前头像框" : "不使用头像框")
                }}
              </h3>
              <span v-if="selectedPendant && isLimited(selectedPendant)" class="cppp-badge">
                限时
              </span>
              <span v-if="selectedPendant && !selectedPendant.owned" class="cppp-badge is-locked">
                未拥有
              </span>
            </div>
            <p v-if="selectedPendant?.description">{{ selectedPendant.description }}</p>
            <p v-else class="cppp-preview-placeholder">
              {{ selectedPendant ? "该头像框暂无描述。" : "头像将以原本的样式展示。" }}
            </p>
            <p v-if="selectedPendant?.author" class="cppp-preview-author">
              绘制者：{{ selectedPendant.author }}
            </p>
            <p v-if="selectedPendant && isLimited(selectedPendant)" class="cppp-preview-limit">
              {{ getPendantLimit(selectedPendant) }}
            </p>
            <p v-if="selectedPendant && !selectedPendant.owned" class="cppp-preview-warning">
              该头像框尚未拥有，暂不可使用。
            </p>
            <p v-if="selectedId === unavailablePendantId" class="cppp-preview-warning">
              当前头像框暂不在可选列表，请选择其他头像框或“不使用”。
            </p>
          </div>
        </div>

        <div class="cppp-list">
          <section v-for="group in pendantGroups" :key="group.title" class="cppp-group">
            <h3 class="cppp-group-title">
              {{ group.title }}
              <span>{{ group.pendants.length }}</span>
            </h3>
            <div :aria-label="group.title" class="cppp-grid" role="group">
              <button
                v-if="group.available"
                aria-label="不使用头像框"
                :aria-pressed="selectedId === 0"
                :class="{ 'is-selected': selectedId === 0 }"
                class="cppp-item"
                type="button"
                @click="selectedId = 0"
              >
                <span class="cppp-item-preview">
                  <img
                    alt=""
                    class="cppp-item-avatar"
                    decoding="async"
                    loading="lazy"
                    :src="avatarUrl"
                  />
                </span>
                <span class="cppp-item-name">不使用</span>
              </button>
              <button
                v-for="pendant in group.pendants"
                :key="pendant.id"
                :aria-label="`选择头像框 ${pendant.name}${pendant.owned ? '' : '（未拥有）'}`"
                :aria-pressed="selectedId === pendant.id"
                :class="{
                  'is-locked': !pendant.owned,
                  'is-selected': selectedId === pendant.id,
                }"
                class="cppp-item"
                :title="pendant.owned ? pendant.name : `${pendant.name}（未拥有，仅可预览）`"
                type="button"
                @click="selectedId = pendant.id"
              >
                <span class="cppp-item-preview">
                  <img
                    alt=""
                    class="cppp-item-avatar"
                    decoding="async"
                    loading="lazy"
                    :src="avatarUrl"
                  />
                  <img
                    alt=""
                    class="cppp-item-pendant"
                    decoding="async"
                    loading="lazy"
                    :src="pendant.url"
                  />
                  <span v-if="!pendant.owned" aria-hidden="true" class="cppp-lock">
                    <v-icon size="12">mdi-lock</v-icon>
                  </span>
                  <span v-if="isLimited(pendant)" class="cppp-item-limit">限时</span>
                </span>
                <span :class="{ 'is-locked': !pendant.owned }" class="cppp-item-name">
                  {{ pendant.name }}
                </span>
              </button>
            </div>
          </section>
          <p v-if="pendants.length === 0" class="cppp-empty">暂无可选头像框</p>
        </div>
      </div>

      <footer class="cppp-footer">
        <v-btn type="button" variant="text" @click="visible = false">取消</v-btn>
        <v-btn
          :disabled="!canConfirm"
          class="cppp-confirm"
          type="button"
          variant="flat"
          @click="handleConfirm"
        >
          {{ selectedId === 0 ? "不使用头像框" : "使用该头像框" }}
        </v-btn>
      </footer>
    </section>
  </v-dialog>
</template>

<script lang="ts" setup>
import CpAvatar from "@comp/communityProfile/cp-avatar.vue";
import { getUserAvatar } from "@utils/toolFunc.js";
import { computed, ref, useId, watch } from "vue";

/**
 * 头像框选择对话框用户信息。
 * @since Beta v0.12.6
 */
type PendantPickerUser = Pick<TGApp.BBS.User.Info, "nickname" | "avatar_url"> & {
  avatar_ext?: TGApp.BBS.User.AvatarExt | null;
};

/**
 * 头像框选择对话框参数。
 * @since Beta v0.12.6
 */
type PendantPickerProps = {
  /** 可选头像框列表 */
  pendants: Array<TGApp.BBS.CommunitySettings.Pendant>;
  /** 预览用户 */
  user: PendantPickerUser;
  /** 当前头像框链接，空串表示未使用 */
  currentUrl: string;
  /** 已保存的头像框链接 */
  serverUrl: string;
  /** 是否正在加载 */
  loading: boolean;
  /** 加载错误 */
  error: string;
};

/**
 * 按可用状态组织的头像框分组。
 * @since Beta v0.12.6
 */
type PendantGroup = {
  title: string;
  available: boolean;
  pendants: Array<TGApp.BBS.CommunitySettings.Pendant>;
};

const props = defineProps<PendantPickerProps>();
const visible = defineModel<boolean>({ required: true });
const emits = defineEmits<{
  confirm: [pendant: TGApp.BBS.CommunitySettings.Pendant | null];
  retry: [];
}>();

const titleId = useId();
const unavailablePendantId = -1;
const selectedId = ref<number>(0);
const pendantGroups = computed<Array<PendantGroup>>(() => {
  const available = props.pendants.filter((pendant) => pendant.owned);
  const unavailable = props.pendants.filter((pendant) => !pendant.owned);
  const groups: Array<PendantGroup> = [
    { title: "可用头像框", available: true, pendants: available },
  ];
  if (unavailable.length > 0) {
    groups.push({ title: "不可用头像框", available: false, pendants: unavailable });
  }
  return groups;
});
const avatarUrl = computed<string>(() => getUserAvatar(props.user) || "/UI/nav/lumine.webp");
const selectedPendant = computed<TGApp.BBS.CommunitySettings.Pendant | null>(() => {
  return props.pendants.find((pendant) => pendant.id === selectedId.value) ?? null;
});
const previewUser = computed<PendantPickerUser & { pendant: string }>(() => ({
  nickname: props.user.nickname,
  avatar_url: props.user.avatar_url,
  pendant:
    selectedPendant.value?.url ??
    (selectedId.value === unavailablePendantId ? props.currentUrl : ""),
  avatar_ext: props.user.avatar_ext,
}));
const canConfirm = computed<boolean>(() => {
  if (props.loading || props.error) return false;
  if (selectedId.value === unavailablePendantId) return false;
  if (selectedId.value === 0) return props.currentUrl !== "";
  if (!selectedPendant.value) return false;
  return selectedPendant.value.owned && selectedPendant.value.url !== props.currentUrl;
});

watch(
  visible,
  (isOpen) => {
    if (isOpen) initializeSelection();
  },
  { immediate: true },
);

watch(
  () => props.pendants,
  () => {
    if (visible.value) initializeSelection();
  },
);

function initializeSelection(): void {
  const currentPendant = props.currentUrl
    ? props.pendants.find((pendant) => pendant.url === props.currentUrl)
    : undefined;
  if (props.currentUrl !== props.serverUrl) {
    selectedId.value = currentPendant?.id ?? (props.currentUrl ? unavailablePendantId : 0);
    return;
  }
  const used = props.pendants.find((pendant) => pendant.is_used);
  selectedId.value =
    used?.id ?? currentPendant?.id ?? (props.currentUrl ? unavailablePendantId : 0);
}

/**
 * 将剩余秒数格式化为官方头像框选择器的展示文本。
 * @since Beta v0.12.6
 * @param seconds - 剩余秒数
 * @returns 剩余时间文本
 */
function formatRemainTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(seconds / 60 / 60);
  const days = Math.floor(seconds / 60 / 60 / 24);
  if (days) return `${days}天${Math.floor((seconds / 60 / 60) % 24)}小时`;
  if (hours) return `${hours}小时`;
  if (minutes) return `${minutes}分钟`;
  return "小于1分钟";
}

function isLimited(pendant: TGApp.BBS.CommunitySettings.Pendant): boolean {
  return Boolean(pendant.expired_time);
}

function getPendantLimit(pendant: TGApp.BBS.CommunitySettings.Pendant): string {
  if (pendant.remain_time !== undefined && pendant.remain_time > 0) {
    return `剩余 ${formatRemainTime(pendant.remain_time)}`;
  }
  return "限时头像框";
}

function handleConfirm(): void {
  if (!canConfirm.value) return;
  emits("confirm", selectedPendant.value);
}
</script>

<style lang="scss" scoped>
.cppp-panel {
  display: flex;
  overflow: hidden;
  width: 100%;
  max-height: calc(100dvh - 48px);
  box-sizing: border-box;
  flex-direction: column;
  border: 1px solid var(--common-shadow-1);
  border-radius: 12px;
  background: var(--box-bg-1);
  color: var(--app-page-content);
}

.cppp-header {
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
    margin: 4px 0 0;
    color: var(--box-text-4);
    font-size: 12px;
  }
}

.cppp-body {
  display: flex;
  overflow: hidden;
  min-height: 0;
  max-height: min(56dvh, 520px);
  box-sizing: border-box;
  flex: 1 1 auto;
  flex-direction: column;
  padding: 16px;
}

.cppp-preview {
  display: flex;
  flex: none;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-2);
  gap: 16px;
}

.cppp-preview-copy {
  min-width: 0;

  p {
    margin: 4px 0 0;
    color: var(--box-text-4);
    font-size: 12px;
    line-height: 18px;
    overflow-wrap: anywhere;
  }
}

.cppp-preview-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  h3 {
    margin: 0;
    color: var(--common-text-title);
    font-size: 16px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
}

.cppp-badge {
  flex: none;
  padding: 0 6px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 2px;
  color: var(--box-text-4);
  font-size: 11px;
  line-height: 18px;

  &.is-locked {
    color: var(--common-text-title);
  }
}

.cppp-preview-copy .cppp-preview-limit {
  color: var(--common-text-title);
}

.cppp-preview-copy .cppp-preview-warning {
  color: var(--common-text-title);
}

.cppp-list {
  min-height: 0;
  flex: 1 1 auto;
  margin-top: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.cppp-group + .cppp-group {
  margin-top: 16px;
}

.cppp-group-title {
  display: flex;
  align-items: center;
  margin: 0 0 8px;
  color: var(--common-text-title);
  font-size: 14px;
  font-weight: 600;
  gap: 8px;
  line-height: 20px;

  span {
    color: var(--box-text-4);
    font-size: 12px;
    font-weight: 400;
  }
}

.cppp-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
}

.cppp-item {
  display: flex;
  overflow: hidden;
  min-width: 0;
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  margin: 0;
  background: transparent;
  color: var(--app-page-content);
  cursor: pointer;
  font: inherit;
  gap: 6px;
  text-align: center;
  transition:
    border-color 120ms ease,
    background-color 120ms ease;

  &:hover:where(:enabled) {
    background: var(--box-bg-2);
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }

  &.is-selected {
    border-color: var(--common-text-title);
    background: var(--box-bg-2);
  }
}

.cppp-item-preview {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1;

  .cppp-item.is-locked & {
    opacity: 0.45;
  }
}

.cppp-item-avatar {
  position: absolute;
  top: 10%;
  left: 10%;
  display: block;
  width: 80%;
  height: 80%;
  border-radius: 50%;
  object-fit: cover;
}

.cppp-item-pendant {
  position: absolute;
  display: block;
  width: 100%;
  height: 100%;
  inset: 0;
  object-fit: contain;
}

.cppp-item-name {
  overflow: hidden;
  max-width: 100%;
  color: var(--common-text-title);
  font-size: 12px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.is-locked {
    color: var(--box-text-4);
  }
}

.cppp-item-limit {
  position: absolute;
  top: 2px;
  left: 2px;
  padding: 0 4px;
  border-radius: 2px;
  background: var(--box-bg-3);
  color: var(--box-text-4);
  font-size: 10px;
  line-height: 16px;
}

.cppp-lock {
  position: absolute;
  right: 2px;
  bottom: 2px;
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--box-bg-3);
  color: var(--box-text-4);
}

.cppp-empty {
  margin: 16px 0 0;
  color: var(--box-text-4);
  font-size: 12px;
  text-align: center;
}

.cppp-state {
  display: flex;
  min-height: 280px;
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

.cppp-footer {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 8px;
}

.cppp-confirm {
  border-radius: 4px;
  background: var(--box-bg-3);
  color: var(--box-text-4);
  font-weight: 600;

  &:enabled {
    background: var(--common-text-title);
    color: var(--app-page-bg);
  }
}

@media (width <= 640px) {
  .cppp-header,
  .cppp-body,
  .cppp-footer {
    padding: 12px;
  }

  .cppp-preview {
    align-items: flex-start;
    padding: 12px;
  }

  .cppp-grid {
    gap: 6px;
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  }
}
</style>
<style lang="scss">
/* Vuetify 的遮罩由内部节点渲染，需使用全局选择器添加背景模糊 */

.cppp-dialog .v-overlay__scrim {
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: rgb(0 0 0 / 32%);
  opacity: 1;
}
</style>
