<template>
  <div class="tua-box" @click="showData">
    <div class="tua-top">
      <div class="top-item">
        <div class="top-icon">
          <div class="ti-bg">
            <img :src="`/icon/bg/${props.modelValue.rarity===105?5:props.modelValue.rarity}-Star.webp`" alt="rarity">
          </div>
          <div class="ti-content">
            <img :src="props.modelValue.icon" alt="avatar">
          </div>
          <div class="ti-level">
            {{ props.modelValue.actived_constellation_num }}
          </div>
        </div>
        <div class="top-text">
          Lv.{{ props.modelValue.level }}
        </div>
      </div>
      <div class="top-item">
        <div class="top-icon">
          <div class="ti-bg">
            <img :src="`/icon/bg/${props.modelValue.weapon.rarity}-Star.webp`" alt="rarity">
          </div>
          <div class="ti-content">
            <img :src="props.modelValue.weapon.icon" alt="avatar">
          </div>
          <div class="ti-level">
            {{ props.modelValue.weapon.affix_level }}
          </div>
        </div>
        <div class="top-text">
          Lv.{{ props.modelValue.level }}
        </div>
      </div>
    </div>
    <!--    <div class="tua-bottom">-->
    <!--      <div class="bottom-item">A</div>-->
    <!--      <div class="bottom-item">E</div>-->
    <!--      <div class="bottom-item">Q</div>-->
    <!--    </div>-->
  </div>
</template>
<script lang="ts" setup>
interface TUAProps {
  modelValue: TGApp.Game.Character.ListItem
}

const props = defineProps<TUAProps>();

function showData () {
  console.log(JSON.stringify(props.modelValue, null, 2));
}

function getNameCard () {

}
</script>
<style lang="css">
.tua-box {
  padding: 5px;
  width: 190px;
  height: 100%;
  background: rgb(255 255 255 / 10%);
  box-shadow: 0 0 10px rgb(0 0 0 / 40%);
  border-radius: 5px;
  cursor: pointer;
}

.tua-top {
  width: 180px;
  height: 110px;
  border-radius: 5px;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.top-item {
  width: 80px;
  height: 100%;
  background: rgb(0 0 0 / 20%);
  border-radius: 5px;
}

.top-icon {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 5px;
}

.ti-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 80px;
  height: 80px;
  border-radius: 5px;
}

.ti-bg img {
  width: 100%;
  height: 100%;
  border-radius: 5px;
}

.ti-content {
  position: absolute;
  top: 0;
  left: 0;
  width: 80px;
  height: 80px;
  border-radius: 5px;
}

.ti-content img {
  width: 100%;
  height: 100%;
  border-radius: 5px;
}

.ti-level {
  position: absolute;
  right: 0;
  top: 0;
  padding: 5px;
  width: 20px;
  height: 20px;
  background: rgb(0 0 0 / 50%);
  color: #faf7e8;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top-right-radius: 5px;
  border-bottom-left-radius: 5px;
  font-family: Genshin,sans-serif;
}

.top-text {
  width: 80px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #faf7e8;
  font-family: Genshin-Light,sans-serif;
}

.top-love img {
  width: 100%;
  height: 100%;
}

.tua-bottom {
  width: 100%;
  height: 40%;
  padding: 5px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bottom-item {
  width: 32%;
  height: 100%;
  background: rgb(0 0 0 / 20%);
  border-radius: 5px;
}
</style>
