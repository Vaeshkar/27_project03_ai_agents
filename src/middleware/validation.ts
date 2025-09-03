import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

export const AgentRequestSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(1000, "Prompt is too long"),
});

export const validateAgentRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validateData = AgentRequestSchema.parse(req.body);
    req.body = validateData;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.issues.map(
          (err: z.ZodIssue) => `${err.path.join(".")}: ${err.message}`
        ),
      });
    }
    next(error);
  }
};
