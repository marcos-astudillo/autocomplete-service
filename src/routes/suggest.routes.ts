import { Router } from "express";
import { handleSuggest } from "../controllers/suggest.controller";

const router = Router();
router.get("/suggest", handleSuggest);

export default router;
