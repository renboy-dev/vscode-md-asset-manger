# 📦 Markdown Asset Manager

<p align="center">
  <img src="icons/icon.png" alt="Logo" width="128" height="128">
</p>

<p align="center">
  <strong>✨ 一个VSCode扩展，用于本地集中管理Markdown文档中的图片和文件附件 ✨</strong>
</p>

<p align="center">
  <a href="#-功能特性">🚀 功能</a> •
  <a href="#-使用方法">📖 使用</a> •
  <a href="#-配置项">⚙️ 配置</a> •
  <a href="#-开发">🔧 开发</a>
</p>

---

## 🎯 简介

实现类似于 **Obsidian** 本地附件管理方式（支持Obsidian嵌入语法 `![[filename]]`），用于VSCode来编写笔记，其扩展能力更强，支持文件类型更丰富 🎉

![[a513928d3306b01978f6e948130d26aa.png]]

### 💡 附件集中管理的好处

- 🔒 **链接永不丢失** - 笔记随时随地的删除和重命名，都不会引起链接丢失
- 🔄 **目录自由调整** - 使用Obsidian语法，资源目录可以自由修改，在配置 `mdAssetManager.assetsRoot` 后也可以正常找到文件，也不会引起笔记中链接丢失

### 🎮 有了这个插件你可以这么玩笔记

| 平台 | 推荐方案 |
|:---|:---|
| 💻 **电脑端** | VSCode + Markdown Asset Manager + Git |
| 📱 **手机端** | Obsidian + Git |

> 💭 **为什么要开发这个插件？** 主要我是一名IT工作者，有大量的md笔记和其他类型文件（pdf、ppt、excel）的参考资料。VSCode文字排版美观和丰富插件生态，让笔记不局限于md文件，其能够支持很多类型的文件。使用Git的远端存储让笔记不仅仅是笔记，是有了版本控制能力的文件存储 🚀

---

## ✨ 功能特性

### 📎 自动附件管理

| 功能 | 描述 |
|:---|:---|
| 🖼️ **图片文件** | 粘贴或拖拽时自动保存到配置的图片目录 |
| 📁 **其他文件** | 粘贴或拖拽时自动保存到配置的文件目录 |
| 🔐 **自动去重** | 使用内容 MD5 hash 自动命名文件，自动去重 |
| 📝 **Obsidian语法** | 采用 Obsidian 嵌入语法 `![[文件名]]` 插入链接 |

### 🔗 Obsidian 语法支持

- ✅ 粘贴/拖拽文件时自动插入 `![[filename.ext]]` 格式嵌入链接
- ✅ 内置预览支持解析 Obsidian 双向链接语法
- ✅ 兼容标准 Markdown 语法

### 👁️ 内联预览增强

- 🖱️ 编辑器右上角预览按钮，一键打开
- 🎨 支持 Obsidian `![[filename]]` 嵌入语法渲染
- 🖼️ 图片自动显示，文件显示为可点击链接
- 🌙 支持暗色模式

### ⚙️ 可配置目录

- 📂 支持自定义 assets 根目录名称
- 🗂️ 支持自定义图片和文件的子目录名称

### 🖱️ 右键菜单

- 📝 编辑器右键菜单集成
- 🗂️ 资源管理器右键菜单集成
- 📂 一键打开资源目录

### 🔒 安全扫描

| 扫描类型 | 描述 |
|:---|:---|
| 🔍 **无效链接扫描** | 检测 Markdown 中指向不存在文件的链接 |
| 🚨 **敏感信息扫描** | 检测密码、API Key、Token 等敏感信息 |

---

## 📊 功能支持矩阵

| 功能 | 🖼️ 图片 | 📁 其他文件 |
|:---|:---:|:---:|
| 粘贴上传 | ✅ | ✅ |
| 拖拽上传 | ✅ | ✅ |
| 图片自动Hash重命名 | ✅ | ✅ |
| 分类存储 | ✅ | ✅ |
| Obsidian 语法 | ✅ | ✅ |
| 内联预览增强 | ✅ | ✅ |
| 自定义配置资源目录 | ✅ | ✅ |
| 右键菜单 | ✅ | ✅ |
| 扫描无效链接报告 | ✅ | ✅ |
| 扫描敏感信息报告 | ✅ | ✅ |

---

## ⚙️ 配置项

在 VS Code 设置中搜索 `mdAssetManager` 可以配置：

| 配置项 | 说明 | 默认值 |
|:---|:---|:---|
| `mdAssetManager.assetsRoot` | 📂 资源根目录名称（相对于工作区根目录） | `assets` |
| `mdAssetManager.imagesSubdir` | 🖼️ 图片子目录名称（相对于资源根目录） | `images` |
| `mdAssetManager.filesSubdir` | 📁 文件子目录名称（相对于资源根目录） | `files` |

