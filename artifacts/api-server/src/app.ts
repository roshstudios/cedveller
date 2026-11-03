import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import cookieParser from "cookie-parser";

const app: Express = express();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: false }));
app.use(cookieParser());
app.use(express.json({ limit: "6mb" }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    const origin = req.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== req.get("host") && new URL(origin).host !== req.get("x-forwarded-host")) {
          res.status(403).json({ error: "Bu mənbədən əməliyyat aparmaq olmaz." }); return;
        }
      } catch { res.status(403).json({ error: "Mənbə düzgün deyil." }); return; }
    }
  }
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use("/api", router);
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  req.log.error({ errorType: err instanceof Error ? err.name : "unknown" }, "Request failed");
  const status = typeof err === "object" && err !== null && "status" in err && err.status === 413 ? 413 : 500;
  res.status(status).json({ error: status === 413 ? "Fayl çox böyükdür. Daha kiçik şəkil yüklə." : "Əməliyyat tamamlanmadı. Yenidən cəhd et." });
});

export default app;
