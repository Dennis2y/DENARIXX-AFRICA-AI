import { Router, type IRouter } from "express";
import healthRouter from "./health";
import waitlistRouter from "./waitlist";
import usersRouter from "./users";
import denaRouter from "./dena";

const router: IRouter = Router();

router.use(healthRouter);
router.use(waitlistRouter);
router.use("/users", usersRouter);
router.use("/dena", denaRouter);

export default router;
