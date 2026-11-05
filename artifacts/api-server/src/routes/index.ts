import { Router, type IRouter } from "express";
import healthRouter from "./health";
import schedulesRouter from "./schedules";
import pushRouter from "./push";

const router: IRouter = Router();

router.use(healthRouter);
router.use(schedulesRouter);
router.use(pushRouter);

export default router;
