<template>
  <div class="not-found">
    <h1>404 - 页面未找到</h1>
    <p>你访问的路径 {{ $route.fullPath }} 不存在。</p>
    <router-link to="/">返回首页</router-link>
  </div>
</template>
<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--全站通用文字颜色);
}
</style>
