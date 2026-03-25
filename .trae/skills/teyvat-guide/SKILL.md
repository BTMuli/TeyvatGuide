---
name: teyvat-guide
description: TeyvatGuide 项目 SKILL。处理 Vue+Tauri+TypeScript 项目开发，包括组件开发、API 集成、SQLite 操作或代码规范。
---

# TeyvatGuide 项目规范

## 技术栈

- **前端**: Vue 3 (Composition API), TypeScript 6, Vuetify 4
- **桌面运行时**: Tauri 2 (Rust backend)
- **构建工具**: Vite 8
- **状态管理**: Pinia + persistedstate
- **数据库**: SQLite (via @tauri-apps/plugin-sql)
- **包管理器**: pnpm 10

## 代码风格

### 通用规则

| 规则 | 要求 |
|------|------|
| 语言 | 中文注释，英文代码 |
| 缩进 | 2 空格 |
| 引号 | 字符串用双引号，Vue 模板用单引号 |
| 分号 | 必须 |
| 尾逗号 | ES5 风格 |
| 行长度 | ≤100 字符 |

### TypeScript 规范

> 详见 [typescript-standards skill](../typescript-standards/SKILL.md)

**枚举**: 使用 `const` 对象模式，禁止原生 `enum`

```typescript
// 正确
const GameServerEnum = <const>{
  CN_GF01: "cn_gf01",
  CN_QD01: "cn_qd01",
};

// 错误
enum GameServerEnum { ... }
```

**JSDoc**: 导出函数必须包含 `@since` 标签，类型定义的子成员修改时需同步更新版本号

```typescript
/**
 * 角色相关类型定义
 * @since Beta v0.9.6
 */

/**
 * 函数描述
 * @since Beta v0.9.6
 * @param param - 参数描述
 * @returns 返回描述
 */
```

**版本更新规则**：当修改类型的子成员时（如添加字段），需要：
1. 更新父级类型的 `@since` 为当前项目版本（递增）
2. 如该文件是主要变更文件，同步更新文件头的 `@since`

示例（项目版本从 0.9.8 → 0.9.9）：

```typescript
// 修改前
/**
 * 角色信息对象
 * @since Beta v0.9.6
 */
type Character = {
  id: number;
  name: string;
};

// 修改后 - 添加新字段
/**
 * 角色信息对象
 * @since Beta v0.9.9  // 递增版本号
 */
type Character = {
  id: number;
  name: string;
  element: string; // 新增字段
};
```

**Import 顺序**: 1. 内置模块 2. 外部包 3. 别名 (@/*) 4. 相对导入

### Vue 规范

- 组件结构: Template → script → style
- 使用 `<script lang="ts" setup>` 语法
- 组件名用 PascalCase
- 样式用 SCSS，遵循 stylelint 配置

## 路径别名

| 别名 | 路径 |
|------|------|
| `@/*` | `./src/*` |
| `@styles/*` | `./src/assets/styles/*` |
| `@comp/*` | `./src/components/*` |
| `@enum/*` | `./src/enum/*` |
| `@hooks/*` | `./src/hooks/*` |
| `@Bili/*` | `./src/plugins/Bili/*` |
| `@Hutao/*` | `./src/plugins/Hutao/*` |
| `@Mys/*` | `./src/plugins/Mys/*` |
| `@Sql/*` | `./src/plugins/Sqlite/*` |
| `@Sqlm/*` | `./src/plugins/Sqlite/modules/*` |
| `@req/*` | `./src/request/*` |
| `@store/*` | `./src/store/modules/*` |
| `@utils/*` | `./src/utils/*` |

## 数据库 (SQLite)

- 参数占位符: `$1, $2, $3...`（禁止 `?`）
- 异步模式: 所有操作返回 Promise

```typescript
await db.execute(
  `INSERT INTO Table(key, value, updated)
   VALUES ($1, $2, datetime('now', 'localtime'))
   ON CONFLICT(key) DO UPDATE SET value = $2, updated = datetime('now', 'localtime');`,
  [key, value],
);
```

## 代码检查

```bash
pnpm lint        # 运行所有检查
pnpm lint:fix    # 自动修复
pnpm lint:vue    # Vue 类型检查
pnpm lint:style  # 样式检查
pnpm lint:rust:fix # Rust fmt
```

## Git 提交规范

> 详见 [git-commit-skill](../git-commit-skill/SKILL.md)

**格式**: `<emoji> <描述>`（一行 ≤100 字符，禁止 type: 声明）

```bash
git add <文件路径>
git commit -m "✨ 添加新功能"
```

## 注意事项

1. **禁止原生 enum** - 使用 const 对象模式
2. **erasableSyntaxOnly** - 应为 `true` 或移除
3. **jsx: preserve** - Vue 项目不需要 tsc 处理 jsx
4. **提交规范** - 每次修改后使用 gitmoji 风格提交