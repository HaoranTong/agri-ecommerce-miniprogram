# 轮播图管理指南

## 📊 **轮播图在哪里？**

轮播图数据存储在 WordPress 数据库的 `wp_options` 表中，选项名称为 `myshop_public_config`。

---

## 🛠️ **方法 1：通过 WP-CLI 命令管理（推荐）**

### **1. 查看当前轮播图配置**

```bash
cd e:\laragon\www\agri-ecommerce
php wp-cli.phar option get myshop_public_config --format=json
```

### **2. 添加/更新轮播图**

```bash
php wp-cli.phar option update myshop_public_config '{
  "payment_qr_url": "",
  "customer_service_qr": "",
  "home_slider": [
    {
      "img": "https://agri-ecommerce.test/wp-content/uploads/2025/11/banner1.jpg",
      "link": "/pages/product/detail?id=8422"
    },
    {
      "img": "https://agri-ecommerce.test/wp-content/uploads/2025/11/banner2.jpg",
      "link": "/pages/product/detail?id=8541"
    },
    {
      "img": "https://agri-ecommerce.test/wp-content/uploads/2025/11/banner3.jpg",
      "link": "/pages/index/index"
    }
  ],
  "last_updated_at": "2025-11-24T14:46:00+00:00"
}' --format=json
```

### **3. 删除轮播图**

```bash
php wp-cli.phar option update myshop_public_config '{
  "payment_qr_url": "",
  "customer_service_qr": "",
  "home_slider": [],
  "last_updated_at": "2025-11-24T14:46:00+00:00"
}' --format=json
```

---

## 🎨 **方法 2：创建后台管理页面（推荐实现）**

### **创建自定义管理页面**

在 `myshop-core` 插件中创建管理界面：

**文件路径**：`wp-content/plugins/myshop-core/admin/config-page.php`

```php
<?php
// 注册管理菜单
add_action('admin_menu', 'myshop_register_config_menu');

function myshop_register_config_menu() {
    add_menu_page(
        'MyShop 配置', // 页面标题
        'MyShop 配置', // 菜单标题
        'manage_options', // 权限
        'myshop-config', // 菜单 slug
        'myshop_config_page', // 回调函数
        'dashicons-admin-generic', // 图标
        58 // 位置
    );
}

function myshop_config_page() {
    // 保存配置
    if (isset($_POST['myshop_save_config'])) {
        check_admin_referer('myshop_config_save');
        
        $config = get_option('myshop_public_config', []);
        $home_slider = [];
        
        // 处理轮播图数据
        if (!empty($_POST['slider_images'])) {
            foreach ($_POST['slider_images'] as $index => $img) {
                if (!empty($img)) {
                    $home_slider[] = [
                        'img' => sanitize_text_field($img),
                        'link' => sanitize_text_field($_POST['slider_links'][$index] ?? '')
                    ];
                }
            }
        }
        
        $config['home_slider'] = $home_slider;
        $config['last_updated_at'] = current_time('c');
        
        update_option('myshop_public_config', $config);
        echo '<div class="notice notice-success"><p>配置已保存！</p></div>';
    }
    
    $config = get_option('myshop_public_config', []);
    $home_slider = $config['home_slider'] ?? [];
    
    ?>
    <div class="wrap">
        <h1>MyShop 轮播图配置</h1>
        <form method="post" action="">
            <?php wp_nonce_field('myshop_config_save'); ?>
            
            <h2>首页轮播图</h2>
            <table class="form-table">
                <tbody id="slider-container">
                    <?php
                    if (empty($home_slider)) {
                        $home_slider = [['img' => '', 'link' => '']]; // 默认一行
                    }
                    foreach ($home_slider as $index => $slide):
                    ?>
                    <tr class="slider-row">
                        <th>轮播图 <?php echo $index + 1; ?></th>
                        <td>
                            <label>图片 URL：</label><br>
                            <input type="text" name="slider_images[]" 
                                   value="<?php echo esc_attr($slide['img']); ?>" 
                                   class="regular-text" placeholder="https://...">
                            <button type="button" class="button upload-image-btn">上传图片</button>
                            <br><br>
                            
                            <label>跳转链接：</label><br>
                            <input type="text" name="slider_links[]" 
                                   value="<?php echo esc_attr($slide['link']); ?>" 
                                   class="regular-text" placeholder="/pages/product/detail?id=123">
                            <br><small>示例：/pages/product/detail?id=8422</small>
                            
                            <button type="button" class="button remove-slider">删除</button>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            
            <button type="button" class="button" id="add-slider">+ 添加轮播图</button>
            <br><br>
            
            <?php submit_button('保存配置', 'primary', 'myshop_save_config'); ?>
        </form>
    </div>
    
    <script>
    jQuery(document).ready(function($) {
        // 添加轮播图
        $('#add-slider').on('click', function() {
            var index = $('#slider-container tr').length + 1;
            var row = `
                <tr class="slider-row">
                    <th>轮播图 ${index}</th>
                    <td>
                        <label>图片 URL：</label><br>
                        <input type="text" name="slider_images[]" class="regular-text" placeholder="https://...">
                        <button type="button" class="button upload-image-btn">上传图片</button>
                        <br><br>
                        <label>跳转链接：</label><br>
                        <input type="text" name="slider_links[]" class="regular-text" placeholder="/pages/product/detail?id=123">
                        <br><small>示例：/pages/product/detail?id=8422</small>
                        <button type="button" class="button remove-slider">删除</button>
                    </td>
                </tr>
            `;
            $('#slider-container').append(row);
        });
        
        // 删除轮播图
        $(document).on('click', '.remove-slider', function() {
            $(this).closest('tr').remove();
        });
        
        // 上传图片
        $(document).on('click', '.upload-image-btn', function(e) {
            e.preventDefault();
            var button = $(this);
            var input = button.prev('input');
            
            var mediaUploader = wp.media({
                title: '选择轮播图',
                button: { text: '使用此图片' },
                multiple: false
            });
            
            mediaUploader.on('select', function() {
                var attachment = mediaUploader.state().get('selection').first().toJSON();
                input.val(attachment.url);
            });
            
            mediaUploader.open();
        });
    });
    </script>
    <?php
}
```

