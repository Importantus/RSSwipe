import { Request, Response, NextFunction } from "express";

/**
 * This function is a helper function that wraps around a function that throws an error. It catches the error and passes it to the next middleware.
 * You can use this function to wrap around a RequestHandler.
 * @param f The function to wrap around
 * @returns 
 */
export default function h(f: (req: Request, res: Response) => void): ((req: Request, res: Response, next: NextFunction) => void) {
    return async (req, res, next) => {
        try {
            await f(req, res);
        } catch (error) {
            next(error);
        }
    }
}