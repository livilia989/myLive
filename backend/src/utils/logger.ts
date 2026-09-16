import type { NextFunction, Request, Response } from "express";

// 사용자의 고민 내용(요청 본문)은 절대 로그에 남기지 않는다.
export const logger = {
  info: (message: string) => console.log(`[${new Date().toISOString()}] INFO  ${message}`),
  warn: (message: string) => console.warn(`[${new Date().toISOString()}] WARN  ${message}`),
  error: (message: string) => console.error(`[${new Date().toISOString()}] ERROR ${message}`),
};

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const started = Date.now();
  res.on("finish", () => {
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
    logger.info(`${req.method} ${route} ${res.statusCode} ${Date.now() - started}ms`);
  });
  next();
}
