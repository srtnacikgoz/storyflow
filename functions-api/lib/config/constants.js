"use strict";
/**
 * Application Constants
 * Instagram Automation - Sade Patisserie
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MESSAGE_TEMPLATES = exports.PEAK_HOURS = exports.PROFITEROLE_RULES = exports.PRODUCT_SCHEDULE_RULES = exports.TIMEZONE = exports.REGION = void 0;
exports.REGION = "europe-west1";
exports.TIMEZONE = "Europe/Istanbul";
/**
 * Product Schedule Rules
 * Akıllı zamanlama: Hangi ürün hangi saatte paylaşılmalı?
 */
exports.PRODUCT_SCHEDULE_RULES = {
    // 🥐 VIENNOISERIE - Sabah Ürünleri
    "viennoiserie": {
        weekday: ["07:30", "08:00", "08:30"],
        weekend: ["09:00", "09:30", "10:00"],
        message: "Güne tatlı başlayın ☕🥐",
        targetAudience: "morning-commuters",
    },
    // ☕ KAHVE MENÜSÜ
    "coffee": {
        weekday: ["08:00", "10:30", "14:00"],
        weekend: ["09:30", "11:00", "15:00"],
        message: "Kahve keyfi ☕✨",
        targetAudience: "office-workers",
    },
    // 🍫 ÇİKOLATA ÜRÜNLERİ
    "chocolate": {
        weekday: ["15:00", "16:00", "20:00"],
        weekend: ["16:00", "17:00", "19:00"],
        message: "Çikolata sevginiz için 🍫",
        targetAudience: "afternoon-tea",
    },
    // 🧁 KÜÇÜK TATLILAR (Macaron, Éclair, Mini Tart)
    "small-desserts": {
        weekday: ["14:30", "15:00", "15:30"],
        weekend: ["15:00", "15:30", "16:00"],
        message: "Çay saatinin vazgeçilmezi 🧁✨",
        targetAudience: "afternoon-tea",
    },
    // 🍰 DİLİM PASTALAR - ALTIN SAAT
    "slice-cakes": {
        weekday: ["15:00", "15:30", "16:00"], // En yüksek etkileşim
        weekend: ["14:00", "15:00", "17:00"],
        message: "Tatlı bir mola hak ediyorsunuz 🍰",
        targetAudience: "afternoon-tea",
    },
    // 🎂 BÜYÜK PASTALAR
    "big-cakes": {
        weekday: ["19:00", "20:00", "20:30"],
        weekend: ["17:00", "18:00", "19:00"],
        message: "Özel anlarınız için 🎂",
        targetAudience: "special-occasions",
    },
    // 🍮 PROFİTEROL (Genel)
    "profiterole": {
        weekday: ["15:00", "15:30", "19:00"],
        weekend: ["15:00", "16:00", "18:00"],
        message: "Profiterol keyfi 🍮✨",
        targetAudience: "afternoon-tea",
    },
    // 💫 ÖZEL SİPARİŞLER
    "special-orders": {
        weekday: ["20:00", "20:30", "21:00"],
        weekend: ["19:00", "19:30", "20:00"],
        message: "Hayalinizdeki pasta 💫",
        targetAudience: "special-occasions",
    },
};
/**
 * Profiterol Sub-Type Specific Rules
 * Profiterol için özel kurallar (3 top, 6 top, 10 top, büyük tabak)
 */
exports.PROFITEROLE_RULES = {
    // 3 Top - Tek kişilik, hemen yeme
    "3-ball": {
        weekday: ["14:30", "15:00", "15:30"],
        weekend: ["15:00", "15:30", "16:00"],
        message: "Hızlı bir tatlı molası için 3 top profiterol 🍮",
        targetAudience: "afternoon-tea",
    },
    // 6 Top - Paylaşımlık
    "6-ball": {
        weekday: ["15:30", "16:00", "19:00"],
        weekend: ["16:00", "17:00", "18:00"],
        message: "Paylaşmak için ideal: 6 top profiterol ✨",
        targetAudience: "afternoon-tea",
    },
    // 10 Top - Aile boyu
    "10-ball": {
        weekday: ["19:00", "19:30", "20:00"],
        weekend: ["17:00", "18:00", "19:00"],
        message: "Aile boyu keyif: 10 top profiterol 🎉",
        targetAudience: "weekend-families",
    },
    // Büyük Tabak - Eve götürmelik
    "large-tray": {
        weekday: ["19:30", "20:00", "20:30"],
        weekend: ["18:00", "18:30", "19:00"],
        message: "Eve özel, büyük tabak profiterol 🏠",
        targetAudience: "evening-planners",
    },
};
/**
 * Instagram Peak Activity Hours
 * Instagram'da en yüksek etkileşim saatleri (genel araştırma)
 */
exports.PEAK_HOURS = {
    highest: ["15:00", "15:30", "16:00", "19:00", "20:00"],
    high: ["08:00", "12:00", "14:00", "17:00", "21:00"],
    medium: ["09:00", "10:00", "11:00", "13:00", "18:00"],
    low: ["06:00", "07:00", "22:00", "23:00"],
};
/**
 * Message Templates by Type
 * Mesaj stratejileri
 */
exports.MESSAGE_TEMPLATES = {
    "start-your-day": [
        "Güne tatlı başlayın ☀️",
        "Sabahınız güzel olsun ☕",
        "Günaydın! Tatlı bir başlangıç ✨",
    ],
    "take-a-break": [
        "Tatlı bir mola hak ediyorsunuz ☕",
        "Mola zamanı! 🍰",
        "Kendinize bir iyilik yapın ✨",
    ],
    "treat-yourself": [
        "Kendinizi şımartın 💝",
        "Bugün kendinize ödül verin 🎁",
        "Siz buna layıksınız ✨",
    ],
    "celebrate": [
        "Özel anlarınız için 🎉",
        "Kutlamanın tam zamanı 🎂",
        "Her an özeldir 💫",
    ],
    "share-joy": [
        "Sevdiklerinizle paylaşın 💕",
        "Mutluluğu paylaşın ✨",
        "Birlikte daha güzel 🤝",
    ],
};
//# sourceMappingURL=constants.js.map