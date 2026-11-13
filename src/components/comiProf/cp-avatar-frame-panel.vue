<!-- 头像框选择面板 -->
<template>
  <TStatePanel
    v-if="props.loading"
    minHeight="280px"
    message="正在加载头像框列表…"
    variant="loading"
  />
  <TStatePanel
    v-else-if="props.error"
    minHeight="280px"
    :message="props.error"
    variant="error"
    @retry="emits('retry')"
  />
  <div v-else class="cpaf-body">
    <CpDecorationPreview
      :author="selectedPendant?.author"
      :bubble="false"
      :description="selectedPendant?.description"
      :inUse="isPendantInUse(selectedPendant, props.serverUrl)"
      :limited="selectedPendant !== null && isDecorationLimited(selectedPendant)"
      :limitText="selectedPendant ? getPendantLimitText(selectedPendant) : ''"
      :locked="selectedPendant !== null && !selectedPendant.owned"
      :placeholder="selectedPendant ? '该头像框暂无描述。' : '头像将以原本的样式展示。'"
      :title="previewTitle"
      :warnings="warnings"
    >
      <template #visual>
        <CpAvatar :size="96" :user="previewUser" />
      </template>
    </CpDecorationPreview>

    <div class="cpaf-list">
      <section v-for="group in groups" :key="group.title" class="cpaf-group">
        <h3 class="cpaf-group-title">
          {{ group.title }}
          <span>{{ group.pendants.length }}</span>
        </h3>
        <div :aria-label="group.title" class="cpaf-grid" role="group">
          <CpDecorationItem
            v-if="group.available"
            ariaText="不使用头像框"
            :inUse="false"
            :limited="false"
            name="不使用"
            :owned="true"
            :selected="selectedId === 0"
            @select="selectedId = 0"
          >
            <img
              alt=""
              class="cpaf-item-avatar"
              decoding="async"
              loading="lazy"
              :src="props.avatarUrl"
            />
          </CpDecorationItem>
          <v-tooltip
            v-for="pendant in group.pendants"
            :key="pendant.id"
            location="top"
            open-delay="120"
          >
            <template #activator="{ props: tooltipProps }">
              <CpDecorationItem
                v-bind="tooltipProps"
                :ariaText="`选择头像框 ${pendant.name}${pendant.owned ? '' : '（未拥有）'}`"
                :inUse="isPendantInUse(pendant, props.serverUrl)"
                :limited="isDecorationLimited(pendant)"
                :name="pendant.name"
                :owned="pendant.owned"
                :selected="selectedId === pendant.id"
                @select="selectedId = pendant.id"
              >
                <img
                  alt=""
                  class="cpaf-item-avatar"
                  decoding="async"
                  loading="lazy"
                  :src="props.avatarUrl"
                />
                <img
                  alt=""
                  class="cpaf-item-pendant"
                  decoding="async"
                  loading="lazy"
                  :src="pendant.url"
                />
              </CpDecorationItem>
            </template>
            <div class="cpaf-tooltip">
              <div class="cpaf-tooltip-name">{{ pendant.name }}</div>
              <div class="cpaf-tooltip-method">{{ getDecorationObtainMethod(pendant) }}</div>
            </div>
          </v-tooltip>
        </div>
      </section>
      <p v-if="props.pendants.length === 0" class="cpaf-empty">暂无可选头像框</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import TStatePanel from "@comp/app/t-state-panel.vue";
import CpAvatar from "@comp/comiProf/cp-avatar.vue";
import CpDecorationItem from "@comp/comiProf/cp-decoration-item.vue";
import CpDecorationPreview from "@comp/comiProf/cp-decoration-preview.vue";
import {
  getDecorationObtainMethod,
  getPendantLimitText,
  isDecorationLimited,
  isPendantInUse,
} from "@utils/community/decorationDisplay.js";
import { computed } from "vue";

/**
 * 头像框选择面板参数。
 * @since Beta v0.13.1
 */
