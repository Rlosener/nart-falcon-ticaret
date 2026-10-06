<?php

declare(strict_types=1);

const NF_CONFIG_FILE = __DIR__ . '/config.local.php';
const NF_INSTALL_FILE = __DIR__ . '/../install.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store, private');

session_name('nf_admin_session');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Strict',
]);
ini_set('session.use_strict_mode', '1');
session_start();

function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

set_exception_handler(static function (Throwable $error): void {
    error_log('[Nart Falcon API] ' . $error->getMessage());
    json_response([
        'error' => 'Sunucu isteği tamamlanamadı. Lütfen tekrar deneyin.',
        'code' => 'server_error',
    ], 500);
});

function request_method(): string
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function request_json(): array
{
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 50 * 1024 * 1024) {
        json_response(['error' => 'İstek gövdesi 50 MB sınırını aşıyor.', 'code' => 'payload_too_large'], 413);
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    try {
        $value = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        json_response(['error' => 'Geçersiz JSON gövdesi.', 'code' => 'invalid_json'], 400);
    }
    if (!is_array($value)) {
        json_response(['error' => 'Geçersiz istek gövdesi.', 'code' => 'invalid_body'], 400);
    }
    return $value;
}

function database_config(): array
{
    if (!is_file(NF_CONFIG_FILE)) {
        json_response([
            'error' => 'SQL kurulumu henüz tamamlanmadı. install.php dosyasını açın.',
            'code' => 'not_installed',
            'installUrl' => '/install.php',
        ], 503);
    }
    $config = require NF_CONFIG_FILE;
    if (!is_array($config)) {
        json_response(['error' => 'Veritabanı yapılandırması geçersiz.', 'code' => 'invalid_config'], 500);
    }
    return $config;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $config = database_config();
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $config['host'],
        (int) $config['port'],
        $config['database']
    );
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function verify_same_origin(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return;
    }
    $originHost = strtolower((string) parse_url($origin, PHP_URL_HOST));
    $requestHost = strtolower(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]);
    if ($originHost === '' || $requestHost === '' || !hash_equals($requestHost, $originHost)) {
        json_response(['error' => 'Bu kaynak için istek reddedildi.', 'code' => 'origin_rejected'], 403);
    }
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return (string) $_SESSION['csrf_token'];
}

function current_admin(): ?array
{
    if (empty($_SESSION['admin_user_id']) || empty($_SESSION['admin_email'])) {
        return null;
    }
    return [
        'id' => (int) $_SESSION['admin_user_id'],
        'email' => (string) $_SESSION['admin_email'],
    ];
}

function require_admin(bool $requireCsrf = true): array
{
    $admin = current_admin();
    if ($admin === null) {
        json_response(['error' => 'Yönetici oturumu gerekli.', 'code' => 'authentication_required'], 401);
    }
    if ($requireCsrf) {
        verify_same_origin();
        $provided = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
        $expected = (string) ($_SESSION['csrf_token'] ?? '');
        if ($provided === '' || $expected === '' || !hash_equals($expected, $provided)) {
            json_response(['error' => 'Güvenlik doğrulaması başarısız.', 'code' => 'csrf_failed'], 403);
        }
    }
    return $admin;
}

function text_slice(string $value, int $maxLength): string
{
    return function_exists('mb_substr')
        ? mb_substr($value, 0, $maxLength)
        : substr($value, 0, $maxLength);
}

function text_length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
}

function text_lower(string $value): string
{
    return function_exists('mb_strtolower') ? mb_strtolower($value) : strtolower($value);
}

function add_activity(PDO $pdo, int $adminId, string $action, string $detail): void
{
    $statement = $pdo->prepare(
        'INSERT INTO activity_log (admin_user_id, action, detail) VALUES (:admin_id, :action, :detail)'
    );
    $statement->execute([
        ':admin_id' => $adminId,
        ':action' => text_slice($action, 140),
        ':detail' => text_slice($detail, 255),
    ]);
}

