<template>
  <div class="card-box">
    <!-- 左侧图标 -->
    <div class="card-left">
      <!-- 底层背景图 -->
      <div class="card-bg">
        <img :src="item.bg" alt="bg">
      </div>
      <!-- 中层内容图 -->
      <div class="card-icon">
        <img :src="item.icon" alt="icon">
      </div>
      <!-- 上层星级 -->
      <div class="card-star">
        <img :src="`/icon/star/${item.star}.webp`" alt="element">
      </div>
    </div>
    <!-- 右侧内容 -->
    <div class="card-name">
      {{ item.name }}
    </div>
  </div>
</template>
<script lang="ts" setup>
interface TMiniWeaponProps {
  item: TGApp.App.Calendar.Material;
}
defineProps<TMiniWeaponProps>();
</script>
<style lang="css" scoped>
.card-box {
    position: relative;
    width: 150px;
    height: 45px;
    cursor: pointer;
		display: flex;
		flex-direction: row;
		border-radius: 5px;
    background: rgb(20 20 20 / 30%);
}

.card-left {
		position: relative;
		width: 45px;
		height: 45px;
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
		overflow: hidden;
}

.card-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 45px;
    height: 45px;
    border-top-left-radius: 5px;
		border-bottom-left-radius: 5px;
    overflow: hidden;
}

.card-bg img {
    width: 45px;
    height: 45px;
    object-fit: cover;
}

.card-icon {
    position: relative;
    width: 45px;
    height: 45px;
    border-radius: 5px;
}

.card-icon img {
		padding: 2px;
    width: 41px;
    height: 41px;
}

.card-star {
    position: absolute;
    bottom: 0;
    width: 45px;
    display: flex;
    justify-content: center;
    align-items: center;
		background: rgb(0 0 0 / 30%);
		border-bottom-left-radius: 5px;
}

.card-star img {
    width: 45px;
		height: auto;
}

.card-name {
		width: calc(100% - 50px);
		height: 45px;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-left: 5px;
		position: relative;
    color: #fff;
		font-size: 12px;
    font-family: Genshin-Light, serif;
}
</style>
