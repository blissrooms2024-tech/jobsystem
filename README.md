# Bliss Rooms Job System

任务分派、GPS 打卡、请假审批、工资结算 — 从 Google Sheets + Apps Script 迁移到 Next.js +
Neon (Postgres) + Vercel。

## 技术栈

- **Next.js 16** (App Router, TypeScript) — 前端 + API 全部在这一个项目里
- **Neon** (Serverless Postgres) — 唯一数据源，用 [Drizzle ORM](https://orm.drizzle.team) 访问
- **Auth.js (NextAuth v5)** — 账号密码登录，密码用 bcrypt 哈希（旧表是明文密码，已在迁移时修复）
- **Vercel Blob** — 存打卡/清洁前后对比照片和工资单 PDF
- **@react-pdf/renderer** — 服务端生成 payslip PDF

## 第一次搭建：从零开始（给还没用过 Neon/Vercel 的你）

### 1. 建 Neon 数据库

1. 打开 https://neon.tech，用邮箱注册（免费额度足够这个系统长期用）
2. 点 "Create a project"，随便取个名字，比如 `blissrooms-jobsystem`
3. 建好后，Neon 会给你一个 **Connection string**，长得像：
   `postgresql://neondb_owner:xxxx@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
4. 复制这串东西，等下要用

### 2. 本地跑起来

```bash
npm install
cp .env.local.example .env.local
```

打开 `.env.local`，把刚才复制的连接串填进 `DATABASE_URL`：

```
DATABASE_URL="postgresql://...你的连接串..."
```

再生成一个随机密钥填入 `AUTH_SECRET`（终端跑 `openssl rand -base64 32`，把结果贴进去）。

`BLOB_READ_WRITE_TOKEN` 暂时可以留空，等部署到 Vercel、开通 Blob 存储后再填（见下面）。

### 3. 把表结构建到 Neon 里

```bash
npm run db:push
```

这一步会把 `src/db/schema.ts` 里定义的 6 张表（users / jobs / payroll / leaves / units /
job_types）建到你的 Neon 数据库里。

### 4. 把旧 Excel 里的历史数据导进去（可选，但建议做）

```bash
npm run migrate:xlsx -- /path/to/BLISS_ROOMS_JOB_SYSTEM.xlsx
```

会自动把旧表里的 13 个员工、94 条任务、27 张工资单等原样导入，并打印一份数量核对报告。
可以重复运行，不会产生重复数据（按旧编号覆盖更新）。

员工的旧密码会被哈希后保留作为临时密码，登录后系统会强制要求修改密码。

### 5. 本地预览

```bash
npm run dev
```

打开 http://localhost:3000，用旧表里任意一个 `Username` + 原密码登录看看（比如
`boss` / `2026`，登入后系统会提示改密码）。

### 6. 部署到 Vercel

1. 把这个仓库 push 到 GitHub（已经在这个仓库里了）
2. 去 https://vercel.com 用 GitHub 账号登录，"Add New Project" 选这个仓库
3. 部署前在 Vercel 项目的 Settings → Environment Variables 里加上和 `.env.local` 一样的三个变量
   （`DATABASE_URL`、`AUTH_SECRET`、`BLOB_READ_WRITE_TOKEN`）
   - 也可以在 Vercel 里搜 "Neon" 集成，一键关联会自动帮你把 `DATABASE_URL` 填好
4. 项目里去 Storage 标签页，创建一个 **Blob** store（免费额度），Vercel 会给你一个
   `BLOB_READ_WRITE_TOKEN`，填回环境变量
5. 点 Deploy，之后每次 push 到这个分支都会自动重新部署

## 日常开发命令

```bash
npm run dev          # 本地开发服务器
npm run build         # 生产构建（部署前建议先跑一次确认没问题）
npm run lint           # 代码检查
npm run db:generate  # schema.ts 改动后生成 migration 文件
npm run db:push        # 把 schema.ts 的改动直接同步到数据库（开发阶段常用）
npm run db:studio      # 打开 Drizzle Studio 图形化查看数据库
```

## 角色权限

| 角色 | 权限 |
|---|---|
| Boss | 全局只读看板 |
| Admin | 全部管理权限，含工资标记已发放 |
| Supervisor | 分派任务、审批请假、生成工资单草稿 |
| Employee | 查看/完成自己的任务、GPS 打卡、上传照片、查看自己的工资单、申请请假 |

## 主要目录

```
src/db/schema.ts              数据表结构 (Drizzle)
src/auth.ts                   登录 / session
src/proxy.ts                  路由权限保护 (Next.js 16 的 middleware)
src/app/(dashboard)/          登录后的所有页面
src/app/api/                  后端 API
scripts/migrate-from-xlsx.ts  旧 Excel 数据导入脚本
```
