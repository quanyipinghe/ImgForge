# ImgForge

个人图床应用，基于 Astro 5 + Cloudflare Pages/R2/D1 构建。密码保护，上传图片即得可分享链接，完全免费部署。

## 功能特性

- **密码保护** — HMAC 签名的 HttpOnly Cookie，30 天免登录
- **客户端压缩** — 上传前通过 Canvas API 自动压缩，最大尺寸 2000px，最大体积 2 MB
- **多格式链接** — 上传后直接复制直链 / Markdown / HTML 格式
- **图库管理** — 分页浏览所有图片，一键复制链接，一键删除（同步删除 R2 文件和数据库记录）
- **零服务器费用** — Cloudflare Pages + R2 + D1 全免费套餐，GitHub 推送自动部署

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Astro 5 + `@astrojs/cloudflare` |
| 图片存储 | Cloudflare R2 |
| 元数据 | Cloudflare D1 (SQLite) |
| 认证 | HMAC-SHA256 签名 Cookie（Web Crypto API） |
| 图片压缩 | 浏览器 Canvas API |
| 部署 | GitHub → Cloudflare Pages 自动部署 |

## 本地开发

### 前提条件

- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)（`npm install -g wrangler`）
- Cloudflare 账号并完成 `wrangler login`

### 1. 克隆并安装依赖

```bash
git clone <your-repo-url>
cd ImgForge
npm install
```

### 2. 创建 Cloudflare 资源

```bash
# 创建 D1 数据库，记录输出的 database_id
npx wrangler d1 create imgforge-db

# 创建 R2 存储桶
npx wrangler r2 bucket create imgforge-images

# 创建 Sessions KV Namespace，记录输出的 id
npx wrangler kv namespace create SESSION
```

将三个 ID 填入 `wrangler.toml`：

```toml
[[d1_databases]]
binding      = "DB"
database_name = "imgforge-db"
database_id  = "填入 D1 database_id"

[[r2_buckets]]
binding     = "BUCKET"
bucket_name = "imgforge-images"

[[kv_namespaces]]
binding = "SESSION"
id      = "填入 KV namespace id"
```

```bash
# 初始化本地数据库表结构
npx wrangler d1 execute imgforge-db --local --file=schema.sql
```

### 3. 配置本地密钥

编辑 `.dev.vars`（已在 `.gitignore` 中，不会提交）：

```ini
UPLOAD_PASSWORD=你的登录密码
AUTH_SECRET=至少32位随机字符串（可用 openssl rand -base64 32 生成）
R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev
```

> `R2_PUBLIC_URL` 需要先在 Cloudflare Dashboard 开启 R2 桶的公开访问后才能获取，本地开发阶段可先填占位符。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:4321`，使用 `.dev.vars` 中设置的密码登录。

---

## 生产部署（完整流程）

### 第一步：创建 Cloudflare 资源

若尚未创建，执行以下命令并记录各资源 ID：

```bash
npx wrangler d1 create imgforge-db
npx wrangler r2 bucket create imgforge-images
npx wrangler kv namespace create SESSION
```

将 ID 填入 `wrangler.toml` 后提交推送。

### 第二步：开启 R2 公开访问

1. Dashboard → **R2 Object Storage** → `imgforge-images` → **Settings**
2. **Public Access** → 点击 **Allow Access**
3. 复制生成的公开 URL（格式：`https://pub-xxxxxxxx.r2.dev`）

### 第三步：推送到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 第四步：Cloudflare Pages 连接仓库

1. Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 选择仓库，配置构建参数：
   - **Build command**：`npm run build`
   - **Build output directory**：`dist`

### 第五步：在 Dashboard 配置绑定与环境变量

Pages 项目 → **Settings → Functions**，添加以下绑定：

| 类型 | 变量名 | 资源 |
|---|---|---|
| D1 Database | `DB` | `imgforge-db` |
| R2 Bucket | `BUCKET` | `imgforge-images` |
| KV Namespace | `SESSION` | `SESSION`（刚创建的） |

Pages 项目 → **Settings → Environment variables**，添加以下密钥（Production 环境）：

| 变量名 | 值 |
|---|---|
| `UPLOAD_PASSWORD` | 你的登录密码 |
| `AUTH_SECRET` | 32 位以上随机字符串 |
| `R2_PUBLIC_URL` | 第二步复制的 R2 公开 URL |

### 第六步：初始化生产数据库

**必须执行**，否则 gallery 页面会报 500 错误：

```bash
npx wrangler d1 execute imgforge-db --file=schema.sql
```

### 第七步：触发重新部署

配置完成后需重新部署：

- 在 Pages 项目页面点击最近一次部署 → **Retry deployment**
- 或推送一个空提交：

```bash
git commit --allow-empty -m "chore: redeploy" && git push
```

---

## 自定义域名

**Pages 绑定自定义域名**（无需改代码）：
Dashboard → Pages → ImgForge → **Custom domains** → Add → 填入域名

**R2 图片 URL 使用自定义域名**（可选）：
1. Dashboard → R2 → `imgforge-images` → **Settings → Custom Domains** → 添加子域名
2. 将 `R2_PUBLIC_URL` 环境变量改为该子域名（如 `https://img.yourdomain.com`）
3. 重新部署生效

---

## 项目结构

```
ImgForge/
├── .dev.vars                        # 本地密钥（已 gitignore）
├── .gitignore
├── wrangler.toml                    # R2 + D1 + KV 绑定配置
├── schema.sql                       # D1 建表语句
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── src/
    ├── env.d.ts                     # Cloudflare 运行时类型声明
    ├── middleware.ts                # 全局认证守卫
    ├── lib/
    │   ├── auth.ts                  # HMAC 签名/验证（Web Crypto）
    │   └── db.ts                    # D1 查询封装
    ├── pages/
    │   ├── index.astro              # 重定向至 /gallery
    │   ├── login.astro              # 登录页
    │   ├── upload.astro             # 上传页（受保护）
    │   ├── gallery.astro            # 图库页（受保护）
    │   └── api/
    │       ├── auth/
    │       │   ├── login.ts         # POST /api/auth/login
    │       │   └── logout.ts        # POST /api/auth/logout
    │       └── images/
    │           ├── index.ts         # GET /api/images
    │           ├── upload.ts        # POST /api/images/upload
    │           └── [id].ts          # DELETE /api/images/:id
    └── components/
        └── ImageCard.astro          # 图库卡片（复制/删除按钮）
```

## Cloudflare 免费额度参考

| 资源 | 免费上限 | 预计用量 |
|---|---|---|
| R2 存储 | 10 GB | 压缩后图片 |
| R2 Class A（写） | 100 万次/月 | 每次上传 1 次 |
| R2 Class B（读） | 1000 万次/月 | CDN 缓存后极低 |
| D1 读取 | 500 万次/天 | 元数据查询 |
| D1 写入 | 10 万次/天 | 每次上传/删除 1 次 |
| Pages Functions | 10 万次请求/天 | API 调用 |
| KV 读取 | 10 万次/天 | Sessions（未实际使用） |

## 常用命令

```bash
npm run dev        # 本地开发
npm run build      # 构建生产包
npm run preview    # 预览构建产物
```
