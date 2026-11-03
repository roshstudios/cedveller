import serverless from "serverless-http";
import app from "../src/app";

export const handler = serverless(app, {
  request(req: { url?: string }) {
    if (req.url?.startsWith("/.netlify/functions/api")) {
      req.url = req.url.replace("/.netlify/functions/api", "/api");
    }
  },
});
