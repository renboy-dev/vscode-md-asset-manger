# Markdown Asset Manager

一个VSCode扩展，用于本地集中管理Markdown文档中的图片和文件附件。实现类似于Obsidian本地附件管理方式，用于VSCode来编写笔记，其扩展能力更强，支持文件类型更丰富。

## 功能特性

### 自动附件管理
- **图片文件**：粘贴或拖拽时自动保存到配置的图片目录
- **其他文件**：粘贴或拖拽时自动保存到配置的文件目录
- 使用内容 MD5 hash 自动命名文件，自动去重
- 自动插入 Markdown 引用语法

### 预览兼容
- 使用绝对路径格式，VS Code 内置预览直接支持
- 图片和文件在预览中正确显示

### 可配置目录
- 支持自定义 assets 根目录名称
- 支持自定义图片和文件的子目录名称

### 右键菜单
- 编辑器右键菜单集成
- 资源管理器右键菜单集成
- 一键打开资源目录

## 功能支持

| 功能 | 图片 | 其他文件 |
|:---|:---:|:---:|
| 粘贴上传 | ✅ | ✅ |
| 拖拽上传 | ✅ | ✅ |
| Hash 重命名 | ✅ | ✅ |
| 分类存储 | ✅ | ✅ |
| 预览支持 | ✅ | ✅ |
| 自定义目录 | ✅ | ✅ |
| 右键菜单 | ✅ | ✅ |

## 配置项

在 VS Code 设置中搜索 `mdAssetManager` 可以配置：

| 配置项 | 说明 | 默认值 |
|:---|:---|:---|
| `mdAssetManager.assetsRoot` | 资源根目录名称（相对于工作区根目录） | `assets` |
| `mdAssetManager.imagesSubdir` | 图片子目录名称（相对于资源根目录） | `images` |
| `mdAssetManager.filesSubdir` | 文件子目录名称（相对于资源根目录） | `files` |

### 配置示例

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

## 使用方法

### 粘贴图片或文件
1. 复制图片或文件到剪贴板（截图、复制图片文件或复制任意文件）
2. 在 Markdown 文件中按 `Ctrl+V` (Mac: `Cmd+V`)
3. 图片保存到配置的图片目录，其他文件保存到配置的文件目录

### 拖拽文件
1. 从文件管理器或 VS Code 资源管理器拖拽文件
2. 放入 Markdown 编辑器
3. 自动分类保存

### 右键菜单

在 Markdown 编辑器或资源管理器中右键，选择 **Markdown Asset Manager**：

```
Markdown Asset Manager
├── 粘贴图片/文件
└── 打开资源目录
```

### 命令面板

按 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`) 打开命令面板：

| 命令 | 说明 |
|:---|:---|
| `粘贴图片/文件` | 粘贴剪贴板中的图片或文件 |
| `打开资源目录` | 在文件管理器中打开资源根目录 |

## 示例

默认配置下，粘贴图片后 Markdown 文件中会插入：

```markdown
![image](/assets/images/a1b2c3d4e5f6g7h8i9j0.png)
```

拖拽 PDF 文件后：

```markdown
[document.pdf](/assets/files/b2c3d4e5f6g7h8i9j0k1.pdf)
```

文件结构：
```
workspace/
├── assets/
│   ├── images/
│   │   └── a1b2c3d4e5f6g7h8i9j0.png
│   └── files/
│       └── b2c3d4e5f6g7h8i9j0k1.pdf
└── your-doc.md
```

## 支持的文件格式

### 图片格式
PNG, JPEG, GIF, WebP, SVG, BMP, TIFF, ICO, APNG

### 其他文件
支持所有文件类型，自动识别并分类存储

## 开发

### 环境要求
- Node.js 18+
- VS Code 1.87+

### 构建
```bash
npm install
npm run compile
```

### 调试
1. 在 VS Code 中打开项目
2. 按 `F5` 启动调试

### 打包
```bash
npm install -g @vscode/vsce
vsce package
```

### 安装
在vscode中运行命令：从VSIX安装 ---> 选择编译好的.vsix文件进行安装,安装完成后需要重启vscode才会生效！

## 许可证

MIT
