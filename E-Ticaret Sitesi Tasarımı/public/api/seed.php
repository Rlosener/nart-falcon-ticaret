<?php

declare(strict_types=1);

function default_products(): array
{
    return [
        [
            'id' => 'manifesto-poster',
            'name' => 'Manifesto Poster Seti',
            'category' => 'Poster & Baskı',
            'price' => 690,
            'oldPrice' => null,
            'badge' => 'Yeni',
            'kind' => 'poster',
            'tone' => 'lime',
            'colors' => ['Neon Yeşil', 'Siyah'],
            'sizes' => [
                ['name' => '30 × 40 cm', 'priceDelta' => 0],
                ['name' => '50 × 70 cm', 'priceDelta' => 300],
            ],
            'description' => 'Duvarında bir fikirden fazlası olsun. Cesur tipografi, güçlü bir duruş. İki parçalı Manifesto seti, yaratıcı alanına Nart Falcon karakterini taşır.',
            'material' => '250 gr mat sanat kâğıdı · 2 adet poster · Çerçeve dahil değildir',
            'active' => true,
        ],
        [
            'id' => 'everyday-tote',
            'name' => 'Everyday Tote Bag',
            'category' => 'Giyim & Aksesuar',
            'price' => 490,
            'oldPrice' => null,
            'badge' => 'Çok satan',
            'kind' => 'tote',
            'tone' => 'black',
            'colors' => ['Siyah', 'Doğal'],
            'sizes' => [['name' => 'Standart', 'priceDelta' => 0]],
            'description' => 'Fikirlerini yanında taşı. Dayanıklı pamuk kanvas, geniş iç hacim ve her güne eşlik eden yalın bir tasarım.',
            'material' => '%100 pamuk kanvas · 38 × 42 cm · 65 cm sap',
            'active' => true,
        ],
        [
            'id' => 'creative-notebook',
            'name' => 'Creative Notes Defter',
            'category' => 'Kırtasiye',
            'price' => 320,
            'oldPrice' => null,
            'badge' => null,
            'kind' => 'notebook',
            'tone' => 'cream',
            'colors' => ['Doğal', 'Siyah'],
            'sizes' => [['name' => 'A5', 'priceDelta' => 0]],
            'description' => 'Henüz söylenmemiş fikirler için boş bir alan. Noktalı sayfalar ve düz açılabilen cilt ile düşünceden tasarıma.',
            'material' => '120 sayfa · 100 gr noktalı kâğıt · İplik dikişli cilt',
            'active' => true,
        ],
        [
            'id' => 'signature-tee',
            'name' => 'Signature Oversize T-shirt',
            'category' => 'Giyim & Aksesuar',
            'price' => 890,
            'oldPrice' => 1090,
            'badge' => 'İndirimli',
            'kind' => 'tee',
            'tone' => 'black',
            'colors' => ['Siyah', 'Beyaz'],
            'sizes' => [
                ['name' => 'S', 'priceDelta' => 0],
                ['name' => 'M', 'priceDelta' => 0],
                ['name' => 'L', 'priceDelta' => 0],
                ['name' => 'XL', 'priceDelta' => 80],
            ],
            'description' => 'Duruşunu giy. Rahat kesim, yoğun pamuk dokusu ve küçük bir imza. Günlük stilin için düşünülmüş bir temel parça.',
            'material' => '%100 pamuk · 240 gr kumaş · Oversize kesim',
            'active' => true,
        ],
        [
            'id' => 'bold-print',
            'name' => 'Bold Art Print',
            'category' => 'Poster & Baskı',
            'price' => 450,
            'oldPrice' => null,
            'badge' => 'Yeni',
            'kind' => 'art',
            'tone' => 'cream',
            'colors' => ['Doğal', 'Neon Yeşil'],
            'sizes' => [
                ['name' => '30 × 40 cm', 'priceDelta' => 0],
                ['name' => '50 × 70 cm', 'priceDelta' => 220],
            ],
            'description' => 'Biçimin ötesine geç. Geometrinin ve negatif alanın dengesiyle tasarlanan özel sanat baskısı.',
            'material' => '300 gr dokulu sanat kâğıdı · Arşiv kalitesinde baskı',
            'active' => true,
        ],
        [
            'id' => 'studio-cup',
            'name' => 'Studio Seramik Kupa',
            'category' => 'Yaşam & Obje',
            'price' => 580,
            'oldPrice' => null,
            'badge' => null,
            'kind' => 'cup',
            'tone' => 'cream',
            'colors' => ['Doğal', 'Siyah'],
            'sizes' => [['name' => '300 ml', 'priceDelta' => 0]],
            'description' => 'Yaratıcı molalar için. Elde tamamlanan seramik dokusu ve dengeli formuyla masanda kendine bir yer açar.',
            'material' => 'Seramik · 300 ml · Bulaşık makinesinde yıkanabilir',
            'active' => true,
        ],
        [
            'id' => 'sticker-pack',
            'name' => 'Make Your Mark Sticker Seti',
            'category' => 'Kırtasiye',
            'price' => 190,
            'oldPrice' => null,
            'badge' => null,
            'kind' => 'stickers',
            'tone' => 'lime',
            'colors' => ['Çok Renkli'],
            'sizes' => [['name' => '6 parça', 'priceDelta' => 0]],
            'description' => 'Küçük yüzeyler, güçlü mesajlar. Bilgisayarına, defterine veya yaratıcı alanına kendi izini bırak.',
            'material' => '6 adet vinil sticker · Suya dayanıklı · Mat yüzey',
            'active' => true,
        ],
        [
            'id' => 'limited-object',
            'name' => 'Loop Masa Objesi',
            'category' => 'Yaşam & Obje',
            'price' => 1250,
            'oldPrice' => null,
            'badge' => 'Sınırlı seri',
            'kind' => 'object',
            'tone' => 'black',
            'colors' => ['Siyah'],
            'sizes' => [['name' => 'Standart', 'priceDelta' => 0]],
            'description' => 'Tek bir çizgiden doğan heykelsi bir form. Sınırlı üretim Loop, günlük alanlara farklı bir perspektif getirir.',
            'material' => 'Mat kompozit · 18 × 12 × 8 cm · Sınırlı üretim',
            'active' => true,
        ],
    ];
}

