<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/seed.php';

$resource = (string) ($_GET['resource'] ?? 'bootstrap');
$method = request_method();
$pdo = db();

function validate_restore_categories(mixed $value): array
{
    if (!is_array($value) || count($value) === 0 || count($value) > 100) {
        json_response(['error' => 'Yedekteki kategori listesi geçersiz.', 'code' => 'invalid_backup'], 422);
    }
    $categories = [];
    $seen = [];
    foreach ($value as $item) {
        $name = preg_replace('/\s+/u', ' ', clean_text($item, 120)) ?? '';
        $key = text_lower($name);
        if (text_length($name) < 2 || isset($seen[$key])) {
            json_response(['error' => 'Yedekte geçersiz veya yinelenen kategori var.', 'code' => 'invalid_backup'], 422);
        }
        $seen[$key] = true;
        $categories[] = $name;
    }
    return $categories;
}

function validate_restore_activity(mixed $value): array
{
    if (!is_array($value) || count($value) > 200) {
        json_response(['error' => 'Yedekteki işlem geçmişi geçersiz.', 'code' => 'invalid_backup'], 422);
    }
    $activity = [];
    foreach ($value as $item) {
        if (!is_array($item)) {
            json_response(['error' => 'Yedekteki işlem kaydı geçersiz.', 'code' => 'invalid_backup'], 422);
        }
        $action = clean_text($item['action'] ?? '', 140);
        $detail = clean_text($item['detail'] ?? '', 255);
        $timestamp = strtotime((string) ($item['createdAt'] ?? ''));
        if ($action === '' || $detail === '' || $timestamp === false) {
            json_response(['error' => 'Yedekteki işlem kaydı eksik.', 'code' => 'invalid_backup'], 422);
        }
        $activity[] = [
            'action' => $action,
            'detail' => $detail,
            'createdAt' => date('Y-m-d H:i:s', $timestamp),
        ];
    }
    return $activity;
}

if ($resource === 'bootstrap' && $method === 'GET') {
    $admin = current_admin();
    json_response([
        'installed' => true,
        'products' => fetch_products($pdo, $admin !== null),
        'categories' => fetch_categories($pdo),
        'settings' => fetch_settings($pdo),
        'session' => [
            'authenticated' => $admin !== null,
            'user' => $admin,
            'csrfToken' => $admin !== null ? csrf_token() : null,
        ],
        'activity' => $admin !== null ? fetch_activity($pdo) : [],
    ]);
}

if ($resource === 'session' && $method === 'POST') {
    verify_same_origin();
    $now = time();
    $windowStarted = (int) ($_SESSION['login_window_started'] ?? 0);
    if ($windowStarted === 0 || $now - $windowStarted > 300) {
        $_SESSION['login_window_started'] = $now;
        $_SESSION['login_attempts'] = 0;
    }
    if ((int) ($_SESSION['login_attempts'] ?? 0) >= 5) {
        json_response([
            'error' => 'Çok fazla giriş denemesi. Beş dakika sonra tekrar deneyin.',
            'code' => 'rate_limited',
        ], 429);
    }

    $input = request_json();
    $email = strtolower(clean_text($input['email'] ?? '', 190));
    $password = is_string($input['password'] ?? null) ? $input['password'] : '';
    $statement = $pdo->prepare('SELECT id, email, password_hash FROM admin_users WHERE email = :email LIMIT 1');
    $statement->execute([':email' => $email]);
    $user = $statement->fetch();
    if (!$user || !password_verify($password, (string) $user['password_hash'])) {
        $_SESSION['login_attempts'] = (int) ($_SESSION['login_attempts'] ?? 0) + 1;
        usleep(300000);
        json_response(['error' => 'E-posta veya parola hatalı.', 'code' => 'invalid_credentials'], 401);
    }

    session_regenerate_id(true);
    $_SESSION['admin_user_id'] = (int) $user['id'];
    $_SESSION['admin_email'] = (string) $user['email'];
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    $_SESSION['login_attempts'] = 0;
    $pdo->prepare('UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = :id')
        ->execute([':id' => (int) $user['id']]);
    add_activity($pdo, (int) $user['id'], 'Yönetici oturumu açıldı', (string) $user['email']);
    json_response([
        'authenticated' => true,
        'user' => ['id' => (int) $user['id'], 'email' => (string) $user['email']],
        'csrfToken' => (string) $_SESSION['csrf_token'],
    ]);
}

if ($resource === 'session' && $method === 'DELETE') {
    require_admin(true);
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], '', $params['secure'], $params['httponly']);
    }
    session_destroy();
    json_response(['authenticated' => false]);
}

