import { Request, Response, NextFunction } from "express";
import APIError from "./helper/apiError";
import { environment } from "./helper/environment";
import jwt from "jsonwebtoken";

export function errorHandler(error: any, req: Request, res: Response, next: NextFunction) {
    if (error instanceof APIError) {
        res.status(error.status).json(error.toJSON());
    } else {
        const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
        res.status(statusCode);
        res.json({
            message: error.message,
            stack: environment.status === "development" ? error.stack : "",
        });
    }
};

export function notFound(req: Request, res: Response, next: NextFunction) {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
}

export function auth(req: Request, res: Response, next: NextFunction) {
    try {
        // No checks if the token is set, because it will throw an error if it's not set - which error doesn't matter
        const token = req.headers.authorization!.split(" ")[1];
        // I do not verify if the user exists, because I don't think it's necessary
        const decoded = jwt.verify(token, environment.jwtSecret);
        // Saving in res.locals as stated in http://expressjs.com/en/api.html#res.locals
        res.locals.userId = (decoded as any).id;
        next();
    } catch (error) {
        next(APIError.notAuthorized());
    }
}