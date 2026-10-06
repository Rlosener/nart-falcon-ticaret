<?php

declare(strict_types=1);

const CONFIG_FILE = __DIR__ . '/api/config.local.php';
const LOCK_FILE = __DIR__ . '/storage/install.lock';

header('Content-Type: text/html; charset=utf-8');
header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store, private');

session_name('nf_installer');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function input_value(string $key, string $fallback = ''): string
{
    return e(is_string($_POST[$key] ?? null) ? trim($_POST[$key]) : $fallback);
}

$locked = is_file(CONFIG_FILE) || is_file(LOCK_FILE);
$success = false;
$error = '';

if (empty($_SESSION['installer_csrf'])) {
    $_SESSION['installer_csrf'] = bin2hex(random_bytes(32));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$locked) {
    $token = is_string($_POST['csrf'] ?? null) ? $_POST['csrf'] : '';
    if (!hash_equals((string) $_SESSION['installer_csrf'], $token)) {
        $error = 'Kurulum oturumu geçersiz. Sayfayı yenileyip tekrar deneyin.';
    } elseif (!extension_loaded('pdo_mysql')) {
        $error = 'Sunucuda PDO MySQL eklentisi etkin değil. Hosting yönetiminden PHP pdo_mysql eklentisini açın.';
    } else {
        $host = is_string($_POST['db_host'] ?? null) ? trim($_POST['db_host']) : '';
        $port = filter_var($_POST['db_port'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1, 'max_range' => 65535],
        ]);
        $database = is_string($_POST['db_name'] ?? null) ? trim($_POST['db_name']) : '';
        $username = is_string($_POST['db_user'] ?? null) ? trim($_POST['db_user']) : '';
        $password = is_string($_POST['db_password'] ?? null) ? $_POST['db_password'] : '';
        $adminEmail = is_string($_POST['admin_email'] ?? null)
            ? strtolower(trim($_POST['admin_email']))
            : '';
        $adminPassword = is_string($_POST['admin_password'] ?? null) ? $_POST['admin_password'] : '';
        $adminPasswordConfirm = is_string($_POST['admin_password_confirm'] ?? null)
            ? $_POST['admin_password_confirm']
            : '';

        if ($host === '' || $port === false || !preg_match('/^[A-Za-z0-9_$-]{1,64}$/', $database) || $username === '') {
            $error = 'Veritabanı sunucusu, portu, adı veya kullanıcı bilgisi geçersiz.';
        } elseif (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL) || strlen($adminEmail) > 190) {
            $error = 'Geçerli bir yönetici e-posta adresi girin.';
        } elseif (
            strlen($adminPassword) < 12 ||
            !preg_match('/[a-z]/', $adminPassword) ||
            !preg_match('/[A-Z]/', $adminPassword) ||
            !preg_match('/\d/', $adminPassword)
        ) {
            $error = 'Yönetici parolası en az 12 karakter olmalı; büyük harf, küçük harf ve rakam içermelidir.';
        } elseif (!hash_equals($adminPassword, $adminPasswordConfirm)) {
            $error = 'Yönetici parolaları eşleşmiyor.';
        } else {
            try {
                $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $host, $port, $database);
                $pdo = new PDO($dsn, $username, $password, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);

                $schema = file_get_contents(__DIR__ . '/database/schema.sql');
                if ($schema === false) {
                    throw new RuntimeException('database/schema.sql okunamadı.');
                }
                $statements = preg_split('/;\s*(?:\r?\n|$)/', trim($schema)) ?: [];
                foreach ($statements as $statement) {
                    if (trim($statement) !== '') {
                        $pdo->exec($statement);
                    }
                }

                require_once __DIR__ . '/api/seed.php';
                seed_catalog($pdo, false);

                $admin = $pdo->prepare(
                    'INSERT INTO admin_users (email, password_hash)
                     VALUES (:email, :password_hash)
                     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), updated_at = CURRENT_TIMESTAMP'
                );
                $admin->execute([
                    ':email' => $adminEmail,
                    ':password_hash' => password_hash($adminPassword, PASSWORD_DEFAULT),
                ]);

                $config = [
                    'host' => $host,
                    'port' => (int) $port,
                    'database' => $database,
                    'username' => $username,
                    'password' => $password,
                    'installed_at' => date(DATE_ATOM),
                ];
                $configContent = "<?php\n\ndeclare(strict_types=1);\n\nreturn " . var_export($config, true) . ";\n";
                $temporary = tempnam(__DIR__ . '/api', 'nf-config-');
                if ($temporary === false || file_put_contents($temporary, $configContent, LOCK_EX) === false) {
                    throw new RuntimeException('API yapılandırma dosyası yazılamadı.');
                }
                chmod($temporary, 0640);
                if (!rename($temporary, CONFIG_FILE)) {
                    @unlink($temporary);
                    throw new RuntimeException('API yapılandırma dosyası etkinleştirilemedi.');
                }

                if (!is_dir(__DIR__ . '/storage') && !mkdir(__DIR__ . '/storage', 0750, true)) {
                    throw new RuntimeException('Kurulum kilidi klasörü oluşturulamadı.');
                }
                $lockPayload = json_encode([
                    'installedAt' => date(DATE_ATOM),
                    'installationId' => bin2hex(random_bytes(16)),
                ], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
                if (file_put_contents(LOCK_FILE, $lockPayload, LOCK_EX) === false) {
                    throw new RuntimeException('Kurulum kilidi yazılamadı.');
                }
                chmod(LOCK_FILE, 0640);
                $_SESSION['installer_csrf'] = bin2hex(random_bytes(32));
                $success = true;
                $locked = true;
            } catch (Throwable $exception) {
                error_log('[Nart Falcon Installer] ' . $exception->getMessage());
                $error = 'Kurulum tamamlanamadı: ' . $exception->getMessage();
            }
        }
    }
}
?>
<!doctype html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <title>Nart Falcon SQL Kurulumu</title>
  <style>
    :root{--ink:#101110;--paper:#f1f3ed;--white:#fbfcf8;--lime:#b8ff32;--line:#d5d8cf;--muted:#71756c}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,sans-serif}main{min-height:100vh;padding:48px 20px;display:grid;place-items:center}.shell{width:min(920px,100%);background:var(--white);border:1px solid var(--line)}header{background:#0c0d0c;color:#fff;padding:40px;border-bottom:3px solid var(--lime)}header img{width:190px;margin-bottom:54px}header span{color:var(--lime);font-size:10px;letter-spacing:.15em}h1{font-size:clamp(42px,6vw,72px);font-weight:500;letter-spacing:-.06em;line-height:1;margin:18px 0}header p{color:#a9ada3;max-width:560px;line-height:1.7}.content{padding:40px}.notice{padding:18px;border-left:3px solid var(--lime);background:#f0f6e7;margin-bottom:28px;line-height:1.6}.notice.error{border-color:#9b3026;background:#f8edea;color:#6f241d}.notice.success{background:#eff9df}form{display:grid;grid-template-columns:1fr 1fr;gap:20px}.wide{grid-column:1/-1}.field{display:flex;flex-direction:column;gap:8px;font-size:12px;font-weight:700}.field small{font-weight:400;color:var(--muted);line-height:1.5}.field input{width:100%;min-height:50px;border:1px solid var(--line);background:#fff;padding:12px;font:inherit}.field input:focus{outline:2px solid var(--ink);outline-offset:2px}.actions{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;gap:20px;margin-top:12px}.button{min-height:50px;border:1px solid var(--ink);background:var(--lime);color:var(--ink);border-radius:28px;padding:14px 24px;font-weight:700;text-decoration:none;cursor:pointer}.text-link{color:inherit;text-decoration:none;border-bottom:1px solid var(--ink);padding:8px 0}.locked{text-align:center;padding:32px 0}.locked h2{font-size:34px;letter-spacing:-.04em;margin:12px 0}.locked p{color:var(--muted);line-height:1.7;max-width:600px;margin:0 auto 24px}@media(max-width:650px){main{padding:0}.shell{border:0}header,.content{padding:28px 22px}header img{margin-bottom:38px;width:165px}form{grid-template-columns:1fr}.wide,.actions{grid-column:auto}.actions{align-items:stretch;flex-direction:column-reverse}.button{width:100%}}
  </style>
</head>
<body>
<main>
  <div class="shell">
    <header>
      <img src="/assets/logo.svg" alt="Nart Falcon Store">
      <span>SQL / OTOMATİK KURULUM</span>
      <h1>Mağazayı veritabanına bağla.</h1>
      <p>Mevcut MySQL veritabanına tabloları, başlangıç ürünlerini ve ilk güvenli yönetici hesabını tek adımda kurar.</p>
    </header>
    <div class="content">
      <?php if ($success): ?>
        <div class="notice success">Kurulum tamamlandı. SQL tabloları, başlangıç kataloğu, ayarlar ve yönetici hesabı oluşturuldu. Kurulum otomatik olarak kilitlendi.</div>
        <div class="locked">
          <h2>Mağaza hazır.</h2>
          <p>Artık yönetim paneline kurulumda belirlediğiniz e-posta ve parola ile giriş yapabilirsiniz.</p>
          <a class="button" href="/#/admin">Yönetim Panelini Aç</a>
        </div>
      <?php elseif ($locked): ?>
        <div class="notice">Kurulum daha önce tamamlanmış ve güvenlik için kilitlenmiş.</div>
        <div class="locked">
          <h2>Yeniden kurulum kapalı.</h2>
          <p>Veriler korunuyor. Yeniden kurulum gerekiyorsa sunucudan <code>api/config.local.php</code> ve <code>storage/install.lock</code> dosyalarını kontrollü olarak kaldırın.</p>
          <a class="button" href="/#/admin">Yönetim Paneline Git</a>
        </div>
      <?php else: ?>
        <div class="notice">cPanel'de önceden bir MySQL veritabanı ve kullanıcı oluşturun; kullanıcıya bu veritabanı için tüm yetkileri verin. Kurucu mevcut veritabanına yalnızca gerekli tabloları ekler.</div>
        <?php if ($error !== ''): ?><div class="notice error" role="alert"><?= e($error) ?></div><?php endif; ?>
        <form method="post" action="/install.php" autocomplete="off">
          <input type="hidden" name="csrf" value="<?= e((string) $_SESSION['installer_csrf']) ?>">
          <label class="field">Veritabanı sunucusu
            <input name="db_host" value="<?= input_value('db_host', 'localhost') ?>" required>
            <small>cPanel kurulumlarında genellikle localhost.</small>
          </label>
          <label class="field">Port
            <input name="db_port" type="number" min="1" max="65535" value="<?= input_value('db_port', '3306') ?>" required>
          </label>
          <label class="field">Veritabanı adı
            <input name="db_name" value="<?= input_value('db_name') ?>" required>
          </label>
          <label class="field">Veritabanı kullanıcısı
            <input name="db_user" value="<?= input_value('db_user') ?>" required>
          </label>
          <label class="field wide">Veritabanı parolası
            <input name="db_password" type="password" autocomplete="new-password">
          </label>
          <label class="field wide">Yönetici e-posta adresi
            <input name="admin_email" type="email" autocomplete="username" value="<?= input_value('admin_email') ?>" required>
          </label>
          <label class="field">Yönetici parolası
            <input name="admin_password" type="password" autocomplete="new-password" minlength="12" required>
            <small>En az 12 karakter; büyük harf, küçük harf ve rakam.</small>
          </label>
          <label class="field">Yönetici parolası tekrar
            <input name="admin_password_confirm" type="password" autocomplete="new-password" minlength="12" required>
          </label>
          <div class="actions">
            <a class="text-link" href="/">Mağazaya dön</a>
            <button class="button" type="submit">SQL Kurulumunu Tamamla</button>
          </div>
        </form>
      <?php endif; ?>
    </div>
  </div>
</main>
</body>
</html>
