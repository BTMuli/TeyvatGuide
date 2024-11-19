<template>
  <div class="tp-avatar-box">
    <div v-if="props.position === 'right'" class="tpa-text">
      <div>{{ props.data.nickname }}</div>
      <div :title="getAuthorDesc()">{{ getAuthorDesc() }}</div>
    </div>
    <div class="tpa-img">
      <img :src="props.data.avatar_url" alt="avatar" class="tpa-icon" />
      <img
        :src="props.data.pendant"
        alt="pendant"
        class="tpa-pendant"
        v-if="props.data.pendant !== ''"
      />
      <div :class="`tpa-level-${props.position}`">{{ props.data.level_exp.level }}</div>
    </div>
    <div v-if="props.position === 'left'" class="tpa-text">
      <div>{{ props.data.nickname }}</div>
      <div :title="getAuthorDesc()">{{ getAuthorDesc() }}</div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

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

const flexAlign = props.position === "left" ? "flex-start" : "flex-end";
const textAlign = props.position;
const levelColor = computed<string>(() => {
  const level = props.data.level_exp.level;
  if (level < 5) return "var(--tgc-od-green)";
  if (level < 9) return "var(--tgc-od-blue)";
  if (level < 13) return "var(--tgc-od-purple)";
  if (level > 12) return "var(--tgc-od-orange)";
  return "var(--tgc-od-white)";
});
</script>
<style lang="css" scoped>
.tp-avatar-box {
  display: flex;
  overflow: hidden;
  width: fit-content;
  max-width: 100%;
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
}

.tpa-icon {
  position: absolute;
  top: 5px;
  left: 5px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--common-shadow-1);
}

.tpa-pendant {
  position: absolute;
  top: 0;
  left: 0;
  width: 50px;
  height: 50px;
}

.tpa-level-left,
.tpa-level-right {
  position: absolute;
  bottom: 0;
  display: flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: v-bind(levelColor);
  color: var(--tgc-white-1);
  font-size: 10px;
}

.tpa-level-right {
  right: 0;
}

.tpa-level-left {
  left: 0;
}
</style>
