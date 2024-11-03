<template>
  <div class="tpu-box">
    <div class="tpu-main">
      <span>UID {{ props.data.insert.game_user_info.game_uid }}</span>
      <span @click="copyUid()" data-html2canvas-ignore><v-icon>mdi-content-copy</v-icon>复制</span>
    </div>
    <div class="tpu-sub">
      <span>{{ props.data.insert.game_user_info.nickname }}</span>
      <span>|</span>
      <span>{{ props.data.insert.game_user_info.region_name }}</span>
      <span>|</span>
      <span>{{ props.data.insert.game_user_info.level }}级</span>
    </div>
    <div class="tpu-game">原神</div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "../func/snackbar.js";

interface TpUid {
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
}

interface TpUidProps {
  data: TpUid;
}

const props = defineProps<TpUidProps>();
console.log("tpUid", props.data.insert.game_user_info);

function copyUid(): void {
  navigator.clipboard.writeText(props.data.insert.game_user_info.game_uid);
  showSnackbar({ text: "已复制UID" });
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

.tpu-main {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 5px;
  font-family: var(--font-title);
  font-size: 16px;

  :last-child {
    cursor: pointer;
    font-size: 12px;
  }
}

.tpu-sub {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 2px;
  font-size: 14px;
}

.tpu-game {
  position: absolute;
  top: 5px;
  right: 5px;
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
