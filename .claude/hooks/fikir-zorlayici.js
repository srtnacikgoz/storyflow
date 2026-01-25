#!/usr/bin/env node

/**
 * Fikir Zorlayıcı Hook
 *
 * Bu script Claude Code hooks tarafından çağrılır ve proaktif fikir
 * üretimini zorlar.
 *
 * Kullanım:
 *   node fikir-zorlayici.js [mode]
 *
 * Modlar:
 *   session-start    - Oturum başında proaktif fikir hatırlatması
 *   post-feature     - Özellik eklendikten sonra fikir uyarısı
 *   post-edit        - Dosya düzenlendikten sonra fikir kontrolü
 *   post-todo        - TODO tamamlandıktan sonra fikir önerisi
 *   reminder         - Periyodik fikir hatırlatması
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

// Emoji'ler
const emoji = {
  bulb: '💡',
  rocket: '🚀',
  warning: '⚠️',
  check: '✅',
  brain: '🧠',
  link: '🔗',
  chart: '📈',
  gear: '⚙️',
  question: '❓',
  star: '⭐'
};

// Proje kök dizini
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const IDEAS_FILE = path.join(PROJECT_ROOT, '.claude/IDEAS.md');
const FEEDBACK_FILE = path.join(PROJECT_ROOT, '.claude/FEEDBACK.md');

// Son fikir sunulma zamanını takip et (basit önbellek)
let lastIdeaTime = 0;
const IDEA_COOLDOWN = 5 * 60 * 1000; // 5 dakika

/**
 * IDEAS.md'deki fikir sayısını al
 */
