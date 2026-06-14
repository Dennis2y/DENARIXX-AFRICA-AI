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
import messagesRouter from "./messages";
import storageRouter from "./storage";
import resumesRouter from "./resumes";
import aiStatusRouter from "./aiStatus";

const router: IRouter = Router();

router.use("/ai/status", aiStatusRouter);

router.use(healthRouter);
router.use(waitlistRouter);
router.use("/storage", storageRouter);
router.use("/resumes", resumesRouter);
router.use("/users", usersRouter);
router.use("/dena", denaRouter);
router.use("/skillswap", skillswapRouter);
router.use("/cv-builder", cvBuilderRouter);
router.use("/jobs", jobsRouter);
router.use("/interview-coach", interviewCoachRouter);
router.use("/community", communityRouter);
router.use("/messages", messagesRouter);

export default router;