if ($resource === 'categories' && in_array($method, ['POST', 'PUT', 'DELETE'], true)) {
    $admin = require_admin(true);
    $currentName = clean_text($_GET['id'] ?? '', 120);

    if ($method === 'DELETE') {
        if ($currentName === '') {
            json_response(['error' => 'Kategori adı eksik.', 'code' => 'validation_error'], 422);
        }
        $usage = $pdo->prepare('SELECT COUNT(*) FROM products WHERE category = :category');
        $usage->execute([':category' => $currentName]);
        if ((int) $usage->fetchColumn() > 0) {
            json_response([
                'error' => 'Bu kategori ürünlerde kullanılıyor. Önce ürünlerin kategorisini değiştirin.',
                'code' => 'category_in_use',
            ], 409);
        }
        $statement = $pdo->prepare('DELETE FROM categories WHERE name = :name');
        $statement->execute([':name' => $currentName]);
        if ($statement->rowCount() === 0) {
            json_response(['error' => 'Kategori bulunamadı.', 'code' => 'not_found'], 404);
        }
        add_activity($pdo, $admin['id'], 'Kategori silindi', $currentName);
        json_response(['ok' => true]);
    }

    $input = request_json();
    $name = preg_replace('/\s+/u', ' ', clean_text($input['name'] ?? '', 120)) ?? '';
    if (text_length($name) < 2) {
        json_response(['error' => 'Kategori adı en az 2 karakter olmalı.', 'code' => 'validation_error'], 422);
    }

    try {
        if ($method === 'POST') {
            $sortOrder = (int) $pdo->query('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories')->fetchColumn();
            $statement = $pdo->prepare(
                'INSERT INTO categories (name, sort_order) VALUES (:name, :sort_order)'
            );
            $statement->execute([':name' => $name, ':sort_order' => $sortOrder]);
            add_activity($pdo, $admin['id'], 'Kategori eklendi', $name);
        } else {
            if ($currentName === '') {
                json_response(['error' => 'Güncellenecek kategori eksik.', 'code' => 'validation_error'], 422);
            }
            $pdo->beginTransaction();
            $current = $pdo->prepare('SELECT name FROM categories WHERE name = :name FOR UPDATE');
            $current->execute([':name' => $currentName]);
            if (!$current->fetch()) {
                $pdo->rollBack();
                json_response(['error' => 'Kategori bulunamadı.', 'code' => 'not_found'], 404);
            }
            $pdo->prepare('UPDATE products SET category = :next_name WHERE category = :current_name')
                ->execute([':next_name' => $name, ':current_name' => $currentName]);
            $pdo->prepare('UPDATE categories SET name = :next_name WHERE name = :current_name')
                ->execute([':next_name' => $name, ':current_name' => $currentName]);
            add_activity($pdo, $admin['id'], 'Kategori güncellendi', $currentName . ' → ' . $name);
            $pdo->commit();
        }
    } catch (PDOException $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($error->getCode() === '23000') {
            json_response(['error' => 'Bu kategori zaten mevcut.', 'code' => 'duplicate_category'], 409);
        }
        throw $error;
    }
    json_response(['ok' => true]);
}

