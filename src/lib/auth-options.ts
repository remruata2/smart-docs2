import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { db } from "./db";
// Import UserRole from the generated Prisma client
import { UserRole } from "../generated/prisma";

// Define custom types for NextAuth
type AppUser = {
	id: string;
	role: UserRole;
	username: string;
	email: string;
	name: string;
};

declare module "next-auth" {
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	interface User extends AppUser { }

	interface Session {
		user: AppUser;
	}
}

declare module "next-auth/jwt" {
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	interface JWT extends AppUser { }
}

export const authOptions: NextAuthOptions = {
	providers: [
		CredentialsProvider({
			name: "Credentials",
			credentials: {
				username: { label: "Username or Email", type: "text" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				if (!credentials?.username || !credentials?.password) {
					return null;
				}

				// Try to find user by email or username
				const user = await db.user.findFirst({
					where: {
						OR: [
							{ email: credentials.username.toLowerCase() },
							{ username: credentials.username },
						],
					},
				});

				if (!user || !user.password_hash) {
					return null;
				}

				const isPasswordValid = await compare(
					credentials.password,
					user.password_hash
				);

				if (!isPasswordValid) {
					return null;
				}

				// Update last login
				await db.user.update({
					where: { id: user.id },
					data: { last_login: new Date() },
				});

				return {
					id: String(user.id),
					username: user.username,
					role: user.role,
					email: user.email || user.username,
					name: user.username,
				};
			},
		}),
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			authorization: {
				params: {
					prompt: "select_account",
					access_type: "offline",
					response_type: "code",
				},
			},
		}),
	],
	callbacks: {
		async signIn({ user, account }) {
			if (account?.provider === "google") {
				try {
					// Check if user exists by email
					const existingUser = await db.user.findUnique({
						where: { email: user.email! },
					});

					if (!existingUser) {
						// Generate a unique username from the Google profile name
						const baseUsername = user.name?.replace(/\s+/g, '').toLowerCase() || user.email!.split('@')[0];
						let counter = 1;
						let uniqueUsername = baseUsername;

						while (await db.user.findUnique({ where: { username: uniqueUsername } })) {
							uniqueUsername = `${baseUsername}${counter}`;
							counter++;
						}

						// Create new user (OAuth users don't have passwords)
						await db.user.create({
							data: {
								username: uniqueUsername,
								email: user.email!,
								password_hash: null, // OAuth users don't have passwords
								role: UserRole.user,
								is_active: true,
								last_login: new Date(),
							},
						});
					} else {
						// Update last login for existing user
						await db.user.update({
							where: { id: existingUser.id },
							data: { last_login: new Date() },
						});
					}
				} catch (error) {
					console.error("Error creating Google user:", error);
					return false;
				}
			}
			return true;
		},
		async jwt({ token, user, account }) {
			if (user) {
				// For OAuth users, fetch from database to get complete user data
				if (account?.provider === "google" && user.email) {
					const dbUser = await db.user.findUnique({
						where: { email: user.email },
					});
					if (dbUser) {
						token.id = String(dbUser.id);
						token.role = dbUser.role;
						token.username = dbUser.username;
						token.email = dbUser.email || user.email;
						token.name = dbUser.username;
					}
				} else {
					// For credentials-based login, use the user object directly
					token.id = user.id;
					token.role = user.role;
					token.username = user.username;
				}
			}
			return token;
		},
		async session({ session, token }) {
			if (token && session.user) {
				session.user.id = token.id;
				session.user.role = token.role as UserRole;
				session.user.username = token.username;
			}
			return session;
		},
	},
	pages: {
		signIn: "/login",
		error: "/login",
	},
	session: {
		strategy: "jwt",
		maxAge: 30 * 24 * 60 * 60, // 30 days
	},
	debug: process.env.NODE_ENV !== "production" && process.env.NEXTAUTH_DEBUG === "true",
	secret: process.env.NEXTAUTH_SECRET,
};

// UserRole is now imported from @prisma/client
