<template>
  <section class="scheme-panel" aria-label="游戏渠道转换">
    <div class="scheme-heading">
      <div>
        <span>渠道转换</span>
        <p>仅在国服官服与国服 B 服之间转换 SDK 与渠道配置；评估不会修改游戏目录。</p>
      </div>
    </div>

    <div class="scheme-route">
      <div class="scheme-node current">
        <span>当前</span>
        <strong>{{ gameEnum.installation.schemeDesc(installation.schemeId) }}</strong>
      </div>
      <v-icon aria-hidden="true" size="18">mdi-chevron-right</v-icon>
      <div class="scheme-node">
        <span>目标</span>
        <strong>{{ gameEnum.installation.schemeDesc(targetScheme) }}</strong>
      </div>
    </div>

    <div class="scheme-actions">
      <v-btn
        :disabled="planning"
        :loading="planning"
        prepend-icon="mdi-swap-horizontal"
        size="small"
        variant="outlined"
        @click="createPlan"
      >
        评估换服
      </v-btn>
    </div>

    <v-alert
      v-if="errorMessage !== null"
      :text="errorMessage"
      density="compact"
      type="warning"
      variant="tonal"
    />

    <div v-if="plan !== null" class="plan-summary" aria-live="polite">
      <div class="plan-title">
        <div>
          <span>换服计划已固化</span>
          <strong>
            {{ gameEnum.installation.schemeDesc(plan.sourceScheme) }} →
            {{ gameEnum.installation.schemeDesc(plan.targetScheme) }}
          </strong>
        </div>
        <v-chip
          :color="plan.hasSufficientSpace ? 'var(--tgc-od-green)' : 'var(--tgc-od-orange)'"
          size="small"
          variant="tonal"
        >
          {{ plan.hasSufficientSpace ? "空间充足" : "空间不足" }}
        </v-chip>
      </div>
      <dl>
        <div>
          <dt>目标渠道</dt>
          <dd>{{ plan.targetChannel }} / {{ plan.targetSubChannel }}</dd>
        </div>
        <div>
          <dt>渠道 SDK</dt>
          <dd>{{ sdkActionLabel }}</dd>
        </div>
        <div>
          <dt>预计下载</dt>
          <dd>{{ formatBytes(plan.downloadBytes) }}</dd>
        </div>
        <div>
          <dt>缓存可复用</dt>
          <dd>{{ formatBytes(plan.cacheHitBytes) }}</dd>
        </div>
        <div>
          <dt>备份移出</dt>
          <dd>{{ plan.deleteCount }} 个</dd>
        </div>
      </dl>
      <p v-if="plan.deleteFiles.length > 0">仅移出当前清单之外的渠道文件：{{ previewDeletes }}</p>
      <p>{{ sdkRetainHint }}</p>
      <p>应用换服尚未开放；当前只能评估并保存计划。</p>
    </div>
  </section>
</template>

<script lang="ts" setup>
import gameEnum from "@enum/game.js";
import { createGamePackageSwitchPlan } from "@utils/TGGameLauncher.js";
import { computed, ref, watch } from "vue";

type Props = {
  installation: TGApp.Game.Installation.Item;
};

const { installation } = defineProps<Props>();
const planning = ref<boolean>(false);
const plan = ref<TGApp.Game.Package.SwitchSummary | null>(null);
const errorMessage = ref<string | null>(null);

const targetScheme = computed<TGApp.Game.Installation.SchemeEnum>(() => {
  return installation.schemeId === gameEnum.installation.scheme.CN_OFFICIAL
    ? gameEnum.installation.scheme.CN_BILIBILI
    : gameEnum.installation.scheme.CN_OFFICIAL;
});
const previewDeletes = computed<string>(() => {
  if (plan.value === null) return "";
  const names = plan.value.deleteFiles.slice(0, 3);
  const extra = plan.value.deleteFiles.length - names.length;
  const listed = names.join("、");
  if (extra > 0) return `${listed} 等 ${plan.value.deleteFiles.length} 个`;
  return listed;
});
const sdkActionLabel = computed<string>(() => {
  if (plan.value === null) return "";
  if (plan.value.sdkRequired) {
    if (plan.value.cacheHitBytes > 0) {
      return `缓存已有 ${plan.value.sdkVersion ?? "渠道 SDK"}`;
    }
    return `需要下载 ${plan.value.sdkVersion ?? "渠道 SDK"}`;
  }
  return "备份并移出渠道 SDK";
});
const sdkRetainHint = computed<string>(() => {
  if (plan.value === null) return "";
  if (plan.value.sdkRequired) {
    return plan.value.cacheHitBytes > 0
      ? "将从应用缓存安装渠道 SDK，不必重新下载。"
      : "SDK 会先写入应用缓存再安装；之后转回可复用。";
  }
  return plan.value.cacheHitBytes > 0
    ? "游戏目录中的渠道 SDK 会备份移出；转回时优先使用已缓存的安装包。"
    : "游戏目录中的渠道 SDK 会备份到应用缓存，不会直接丢掉；转回时不必重新下载。";
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (const candidate of units.slice(1)) {
    if (value < 1024) break;
    value /= 1024;
    unit = candidate;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

async function createPlan(): Promise<void> {
  if (planning.value) return;
  planning.value = true;
  errorMessage.value = null;
  try {
    plan.value = await createGamePackageSwitchPlan(installation.id);
  } catch (error) {
    errorMessage.value = `评估换服失败：${error}`;
  } finally {
    planning.value = false;
  }
}

watch(
  () => installation.id,
  () => {
    plan.value = null;
    errorMessage.value = null;
  },
);
</script>

<style lang="scss" scoped>
.scheme-panel {
  display: grid;
  padding-top: 16px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 16px;
}

.scheme-heading {
  span {
    color: var(--common-text-title);
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
  }

  p {
    margin: 2px 0 0;
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }
}

.scheme-route {
  display: grid;
  align-items: center;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);

  > .v-icon {
    color: var(--box-text-2);
  }
}

.scheme-node {
  display: grid;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-4);
  gap: 4px;

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  strong {
    color: var(--box-text-1);
    font-size: 14px;
    line-height: 20px;
  }

  &.current {
    border-color: var(--tgc-yellow-3);
  }
}

.scheme-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.plan-summary {
  display: grid;
  padding: 16px;
  border-radius: 8px;
  background: var(--box-bg-4);
  gap: 12px;

  p {
    margin: 0;
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  dl {
    display: grid;
    margin: 0;
    gap: 8px 16px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  dl div {
    display: grid;
    gap: 2px;
  }

  dt {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  dd {
    margin: 0;
    color: var(--box-text-1);
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
  }
}

.plan-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  > div {
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
      font-size: 16px;
      line-height: 22px;
    }
  }

  :deep(.v-chip) {
    flex-shrink: 0;
    align-self: center;
  }

  :deep(.v-chip__content) {
    display: flex;
    align-items: center;
    line-height: 16px;
  }
}

@media (width <= 720px) {
  .scheme-route {
    grid-template-columns: 1fr;

    > .v-icon {
      justify-self: center;
      transform: rotate(90deg);
    }
  }

  .plan-summary dl {
    grid-template-columns: 1fr;
  }
}
</style>