function decode_list(string $value): array
{
    try {
        $decoded = json_decode($value, true, 16, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        return [];
    }
    if (!is_array($decoded)) {
        return [];
    }
    return array_values(array_filter($decoded, 'is_string'));
}

function decode_size_options(string $value): array
{
    try {
        $decoded = json_decode($value, true, 24, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        return [];
    }
    if (!is_array($decoded)) {
        return [];
    }
    $sizes = [];
    foreach ($decoded as $item) {
        if (is_string($item)) {
            $name = trim($item);
            $priceDelta = 0.0;
        } elseif (is_array($item)) {
            $name = is_string($item['name'] ?? null) ? trim($item['name']) : '';
            $priceDelta = is_numeric($item['priceDelta'] ?? null) ? (float) $item['priceDelta'] : 0.0;
        } else {
            continue;
        }
        if ($name === '' || $priceDelta < 0 || $priceDelta > 1000000) {
            continue;
        }
        $sizes[] = ['name' => $name, 'priceDelta' => $priceDelta];
    }
    return $sizes;
}

function decode_product_images(string $value): array
{
    return decode_product_media($value)['images'];
}

function decode_product_media(string $value): array
{
    $fallback = ['images' => [], 'templateVisible' => true];
    if ($value === '') {
        return $fallback;
    }
    if (preg_match('#^data:image/(?:png|jpe?g|webp);base64,#i', $value)) {
        return ['images' => [$value], 'templateVisible' => true];
    }
    try {
        $decoded = json_decode($value, true, 8, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        return $fallback;
    }
    if (!is_array($decoded)) {
        return $fallback;
    }
    $source = array_is_list($decoded) ? $decoded : ($decoded['images'] ?? []);
    if (!is_array($source)) {
        $source = [];
    }
    $images = array_values(array_filter(
        array_slice($source, 0, 4),
        static fn(mixed $image): bool => is_string($image)
            && preg_match('#^data:image/(?:png|jpe?g|webp);base64,#i', $image) === 1
    ));
    return [
        'images' => $images,
        'templateVisible' => array_is_list($decoded) || !array_key_exists('templateVisible', $decoded)
            ? true
            : $decoded['templateVisible'] !== false,
    ];
}

function serialize_product(array $row): array
{
    $product = [
        'id' => (string) $row['id'],
        'name' => (string) $row['name'],
        'category' => (string) $row['category'],
        'price' => (float) $row['price'],
        'kind' => (string) $row['kind'],
        'tone' => (string) $row['tone'],
        'colors' => decode_list((string) $row['colors']),
        'sizes' => decode_size_options((string) $row['sizes']),
        'description' => (string) $row['description'],
        'material' => (string) $row['material'],
        'active' => (bool) $row['active'],
    ];
    if ($row['old_price'] !== null) {
        $product['oldPrice'] = (float) $row['old_price'];
    }
    if (!empty($row['badge'])) {
        $product['badge'] = (string) $row['badge'];
    }
    $media = decode_product_media((string) ($row['image'] ?? ''));
    $images = $media['images'];
    $product['templateVisible'] = $media['templateVisible'];
    if (count($images) > 0) {
        $product['images'] = $images;
        $product['image'] = $images[0];
    }
    return $product;
}

function fetch_categories(PDO $pdo): array
{
    return array_map(
        static fn(array $row): string => (string) $row['name'],
        $pdo->query('SELECT name FROM categories ORDER BY sort_order ASC, name ASC')->fetchAll()
    );
}

function fetch_products(PDO $pdo, bool $includeHidden): array
{
    $sql = 'SELECT * FROM products';
    if (!$includeHidden) {
        $sql .= ' WHERE active = 1';
    }
    $sql .= ' ORDER BY sort_order ASC, created_at ASC';
    $rows = $pdo->query($sql)->fetchAll();
    return array_map('serialize_product', $rows);
}

function fetch_settings(PDO $pdo): array
{
    $defaults = default_store_settings();
    $settings = $defaults;
    foreach ($pdo->query('SELECT setting_key, setting_value FROM store_settings')->fetchAll() as $row) {
        if (!array_key_exists($row['setting_key'], $settings)) {
            continue;
        }
        try {
            $settings[$row['setting_key']] = json_decode(
                (string) $row['setting_value'],
                true,
                8,
                JSON_THROW_ON_ERROR
            );
        } catch (JsonException) {
            continue;
        }
    }
    $settings['seller'] = is_array($settings['seller'] ?? null)
        ? array_merge($defaults['seller'], $settings['seller'])
        : $defaults['seller'];
    $settings['whatsappNumber'] = preg_replace(
        '/\D+/',
        '',
        is_string($settings['whatsappNumber'] ?? null) ? $settings['whatsappNumber'] : ''
    ) ?? '';
    $sellerReady = trim((string) $settings['seller']['legalName']) !== ''
        && trim((string) $settings['seller']['address']) !== ''
        && filter_var($settings['seller']['email'], FILTER_VALIDATE_EMAIL);
    $settings['acceptingOrders'] = ($settings['acceptingOrders'] ?? false) === true
        && preg_match('/^\d{10,15}$/', $settings['whatsappNumber']) === 1
        && $sellerReady;
    $corporateUrl = is_string($settings['corporateSiteUrl'] ?? null)
        ? $settings['corporateSiteUrl']
        : '';
    $corporateParts = parse_url($corporateUrl);
    if (
        !filter_var($corporateUrl, FILTER_VALIDATE_URL)
        || !is_array($corporateParts)
        || !in_array(strtolower((string) ($corporateParts['scheme'] ?? '')), ['http', 'https'], true)
    ) {
        $settings['corporateSiteUrl'] = $defaults['corporateSiteUrl'];
    }
    return $settings;
}

function default_store_settings(): array
{
    return [
        'announcement' => 'TASARIMDAN HAYATA. NART FALCON MAĞAZASIYLA TANIŞ.',
        'whatsappNumber' => '',
        'acceptingOrders' => false,
        'corporateSiteUrl' => 'https://lab2.efecanakbulut.com',
        'seller' => [
            'legalName' => '',
            'address' => '',
            'email' => '',
            'registrationId' => '',
            'jurisdictionNote' => '',
        ],
    ];
}

function fetch_activity(PDO $pdo, int $limit = 40): array
{
    $limit = max(1, min(200, $limit));
    $rows = $pdo->query(
        'SELECT id, action, detail, created_at FROM activity_log ORDER BY id DESC LIMIT ' . $limit
    )->fetchAll();
    return array_map(static fn(array $row): array => [
        'id' => (string) $row['id'],
        'action' => (string) $row['action'],
        'detail' => (string) $row['detail'],
        'createdAt' => date(DATE_ATOM, strtotime((string) $row['created_at'])),
    ], $rows);
}

function clean_text(mixed $value, int $maxLength): string
{
    if (!is_string($value)) {
        return '';
    }
    return text_slice(trim($value), $maxLength);
}

function validate_store_settings(array $input): array
{
    $announcement = clean_text($input['announcement'] ?? '', 100);
    $whatsapp = preg_replace('/\D+/', '', (string) ($input['whatsappNumber'] ?? '')) ?? '';
    $acceptingOrders = filter_var(
        $input['acceptingOrders'] ?? null,
        FILTER_VALIDATE_BOOL,
        FILTER_NULL_ON_FAILURE
    );
    $corporateSiteUrl = clean_text($input['corporateSiteUrl'] ?? '', 500);
    $sellerInput = is_array($input['seller'] ?? null) ? $input['seller'] : [];
    $seller = [
        'legalName' => clean_text($sellerInput['legalName'] ?? '', 190),
        'address' => clean_text($sellerInput['address'] ?? '', 500),
        'email' => strtolower(clean_text($sellerInput['email'] ?? '', 190)),
        'registrationId' => clean_text($sellerInput['registrationId'] ?? '', 190),
        'jurisdictionNote' => clean_text($sellerInput['jurisdictionNote'] ?? '', 300),
    ];
    $urlParts = parse_url($corporateSiteUrl);
    $validUrl = filter_var($corporateSiteUrl, FILTER_VALIDATE_URL)
        && is_array($urlParts)
        && in_array(strtolower((string) ($urlParts['scheme'] ?? '')), ['http', 'https'], true);
    if (
        $announcement === ''
        || ($whatsapp !== '' && preg_match('/^\d{10,15}$/', $whatsapp) !== 1)
        || $acceptingOrders === null
        || !$validUrl
        || ($seller['email'] !== '' && !filter_var($seller['email'], FILTER_VALIDATE_EMAIL))
    ) {
        json_response(['error' => 'Mağaza ayarları geçersiz.', 'code' => 'validation_error'], 422);
    }
    if (
        $acceptingOrders
        && (
            preg_match('/^\d{10,15}$/', $whatsapp) !== 1
            || $seller['legalName'] === ''
            || $seller['address'] === ''
            || $seller['email'] === ''
        )
    ) {
        json_response([
            'error' => 'Siparişi açmak için WhatsApp numarası ve zorunlu işletme bilgileri tamamlanmalı.',
            'code' => 'store_not_ready',
        ], 422);
    }
    return [
        'announcement' => $announcement,
        'whatsappNumber' => $whatsapp,
        'acceptingOrders' => $acceptingOrders,
        'corporateSiteUrl' => $corporateSiteUrl,
        'seller' => $seller,
    ];
}

function clean_string_list(mixed $value): array
{
    if (!is_array($value)) {
        return [];
    }
    $items = [];
    foreach (array_slice($value, 0, 20) as $item) {
        $clean = clean_text($item, 80);
        if ($clean !== '' && !in_array($clean, $items, true)) {
            $items[] = $clean;
        }
    }
    return $items;
}

function clean_size_options(mixed $value): array
{
    if (!is_array($value)) {
        return [];
    }
    $items = [];
    $names = [];
    foreach (array_slice($value, 0, 20) as $item) {
        if (is_string($item)) {
            $name = clean_text($item, 80);
            $priceDelta = 0.0;
        } elseif (is_array($item)) {
            $name = clean_text($item['name'] ?? '', 80);
            $rawDelta = $item['priceDelta'] ?? 0;
            $priceDelta = filter_var($rawDelta, FILTER_VALIDATE_FLOAT);
        } else {
            continue;
        }
        $normalizedName = text_lower($name);
        if (
            $name === '' ||
            $priceDelta === false ||
            $priceDelta < 0 ||
            $priceDelta > 1000000 ||
            in_array($normalizedName, $names, true)
        ) {
            continue;
        }
        $names[] = $normalizedName;
        $items[] = ['name' => $name, 'priceDelta' => (float) $priceDelta];
    }
    return $items;
}

function clean_product_images(mixed $value, mixed $legacyImage = null): array
{
    $source = is_array($value)
        ? $value
        : (is_string($legacyImage) && trim($legacyImage) !== '' ? [$legacyImage] : []);
    if (count($source) > 4) {
        json_response(['error' => 'Bir ürüne en fazla 4 görsel eklenebilir.', 'code' => 'validation_error'], 422);
    }
    $images = [];
    $totalBytes = 0;
    $mimeMap = [
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
    ];
    foreach ($source as $image) {
        if (!is_string($image)) {
            json_response(['error' => 'Ürün görseli geçersiz.', 'code' => 'validation_error'], 422);
        }
        $image = trim($image);
        if (!preg_match('#^data:image/(png|jpe?g|webp);base64,(.+)$#is', $image, $matches)) {
            json_response(['error' => 'Ürün görseli geçersiz veya çok büyük.', 'code' => 'validation_error'], 422);
        }
        $binary = base64_decode(preg_replace('/\s+/', '', $matches[2]) ?? '', true);
        if ($binary === false || strlen($binary) === 0 || strlen($binary) > 700 * 1024) {
            json_response(['error' => 'Her ürün görseli en fazla 700 KB olabilir.', 'code' => 'validation_error'], 422);
        }
        $detectedMime = '';
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo !== false) {
                $detectedMime = (string) finfo_buffer($finfo, $binary);
            }
        }
        if ($detectedMime === '' && function_exists('getimagesizefromstring')) {
            $imageInfo = @getimagesizefromstring($binary);
            $detectedMime = is_array($imageInfo) ? (string) ($imageInfo['mime'] ?? '') : '';
        }
        $declaredMime = $mimeMap[strtolower($matches[1])] ?? '';
        if ($detectedMime === '' || !in_array($detectedMime, $mimeMap, true) || $detectedMime !== $declaredMime) {
            json_response(['error' => 'Görselin dosya içeriği ile MIME türü eşleşmiyor.', 'code' => 'validation_error'], 422);
        }
        $totalBytes += strlen($binary);
        if ($totalBytes > 4 * 700 * 1024) {
            json_response(['error' => 'Ürün galerisinin toplam boyutu çok büyük.', 'code' => 'validation_error'], 422);
        }
        if (!in_array($image, $images, true)) {
            $images[] = $image;
        }
    }
    return $images;
}

function validate_product(array $input, ?string $expectedId = null): array
{
    $id = clean_text($input['id'] ?? '', 120);
    $name = clean_text($input['name'] ?? '', 190);
    $category = clean_text($input['category'] ?? '', 120);
    $description = clean_text($input['description'] ?? '', 5000);
    $material = clean_text($input['material'] ?? '', 3000);
    $badge = clean_text($input['badge'] ?? '', 80);
    $kind = clean_text($input['kind'] ?? '', 40);
    $tone = clean_text($input['tone'] ?? '', 30);
    $colors = clean_string_list($input['colors'] ?? null);
    $sizes = clean_size_options($input['sizes'] ?? null);
    $price = filter_var($input['price'] ?? null, FILTER_VALIDATE_FLOAT);
    $oldPriceRaw = $input['oldPrice'] ?? null;
    $oldPrice = $oldPriceRaw === null || $oldPriceRaw === ''
        ? null
        : filter_var($oldPriceRaw, FILTER_VALIDATE_FLOAT);
    $active = filter_var($input['active'] ?? true, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
    $images = clean_product_images($input['images'] ?? null, $input['image'] ?? null);
    $templateVisible = filter_var(
        $input['templateVisible'] ?? true,
        FILTER_VALIDATE_BOOL,
        FILTER_NULL_ON_FAILURE
    );

    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $id)) {
        json_response(['error' => 'Geçersiz ürün kodu.', 'code' => 'validation_error'], 422);
    }
    if ($expectedId !== null && !hash_equals($expectedId, $id)) {
        json_response(['error' => 'Ürün kodu sonradan değiştirilemez.', 'code' => 'validation_error'], 422);
    }
    if (text_length($name) < 3 || $category === '' || text_length($description) < 12 || text_length($material) < 5) {
        json_response(['error' => 'Zorunlu ürün alanları eksik.', 'code' => 'validation_error'], 422);
    }
    if ($price === false || $price <= 0 || ($oldPrice !== null && ($oldPrice === false || $oldPrice <= $price))) {
        json_response(['error' => 'Fiyat bilgileri geçersiz.', 'code' => 'validation_error'], 422);
    }
    if (!in_array($kind, ['poster', 'tote', 'notebook', 'tee', 'art', 'cup', 'stickers', 'object'], true)) {
        json_response(['error' => 'Görsel şablonu geçersiz.', 'code' => 'validation_error'], 422);
    }
    if (!in_array($tone, ['lime', 'black', 'cream'], true) || count($colors) === 0 || count($sizes) === 0) {
        json_response(['error' => 'Varyant bilgileri geçersiz.', 'code' => 'validation_error'], 422);
    }
    if ($active === null || $templateVisible === null) {
        json_response(['error' => 'Yayın veya görsel durumu geçersiz.', 'code' => 'validation_error'], 422);
    }
    return [
        'id' => $id,
        'name' => $name,
        'category' => $category,
        'price' => (float) $price,
        'oldPrice' => $oldPrice === null ? null : (float) $oldPrice,
        'badge' => $badge === '' ? null : $badge,
        'kind' => $kind,
        'tone' => $tone,
        'colors' => $colors,
        'sizes' => $sizes,
        'description' => $description,
        'material' => $material,
        'images' => $images,
        'templateVisible' => $templateVisible,
        'active' => $active,
    ];
}
