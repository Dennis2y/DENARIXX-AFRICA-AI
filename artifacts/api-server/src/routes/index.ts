import { Router, type IRouter } from "express";
import healthRouter from "./health";
import waitlistRouter from "./waitlist";
import usersRouter from "./users";
import denaRouter from "./dena";
import skillswapRouter from "./skillswap";
import cvBuilderRouter from "./cvbuilder";
import jobsRouter from "./jobs";
import interviewCoachRouter from "./interviewCoach";
import communityRouter from "./community";

const router: IRouter = Router();

router.use(healthRouter);
router.use(waitlistRouter);
router.use("/users", usersRouter);
router.use("/dena", denaRouter);
router.use("/skillswap", skillswapRouter);
router.use("/cv-builder", cvBuilderRouter);
router.use("/jobs", jobsRouter);
router.use("/interview-coach", interviewCoachRouter);
router.use("/community", communityRouter);

export default router;
