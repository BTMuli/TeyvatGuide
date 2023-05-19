<template>
  <div class="card-box">
    <!-- 底层背景图 -->
    <div class="card-bg">
      <img :src="item.bg" alt="bg">
    </div>
    <!-- 中层武器图 -->
    <div class="card-icon">
      <img :src="item.icon" alt="icon">
    </div>
    <!-- 上层图标&内容 -->
    <div class="card-cover">
      <div class="card-weapon">
        <img :src="item.weapon_type" alt="type">
      </div>
      <div class="card-name">
        <span>{{ item.name }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";
interface TMiniWeaponProps {
  size: string;
  modelValue: BTMuli.Genshin.Wiki.Weapon.BriefInfo | BTMuli.Genshin.Calendar.Data
}

const props = defineProps<TMiniWeaponProps>();
const getSize = computed(() => {
  return props.size === "100px" ? "30px" : "40px";
});

const item = computed(() => {
  let res;
  if (!props.modelValue.hasOwnProperty("weapon_type")) {
    res = props.modelValue as BTMuli.Genshin.Wiki.Weapon.BriefInfo;
    return {
      bg: res.bg,
      icon: res.icon,
      element: res.element,
      weapon_type: res.type,
      name: res.name,
    };
  } else {
    res = props.modelValue as BTMuli.Genshin.Calendar.Data;
    return {
      bg: res.bg,
      icon: res.icon,
      element: res.element,
      weapon_type: res.weapon_type,
      name: res.name,
    };
  }
});
</script>
<style lang="css" scoped>
.card-box {
    position: relative;
    width: v-bind(size);
    height: v-bind(size);
    cursor: pointer;
}

.card-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 5px;
    overflow: hidden;
}

.card-bg img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.card-icon {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 5px;
}

.card-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.card-cover {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 5px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
}

.card-weapon {
    position: absolute;
    top: 0;
    left: 0;
    width: v-bind(getSize);
    height: v-bind(getSize);
    display: flex;
    justify-content: center;
    align-items: center;
}

.card-weapon img {
    width: calc(v-bind(getSize) - 10px);
    height: calc(v-bind(getSize) - 10px);
    object-fit: cover;
}

.card-name {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgb(20 20 20 / 50%);
    border-bottom-left-radius: 5px;
    border-bottom-right-radius: 5px;
    color: #fff;
    font-size: calc(v-bind(getSize) / 3);
    text-shadow: 0 0 5px #000;
    font-family: Genshin, serif;
}
</style>
