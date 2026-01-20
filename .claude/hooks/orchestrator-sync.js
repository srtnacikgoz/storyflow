/**
 * ORCHESTRATOR.md Sync Hook
 * Bu script ORCHESTRATOR.md değiştiğinde çalışır ve Firestore'a senkronize eder
 *
 * Kullanım: node .claude/hooks/orchestrator-sync.js
 */

const fs = require('fs');
const path = require('path');

// ORCHESTRATOR.md dosyasını parse et
function parseOrchestratorMD(content) {
  const rules = {
    scenarios: [],
    handStyles: [],
    assetPersonalities: [],
    absoluteRules: [],
    variationRules: {},
    version: '1.0.0',
    parsedAt: Date.now(),
  };

  // Senaryolar tablosunu parse et
  const scenarioTableMatch = content.match(/## 1\. SENARYOLAR[\s\S]*?\| ID \| Ad \| El Var \| Açıklama \| Kompozisyon Varyantları \|([\s\S]*?)(?=##|$)/);
  if (scenarioTableMatch) {
    const rows = scenarioTableMatch[1].split('\n').filter(row => row.includes('|') && !row.includes('---'));
    rows.forEach(row => {
      const cols = row.split('|').map(c => c.trim()).filter(c => c);
      if (cols.length >= 5) {
        const [id, name, hasHands, description, compositions] = cols;
        if (id && id !== 'ID') {
          rules.scenarios.push({
            id,
            name,
            description,
            includesHands: hasHands === '✓',
            compositions: compositions.split(',').map(c => ({
              id: c.trim(),
              description: c.trim()
            }))
          });
        }
      }
    });
  }

  // El stilleri tablosunu parse et
  const handStylesMatch = content.match(/## 2\. EL STİLLERİ[\s\S]*?\| ID \| Açıklama \| Oje \| Aksesuar \| Dövme \|([\s\S]*?)(?=##|$)/);
  if (handStylesMatch) {
    const rows = handStylesMatch[1].split('\n').filter(row => row.includes('|') && !row.includes('---'));
    rows.forEach(row => {
      const cols = row.split('|').map(c => c.trim()).filter(c => c);
      if (cols.length >= 5) {
        const [id, description, nailPolish, accessories, tattoo] = cols;
        if (id && id !== 'ID') {
          rules.handStyles.push({
            id,
            name: id.charAt(0).toUpperCase() + id.slice(1),
            description,
            nailPolish,
            accessories,
            tattoo
          });
        }
      }
    });
  }

  // Çeşitlilik kurallarını parse et
  const variationMatch = content.match(/### Minimum Aralıklar[\s\S]*?\| Öğe \| Minimum Aralık \| Açıklama \|([\s\S]*?)(?=###|##|$)/);
  if (variationMatch) {
    const rows = variationMatch[1].split('\n').filter(row => row.includes('|') && !row.includes('---'));
    rows.forEach(row => {
      const cols = row.split('|').map(c => c.trim()).filter(c => c);
      if (cols.length >= 2) {
        const [item, gapStr] = cols;
        const gap = parseInt(gapStr.replace(/[^0-9]/g, ''));
        if (item.includes('senaryo')) rules.variationRules.scenarioGap = gap;
        if (item.includes('masa')) rules.variationRules.tableGap = gap;
        if (item.includes('el stili')) rules.variationRules.handStyleGap = gap;
        if (item.includes('kompozisyon')) rules.variationRules.compositionGap = gap;
      }
    });
  }

  // Özel frekansları parse et
  const freqMatch = content.match(/### Özel Frekanslar[\s\S]*?\| Öğe \| Frekans \| Açıklama \|([\s\S]*?)(?=###|##|$)/);
  if (freqMatch) {
    const rows = freqMatch[1].split('\n').filter(row => row.includes('|') && !row.includes('---'));
    rows.forEach(row => {
      const cols = row.split('|').map(c => c.trim()).filter(c => c);
      if (cols.length >= 2) {
        const [item, freqStr] = cols;
        const freq = parseInt(freqStr.replace(/[^0-9]/g, ''));
        if (item.includes('Köpek')) rules.variationRules.petFrequency = freq;
        if (item.includes('Dış mekan')) rules.variationRules.outdoorFrequency = freq;
        if (item.includes('Wabi-sabi')) rules.variationRules.wabiSabiFrequency = freq;
      }
    });
  }

  // Mutlak kuralları parse et
  const absoluteMatch = content.match(/## 7\. MUTLAK KURALLAR[\s\S]*?### Ürün Kuralları([\s\S]*?)### Yasak Elementler([\s\S]*?)### Kalite Kuralları([\s\S]*?)(?=##|$)/);
  if (absoluteMatch) {
    const extractRules = (section) => {
      return section.split('\n')
        .filter(line => line.startsWith('- **'))
        .map(line => {
          const match = line.match(/\*\*(.+?)\*\*:?\s*(.+)/);
          return match ? `${match[1]} - ${match[2]}` : line;
        });
    };
    rules.absoluteRules = [
      ...extractRules(absoluteMatch[1]),
      ...extractRules(absoluteMatch[2]),
      ...extractRules(absoluteMatch[3]),
    ];
  }

  // Versiyon parse et
  const versionMatch = content.match(/\*\*Versiyon\*\*:\s*(\d+\.\d+\.\d+)/);
  if (versionMatch) {
    rules.version = versionMatch[1];
  }

  return rules;
}

// Validation fonksiyonu
function validateRules(rules) {
  const errors = [];

  if (rules.scenarios.length === 0) {
    errors.push('❌ Hiç senaryo bulunamadı');
  }

  if (rules.handStyles.length === 0) {
    errors.push('❌ Hiç el stili bulunamadı');
  }

  // Her senaryo için kompozisyon kontrolü
  rules.scenarios.forEach(s => {
    if (!s.compositions || s.compositions.length === 0) {
      errors.push(`⚠️ ${s.id} senaryosu için kompozisyon varyantı yok`);
    }
  });

  // Çeşitlilik kuralları kontrolü
  if (!rules.variationRules.scenarioGap) {
    errors.push('⚠️ scenarioGap tanımlanmamış, varsayılan: 3');
    rules.variationRules.scenarioGap = 3;
  }
  if (!rules.variationRules.petFrequency) {
    errors.push('⚠️ petFrequency tanımlanmamış, varsayılan: 15');
    rules.variationRules.petFrequency = 15;
  }

  return errors;
}

// Ana fonksiyon
async function main() {
  const orchestratorPath = path.join(__dirname, '..', 'rules', 'ORCHESTRATOR.md');

  console.log('🔄 ORCHESTRATOR.md sync işlemi başlıyor...');
  console.log(`📄 Dosya: ${orchestratorPath}`);

  // Dosyayı oku
  if (!fs.existsSync(orchestratorPath)) {
    console.error('❌ ORCHESTRATOR.md dosyası bulunamadı!');
    process.exit(1);
  }

  const content = fs.readFileSync(orchestratorPath, 'utf-8');
  console.log(`📖 Dosya okundu (${content.length} karakter)`);

  // Parse et
  const rules = parseOrchestratorMD(content);
  console.log(`✅ Parse edildi:`);
  console.log(`   - Senaryolar: ${rules.scenarios.length}`);
  console.log(`   - El Stilleri: ${rules.handStyles.length}`);
  console.log(`   - Mutlak Kurallar: ${rules.absoluteRules.length}`);

  // Validate et
  const errors = validateRules(rules);
  if (errors.length > 0) {
    console.log('\n⚠️ Validasyon sonuçları:');
    errors.forEach(e => console.log(`   ${e}`));
  }

  // JSON olarak kaydet (Firestore sync için)
  const outputPath = path.join(__dirname, '..', '..', 'functions', 'src', 'orchestrator', 'parsed-rules.json');
  fs.writeFileSync(outputPath, JSON.stringify(rules, null, 2));
  console.log(`\n💾 Parsed rules kaydedildi: ${outputPath}`);

  // Firestore sync talimatı
  console.log('\n📤 Firestore sync için:');
  console.log('   firebase firestore:set orchestrator-config/parsed-rules --data @functions/src/orchestrator/parsed-rules.json');
  console.log('\n✅ Sync hazır! Deploy sırasında Firestore\'a yüklenecek.');
}

// Çalıştır
main().catch(err => {
  console.error('❌ Sync hatası:', err);
  process.exit(1);
});
