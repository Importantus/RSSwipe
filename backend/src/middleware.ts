import { Request, Response, NextFunction } from "express";

export function errorHandler(error: any, req: Request, res: Response, next: NextFunction) {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: error.message,
        stack: process.env.STATUS === "development" ? error.stack : "",
    });
};

export function notFound(req: Request, res: Response, next: NextFunction) {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
}

export function auth(req: Request, res: Response, next: NextFunction) {
    const error = new Error(`Not Authorized`);
    res.status(401);
    next(error);
}