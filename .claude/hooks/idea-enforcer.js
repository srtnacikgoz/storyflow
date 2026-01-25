#!/usr/bin/env node

/**
 * Idea Enforcer Hook - Fikir Zorlama Mekanizması
 *
 * Bu hook, Claude'un fikir sunmadan sürekli kod yazmasını ENGELLER.
 * Dengeli versiyon: 3+ kod değişikliği sonrası ve 10dk+ fikir yoksa tetiklenir.
 *
 * Kullanım:
 *   node idea-enforcer.js [mode] [file]
 *
 * Modlar:
 *   pre-write      - Write öncesi kontrol (engelleyici)
 *   pre-edit       - Edit öncesi kontrol (engelleyici)
 *   post-idea      - IDEAS.md yazıldıktan sonra (state reset)
 *   session-start  - Oturum başında state sıfırla
 *   bypass         - Geçici bypass (5 dakika)
 *   status         - Mevcut durumu göster
 *   reset          - State'i tamamen sıfırla
 *
 * Ayarlar:
 *   CODE_CHANGE_THRESHOLD = 3   (kaç değişiklik sonrası tetiklensin)
 *   IDEA_COOLDOWN_MS = 600000   (10 dakika)
 *   BYPASS_DURATION_MS = 300000 (5 dakika)
 */

const fs = require('fs');
const path = require('path');

// Renkli çıktı için ANSI kodları
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

// Ayarlar
const CONFIG = {
  CODE_CHANGE_THRESHOLD: 3,        // Kaç değişiklik sonrası tetiklensin
  IDEA_COOLDOWN_MS: 10 * 60 * 1000, // 10 dakika
  BYPASS_DURATION_MS: 5 * 60 * 1000, // 5 dakika bypass süresi
  CODE_EXTENSIONS: ['.ts', '.tsx', '.js', '.jsx'], // Sayılan dosya uzantıları
  EXCLUDED_PATHS: ['node_modules', '.claude/hooks', 'dist', 'build'] // Hariç tutulan pathler
};

// Proje kök dizini
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const STATE_FILE = path.join(PROJECT_ROOT, '.claude/state/idea-tracker.json');
const IDEAS_FILE = path.join(PROJECT_ROOT, '.claude/IDEAS.md');

/**
 * State dosyasını oku
 */
function readState() {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return createDefaultState();
    }
    const content = fs.readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`${colors.red}State okunamadı: ${error.message}${colors.reset}`);
    return createDefaultState();
  }
}

/**
 * State dosyasını yaz
 */
function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error(`${colors.red}State yazılamadı: ${error.message}${colors.reset}`);
  }
}

/**
 * Varsayılan state oluştur
 */
function createDefaultState() {
  return {
    lastIdeaTimestamp: Date.now(),
    pendingCodeChanges: 0,
    ideaRequired: false,
    bypassUntil: 0,
    sessionStart: Date.now(),
    totalIdeasThisSession: 0,
    totalChangesThisSession: 0
  };
}

/**
 * Dosyanın kod dosyası olup olmadığını kontrol et
 */
function isCodeFile(filePath) {
  if (!filePath) return false;

  // Hariç tutulan pathler
  for (const excluded of CONFIG.EXCLUDED_PATHS) {
    if (filePath.includes(excluded)) {
      return false;
    }
  }

  // Uzantı kontrolü
  const ext = path.extname(filePath).toLowerCase();
  return CONFIG.CODE_EXTENSIONS.includes(ext);
}

/**
 * Bypass aktif mi kontrol et
 */
function isBypassActive(state) {
  return state.bypassUntil > Date.now();
}

/**
 * Fikir gerekli mi kontrol et
 */
function isIdeaRequired(state) {
  const now = Date.now();
  const timeSinceLastIdea = now - state.lastIdeaTimestamp;

  return (
    state.pendingCodeChanges >= CONFIG.CODE_CHANGE_THRESHOLD &&
    timeSinceLastIdea > CONFIG.IDEA_COOLDOWN_MS
  );
}

/**
 * Pre-Write/Edit kontrolü - ENGELLEYİCİ
 */
function preWriteCheck(filePath) {
  // Kod dosyası değilse geç
  if (!isCodeFile(filePath)) {
    return;
  }

  const state = readState();

  // Bypass aktifse geç
  if (isBypassActive(state)) {
    const remaining = Math.ceil((state.bypassUntil - Date.now()) / 1000 / 60);
    console.log(`${colors.yellow}🔓 Bypass aktif (${remaining} dk kaldı)${colors.reset}`);

    // Değişiklik sayısını artır (bypass'ta bile sayılsın)
    state.pendingCodeChanges++;
    state.totalChangesThisSession++;
    saveState(state);
    return;
  }

  // Fikir gerekli mi?
  if (isIdeaRequired(state)) {
    const timeSinceIdea = Math.ceil((Date.now() - state.lastIdeaTimestamp) / 1000 / 60);

    console.log(`\n${colors.bold}${colors.red}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}${colors.red}  ⛔ FİKİR SUNMADAN KOD YAZAMAZSIN!${colors.reset}`);
    console.log(`${colors.red}═══════════════════════════════════════════════════${colors.reset}\n`);

    console.log(`${colors.yellow}📊 Durum:${colors.reset}`);
    console.log(`  ${colors.dim}•${colors.reset} Kod değişikliği: ${colors.red}${state.pendingCodeChanges}${colors.reset} (limit: ${CONFIG.CODE_CHANGE_THRESHOLD})`);
    console.log(`  ${colors.dim}•${colors.reset} Son fikir: ${colors.red}${timeSinceIdea} dk${colors.reset} önce (limit: ${CONFIG.IDEA_COOLDOWN_MS / 60000} dk)`);

    console.log(`\n${colors.cyan}🔧 Çözüm seçenekleri:${colors.reset}`);
    console.log(`  ${colors.green}1.${colors.reset} IDEAS.md'ye fikir ekle`);
    console.log(`  ${colors.green}2.${colors.reset} "fikir" diyerek fikir üret`);
    console.log(`  ${colors.green}3.${colors.reset} Acil durum için: node .claude/hooks/idea-enforcer.js bypass`);

    console.log(`\n${colors.red}═══════════════════════════════════════════════════${colors.reset}\n`);

    // İŞLEMİ ENGELLE
    process.exit(1);
  }

  // Değişiklik sayısını artır
  state.pendingCodeChanges++;
  state.totalChangesThisSession++;
  saveState(state);

  // Yaklaşan uyarı
  if (state.pendingCodeChanges === CONFIG.CODE_CHANGE_THRESHOLD - 1) {
    console.log(`${colors.yellow}⚠️ Dikkat: Bir sonraki kod değişikliğinde fikir sunman gerekecek!${colors.reset}`);
  }
}

