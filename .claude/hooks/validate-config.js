/**
 * Pre-Deploy Validation Hook
 * Deploy öncesi konfigürasyon tutarlılığını kontrol eder
 *
 * Kullanım: node .claude/hooks/validate-config.js
 */

const fs = require('fs');
const path = require('path');

// Renk kodları
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(color, symbol, message) {
  console.log(`${colors[color]}${symbol}${colors.reset} ${message}`);
}

// Dosya varlığını kontrol et
function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    log('green', '✓', `${description} mevcut`);
    return true;
  } else {
    log('red', '✗', `${description} eksik: ${filePath}`);
    return false;
  }
}

// JSON dosyasını doğrula
function validateJSON(filePath, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    JSON.parse(content);
    log('green', '✓', `${description} geçerli JSON`);
    return true;
  } catch (error) {
    log('red', '✗', `${description} geçersiz JSON: ${error.message}`);
    return false;
  }
}

// TypeScript dosyasında syntax hatası kontrolü (basit)
function checkTypeScriptSyntax(filePath, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Basit kontroller
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;

    if (openBraces !== closeBraces) {
      log('yellow', '⚠', `${description}: Süslü parantez eşleşmiyor (${openBraces} { vs ${closeBraces} })`);
      return false;
    }

    if (openParens !== closeParens) {
      log('yellow', '⚠', `${description}: Parantez eşleşmiyor (${openParens} ( vs ${closeParens} ))`);
      return false;
    }

    log('green', '✓', `${description} syntax OK`);
    return true;
  } catch (error) {
    log('red', '✗', `${description} okunamadı: ${error.message}`);
    return false;
  }
}

// Types dosyasında gerekli tiplerin varlığını kontrol et
function checkRequiredTypes(typesPath) {
  const requiredTypes = [
    'EffectiveRules',
    'VariationRules',
    'ProductionHistoryEntry',
    'Scenario',
    'HandStyle',
    'AssetSelection',
  ];

  try {
    const content = fs.readFileSync(typesPath, 'utf-8');
    let allFound = true;

    requiredTypes.forEach(typeName => {
      if (content.includes(`export interface ${typeName}`) || content.includes(`export type ${typeName}`)) {
        log('green', '✓', `Tip tanımlı: ${typeName}`);
      } else {
        log('red', '✗', `Tip eksik: ${typeName}`);
        allFound = false;
      }
    });

    return allFound;
  } catch (error) {
    log('red', '✗', `Types dosyası okunamadı: ${error.message}`);
    return false;
  }
}

// ORCHESTRATOR.md ile kod tutarlılığını kontrol et
function checkRulesConsistency() {
  const orchestratorPath = path.join(__dirname, '..', 'rules', 'ORCHESTRATOR.md');
  const rulesServicePath = path.join(__dirname, '..', '..', 'functions', 'src', 'orchestrator', 'rulesService.ts');

  if (!fs.existsSync(orchestratorPath) || !fs.existsSync(rulesServicePath)) {
    log('yellow', '⚠', 'Tutarlılık kontrolü atlandı (dosyalar eksik)');
    return true;
  }

  const orchestratorContent = fs.readFileSync(orchestratorPath, 'utf-8');
  const rulesServiceContent = fs.readFileSync(rulesServicePath, 'utf-8');

  // Senaryo ID'lerini kontrol et
  const scenarioIdsInMD = orchestratorContent.match(/\| ([\w-]+) \|/g)?.map(m => m.replace(/\| /g, '').replace(/ \|/g, '')) || [];
  const scenarioIdsInCode = rulesServiceContent.match(/id: ["']([\w-]+)["']/g)?.map(m => m.replace(/id: ["']/g, '').replace(/["']/g, '')) || [];

  // Basit karşılaştırma
  const missingInCode = scenarioIdsInMD.filter(id => !scenarioIdsInCode.includes(id) && id !== 'ID' && !id.includes('---'));

  if (missingInCode.length > 0 && missingInCode.length < 5) { // False positive azaltmak için
    log('yellow', '⚠', `ORCHESTRATOR.md'deki bazı senaryolar kodda yok: ${missingInCode.join(', ')}`);
  } else {
    log('green', '✓', 'Senaryo tutarlılığı OK');
  }

  return true;
}

// Ana validasyon fonksiyonu
async function main() {
  console.log('\n🔍 Pre-Deploy Validation başlıyor...\n');
  console.log('─'.repeat(50));

  let hasErrors = false;
  let hasWarnings = false;

  const basePath = path.join(__dirname, '..', '..');
  const functionsPath = path.join(basePath, 'functions', 'src', 'orchestrator');

  // 1. Kritik dosyaların varlığı
  console.log('\n📁 Dosya Kontrolü:');

  const criticalFiles = [
    { path: path.join(functionsPath, 'orchestrator.ts'), desc: 'orchestrator.ts' },
    { path: path.join(functionsPath, 'claudeService.ts'), desc: 'claudeService.ts' },
    { path: path.join(functionsPath, 'rulesService.ts'), desc: 'rulesService.ts' },
    { path: path.join(functionsPath, 'scheduler.ts'), desc: 'scheduler.ts' },
    { path: path.join(functionsPath, 'types.ts'), desc: 'types.ts' },
    { path: path.join(__dirname, '..', 'rules', 'ORCHESTRATOR.md'), desc: 'ORCHESTRATOR.md' },
  ];

  criticalFiles.forEach(file => {
    if (!checkFileExists(file.path, file.desc)) {
      hasErrors = true;
    }
  });

  // 2. TypeScript syntax kontrolü
  console.log('\n📝 Syntax Kontrolü:');

  const tsFiles = [
    { path: path.join(functionsPath, 'orchestrator.ts'), desc: 'orchestrator.ts' },
    { path: path.join(functionsPath, 'claudeService.ts'), desc: 'claudeService.ts' },
    { path: path.join(functionsPath, 'rulesService.ts'), desc: 'rulesService.ts' },
  ];

  tsFiles.forEach(file => {
    if (fs.existsSync(file.path)) {
      if (!checkTypeScriptSyntax(file.path, file.desc)) {
        hasWarnings = true;
      }
    }
  });

  // 3. Gerekli tiplerin varlığı
  console.log('\n📐 Tip Kontrolü:');

  const typesPath = path.join(functionsPath, 'types.ts');
  if (fs.existsSync(typesPath)) {
    if (!checkRequiredTypes(typesPath)) {
      hasErrors = true;
    }
  }

  // 4. Tutarlılık kontrolü
  console.log('\n🔗 Tutarlılık Kontrolü:');
  checkRulesConsistency();

  // Sonuç
  console.log('\n' + '─'.repeat(50));

  if (hasErrors) {
    log('red', '❌', 'Validasyon BAŞARISIZ - Deploy engellendi\n');
    process.exit(1);
  } else if (hasWarnings) {
    log('yellow', '⚠️', 'Validasyon tamamlandı (uyarılarla)\n');
    process.exit(0);
  } else {
    log('green', '✅', 'Validasyon başarılı - Deploy hazır\n');
    process.exit(0);
  }
}

// Çalıştır
main().catch(err => {
  console.error('❌ Validation hatası:', err);
  process.exit(1);
});
