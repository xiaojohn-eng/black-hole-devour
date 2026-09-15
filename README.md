# 黑洞吞噬（Black Hole Devour）

一款基于 **Vite + TypeScript + Three.js** 的纯前端网页游戏。控制黑洞在宇宙中移动、吸引并吞噬天体，不断成长，挑战三关递增难度，成为超级黑洞！

## 在线游玩

GitHub Pages：https://xiaojohn-eng.github.io/black-hole-devour/

（若页面 404，请到仓库 Settings → Pages，将 Source 设为 `gh-pages` 分支根目录。）

## 本地运行

```bash
npm install
npm run dev      # 开发服务器，默认 http://localhost:5173
npm run build    # 产出 dist/
npm run preview  # 预览构建，默认 http://localhost:4173
```

静态预览也可：

```bash
npx --yes serve dist -l 4173
```

## 操作说明

| 按键 | 功能 |
|------|------|
| `W` `A` `S` `D` / 方向键 | 移动黑洞 |
| 鼠标拖拽（或开启指针锁定后移动鼠标） | 辅助转向 |
| `P` / `Esc` | 暂停；Esc 同时可退出指针锁定 |
| 点击「暂停」按钮 | 暂停游戏 |

设置中可调节主音量、音效音量、鼠标灵敏度，以及是否启用指针锁定。

## 玩法

1. **吸引与吞噬**：靠近质量更小的天体会被引力拉拽，进入事件视界即吞噬，质量与分数增加。
2. **成长分档**：质量越大，能吞下的物体越大；吸积盘与事件视界会随之扩张。
3. **三关挑战**：
   - 第 1 关「星际尘埃带」— 小行星与恒星为主
   - 第 2 关「恒星摇篮」— 出现行星与敌对黑洞
   - 第 3 关「星系核心」— 高强度对抗，更大目标质量
4. **胜负**：达到本关目标质量通关；被更大的敌对黑洞吞掉则失败。
5. **最高分**：保存在浏览器 `localStorage`。

## 已实现功能

- 标题界面（开始 / 操作说明 / 设置 / 最高分）
- WASD + 鼠标转向、可选指针锁定
- 黑洞事件视界 + 旋转吸积盘 Shader + 发光光晕
- 程序化小行星 / 恒星 / 行星材质与星空星云背景
- 引力吸引、吸入粒子、屏幕震动、FOV punch
- WebAudio 程序生成音效与环境音
- HUD（质量 / 分数 / 关卡 / 进度 / 暂停）
- 胜利 / 失败结算、重开、回标题
- 对象池式粒子系统，目标 60fps（桌面浏览器优先）

## 技术栈

- Vite 8 + TypeScript
- Three.js r186
- 纯前端，无后端

## 部署

本仓库通过 GitHub Actions 将 `dist` 发布到 `gh-pages` 分支。

手动开启 Pages（若 Actions 已推送但站点未开）：

1. 打开 https://github.com/xiaojohn-eng/black-hole-devour/settings/pages
2. Build and deployment → Source 选择 **Deploy from a branch**
3. Branch 选择 `gh-pages` / `/ (root)` → Save

## 许可证

仅供学习与演示。音效均为程序生成，无第三方素材版权问题。