function default_categories(): array
{
    return ['Poster & Baskı', 'Giyim & Aksesuar', 'Kırtasiye', 'Yaşam & Obje'];
}

function default_settings(): array
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

function seed_catalog(PDO $pdo, bool $replace = false): void
{
    if ($replace) {
        $pdo->exec('DELETE FROM activity_log');
        $pdo->exec('DELETE FROM products');
        $pdo->exec('DELETE FROM categories');
        $pdo->exec('DELETE FROM store_settings');
    }

    $categoryStatement = $pdo->prepare(
        'INSERT INTO categories (name, sort_order)
         VALUES (:name, :sort_order)
         ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order)'
    );
    foreach (default_categories() as $index => $category) {
        $categoryStatement->execute([
            ':name' => $category,
            ':sort_order' => $index + 1,
        ]);
    }

    $productCount = (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
    if ($productCount === 0) {
        $statement = $pdo->prepare(
            'INSERT INTO products
            (id, name, category, price, old_price, badge, kind, tone, colors, sizes, description, material, image, active, sort_order)
            VALUES
            (:id, :name, :category, :price, :old_price, :badge, :kind, :tone, :colors, :sizes, :description, :material, NULL, :active, :sort_order)'
        );
        foreach (default_products() as $index => $product) {
            $statement->execute([
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
                ':active' => $product['active'] ? 1 : 0,
                ':sort_order' => $index + 1,
            ]);
        }
    }

    $setting = $pdo->prepare(
        'INSERT INTO store_settings (setting_key, setting_value)
         VALUES (:setting_key, :setting_value)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
    );
    foreach (default_settings() as $key => $value) {
        $setting->execute([
            ':setting_key' => $key,
            ':setting_value' => json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
        ]);
    }
}
