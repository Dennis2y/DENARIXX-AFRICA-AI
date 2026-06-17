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
import memoriesRouter from "./memories";
import documentsRouter from "./documents";
import aiGenerateRouter from "./aiGenerate";
import aiStatusRouter from "./aiStatus";
import voiceRouter from "./voice";
import imageGenerateRouter from "./imageGenerate";
import artifactsRouter from "./artifacts";
import artifactFromMessageRouter from "./artifactFromMessage";

const router: IRouter = Router();

router.use("/ai/status", aiStatusRouter);
router.use("/ai/generate", aiGenerateRouter);
router.use("/voice", voiceRouter);
router.use("/images/generate", imageGenerateRouter);
router.use("/artifacts", artifactsRouter);
router.use("/artifact-from-message", artifactFromMessageRouter);

router.use(healthRouter);
router.use(waitlistRouter);
router.use("/storage", storageRouter);
router.use("/resumes", resumesRouter);
router.use("/memories", memoriesRouter);
router.use("/documents", documentsRouter);
router.use("/users", usersRouter);
router.use("/dena", denaRouter);
router.use("/skillswap", skillswapRouter);
router.use("/cv-builder", cvBuilderRouter);
router.use("/jobs", jobsRouter);
router.use("/interview-coach", interviewCoachRouter);
router.use("/community", communityRouter);
router.use("/messages", messagesRouter);

export default router;
