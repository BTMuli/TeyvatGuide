<!-- 帖子评论与定向回复输入框 -->
<template>
  <form class="vpr-composer" @submit.prevent="publishReply">
    <div v-if="target" class="vpr-target">
      <span>回复 {{ target.user.nickname }}</span>
      <v-btn
        :disabled="busy"
        aria-label="取消定向回复"
        icon="mdi-close"
        size="24"
        variant="text"
        @click="emits('cancel')"
      />
    </div>
    <v-textarea
      v-model="content"
      :disabled="busy || !canWrite"
      :label="target ? '回复内容' : '发表评论'"
      auto-grow
      hide-details
      max-rows="6"
      rows="2"
      variant="outlined"
    />
    <div class="vpr-footer">
      <span class="vpr-account">{{ accountHint }}</span>
      <v-btn
        :disabled="!canWrite || content.trim() === '' || busy"
        :loading="publishing"
        color="var(--tgc-btn-1)"
        size="small"
        type="submit"
        variant="flat"
      >
        {{ target ? "发布回复" : "发布评论" }}
      </v-btn>
    </div>
  </form>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import { useReplyInteraction } from "@hooks/useReplyInteraction.js";
import postReq from "@req/postReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { executeReplyForCurrentAccount } from "@utils/bbsReplyAccount.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, watch } from "vue";

/**
 * 评论输入框参数。
 * @since Beta v0.12.6
 */
type ReplyComposerProps = {
  postId: string;
  gid: number;
  target?: TGApp.BBS.Reply.ReplyFull;
};

const props = defineProps<ReplyComposerProps>();
const emits = defineEmits<{ cancel: []; published: [] }>();
const interaction = useReplyInteraction();
const busy = interaction.busy;
const { uid, cookie, briefInfo } = storeToRefs(useUserStore());
const { incognito } = storeToRefs(useAppStore());
const content = ref<string>("");
const publishing = ref<boolean>(false);
let contextVersion = 0;
let mounted = true;

const canWrite = computed<boolean>(
  () =>
    !incognito.value &&
    !!uid.value &&
    cookie.value?.ltuid === uid.value &&
    !!cookie.value?.ltoken.trim(),
);
const accountHint = computed<string>(() => {
  if (incognito.value) return "无痕模式下仅可浏览";
  if (!canWrite.value) return "请先登录米游社账号";
  return `发布账号：${briefInfo.value.nickname || "当前账号"}`;
});

watch(
  () => [
    props.postId,
    props.gid,
    uid.value,
    cookie.value?.ltoken,
    cookie.value?.ltuid,
    incognito.value,
  ],
  () => {
    contextVersion += 1;
    content.value = "";
  },
  { flush: "sync" },
);

watch(
  () => props.target?.reply.reply_id,
  () => {
    contextVersion += 1;
  },
  { flush: "sync" },
);

onBeforeUnmount(() => {
  mounted = false;
  contextVersion += 1;
});

async function publishReply(): Promise<void> {
  if (busy.value) return;
  if (!canWrite.value || !cookie.value) {
    showSnackbar.warn(accountHint.value);
    return;
  }
  const text = content.value.trim();
  if (text === "") {
    showSnackbar.warn("请输入评论内容");
    return;
  }
  if (!Number.isSafeInteger(props.gid) || props.gid <= 0) {
    showSnackbar.warn("请选择游戏");
    return;
  }
  const version = contextVersion;
  const request: TGApp.BBS.Reply.CreateParams = {
    postId: props.postId,
    gid: props.gid,
    content: text,
    replyId: props.target?.reply.reply_id,
  };
  const requestCookie = { ltoken: cookie.value.ltoken, ltuid: cookie.value.ltuid };
  const title = props.target ? "发布回复" : "发布评论";
  const targetLabel = props.target ? `回复 ${props.target.user.nickname}` : "评论当前帖子";
  await interaction.run(async () => {
    publishing.value = true;
    try {
      const confirmed = await showDialog.checkF({
        title,
        text: `以 ${briefInfo.value.nickname || "当前账号"} ${targetLabel}：\n${text}`,
        confirmLabel: title,
        cancelLabel: "继续编辑",
      });
      if (!confirmed) return;
      if (!mounted || version !== contextVersion || !canWrite.value) {
        showSnackbar.warn("账号或回复目标已变化，请重新确认");
        return;
      }
      const execution = await executeReplyForCurrentAccount(
        { uid: requestCookie.ltuid, cookie: requestCookie },
        () => postReq.reply.create(request, requestCookie),
      );
      if (!mounted || version !== contextVersion) return;
      if (execution.allowed === false) {
        showSnackbar.warn("账号状态已变化，请重新打开帖子窗口后再操作");
        return;
      }
      const response = execution.data;
      if (response.retcode !== 0) {
        showSnackbar.error(`[${response.retcode}] ${response.message}`);
        return;
      }
      content.value = "";
      showSnackbar.success(`${title}成功`);
      emits("published");
    } catch {
      if (mounted && version === contextVersion) {
        showSnackbar.error("评论未确认成功，请先刷新回复列表核对后再重试");
      }
    } finally {
      publishing.value = false;
    }
  });
}
</script>
<style lang="scss" scoped>
.vpr-composer {
  display: flex;
  width: 100%;
  flex-direction: column;
  flex-shrink: 0;
  gap: 8px;
}

.vpr-target,
.vpr-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.vpr-target {
  color: var(--common-text-title);
  font-size: 14px;
}

.vpr-account {
  color: var(--app-page-content);
  font-size: 12px;
  overflow-wrap: anywhere;
}
</style>
