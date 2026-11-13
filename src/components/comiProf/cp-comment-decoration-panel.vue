<!-- 评论装扮选择面板 -->
<template>
  <div class="cpcd-body">
    <CpDecorationPreview
      :author="selectedDecoration?.author"
      :bubble="hasBubble"
      :description="selectedDecoration?.description"
      :inUse="isCommentInUse(selectedDecoration, props.serverId)"
      :limited="selectedDecoration !== null && isDecorationLimited(selectedDecoration)"
      :limitText="selectedDecoration ? getCommentLimitText(selectedDecoration) : ''"
      :locked="selectedDecoration !== null && !selectedDecoration.owned"
      :placeholder="selectedDecoration ? '该评论装扮暂无描述。' : '评论将以默认样式展示。'"
      :title="previewTitle"
      :warnings="warnings"
    >
      <template #visual>
        <div v-if="selectedDecoration?.url" aria-hidden="true" class="cpcd-bubble">
          <img alt="" decoding="async" loading="lazy" :src="selectedDecoration.url" />
        </div>
      </template>
    </CpDecorationPreview>

    <div class="cpcd-list">
      <TStatePanel
        v-if="props.loading"
        minHeight="280px"
        message="正在加载评论装扮列表…"
        variant="loading"
      />
      <TStatePanel
        v-else-if="props.error"
        minHeight="280px"
        :message="props.error"
        variant="error"
        @retry="emits('retry')"
      />
      <template v-else>
        <div aria-label="评论装扮使用选项" class="cpcd-grid cpcd-comment-grid" role="group">
          <CpDecorationItem
            ariaText="不使用评论装扮"
            class="cpcd-none"
            :inUse="false"
            :limited="false"
            name="不使用"
            :owned="true"
            :selected="selectedId === ''"
            shape="wide"
            @select="selectedId = ''"
          >
            <span class="cpcd-none-text">默认</span>
          </CpDecorationItem>
        </div>
        <template v-if="props.decorations.length > 0">
          <section v-for="group in groups" :key="group.title" class="cpcd-group">
            <h3 class="cpcd-group-title">
              {{ group.title }}
              <span>{{ group.decorations.length }}</span>
            </h3>
            <div :aria-label="group.title" class="cpcd-grid cpcd-comment-grid" role="group">
              <v-tooltip
                v-for="decoration in group.decorations"
                :key="decoration.id"
                location="top"
                open-delay="120"
              >
                <template #activator="{ props: tooltipProps }">
                  <CpDecorationItem
                    v-bind="tooltipProps"
                    :ariaText="`选择评论装扮 ${decoration.name}${decoration.owned ? '' : '（未拥有）'}`"
                    :background="getCommentBackground(decoration.bg_color)"
                    :inUse="isCommentInUse(decoration, props.serverId)"
                    :limited="isDecorationLimited(decoration)"
                    :name="decoration.name"
                    :owned="decoration.owned"
                    :selected="selectedId === decoration.id"
                    shape="wide"
                    @select="selectedId = decoration.id"
                  >
                    <img
                      v-if="decoration.url"
                      :alt="decoration.name"
                      class="cpcd-comment-img"
                      decoding="async"
                      loading="lazy"
                      :src="decoration.url"
                    />
                    <span v-else>{{ decoration.name }}</span>
                  </CpDecorationItem>
                </template>
                <div class="cpcd-tooltip">
                  <div class="cpcd-tooltip-name">{{ decoration.name }}</div>
                  <div class="cpcd-tooltip-method">{{ getDecorationObtainMethod(decoration) }}</div>
                </div>
              </v-tooltip>
            </div>
          </section>
        </template>
        <p v-else class="cpcd-empty">暂无可选评论装扮</p>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import TStatePanel from "@comp/app/t-state-panel.vue";
import CpDecorationItem from "@comp/comiProf/cp-decoration-item.vue";
import CpDecorationPreview from "@comp/comiProf/cp-decoration-preview.vue";
import {
  getCommentBackground,
  getCommentLimitText,
  getDecorationObtainMethod,
  isCommentInUse,
  isDecorationLimited,
} from "@utils/community/decorationDisplay.js";
import { computed } from "vue";

