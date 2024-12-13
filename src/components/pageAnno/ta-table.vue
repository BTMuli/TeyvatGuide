<template>
  <div v-html="props.data.insert.table" />
</template>
<script lang="ts" setup>
type TaTableType = { insert: { table: string } };
type TaTableProps = { data: TaTableType };

const props = defineProps<TaTableProps>();
</script>
