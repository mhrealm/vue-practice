import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import Pages from 'vite-plugin-pages'

export default defineConfig({
  plugins: [
    vue(),
    Pages({
      // 这里的配置意味着：src/views 下的所有 .vue 文件都会被自动注册为路由
      dirs: 'src/views',
      extensions: ['vue'],
      importMode: 'async',
    }),
  ],
  css: {
    preprocessorOptions: {
      less: {
        // 全局导入 Less 文件（支持多个）
        additionalData: `
       @import "${path.resolve(__dirname, 'src/styles/variables.less').replace(/\\/g, '/')}";
        `,
        // 允许 Less 内联 JavaScript（可选，根据需求开启）
        javascriptEnabled: true,
      },
    },
  },
  resolve: {
    // 配置路径别名
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
