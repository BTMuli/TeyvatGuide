<template>
  <div class="tp-avatar-box">
    <div v-if="props.position === 'right'" class="tpa-text">
      <div>{{ props.data.nickname }}</div>
      <div :title="getAuthorDesc()">{{ getAuthorDesc() }}</div>
    </div>
    <div class="tpa-img" @click="toAuthor()" title="点击前往用户主页">
      <img :src="props.data.avatar_url" alt="avatar" class="tpa-icon" />
      <img
        :src="props.data.pendant"
        alt="pendant"
        class="tpa-pendant"
        v-if="props.data.pendant !== ''"
      />
    </div>
    <div v-if="props.position === 'left'" class="tpa-text">
      <div>{{ props.data.nickname }}</div>
      <div :title="getAuthorDesc()">{{ getAuthorDesc() }}</div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TGClient from "../../utils/TGClient";

interface TpAvatarProps {
  data: TGApp.Plugins.Mys.User.Post;
  position: "left" | "right";
}

const props = defineProps<TpAvatarProps>();

function getAuthorDesc(): string {
  if (props.data.certification.label !== "") {
    return props.data.certification.label;
  }
  return props.data.introduce;
}

async function toAuthor(): Promise<void> {
  const url = `https://m.miyoushe.com/ys/#/accountCenter/0?id=${props.data.uid}`;
  await TGClient.open("web_thin", url);
}

const flexAlign = props.position === "left" ? "flex-start" : "flex-end";
const textAlign = props.position;
</script>
<style lang="css" scoped>
.tp-avatar-box {
  display: flex;
}

.tpa-text {
  position: relative;
  display: flex;
  max-width: calc(100% - 50px);
  height: 50px;
  flex-direction: column;
  align-items: v-bind(flexAlign);
  color: var(--box-text-4);
}

.tpa-text :first-child {
  font-family: var(--font-title);
  font-size: 16px;
}

.tpa-text :last-child {
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  height: 26px;
  border-top: 2px solid var(--common-shadow-2);
  font-size: 14px;
  opacity: 0.7;
  text-align: v-bind(textAlign);
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.tpa-img {
  position: relative;
  width: 50px;
  height: 50px;
  cursor: pointer;
}

.tpa-icon {
  position: absolute;
  top: 5px;
  left: 5px;
  overflow: hidden;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.tpa-pendant {
  position: absolute;
  top: 0;
  left: 0;
  width: 50px;
  height: 50px;
}
</style>