### 📝 配置示例

```json
{
  "mdAssetManager.assetsRoot": "static",
  "mdAssetManager.imagesSubdir": "img",
  "mdAssetManager.filesSubdir": "docs"
}
```

以上配置会将图片保存到 `/static/img/`，文件保存到 `/static/docs/`。

如果将子目录设为空字符串，则直接保存到资源根目录：

```json
{
  "mdAssetManager.assetsRoot": "attachments",
  "mdAssetManager.imagesSubdir": "",
  "mdAssetManager.filesSubdir": ""
}
```

以上配置会将所有文件保存到 `/attachments/`。

---

## 📖 使用方法

### 📋 粘贴图片或文件

1. 📸 复制图片或文件到剪贴板（截图、复制图片文件或复制任意文件）
2. 📝 在 Markdown 文件中按 `Ctrl+V` (Mac: `Cmd+V`)
3. ✨ 自动保存文件并插入 Obsidian 格式链接

### 🖱️ 拖拽文件

1. 📂 从文件管理器或 VS Code 资源管理器拖拽文件
2. 🎯 放入 Markdown 编辑器
3. ✅ 自动分类保存并插入链接

### 👁️ 预览文档

- 🖱️ 点击编辑器右上角的 👁 预览按钮
- ⌨️ 或按 `Ctrl+Shift+P` 输入 `打开预览`

### 🖱️ 右键菜单

在 Markdown 编辑器或资源管理器中右键，选择 **Markdown Asset Manager**：

```
📦 Markdown Asset Manager
├── 📋 粘贴图片/文件
├── 📂 打开资源目录
├── 🔍 扫描无效链接
└── 🚨 扫描敏感信息
```

### ⌨️ 命令面板

按 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`) 打开命令面板：

| 命令 | 说明 |
|:---|:---|
| `📋 粘贴图片/文件` | 粘贴剪贴板中的图片或文件 |
| `📂 打开资源目录` | 在文件管理器中打开资源根目录 |
| `👁️ 打开预览` | 打开 Obsidian 语法兼容的预览 |
| `🔍 扫描无效链接` | 扫描工作区所有 Markdown 文件的无效链接 |
| `🚨 扫描敏感信息` | 扫描工作区所有 Markdown 文件的敏感信息 |

---

## 🔗 Obsidian 嵌入语法

### 📝 基本语法

```markdown
![[filename.png]]           🖼️ 图片嵌入
![[document.pdf]]           📄 文件链接
![[filename|显示名称]]       🏷️ 带显示名称的嵌入
```

> 💡 **注意**: `![[filename]]` 是 Obsidian 的嵌入语法，用于直接显示/嵌入文件内容。
> 与 `[[filename]]` 链接语法不同，嵌入语法会直接渲染图片或显示文件链接。

### 💻 示例

粘贴图片后 Markdown 文件中会插入：

```markdown
# 📝 粘贴图片
![[a1b2c3d4e5f6g7h8i9j0.png]]

# 📄 拖拽 PDF（自动保留原文件名）
![[b2c3d4e5f6g7h8i9j0k1.pdf|季度报告]]
```

文件结构：
```
workspace/
├── 📂 assets/
│   ├── 🖼️ images/
│   │   └── a1b2c3d4e5f6g7h8i9j0.png
│   └── 📁 files/
│       └── b2c3d4e5f6g7h8i9j0k1.pdf
└── 📝 your-doc.md
```

---

## 📁 支持的文件格式

### 🖼️ 图片格式

PNG, JPEG, GIF, WebP, SVG, BMP, TIFF, ICO, APNG

### 📄 其他文件

支持所有文件类型，自动识别并分类存储 🎉

---

## 🔧 开发

### 📋 环境要求

- 🟢 Node.js 18+
- 🔵 VS Code 1.87+

### 🏗️ 构建

```bash
# 📦 安装依赖
npm install

# 🔨 编译项目
npm run compile
```

### 🐛 调试

1. 📂 在 VS Code 中打开项目
2. ▶️ 按 `F5` 启动调试

### 📦 打包

```bash
# 📥 安装打包工具
npm install -g @vscode/vsce

# 📦 打包扩展
vsce package
```

### 💾 安装

在 VS Code 中运行命令：`从 VSIX 安装` → 选择编译好的 `.vsix` 文件进行安装，安装完成后需要重启 VS Code 才会生效！

---

## 📄 许可证

[MIT](LICENSE) © Markdown Asset Manager

---

<p align="center">
  <strong>⭐ 如果这个项目对你有帮助，请给它一个星标！ ⭐</strong>
</p>

<p align="center">
  Made with ❤️ by IT工作者
</p>