if ($resource === 'products' && in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
    $admin = require_admin(true);
    $id = clean_text($_GET['id'] ?? '', 120);

    if ($method === 'PATCH') {
        if ($id === '') {
            json_response(['error' => 'Ürün kodu eksik.', 'code' => 'validation_error'], 422);
        }
        $input = request_json();
        $active = filter_var($input['active'] ?? null, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
        if ($active === null) {
            json_response(['error' => 'Yayın durumu geçersiz.', 'code' => 'validation_error'], 422);
        }
        $pdo->beginTransaction();
        $current = $pdo->prepare('SELECT name FROM products WHERE id = :id FOR UPDATE');
        $current->execute([':id' => $id]);
        $product = $current->fetch();
        if (!$product) {
            $pdo->rollBack();
            json_response(['error' => 'Ürün bulunamadı.', 'code' => 'not_found'], 404);
        }
        $pdo->prepare('UPDATE products SET active = :active WHERE id = :id')->execute([
            ':active' => $active ? 1 : 0,
            ':id' => $id,
        ]);
        add_activity(
            $pdo,
            $admin['id'],
            $active ? 'Ürün yayınlandı' : 'Ürün yayından kaldırıldı',
            (string) $product['name']
        );
        $pdo->commit();
        json_response(['ok' => true]);
    }

    if ($method === 'DELETE') {
        if ($id === '') {
            json_response(['error' => 'Ürün kodu eksik.', 'code' => 'validation_error'], 422);
        }
        $pdo->beginTransaction();
        $current = $pdo->prepare('SELECT name FROM products WHERE id = :id FOR UPDATE');
        $current->execute([':id' => $id]);
        $product = $current->fetch();
        if (!$product) {
            $pdo->rollBack();
            json_response(['error' => 'Ürün bulunamadı.', 'code' => 'not_found'], 404);
        }
        $pdo->prepare('DELETE FROM products WHERE id = :id')->execute([':id' => $id]);
        add_activity($pdo, $admin['id'], 'Ürün silindi', (string) $product['name']);
        $pdo->commit();
        json_response(['ok' => true]);
    }

    $product = validate_product(request_json(), $method === 'PUT' ? $id : null);
    $categoryExists = $pdo->prepare('SELECT COUNT(*) FROM categories WHERE name = :name');
    $categoryExists->execute([':name' => $product['category']]);
    if ((int) $categoryExists->fetchColumn() === 0) {
        json_response(['error' => 'Seçilen kategori bulunamadı.', 'code' => 'invalid_category'], 422);
    }
    $pdo->beginTransaction();
    try {
        if ($method === 'POST') {
            $sortOrder = (int) $pdo->query('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM products')->fetchColumn();
            $statement = $pdo->prepare(
                'INSERT INTO products
                (id, name, category, price, old_price, badge, kind, tone, colors, sizes, description, material, image, active, sort_order)
                VALUES
                (:id, :name, :category, :price, :old_price, :badge, :kind, :tone, :colors, :sizes, :description, :material, :image, :active, :sort_order)'
            );
        } else {
            $sortOrder = null;
            $statement = $pdo->prepare(
                'UPDATE products SET
                    name = :name,
                    category = :category,
                    price = :price,
                    old_price = :old_price,
                    badge = :badge,
                    kind = :kind,
                    tone = :tone,
                    colors = :colors,
                    sizes = :sizes,
                    description = :description,
                    material = :material,
                    image = :image,
                    active = :active
                WHERE id = :id'
            );
        }
        $values = [
            ':id' => $product['id'],
            ':name' => $product['name'],
            ':category' => $product['category'],
            ':price' => $product['price'],
            ':old_price' => $product['oldPrice'],
            ':badge' => $product['badge'],
            ':kind' => $product['kind'],
            ':tone' => $product['tone'],
            ':colors' => json_encode($product['colors'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            ':sizes' => json_encode($product['sizes'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            ':description' => $product['description'],
            ':material' => $product['material'],
            ':image' => count($product['images']) > 0 || !$product['templateVisible']
                ? json_encode([
                    'images' => $product['images'],
                    'templateVisible' => $product['templateVisible'],
                ], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)
                : null,
            ':active' => $product['active'] ? 1 : 0,
        ];
        if ($method === 'POST') {
            $values[':sort_order'] = $sortOrder;
        }
        $statement->execute($values);
        if ($method === 'PUT' && $statement->rowCount() === 0) {
            $exists = $pdo->prepare('SELECT COUNT(*) FROM products WHERE id = :id');
            $exists->execute([':id' => $product['id']]);
            if ((int) $exists->fetchColumn() === 0) {
                $pdo->rollBack();
                json_response(['error' => 'Ürün bulunamadı.', 'code' => 'not_found'], 404);
            }
        }
        add_activity(
            $pdo,
            $admin['id'],
            $method === 'POST' ? 'Ürün eklendi' : 'Ürün güncellendi',
            $product['name']
        );
        $pdo->commit();
    } catch (PDOException $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($error->getCode() === '23000') {
            json_response(['error' => 'Bu ürün kodu zaten kullanılıyor.', 'code' => 'duplicate_product'], 409);
        }
        throw $error;
    }
    json_response(['ok' => true]);
}

if ($resource === 'settings' && $method === 'PUT') {
    $admin = require_admin(true);
    $values = validate_store_settings(request_json());
    $statement = $pdo->prepare(
        'INSERT INTO store_settings (setting_key, setting_value)
         VALUES (:setting_key, :setting_value)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
    );
    $pdo->beginTransaction();
    foreach ($values as $key => $value) {
        $statement->execute([
            ':setting_key' => $key,
            ':setting_value' => json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
        ]);
    }
    add_activity(
        $pdo,
        $admin['id'],
        'Mağaza ayarları güncellendi',
        $values['acceptingOrders'] ? 'Sipariş alımı açık' : 'Sipariş alımı kapalı'
    );
    $pdo->commit();
    json_response(['ok' => true]);
}

if ($resource === 'backup' && $method === 'GET') {
    require_admin(false);
    json_response([
        'schemaVersion' => 1,
        'exportedAt' => date(DATE_ATOM),
        'products' => fetch_products($pdo, true),
        'categories' => fetch_categories($pdo),
        'settings' => fetch_settings($pdo),
        'activity' => fetch_activity($pdo, 200),
    ]);
}

if ($resource === 'restore' && $method === 'POST') {
    $admin = require_admin(true);
    $input = request_json();
    if ((int) ($input['schemaVersion'] ?? 0) !== 1) {
        json_response(['error' => 'Yedek sürümü desteklenmiyor.', 'code' => 'invalid_backup'], 422);
    }
    if (!is_array($input['products'] ?? null) || count($input['products']) > 500) {
        json_response(['error' => 'Yedekteki ürün listesi geçersiz.', 'code' => 'invalid_backup'], 422);
    }
    $categories = validate_restore_categories($input['categories'] ?? null);
    $categoryLookup = array_fill_keys($categories, true);
    $products = [];
    $productIds = [];
    foreach ($input['products'] as $item) {
        if (!is_array($item)) {
            json_response(['error' => 'Yedekte geçersiz ürün kaydı var.', 'code' => 'invalid_backup'], 422);
        }
        $product = validate_product($item);
        if (isset($productIds[$product['id']]) || !isset($categoryLookup[$product['category']])) {
            json_response(['error' => 'Yedekte yinelenen ürün veya eksik kategori var.', 'code' => 'invalid_backup'], 422);
        }
        $productIds[$product['id']] = true;
        $products[] = $product;
    }
    $settings = validate_store_settings(is_array($input['settings'] ?? null) ? $input['settings'] : []);
    $activity = validate_restore_activity($input['activity'] ?? []);

    $pdo->beginTransaction();
    try {
        $pdo->exec('DELETE FROM activity_log');
        $pdo->exec('DELETE FROM products');
        $pdo->exec('DELETE FROM categories');
        $pdo->exec('DELETE FROM store_settings');

        $categoryStatement = $pdo->prepare(
            'INSERT INTO categories (name, sort_order) VALUES (:name, :sort_order)'
        );
        foreach ($categories as $index => $category) {
            $categoryStatement->execute([':name' => $category, ':sort_order' => $index + 1]);
        }

        $productStatement = $pdo->prepare(
            'INSERT INTO products
            (id, name, category, price, old_price, badge, kind, tone, colors, sizes, description, material, image, active, sort_order)
            VALUES
            (:id, :name, :category, :price, :old_price, :badge, :kind, :tone, :colors, :sizes, :description, :material, :image, :active, :sort_order)'
        );
        foreach ($products as $index => $product) {
            $productStatement->execute([
                ':id' => $product['id'],
                ':name' => $product['name'],
                ':category' => $product['category'],
                ':price' => $product['price'],
                ':old_price' => $product['oldPrice'],
                ':badge' => $product['badge'],
                ':kind' => $product['kind'],
                ':tone' => $product['tone'],
                ':colors' => json_encode($product['colors'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                ':sizes' => json_encode($product['sizes'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                ':description' => $product['description'],
                ':material' => $product['material'],
                ':image' => count($product['images']) > 0 || !$product['templateVisible']
                    ? json_encode([
                        'images' => $product['images'],
                        'templateVisible' => $product['templateVisible'],
                    ], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)
                    : null,
                ':active' => $product['active'] ? 1 : 0,
                ':sort_order' => $index + 1,
            ]);
        }

        $settingStatement = $pdo->prepare(
            'INSERT INTO store_settings (setting_key, setting_value) VALUES (:setting_key, :setting_value)'
        );
        foreach ($settings as $key => $value) {
            $settingStatement->execute([
                ':setting_key' => $key,
                ':setting_value' => json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            ]);
        }

        $activityStatement = $pdo->prepare(
            'INSERT INTO activity_log (admin_user_id, action, detail, created_at)
             VALUES (NULL, :action, :detail, :created_at)'
        );
        foreach (array_reverse($activity) as $item) {
            $activityStatement->execute([
                ':action' => $item['action'],
                ':detail' => $item['detail'],
                ':created_at' => $item['createdAt'],
            ]);
        }
        add_activity($pdo, $admin['id'], 'Yedek geri yüklendi', count($products) . ' ürün geri yüklendi');
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
    json_response(['ok' => true]);
}

if ($resource === 'reset' && $method === 'POST') {
    $admin = require_admin(true);
    $pdo->beginTransaction();
    seed_catalog($pdo, true);
    add_activity($pdo, $admin['id'], 'Sistem sıfırlandı', 'Varsayılan ürünler ve ayarlar geri yüklendi');
    $pdo->commit();
    json_response(['ok' => true]);
}

json_response(['error' => 'API kaynağı bulunamadı.', 'code' => 'not_found'], 404);