function getIdeasCount() {
  try {
    if (!fs.existsSync(IDEAS_FILE)) return 0;
    const content = fs.readFileSync(IDEAS_FILE, 'utf-8');
    const matches = content.match(/## \[FİKİR-\d+\]/g);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

/**
 * FEEDBACK.md'deki açık TODO sayısını al
 */
function getOpenTodosCount() {
  try {
    if (!fs.existsSync(FEEDBACK_FILE)) return 0;
    const content = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
    const matches = content.match(/\*\*Durum:\*\* open/g);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Oturum başlangıç mesajı - Proaktif fikir hatırlatması
 */
function sessionStartMessage() {
  const ideasCount = getIdeasCount();
  const todosCount = getOpenTodosCount();

  console.log(`\n${colors.bold}${colors.magenta}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.yellow}  ${emoji.bulb} PROAKTİF FİKİR KURALI AKTİF${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.cyan}${emoji.brain} HATIRLA:${colors.reset}`);
  console.log(`  ${colors.yellow}•${colors.reset} Her değişiklik sonrası EN AZ 3 fikir sun`);
  console.log(`  ${colors.yellow}•${colors.reset} "Başka ne olabilir?" sorusunu sürekli sor`);
  console.log(`  ${colors.yellow}•${colors.reset} SaaS perspektifinden düşün`);
  console.log(`  ${colors.yellow}•${colors.reset} Mevcut yapıyı sorgula`);

  console.log(`\n${colors.cyan}${emoji.chart} DURUM:${colors.reset}`);
  console.log(`  ${colors.dim}•${colors.reset} Kayıtlı fikirler: ${colors.green}${ideasCount}${colors.reset}`);
  console.log(`  ${colors.dim}•${colors.reset} Açık TODO'lar: ${colors.yellow}${todosCount}${colors.reset}`);

  console.log(`\n${colors.cyan}${emoji.gear} FİKİR ÜRETMEK İÇİN:${colors.reset}`);
  console.log(`  ${colors.green}"fikir"${colors.reset} veya ${colors.green}"öneri"${colors.reset} de`);

  console.log(`\n${colors.magenta}═══════════════════════════════════════════════════${colors.reset}\n`);
}

/**
 * Özellik eklendikten sonra fikir uyarısı
 */
function postFeatureWarning() {
  const now = Date.now();

  // Cooldown kontrolü - çok sık uyarı verme
  if (now - lastIdeaTime < IDEA_COOLDOWN) {
    return;
  }
  lastIdeaTime = now;

  console.log(`\n${colors.bold}${colors.yellow}${emoji.warning} FİKİR ZORUNLULUĞU${colors.reset}`);
  console.log(`${colors.dim}─────────────────────────────────────────${colors.reset}`);
  console.log(`${colors.cyan}Yeni özellik/değişiklik tespit edildi.${colors.reset}\n`);

  console.log(`${colors.yellow}DEVAM ETMEDEN ÖNCE:${colors.reset}`);
  console.log(`  ${colors.red}☐${colors.reset} 3 bağlantılı fikir sundun mu?`);
  console.log(`  ${colors.red}☐${colors.reset} SaaS etkisini düşündün mü?`);
  console.log(`  ${colors.red}☐${colors.reset} Mevcut yapıyı sorguladın mı?`);

  console.log(`\n${colors.green}${emoji.bulb} "fikir" diyerek kapsamlı fikir üretebilirsin.${colors.reset}\n`);
}

/**
 * Dosya düzenleme sonrası kontrol
 */
function postEditCheck() {
  // Sadece önemli dosya değişikliklerinde uyar
  const editedFile = process.env.CLAUDE_EDITED_FILE || '';

  // .md, .json gibi config dosyalarını atla
  const skipExtensions = ['.md', '.json', '.yaml', '.yml', '.env'];
  const ext = path.extname(editedFile).toLowerCase();

  if (skipExtensions.includes(ext)) {
    return;
  }

  // Kod dosyası değiştiyse uyar
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  if (codeExtensions.includes(ext)) {
    postFeatureWarning();
  }
}

/**
 * TODO tamamlandıktan sonra fikir önerisi
 */
function postTodoComplete() {
  console.log(`\n${colors.green}${emoji.check} TODO TAMAMLANDI${colors.reset}`);
  console.log(`${colors.dim}─────────────────────────────────────────${colors.reset}`);
  console.log(`${colors.cyan}Bu tamamlanan TODO ile ilişkili:${colors.reset}\n`);

  console.log(`  ${colors.yellow}${emoji.question}${colors.reset} Yeni fikirler var mı?`);
  console.log(`  ${colors.yellow}${emoji.link}${colors.reset} Bağlantılı başka TODO'lar oluştu mu?`);
  console.log(`  ${colors.yellow}${emoji.chart}${colors.reset} SaaS için düşünülecek bir şey var mı?`);

  console.log(`\n${colors.dim}İlgili fikirler varsa IDEAS.md'ye ekle.${colors.reset}\n`);
}

/**
 * Periyodik fikir hatırlatması
 */
function periodicReminder() {
  const reminders = [
    `${emoji.bulb} Fikir sundun mu? Her değişiklik sonrası 3 fikir!`,
    `${emoji.brain} SaaS perspektifinden düşün: Bu özellik ölçeklenir mi?`,
    `${emoji.question} Mevcut yapı optimal mı? Hardcoded değer var mı?`,
    `${emoji.link} Entegrasyon fırsatı var mı? Cross-feature düşün!`,
    `${emoji.chart} Bu değişiklik SaaS müşterileri için ne ifade eder?`,
    `${emoji.gear} Dinamik olabilir mi? Enum yerine collection?`,
    `${emoji.star} En iyi 3 fikir hangisi? Önceliklendir!`
  ];

  const randomReminder = reminders[Math.floor(Math.random() * reminders.length)];

  // %30 ihtimalle göster (çok sık olmasın)
  if (Math.random() < 0.3) {
    console.log(`${colors.magenta}${randomReminder}${colors.reset}`);
  }
}

/**
 * Fikir sorgulaması - interaktif
 */
function ideaQuery() {
  console.log(`\n${colors.bold}${colors.cyan}${emoji.brain} FİKİR SORGULAMA${colors.reset}`);
  console.log(`${colors.dim}─────────────────────────────────────────${colors.reset}\n`);

  console.log(`${colors.yellow}Son yapılan iş için:${colors.reset}`);
  console.log(`  1. ${colors.cyan}Genişletme${colors.reset}: Bu nasıl büyütülebilir?`);
  console.log(`  2. ${colors.cyan}Bağlantı${colors.reset}: Başka neyle entegre olabilir?`);
  console.log(`  3. ${colors.cyan}Sorgulama${colors.reset}: Mevcut yapı optimal mı?`);
  console.log(`  4. ${colors.cyan}SaaS${colors.reset}: Çoklu müşteri için uygun mu?`);
  console.log(`  5. ${colors.cyan}Alternatif${colors.reset}: Başka nasıl yapılabilirdi?`);

  console.log(`\n${colors.green}En az 3 fikir sun ve kullanıcıya sor!${colors.reset}\n`);
}

/**
 * Ana fonksiyon
 */
function main() {
  const mode = process.argv[2] || 'session-start';

  switch (mode) {
    case 'session-start':
      sessionStartMessage();
      break;
    case 'post-feature':
      postFeatureWarning();
      break;
    case 'post-edit':
      postEditCheck();
      break;
    case 'post-todo':
      postTodoComplete();
      break;
    case 'reminder':
      periodicReminder();
      break;
    case 'query':
      ideaQuery();
      break;
    default:
      console.log(`Bilinmeyen mod: ${mode}`);
      console.log('Kullanılabilir modlar: session-start, post-feature, post-edit, post-todo, reminder, query');
      process.exit(1);
  }
}

main();
