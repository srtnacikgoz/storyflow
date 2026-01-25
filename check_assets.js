const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAssets() {
  // Product kategorisindeki asset'leri kontrol et
  const snapshot = await db.collection('assets')
    .where('category', '==', 'product')
    .where('isActive', '==', true)
    .get();
  
  console.log('=== ÜRÜN ASSET\'LERİ - canBeHeldByHand DURUMU ===\n');
  
  const products = [];
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    products.push({
      id: doc.id,
      filename: data.filename,
      productType: data.productType,
      canBeHeldByHand: data.canBeHeldByHand,
      eatingMethod: data.eatingMethod
    });
  });
  
  // Kategoriye göre grupla
  const byType = {};
  products.forEach(p => {
    const type = p.productType || 'unknown';
    if (!byType[type]) byType[type] = [];
    byType[type].push(p);
  });
  
  for (const [type, items] of Object.entries(byType)) {
    console.log(`\n📦 ${type.toUpperCase()} (${items.length} adet):`);
    items.forEach(p => {
      const handStatus = p.canBeHeldByHand === true ? '✋ Elle tutulabilir' :
                        p.canBeHeldByHand === false ? '🍴 Elle tutulamaz' :
                        '❓ Belirtilmemiş';
      console.log(`  - ${p.filename}: ${handStatus}`);
    });
  }
  
  process.exit(0);
}

checkAssets().catch(console.error);
