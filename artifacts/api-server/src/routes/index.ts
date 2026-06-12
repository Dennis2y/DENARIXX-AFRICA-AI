import { Router, type IRouter } from "express";
import healthRouter from "./health";
import waitlistRouter from "./waitlist";
import usersRouter from "./users";
import denaRouter from "./dena";
import skillswapRouter from "./skillswap";
import cvBuilderRouter from "./cvbuilder";

const router: IRouter = Router();

router.use(healthRouter);
router.use(waitlistRouter);
router.use("/users", usersRouter);
router.use("/dena", denaRouter);
router.use("/skillswap", skillswapRouter);
router.use("/cv-builder", cvBuilderRouter);

export default router;
