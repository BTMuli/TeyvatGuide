<!-- 未完成游戏本体安装草稿 -->
<template>
  <section aria-label="未完成安装草稿" class="install-draft">
    <div class="install-draft-heading">
      <div class="install-draft-title">
        <span>未完成安装</span>
        <strong>安装游戏本体</strong>
      </div>
      <v-chip color="warning" size="small" variant="tonal">{{ stateLabel }}</v-chip>
    </div>

    <div class="install-draft-config">
      <div class="install-draft-config-item">
        <span>渠道</span>
        <strong>{{ gameEnum.installation.schemeDesc(draft.scheme) }}</strong>
      </div>
      <div class="install-draft-config-item">
        <span>语音包</span>
        <strong>{{ audioLabel }}</strong>
      </div>
      <div class="install-draft-config-item install-draft-config-wide">
        <span>安装目录</span>
        <strong>{{ draft.installRoot }}</strong>
      </div>
    </div>

    <p class="install-draft-message">该游戏库目录已有未完成的安装草稿，请先恢复或取消原任务。</p>

    <div class="install-draft-actions">
      <v-btn
        :disabled="actionPending"
        :loading="actionPending"
        color="var(--tgc-od-orange)"
        prepend-icon="mdi-play-circle-outline"
        size="small"
        variant="tonal"
        @click="emit('resumeRequested')"
      >
        {{ resumeLabel }}
      </v-btn>
      <v-btn
        :disabled="actionPending"
        :loading="actionPending"
        prepend-icon="mdi-delete-outline"
        size="small"
        variant="text"
        @click="emit('cancelRequested')"
      >
        取消草稿
      </v-btn>
    </div>
  </section>
</template>

<script lang="ts" setup>
import gameEnum from "@enum/game.js";
import { computed } from "vue";

type Props = {
  actionPending: boolean;
  draft: TGApp.Game.Installation.InstallDraftSummary;
};

const { actionPending, draft } = defineProps<Props>();
const emit = defineEmits<{
  cancelRequested: [];
  resumeRequested: [];
}>();

const stateLabel = computed<string>(() => {
  switch (draft.state) {
    case gameEnum.installation.draftState.CREATED:
      return "待评估";
    case gameEnum.installation.draftState.PLANNED:
      return "待开始";
    case gameEnum.installation.draftState.RECOVERY_REQUIRED:
      return "等待恢复";
    default:
      return "需要处理";
  }
});
const resumeLabel = computed<string>(() => {
  return draft.state === gameEnum.installation.draftState.CREATED ? "继续评估" : "恢复安装";
});
const audioLabel = computed<string>(() => {
  const labels: Record<string, string> = {
    "zh-cn": "中文",
    "en-us": "英语",
    "ja-jp": "日语",
    "ko-kr": "韩语",
  };
  return (
    draft.audioLanguages.map((language) => labels[language] ?? language).join("、") || "未记录"
  );
});
</script>

<style lang="scss" scoped>
.install-draft {
  display: grid;
  padding: 12px 16px 16px;
  border: 1px solid var(--tgc-od-orange);
  border-radius: 8px;
  -webkit-backdrop-filter: var(--game-page-cover-backdrop-filter, none);
  backdrop-filter: var(--game-page-cover-backdrop-filter, none);
  background: var(--game-page-cover-panel-bg, var(--box-bg-1));
  gap: 12px;
}

.install-draft-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.install-draft-title {
  min-width: 0;

  span,
  strong {
    display: block;
  }

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  strong {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
    line-height: 22px;
  }
}

.install-draft-config {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.install-draft-config-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 8px 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 6px;
  -webkit-backdrop-filter: var(--game-page-cover-backdrop-filter, none);
  backdrop-filter: var(--game-page-cover-backdrop-filter, none);
  background: var(--game-page-cover-subpanel-bg, var(--box-bg-2));
  gap: 3px;

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  strong {
    color: var(--common-text-title);
    font-size: 13px;
    font-weight: normal;
    line-height: 18px;
    overflow-wrap: anywhere;
  }
}

.install-draft-config-wide {
  grid-column: 1 / -1;
}

.install-draft-message {
  margin: 0;
  color: var(--box-text-2);
  font-size: 13px;
  line-height: 18px;
}

.install-draft-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

@media (width <= 640px) {
  .install-draft-config {
    grid-template-columns: 1fr;
  }

  .install-draft-config-wide {
    grid-column: auto;
  }
}
</style>
