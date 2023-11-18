import * as s from 'superstruct';

export const email = s.refine(s.string(), 'email', (s) => {
    return s.includes('@');
});

export const password = s.size(s.string(), 8, 100);

export const name = s.size(s.string(), 1, 30);

export const UserRegisterInput = s.object({
    name,
    email,
    password
})

export const UserLoginInput = s.object({
    email,
    password
})

export const UserUpdateInput = s.object({
    name: s.optional(name),
    email: s.optional(email),
    password: s.optional(password),
    oldPassword: password
})

export const UserDeleteInput = s.object({
    password
})

export type UserRegisterInputType = s.Infer<typeof UserRegisterInput>;
export type UserLoginInputType = s.Infer<typeof UserLoginInput>;
export type UserUpdateInputType = s.Infer<typeof UserUpdateInput>;
export type UserDeleteInputType = s.Infer<typeof UserDeleteInput>;