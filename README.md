# 合成小伙伴：使用与发布指南

这是一个可以在手机和电脑浏览器中游玩的合成游戏，最高可合成到第 13 级。每局第一个球只从第 1～3 级随机生成。相同等级的小伙伴碰撞后会变成更大的小伙伴；超过虚线一段时间则游戏结束。虚线距离画布顶部为第 3 级球的直径。结束时，本局最高合成等级达到 12 级或以上显示 `assets/win.jpg`，否则显示 `assets/over.jpg`。图片加载后显示 2 秒，也可以提前手动关闭；得分和“再玩一次”继续保留。最高分仅保存在当前设备的浏览器中。每个人打开链接后独立游玩，没有实时联机或共享排行榜。

当前角色是内置示例，背景图和音乐未设置。可以先测试玩法，再把素材交给 Codex 替换，或者按照下面的方法自行替换。

## 一、在电脑上试玩

在本文件所在的文件夹中，双击 `index.html`，用浏览器打开即可。点击或拖动游戏画布来选择位置并松开放下；也可以先点击游戏画布，再按键盘的左右方向键移动，空格键或回车键放下。点击“暂停”可以暂停游戏，并在设置了音乐时切换音乐开关。

## 二、替换角色图片、背景和音乐

1. 把素材放入本文件夹的 `assets` 文件夹。建议使用容易识别的英文文件名，例如 `character-01.png`、`background.jpg` 和 `music.mp3`。
2. 用记事本或其他文本编辑器打开 `config.js`。在英文双引号之间填写文件路径，例如：

   ```js
   backgroundImage: "assets/background.jpg",
   music: "assets/music.mp3",
   ```

3. `characters` 从小到大依次对应 13 个合成等级。修改每一行的 `name` 和 `image`，例如：

   ```js
   { name: "小伙伴一号", image: "assets/character-01.png" },
   { name: "小伙伴二号", image: "assets/character-02.png" },
   ```

   保留原来的英文标点、引号和逗号。没有设置图片的等级继续显示内置示例；也可以多个等级暂时使用同一张图。建议使用主体居中的 JPG、PNG 或 WebP；图片会保持原比例，居中放大至铺满圆球，超出圆形边缘的部分不显示，不添加彩色边框。请提前调整好人物在画面中的位置，避免留白过多。背景图会铺满页面，并以较淡的方式显示在游戏区域内。

4. 保存文件并刷新页面。设置音乐后，玩家首次点击游戏区域或从暂停中继续时会尝试播放音乐；暂停窗口中可以手动开启或关闭。请使用自己有权公开分享的图片和音乐。

## 三、通过 GitHub Pages 发布

下面以仓库名 `my-merge-game` 为例。GitHub 的免费个人账户可以用公开仓库发布；网站和上传到公开仓库的素材都能被其他人看到。

1. 登录 [GitHub](https://github.com/)。右上角点击 **+ → New repository**。
2. Repository name 填 `my-merge-game`，选择 **Public**，点击 **Create repository**。创建时可以勾选 README，也可以不勾选。
3. 进入新仓库的 **Code** 页面。如果仓库是空的，点击页面上的 **uploading an existing file**；如果已有文件，点击 **Add file → Upload files**。
4. 打开电脑上的游戏文件夹，选中里面的内容（`index.html`、`style.css`、`game.js`、`config.js`、`vendor` 文件夹，以及有素材时的 `assets` 文件夹），拖到上传页面。注意：上传的是游戏文件夹**里面的内容**，使 `index.html` 位于仓库首页；不要把整个游戏外层文件夹再套一层。确认 `vendor/matter.min.js`、`vendor/MATTER-LICENSE.txt` 和各个素材仍在对应子文件夹中。
5. 在页面底部点击 **Commit changes**。如果提示填写提交说明，输入 `Add game` 后确认。
6. 打开仓库 **Settings → Pages**。在 **Build and deployment → Source** 选择 **Deploy from a branch**；在 Branch 选择 **main**，文件夹选择 **/(root)**，点击 **Save**。
7. 稍等 GitHub 构建完成，再回到 **Settings → Pages**，点击 **Visit site**。项目的默认地址通常是：

   `https://你的GitHub用户名.github.io/my-merge-game/`

   把实际显示的网址发给朋友即可；不需要朋友登录 GitHub。GitHub 提示发布变更可能需要最多约 10 分钟。

之后修改素材时，将对应文件和更改过的 `config.js` 上传到同一个仓库并提交，GitHub Pages 会重新发布。文件名区分大小写。通过网页上传时，每个文件不得超过 25 MiB，一次最多上传 100 个文件。若网页出现 404，先检查 `index.html` 是否在仓库根目录、Pages 的分支和目录是否正确，再查看仓库的 **Actions** 页面是否部署成功。

GitHub 官方说明：[创建 GitHub Pages 站点](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)；[配置发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 文件说明与来源

- `index.html`、`style.css`、`game.js`：网页和游戏逻辑。
- `config.js`：游戏名称与素材路径。
- `vendor/matter.min.js`：Matter.js 0.20.0 物理引擎，MIT 许可；版权与许可证见 `vendor/MATTER-LICENSE.txt`。
- 玩法参考 [bullhe4d/bigwatermelon](https://github.com/bullhe4d/bigwatermelon)，游戏代码和默认图形为独立实现，并未直接使用该仓库的代码或素材。
