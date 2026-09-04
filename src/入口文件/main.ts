import '@fortawesome/fontawesome-free/css/all.min.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import 总路由 from '@/路由/总路由'

const app = createApp(App)
app.use(createPinia())
app.use(总路由)
;(window as any).__router__ = 总路由
app.mount('#app')

// FontAwesome 字体预加载：创建隐藏图标强制触发 @font-face 下载
// 独立窗口首次打开时，字体文件需要完整下载才显示图标
// 此触发器立即请求字体文件，减少后续页面图标空白时间
const 字体触发器 = document.createElement('i')
字体触发器.className = 'fas fa-home'
字体触发器.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;font-size:1px'
document.body.appendChild(字体触发器)

document.fonts.ready.then(() => 字体触发器.remove()).catch(() => setTimeout(() => 字体触发器.remove(), 3000))
