"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsHandler = void 0;
exports.withCors = withCors;
const cors_1 = __importDefault(require("cors"));
// CORS ayarları - tüm origin'lere izin ver (development + production)
const corsHandler = (0, cors_1.default)({ origin: true });
exports.corsHandler = corsHandler;
/**
 * CORS middleware wrapper
 * HTTP fonksiyonlarında CORS desteği için kullanılır
 * @param {Function} handler - Request handler fonksiyonu
 * @return {Function} CORS sarmalı handler
 */
function withCors(handler) {
    return (req, res) => {
        corsHandler(req, res, () => {
            handler(req, res);
        });
    };
}
//# sourceMappingURL=cors.js.map