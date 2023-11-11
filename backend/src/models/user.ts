import { PrismaClient, User } from "@prisma/client";
import bcrypt from "bcrypt";
import APIError from "../helper/apiError";
import jwt from "jsonwebtoken";
import { environment } from "../helper/environment";
import { UserDeleteInputType, UserUpdateInputType } from "../validators/user";

const saltRounds = 10;
const prisma = new PrismaClient();

export async function registerUser(name: string, email: string, password: string) {
    // Check if user already exists
    if (await getUserByEmail(email)) {
        throw APIError.badRequest("User with this email already exists");
    }

    const hash = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hash
        }
    })

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
    };
}

export async function loginUser(email: string, password: string) {
    try {
        const user = await getUserByEmail(email);
        if (!user) {
            throw APIError.notAuthorized();
        }

        // Check if password is correct
        bcrypt.compare(password, user.password, (_, result) => {
            if (!result) {
                throw APIError.notAuthorized();
            }
        });

        // Generate JWT token
        return jwt.sign({ id: user.id }, environment.jwtSecret, { expiresIn: environment.jwtExpiration });
    } catch (error) {
        throw APIError.notAuthorized();
    }
}

export async function getUserData(id: string) {
    const user = await getUserById(id);

    if (!user) {
        throw APIError.notFound();
    }

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
    };
}

export async function updateUserData(id: string, data: UserUpdateInputType) {
    const user = await getUserById(id);

    if (!user) {
        throw APIError.notFound();
    }

    // Check if old password is correct
    if (data.password) {
        const result = await bcrypt.compare(data.oldPassword, user.password);

        if (!result) {
            throw APIError.forbidden();
        }
    }

    // Check if user with new email already exists
    if (data.email) {
        if (await getUserByEmail(data.email)) {
            throw APIError.badRequest("User with this email already exists");
        }
    }

    await prisma.user.update({
        where: {
            id
        },
        data: {
            name: data.name,
            email: data.email,
            password: data.password ? await bcrypt.hash(data.password, saltRounds) : undefined
        }
    });
}

export async function deleteUser(id: string, data: UserDeleteInputType) {
    const user = await getUserById(id);

    if (!user) {
        throw APIError.notFound();
    }

    // Check if password is correct
    const result = await bcrypt.compare(data.password, user.password);

    if (!result) {
        throw APIError.forbidden();
    }

    await prisma.user.delete({
        where: {
            id
        }
    });
}

async function getUserByEmail(email: string) {
    const user = await prisma.user.findUnique({
        where: {
            email
        }
    });
    return user;
}

async function getUserById(id: string) {
    const user = await prisma.user.findUnique({
        where: {
            id
        }
    });
    return user;
}