### **在主插件文件中引入**

**编辑**：`wp-content/plugins/myshop-core/myshop-core.php`

```php
// 引入后台管理页面
if (is_admin()) {
    require_once plugin_dir_path(__FILE__) . 'admin/config-page.php';
}
```

---

## 📸 **图片上传到 WordPress**

### **方法 1：通过媒体库上传**

1. 登录 WordPress 后台：`https://agri-ecommerce.test/wp-admin`
2. 左侧菜单：**媒体** → **添加新媒体文件**
3. 上传轮播图（建议尺寸：750px × 400px，比例 15:8）
4. 上传后点击图片，复制 **文件 URL**

### **方法 2：通过 FTP 上传**

1. 将图片放到：`e:\laragon\www\agri-ecommerce\wp-content\uploads\2025\11\`
2. 图片 URL：`https://agri-ecommerce.test/wp-content/uploads/2025/11/banner.jpg`

---

## 🔗 **跳转链接格式**

### **跳转到商品详情页**
```
/pages/product/detail?id=8422
```

### **跳转到首页**
```
/pages/index/index
```

### **跳转到分类页**
```
/pages/product/list?category=rice
```

### **跳转到活动页**
```
/pages/activity/detail?id=1
```

---

## ✅ **验证轮播图是否生效**

### **1. 测试 API 接口**

```bash
curl https://agri-ecommerce.test/wp-json/myshop/v1/config/public -k
```

**预期返回**：
```json
{
  "payment_qr_url": "",
  "customer_service_qr": "",
  "home_slider": [
    {
      "img": "https://agri-ecommerce.test/wp-content/uploads/2025/11/banner1.jpg",
      "link": "/pages/product/detail?id=8422"
    }
  ],
  "last_updated_at": "2025-11-24T22:46:00+08:00"
}
```

### **2. 小程序查看**

1. 重新编译小程序：`npm run dev:weapp`
2. 刷新微信开发者工具
3. 查看首页轮播图是否显示

---

## 📋 **推荐轮播图设计规范**

### **尺寸**
- **宽度**：750px（小程序标准宽度）
- **高度**：400-500px（推荐 400px）
- **比例**：15:8 或 16:9

### **格式**
- **推荐**：JPG（文件小，加载快）
- **支持**：PNG（透明背景）、WebP（更小）

### **内容建议**
- 突出商品卖点（如"有机认证"、"限时优惠"）
- 文字大小适中，在手机上可清晰阅读
- 颜色搭配与品牌一致
- 每张轮播图聚焦一个主题

---

## 🚀 **快速示例**

```bash
# 添加 3 张轮播图
cd e:\laragon\www\agri-ecommerce
php wp-cli.phar option update myshop_public_config '{
  "home_slider": [
    {
      "img": "https://agri-ecommerce.test/wp-content/uploads/2025/11/banner-organic.jpg",
      "link": "/pages/product/detail?id=8422"
    },
    {
      "img": "https://agri-ecommerce.test/wp-content/uploads/2025/11/banner-pearl.jpg",
      "link": "/pages/product/detail?id=8541"
    },
    {
      "img": "https://agri-ecommerce.test/wp-content/uploads/2025/11/banner-gift.jpg",
      "link": "/pages/giftcard/mine"
    }
  ],
  "payment_qr_url": "",
  "customer_service_qr": "",
  "last_updated_at": "2025-11-24T15:00:00+00:00"
}' --format=json
```

---

**文档版本**：V1.0
**更新时间**：2025-11-24
