<template>
  <div class="tpu-box">
    <div class="tpu-top">
      <span @click="copyUid()" data-html2canvas-ignore>
        <v-icon>mdi-content-copy</v-icon>
        <span>复制</span>
      </span>
      <span class="tpu-game">{{ getGameName() }}</span>
    </div>
    <div class="tpu-main">UID {{ props.data.insert.game_user_info.game_uid }}</div>
    <div class="tpu-sub">
      <span>{{ props.data.insert.game_user_info.nickname }}</span>
      <span>|</span>
      <span>{{ props.data.insert.game_user_info.region_name }}</span>
      <span>|</span>
      <span>{{ props.data.insert.game_user_info.level }}级</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";

type TpUid = {
  insert: {
    backup_text: string;
    game_user_info: {
      game_uid: string;
      game_biz: string;
      nickname: string;
      region_name: string;
      level: string;
    };
  };
};
type TpUidProps = { data: TpUid };

const props = defineProps<TpUidProps>();
console.log("tpUid", props.data.insert.game_user_info);

function copyUid(): void {
  navigator.clipboard.writeText(props.data.insert.game_user_info.game_uid);
  showSnackbar.success("已复制UID");
}

function getGameName(): string {
  const gameBiz = props.data.insert.game_user_info.game_biz;
  if (gameBiz.startsWith("hkrpg")) return "崩坏·星穹铁道";
  if (gameBiz.startsWith("hk4e")) return "原神";
  if (gameBiz.startsWith("nap")) return "绝区零";
  if (gameBiz.startsWith("bh2")) return "崩坏学园2";
  if (gameBiz.startsWith("bh3")) return "崩坏3";
  if (gameBiz.startsWith("nxx")) return "未定事件簿";
  return "未知游戏";
}
</script>
<style lang="css" scoped>
.tpu-box {
  position: relative;
  display: flex;
  max-width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 5px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 3px;
  background-color: #f4efe9;
  background-image: url("/source/post/tp_uid_bg.webp");
  background-position: right bottom;
  background-repeat: no-repeat;
  background-size: contain;
  color: #a17a58;
}

.tpu-top {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-left: auto;
  column-gap: 5px;

  :first-child {
    cursor: pointer;
    font-size: 12px;
  }
}

.tpu-main {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 5px;
  font-family: var(--font-title);
  font-size: 16px;
}

.tpu-sub {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 2px;
  font-size: 14px;
}

.tpu-game {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border: 1px solid rgb(161 122 88 / 30%);
  border-radius: 3px;
  font-size: 12px;
  opacity: 0.7;
}
</style>
