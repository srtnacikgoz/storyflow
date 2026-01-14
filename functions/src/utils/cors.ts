import cors from "cors";
import {Request, Response} from "express";

// CORS ayarları - tüm origin'lere izin ver (development + production)
const corsHandler = cors({origin: true});

/**
 * CORS middleware wrapper
 * HTTP fonksiyonlarında CORS desteği için kullanılır
 * @param {Function} handler - Request handler fonksiyonu
 * @return {Function} CORS sarmalı handler
 */
export function withCors(
  handler: (req: Request, res: Response) => void | Promise<void>
): (req: Request, res: Response) => void {
  return (req: Request, res: Response) => {
    corsHandler(req, res, () => {
      handler(req, res);
    });
  };
}

export {corsHandler};
