<template>
  <div class="tp-avatar-box">
    <div v-if="props.position === 'right'" class="tpa-text">
      <div>{{ props.data.nickname }}</div>
      <div :title="authorDesc">{{ authorDesc }}</div>
    </div>
    <div class="tpa-img">
      <div class="tpa-icon">
        <TMiImg :ori="true" :src="props.data.avatar_url" alt="avatar" />
      </div>
      <div v-if="props.data.pendant !== ''" class="tpa-pendant">
        <TMiImg :ori="true" :src="props.data.pendant" alt="pendant" />
      </div>
      <div
        v-if="props.data.level_exp"
        :class="{
          'tpa-level-left': props.position === 'left',
          'tpa-level-right': props.position === 'right',
        }"
      >
        {{ props.data.level_exp.level }}
      </div>
    </div>
    <div v-if="props.position === 'left'" class="tpa-text">
      <div>{{ props.data.nickname }}</div>
      <div :title="authorDesc">{{ authorDesc }}</div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import { computed } from "vue";

type TpAvatarProps = { data: TGApp.BBS.Post.User; position: "left" | "right" };

const props = defineProps<TpAvatarProps>();

const authorDesc = computed<string>(() => {
  if (props.data.certification.label !== "") return props.data.certification.label;
  return props.data.introduce;
});

const levelColor = computed<string>(() => {
  if (!props.data.level_exp) return "var(--tgc-od-white)";
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
  align-items: v-bind("props.position === 'left' ? 'flex-start' : 'flex-end'");
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
  text-align: v-bind("props.position");
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.tpa-img {
  position: relative;
  display: flex;
  width: 50px;
  height: 50px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 5px;
}

.tpa-icon {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--common-shadow-1);

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: contain;
  }
}

.tpa-pendant {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 50px;
  height: 50px;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: contain;
  }
}

.tpa-level-left,
.tpa-level-right {
  position: absolute;
  bottom: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: v-bind(levelColor);
  color: var(--tgc-white-1);
  font-size: 10px;
  line-height: 18px;
  text-align: center;
}

.tpa-level-right {
  right: 0;
}

.tpa-level-left {
  left: 0;
}
</style>