type AvatarFramePanelProps = {
  /** 可选头像框列表 */
  pendants: Array<TGApp.BBS.CommunitySettings.Pendant>;
  /** 预览用户昵称 */
  nickname: string;
  /** 预览用户头像链接 */
  avatarUrl: string;
  /** 预览用户动态头像扩展 */
  avatarExt?: TGApp.BBS.User.AvatarExt | null;
  /** 当前头像框链接，空串表示未使用 */
  currentUrl: string;
  /** 已保存的头像框链接 */
  serverUrl: string;
  /** 不在可选列表中的头像框占位编号 */
  unavailableId: number;
  /** 是否正在加载 */
  loading: boolean;
  /** 加载错误 */
  error: string;
};

/**
 * 按可用状态组织的头像框分组。
 * @since Beta v0.13.1
 */
type AvatarFrameGroup = {
  title: string;
  available: boolean;
  pendants: Array<TGApp.BBS.CommunitySettings.Pendant>;
};

type AvatarFramePanelEmits = {
  /** 重新加载头像框 */
  retry: [];
};

const props = defineProps<AvatarFramePanelProps>();
const selectedId = defineModel<number>("selectedId", { required: true });
const emits = defineEmits<AvatarFramePanelEmits>();

const groups = computed<Array<AvatarFrameGroup>>(() => {
  const available = props.pendants.filter((pendant) => pendant.owned);
  const unavailable = props.pendants.filter((pendant) => !pendant.owned);
  const result: Array<AvatarFrameGroup> = [
    { title: "可用头像框", available: true, pendants: available },
  ];
  if (unavailable.length > 0) {
    result.push({ title: "不可用头像框", available: false, pendants: unavailable });
  }
  return result;
});
const selectedPendant = computed<TGApp.BBS.CommunitySettings.Pendant | null>(() => {
  return props.pendants.find((pendant) => pendant.id === selectedId.value) ?? null;
});
const previewUser = computed<{
  nickname: string;
  avatar_url: string;
  pendant: string;
  avatar_ext?: TGApp.BBS.User.AvatarExt | null;
}>(() => ({
  nickname: props.nickname,
  avatar_url: props.avatarUrl,
  pendant:
    selectedPendant.value?.url ??
    (selectedId.value === props.unavailableId ? props.currentUrl : ""),
  avatar_ext: props.avatarExt,
}));
const previewTitle = computed<string>(() => {
  if (selectedPendant.value) return selectedPendant.value.name;
  return selectedId.value === props.unavailableId ? "当前头像框" : "不使用头像框";
});
const warnings = computed<Array<string>>(() => {
  const result: Array<string> = [];
  if (selectedPendant.value && !selectedPendant.value.owned) {
    result.push("该头像框尚未拥有，暂不可使用。");
  }
  if (selectedId.value === props.unavailableId) {
    result.push("当前头像框暂不在可选列表，请选择其他头像框或“不使用”。");
  }
  return result;
});
</script>

<style lang="scss" scoped>
.cpaf-body {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 16px;
}

.cpaf-list {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.cpaf-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cpaf-group-title {
  display: flex;
  align-items: center;
  margin: 0;
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

.cpaf-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
}

.cpaf-item-avatar {
  position: absolute;
  top: 10%;
  left: 10%;
  display: block;
  width: 80%;
  height: 80%;
  border-radius: 50%;
  object-fit: cover;
}

.cpaf-item-pendant {
  position: absolute;
  display: block;
  width: 100%;
  height: 100%;
  inset: 0;
  object-fit: contain;
}

.cpaf-tooltip {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  gap: 2px;
  line-height: 18px;
  text-align: left;
}

.cpaf-tooltip-name {
  font-weight: 600;
}

.cpaf-tooltip-method {
  opacity: 0.8;
}

.cpaf-empty {
  margin: 0;
  color: var(--box-text-4);
  font-size: 12px;
  text-align: center;
}

@media (width <= 640px) {
  .cpaf-grid {
    gap: 6px;
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  }
}
</style>