/**
 * IDEAS.md yazıldıktan sonra - State reset
 */
function postIdeaWrite() {
  const state = readState();

  state.lastIdeaTimestamp = Date.now();
  state.pendingCodeChanges = 0;
  state.ideaRequired = false;
  state.totalIdeasThisSession++;

  saveState(state);

  console.log(`${colors.green}✅ Fikir kaydedildi! Kod yazma kilidi açıldı.${colors.reset}`);
  console.log(`${colors.dim}   Bu oturumda: ${state.totalIdeasThisSession} fikir, ${state.totalChangesThisSession} değişiklik${colors.reset}`);
}

/**
 * Oturum başlangıcı - State sıfırla
 */
function sessionStart() {
  const state = createDefaultState();
  saveState(state);

  console.log(`${colors.cyan}🔄 Fikir takip sistemi başlatıldı${colors.reset}`);
  console.log(`${colors.dim}   Threshold: ${CONFIG.CODE_CHANGE_THRESHOLD} değişiklik, Cooldown: ${CONFIG.IDEA_COOLDOWN_MS / 60000} dk${colors.reset}`);
}

/**
 * Geçici bypass
 */
function activateBypass() {
  const state = readState();
  state.bypassUntil = Date.now() + CONFIG.BYPASS_DURATION_MS;
  saveState(state);

  const minutes = CONFIG.BYPASS_DURATION_MS / 60000;
  console.log(`\n${colors.yellow}🔓 BYPASS AKTİF - ${minutes} dakika${colors.reset}`);
  console.log(`${colors.dim}   Bu süre içinde fikir sunmadan kod yazabilirsin.${colors.reset}`);
  console.log(`${colors.dim}   Ama unutma: Proaktif fikir üretmek senin sorumluluğun!${colors.reset}\n`);
}

/**
 * Mevcut durumu göster
 */
function showStatus() {
  const state = readState();
  const now = Date.now();
  const timeSinceIdea = Math.ceil((now - state.lastIdeaTimestamp) / 1000 / 60);
  const bypassActive = isBypassActive(state);
  const ideaRequired = isIdeaRequired(state);

  console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  📊 FİKİR TAKİP DURUMU${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.yellow}Mevcut Oturum:${colors.reset}`);
  console.log(`  ${colors.dim}•${colors.reset} Bekleyen değişiklik: ${state.pendingCodeChanges}/${CONFIG.CODE_CHANGE_THRESHOLD}`);
  console.log(`  ${colors.dim}•${colors.reset} Son fikir: ${timeSinceIdea} dk önce`);
  console.log(`  ${colors.dim}•${colors.reset} Toplam fikir: ${state.totalIdeasThisSession}`);
  console.log(`  ${colors.dim}•${colors.reset} Toplam değişiklik: ${state.totalChangesThisSession}`);

  console.log(`\n${colors.yellow}Durum:${colors.reset}`);
  console.log(`  ${colors.dim}•${colors.reset} Bypass: ${bypassActive ? `${colors.yellow}AKTİF${colors.reset}` : `${colors.dim}kapalı${colors.reset}`}`);
  console.log(`  ${colors.dim}•${colors.reset} Fikir gerekli: ${ideaRequired ? `${colors.red}EVET${colors.reset}` : `${colors.green}hayır${colors.reset}`}`);

  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);
}

/**
 * State'i tamamen sıfırla
 */
function resetState() {
  const state = createDefaultState();
  saveState(state);
  console.log(`${colors.green}✅ State tamamen sıfırlandı.${colors.reset}`);
}

/**
 * Ana fonksiyon
 */
function main() {
  const mode = process.argv[2] || 'status';
  const filePath = process.argv[3] || process.env.CLAUDE_TOOL_FILE || '';

  switch (mode) {
    case 'pre-write':
    case 'pre-edit':
      preWriteCheck(filePath);
      break;
    case 'post-idea':
      postIdeaWrite();
      break;
    case 'session-start':
      sessionStart();
      break;
    case 'bypass':
      activateBypass();
      break;
    case 'status':
      showStatus();
      break;
    case 'reset':
      resetState();
      break;
    default:
      console.log(`Bilinmeyen mod: ${mode}`);
      console.log('Kullanılabilir modlar: pre-write, pre-edit, post-idea, session-start, bypass, status, reset');
      process.exit(1);
  }
}

main();