/**
 * 评论装扮选择面板参数。
 * @since Beta v0.13.1
 */
type CommentDecorationPanelProps = {
  /** 可选评论装扮列表 */
  decorations: Array<TGApp.BBS.CommunitySettings.CommentDecoration>;
  /** 当前评论装扮 ID，null 表示尚未加载，空串表示未使用 */
  currentId: string | null;
  /** 已保存的评论装扮 ID，null 表示尚未加载，空串表示未使用 */
  serverId: string | null;
  /** 是否正在加载 */
  loading: boolean;
  /** 加载错误 */
  error: string;
};

/**
 * 按可用状态组织的评论装扮分组。
 * @since Beta v0.13.1
 */
type CommentDecorationGroup = {
  title: string;
  decorations: Array<TGApp.BBS.CommunitySettings.CommentDecoration>;
};

type CommentDecorationPanelEmits = {
  /** 重新加载评论装扮 */
  retry: [];
};

const props = defineProps<CommentDecorationPanelProps>();
const selectedId = defineModel<string | null>("selectedId", { required: true });
const emits = defineEmits<CommentDecorationPanelEmits>();

const groups = computed<Array<CommentDecorationGroup>>(() => {
  const available = props.decorations.filter((decoration) => decoration.owned);
  const unavailable = props.decorations.filter((decoration) => !decoration.owned);
  const result: Array<CommentDecorationGroup> = [];
  if (available.length > 0) {
    result.push({ title: "已拥有评论装扮", decorations: available });
  }
  if (unavailable.length > 0) {
    result.push({ title: "未拥有评论装扮", decorations: unavailable });
  }
  return result;
});
const selectedDecoration = computed<TGApp.BBS.CommunitySettings.CommentDecoration | null>(() => {
  return props.decorations.find((decoration) => decoration.id === selectedId.value) ?? null;
});
const previewTitle = computed<string>(() => {
  if (selectedDecoration.value) return selectedDecoration.value.name;
  return selectedId.value === null ? "当前评论装扮" : "不使用评论装扮";
});
const hasBubble = computed<boolean>(() => Boolean(selectedDecoration.value?.url));
const warnings = computed<Array<string>>(() => {
  if (props.currentId === null) return ["正在读取当前评论装扮，确认按钮暂不可用。"];
  if (selectedId.value === null) {
    return ["当前评论装扮暂不在可选列表，请选择其他评论装扮或“不使用”。"];
  }
  return [];
});
</script>

<style lang="scss" scoped>
.cpcd-body {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 16px;
}

.cpcd-list {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.cpcd-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cpcd-group-title {
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

.cpcd-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
}

.cpcd-comment-grid {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.cpcd-none {
  &:hover,
  &.is-selected {
    background: transparent;
  }

  :deep(.cpdi-visual) {
    border: 1px dashed var(--common-shadow-2);
    background: var(--box-bg-1);
  }

  &:hover :deep(.cpdi-visual) {
    border-color: var(--common-text-title);
    background: var(--box-bg-3);
  }

  &.is-selected :deep(.cpdi-visual) {
    border-color: var(--common-text-title);
  }
}

.cpcd-none-text {
  font-size: 12px;
}

.cpcd-comment-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.cpcd-bubble {
  position: absolute;
  top: 0;
  right: 0;
  overflow: hidden;
  max-width: 45%;
  border-top: 1px inset var(--common-shadow-1);
  border-right: 1px inset var(--common-shadow-1);
  border-top-right-radius: 4px;
  opacity: 0.5;
  pointer-events: none;

  img {
    display: block;
    max-width: 100%;
    height: 40px;
    object-fit: contain;
  }
}

.cpcd-tooltip {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  gap: 2px;
  line-height: 18px;
  text-align: left;
}

.cpcd-tooltip-name {
  font-weight: 600;
}

.cpcd-tooltip-method {
  opacity: 0.8;
}

.cpcd-empty {
  margin: 0;
  color: var(--box-text-4);
  font-size: 12px;
  text-align: center;
}

@media (width <= 640px) {
  .cpcd-comment-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  .cpcd-bubble {
    max-width: 40%;
    height: 32px;

    img {
      height: 32px;
    }
  }
}
</style>
