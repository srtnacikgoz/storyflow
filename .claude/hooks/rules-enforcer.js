#!/usr/bin/env node

/**
 * Rules Enforcer Hook
 *
 * Bu script Claude Code hooks tarafından çağrılır ve kuralların
 * okunup uygulandığından emin olur.
 *
 * Kullanım:
 *   node rules-enforcer.js [mode]
 *
 * Modlar:
 *   session-start  - Oturum başında tüm kuralları hatırlat
 *   pre-write      - Dosya yazmadan önce kritik kuralları kontrol et
 *   pre-bash       - Bash komutu öncesi güvenlik kontrolü
 *   pre-deploy     - Deploy öncesi tam kontrol
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
  bold: '\x1b[1m'
};

// Proje kök dizini
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const RULES_DIR = path.join(PROJECT_ROOT, '.claude/rules');

// Kural dosyalarını oku
function readRulesFiles() {
  const rules = {};

  try {
    const files = fs.readdirSync(RULES_DIR).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(RULES_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      rules[file] = content;
    }
  } catch (error) {
    console.error(`${colors.red}Kural dosyaları okunamadı: ${error.message}${colors.reset}`);
  }

  return rules;
}

// Kritik kuralları çıkar
function extractCriticalRules(rules) {
  const critical = [];

  // Iron-Rules.md'den kritik kuralları çek
  if (rules['Iron-Rules.md']) {
    const ironRules = rules['Iron-Rules.md'];

    // KRİTİK etiketli satırları bul
    const lines = ironRules.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('KRİTİK') || lines[i].includes('CRITICAL')) {
        // Bir sonraki birkaç satırı da al
        critical.push(lines[i]);
        if (lines[i + 1] && !lines[i + 1].startsWith('#')) {
          critical.push(lines[i + 1]);
        }
      }
    }
  }

  return critical;
}

// Oturum başlangıç mesajı
function sessionStartMessage() {
  const rules = readRulesFiles();
  const ruleFiles = Object.keys(rules);

  console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.green}  📋 KURALLAR YÜKLENDİ - OTURUM BAŞLADI${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.yellow}Yüklenen kural dosyaları:${colors.reset}`);
  for (const file of ruleFiles) {
    const size = Math.round(rules[file].length / 1024 * 10) / 10;
    console.log(`  ${colors.green}✓${colors.reset} ${file} (${size} KB)`);
  }

  console.log(`\n${colors.bold}${colors.magenta}⚡ HIZLI HATIRLATMA:${colors.reset}`);
  console.log(`  ${colors.yellow}•${colors.reset} Türkçe cevap ver`);
  console.log(`  ${colors.yellow}•${colors.reset} Alternatifleri açıkla`);
  console.log(`  ${colors.yellow}•${colors.reset} Önce oku, sonra düzenle`);
  console.log(`  ${colors.yellow}•${colors.reset} Test etmeden bitirme`);
  console.log(`  ${colors.yellow}•${colors.reset} TodoWrite kullan`);

  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);
}

// Dosya yazma öncesi kontrol
function preWriteCheck() {
  console.log(`\n${colors.yellow}📝 WRITE ÖNCESİ KONTROL:${colors.reset}`);
  console.log(`  ${colors.blue}•${colors.reset} Dosyayı önce okudun mu?`);
  console.log(`  ${colors.blue}•${colors.reset} Mevcut yapıyı anladın mı?`);
  console.log(`  ${colors.blue}•${colors.reset} Placeholder kod yazma!`);
  console.log(`  ${colors.blue}•${colors.reset} Gizli bilgi içermiyor mu?\n`);
}

// Bash komutu öncesi güvenlik kontrolü
function preBashCheck() {
  // Tehlikeli komutları kontrol et
  const command = process.env.CLAUDE_BASH_COMMAND || '';

  const dangerousPatterns = [
    /rm\s+-rf?\s+[\/~]/,  // rm -rf / veya ~
    /rm\s+-rf?\s+\.\./,   // rm -rf ..
    />\s*\/dev\/sd/,       // disk üzerine yazma
    /mkfs/,                // format
    /dd\s+if=/,            // disk dump
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      console.log(`\n${colors.red}${colors.bold}⚠️  TEHLİKELİ KOMUT TESPİT EDİLDİ!${colors.reset}`);
      console.log(`${colors.red}Komut: ${command}${colors.reset}`);
      console.log(`${colors.yellow}Bu komut sistem dosyalarına zarar verebilir.${colors.reset}\n`);
      process.exit(1); // Komutu engelle
    }
  }

  // Genel hatırlatma
  console.log(`${colors.blue}🔒 Güvenlik kontrolü geçti${colors.reset}`);
}

// Deploy öncesi tam kontrol
function preDeployCheck() {
  console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.yellow}  🚀 DEPLOY ÖNCESİ KONTROL LİSTESİ${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);

  const checks = [
    'npm run build başarılı mı?',
    'TypeScript hataları düzeltildi mi?',
    'Lint hataları düzeltildi mi?',
    'Gizli bilgi commit edilmedi mi?',
    '.env dosyaları .gitignore\'da mı?',
    'Test edildi mi?'
  ];

  for (const check of checks) {
    console.log(`  ${colors.yellow}☐${colors.reset} ${check}`);
  }

  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);
}

// Periyodik hatırlatma
function periodicReminder() {
  const reminders = [
    'Türkçe cevap vermeyi unutma!',
    'Alternatifleri açıkla!',
    'Fikrini belirt, soru sor!',
    'Test etmeden bitirme!',
    'Önce oku, sonra düzenle!'
  ];

  const randomReminder = reminders[Math.floor(Math.random() * reminders.length)];
  console.log(`${colors.magenta}💡 Hatırlatma: ${randomReminder}${colors.reset}`);
}

// Ana fonksiyon
function main() {
  const mode = process.argv[2] || 'session-start';

  switch (mode) {
    case 'session-start':
      sessionStartMessage();
      break;
    case 'pre-write':
      preWriteCheck();
      break;
    case 'pre-bash':
      preBashCheck();
      break;
    case 'pre-deploy':
      preDeployCheck();
      break;
    case 'reminder':
      periodicReminder();
      break;
    default:
      console.log(`Bilinmeyen mod: ${mode}`);
      console.log('Kullanılabilir modlar: session-start, pre-write, pre-bash, pre-deploy, reminder');
      process.exit(1);
  }
}

main();
