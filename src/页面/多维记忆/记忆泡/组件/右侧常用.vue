<script setup lang="ts">
/** 右侧：经常复制的气泡 ×10（先占位，复制功能未实现） */
const 占位数 = 10
</script>

<template>
  <div class="记忆泡-常用区">
    <div class="记忆泡-常用头">常用复制</div>
    <div class="记忆泡-常用列表">
      <div v-for="i in 占位数" :key="i" class="记忆泡-常用占位">
        <i class="fas fa-bookmark 记忆泡-常用占位图标"></i>
        <span>暂无</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.记忆泡-常用区 {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px;
}

.记忆泡-常用头 {
  font-size: 13px;
  font-weight: 600;
  color: var(--记忆泡-文字);
  padding: 6px 8px 10px;
}

.记忆泡-常用列表 {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
}

.记忆泡-常用占位 {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px dashed var(--记忆泡-气泡边框);
  border-radius: 8px;
  color: var(--记忆泡-弱文字);
  font-size: 12px;
}

.记忆泡-常用占位图标 {
  font-size: 12px;
  opacity: 0.6;
}
</style>
