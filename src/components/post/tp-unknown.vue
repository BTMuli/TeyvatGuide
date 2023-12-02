<template>
  <div class="mys-post-unknown">
    <code class="mys-post-unknown-code">{{ JSON.stringify(props.data, null, 2) }}</code>
  </div>
</template>
<script lang="ts" setup>
interface TpUnknownProps {
  data: TGApp.Plugins.Mys.SctPost.Empty;
}

const props = defineProps<TpUnknownProps>();
</script>
