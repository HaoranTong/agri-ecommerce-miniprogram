# 真机调试配置指南

## 问题现象
- 真机调试时所有图片显示为占位图
- 变体选择消失
- 部分字段显示英文

## 根本原因
真机无法访问本地开发服务器域名 `agri-ecommerce.test`，导致所有 API 请求失败。

## 解决方案

### ✅ 已完成配置

1. **修改 API 地址为局域网 IP**
   - 文件：`src/utils/constants.ts`
   - 修改：`DEV_BASE_URL` 从 `https://agri-ecommerce.test` 改为 `http://192.168.1.4`

2. **关闭域名校验**
   - 文件：`project.config.json`
   - 修改：`"urlCheck": false`（允许 HTTP 请求）

### 🔧 需要手动配置

#### 1. 确保 Laragon 允许外网访问

**方法一：修改 Apache 配置（推荐）**

1. 打开 Laragon，点击 `菜单 → Apache → sites-enabled → agri-ecommerce.test.conf`

2. 找到 `<VirtualHost>` 块，修改为：
```apache
<VirtualHost *:80>
    DocumentRoot "E:/laragon/www/agri-ecommerce/"
    ServerName agri-ecommerce.test
    ServerAlias *.agri-ecommerce.test
    
    # 允许局域网访问
    <Directory "E:/laragon/www/agri-ecommerce/">
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

3. 重启 Apache：Laragon → `停止所有` → `启动所有`

**方法二：关闭 Windows 防火墙（临时）**

```powershell
# 仅用于测试，不建议长期关闭
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
```

#### 2. 验证局域网访问

在手机浏览器中访问：
```
http://192.168.1.4/wp-json/myshop/v1/config/public
```

应该能看到 JSON 数据返回。

#### 3. 重新编译小程序

```powershell
# 在项目根目录执行
npm run dev:weapp
```

#### 4. 微信开发者工具配置

1. **开启调试模式**
   - 详情 → 本地设置 → 勾选 `不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书`

2. **真机调试**
   - 点击顶部工具栏 `真机调试`
   - 扫码连接手机
   - 等待编译完成

### 🔍 故障排查

#### 问题 1：手机浏览器无法访问 `http://192.168.1.4`

**检查项：**
- 手机和电脑是否在同一 WiFi 网络
- 电脑防火墙是否阻止 80 端口
- Laragon 是否正常运行

**解决方法：**
```powershell
# 1. 检查 Apache 是否监听 80 端口
netstat -ano | findstr :80

# 2. 添加防火墙入站规则
New-NetFirewallRule -DisplayName "Laragon HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# 3. 重启 Laragon
```

#### 问题 2：API 返回 404 或 403

**检查项：**
- WordPress 固定链接是否正常
- `.htaccess` 文件是否存在

**解决方法：**
```powershell
# 在 WordPress 根目录执行
cd E:\laragon\www\agri-ecommerce

# 检查 .htaccess
Get-Content .htaccess

# 如果不存在，登录 WordPress 后台：
# 设置 → 固定链接 → 点击"保存更改"（重新生成 .htaccess）
```

#### 问题 3：图片仍然无法显示

**检查项：**
- 图片 URL 是否使用了 `agri-ecommerce.test` 域名
- 媒体库图片路径是否正确

**解决方法：**

1. **批量替换数据库中的域名**（谨慎操作）：
```sql
-- 在 phpMyAdmin 或命令行执行
UPDATE wp_posts 
SET post_content = REPLACE(post_content, 'https://agri-ecommerce.test', 'http://192.168.1.4');

UPDATE wp_postmeta 
SET meta_value = REPLACE(meta_value, 'https://agri-ecommerce.test', 'http://192.168.1.4')
WHERE meta_key = '_wp_attached_file' OR meta_key = '_wp_attachment_metadata';

UPDATE wp_options 
SET option_value = REPLACE(option_value, 'https://agri-ecommerce.test', 'http://192.168.1.4')
WHERE option_name = 'siteurl' OR option_name = 'home' OR option_name = 'myshop_public_config';
```

2. **临时方案：使用代理函数**

在 `src/utils/request.ts` 中添加：
```typescript
// 替换响应数据中的域名
function replaceDomain(data: any): any {
  const jsonStr = JSON.stringify(data);
  const replaced = jsonStr.replace(/https:\/\/agri-ecommerce\.test/g, 'http://192.168.1.4');
  return JSON.parse(replaced);
}
```

### 📱 微信小程序域名配置（正式发布前）

1. 登录 [微信公众平台](https://mp.weixin.qq.com)
2. 开发管理 → 开发设置 → 服务器域名
3. 配置：
   - **request 合法域名**：`https://yourdomain.com`（需要 HTTPS + 备案域名）
   - **uploadFile 合法域名**：`https://yourdomain.com`
   - **downloadFile 合法域名**：`https://yourdomain.com`

**注意：** 
- 开发阶段使用 `urlCheck: false` 绕过检查
- 正式发布必须配置 HTTPS 域名
- 每月只能修改 5 次

### 🚀 生产环境部署（未来）

1. **购买云服务器和域名**
   - 推荐：阿里云/腾讯云
   - 域名需要 ICP 备案

2. **配置 HTTPS 证书**
   ```bash
   # 使用 Let's Encrypt 免费证书
   certbot --apache -d yourdomain.com
   ```

3. **修改生产环境配置**
   ```typescript
   // src/utils/constants.ts
   const PROD_BASE_URL = 'https://yourdomain.com';
   ```

4. **上传代码到微信审核**
   ```powershell
   npm run build:weapp
   # 在微信开发者工具中点击"上传"
   ```

## 📋 快速检查清单

- [ ] `constants.ts` 已修改为局域网 IP
- [ ] `project.config.json` 的 `urlCheck` 设为 `false`
- [ ] Laragon Apache 允许外网访问
- [ ] 手机能通过浏览器访问 `http://192.168.1.4`
- [ ] API 接口返回正常数据
- [ ] 重新编译小程序 `npm run dev:weapp`
- [ ] 微信开发者工具勾选"不校验合法域名"
- [ ] 手机和电脑在同一 WiFi

## 💡 提示

**切换模拟器/真机调试：**
- 模拟器：可以使用 `agri-ecommerce.test`（通过 hosts 映射）
- 真机：必须使用局域网 IP `192.168.1.4`

**统一方案：** 始终使用局域网 IP，模拟器和真机都能正常访问。
