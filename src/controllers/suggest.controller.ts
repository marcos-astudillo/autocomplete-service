import { Request, Response, NextFunction } from "express";
import { SuggestQuerySchema } from "../models/suggest";
import { suggestService } from "../services/suggest.service";
import { AppError } from "../middlewares/error.middleware";

export const handleSuggest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = SuggestQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(
        400,
        "Invalid query parameters",
        parsed.error.flatten(),
      );
    }

    const result = await suggestService.getSuggestions(parsed.data);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
