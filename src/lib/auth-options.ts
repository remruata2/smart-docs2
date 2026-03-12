import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import { compare } from "bcryptjs";
import { db } from "./db";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "./supabase";
// Import UserRole from the generated Prisma client
import { UserRole } from "../generated/prisma";

// Define custom types for NextAuth
type AppUser = {
	id: string;
	role: UserRole;
	username: string;
	email: string;
	name: string;
	image?: string | null;
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

const providers: NextAuthOptions["providers"] = [
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

				if (!user) {
					// Fallback: If user is not in Prisma yet, attempt Supabase login directly if it's an email
					if (credentials.username.includes('@') && supabaseAdmin) {
						const { data, error } = await supabaseAdmin.auth.signInWithPassword({
							email: credentials.username.toLowerCase(),
							password: credentials.password,
						});

						if (!error && data.user) {
							// For session, we need them in Prisma eventually, but for now we might need to return a guest-like user or wait for webhook
							// Better approach: Since we have supabaseAdmin, we can't easily "create" them here without more info (role, etc)
							// However, our webhook should have created them. If not, they might be truly non-existent.
							return null;
						}
					}
					return null;
				}

				// Case A: User has a direct Prisma password (Web-native or Legacy)
				if (user.password_hash) {
					const isPasswordValid = await compare(
						credentials.password,
						user.password_hash
					);

					if (isPasswordValid) {
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
							name: user.name || user.username,
							image: user.image,
						};
					}
					return null;
				}

				// Case B: User exists in Prisma but has NO password (Supabase-native/Mobile user)
				if (user.email && supabaseAdmin) {
					const { data, error } = await supabaseAdmin.auth.signInWithPassword({
						email: user.email,
						password: credentials.password,
					});

					if (!error && data.user) {
						// Update last login in Prisma
						await db.user.update({
							where: { id: user.id },
							data: { last_login: new Date() },
						});

						return {
							id: String(user.id),
							username: user.username,
							role: user.role,
							email: user.email,
							name: user.name || user.username,
							image: user.image,
						};
					}
				}

				return null;
			},
		}),
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID || "",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
			authorization: {
				params: {
					prompt: "select_account",
					access_type: "offline",
					response_type: "code",
				},
			},
		}),
];

// Only add Apple if keys are present to avoid build crash
const hasAppleKeys = !!(process.env.APPLE_ID && process.env.APPLE_PRIVATE_KEY && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID);

if (hasAppleKeys) {
	providers.push(
		AppleProvider({
			clientId: process.env.APPLE_ID!,
			clientSecret: jwt.sign({}, process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n"), {
				algorithm: "ES256",
				expiresIn: "24h",
				audience: "https://appleid.apple.com",
				issuer: process.env.APPLE_TEAM_ID!,
				subject: process.env.APPLE_ID!,
				header: {
					alg: "ES256",
					kid: process.env.APPLE_KEY_ID!,
				},
			}),
		})
	);
}

export const authOptions: NextAuthOptions = {
	providers,
	cookies: {
		pkceCodeVerifier: {
			name: "next-auth.pkce.code_verifier",
			options: {
				httpOnly: true,
				sameSite: "none",
				path: "/",
				secure: true,
			},
		},
	},
	callbacks: {
		async signIn({ user, account }) {
			if (account?.provider === "google" || account?.provider === "apple") {
				try {
					// Check if user exists by email
					const existingUser = await db.user.findUnique({
						where: { email: user.email! },
					});

					if (!existingUser) {
						// Generate a unique username from the profile name or email
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
								role: UserRole.student,
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
					console.error(`Error creating ${account.provider} user:`, error);
					return false;
				}
			}
			return true;
		},
		async jwt({ token, user, account }) {
			if (user) {
				// For OAuth users, fetch from database to get complete user data
				if ((account?.provider === "google" || account?.provider === "apple") && user.email) {
					const dbUser = await db.user.findUnique({
						where: { email: user.email },
					});
					if (dbUser) {
						token.id = String(dbUser.id);
						token.role = dbUser.role;
						token.username = dbUser.username;
						token.email = dbUser.email || user.email;
						token.name = dbUser.name || dbUser.username;
						token.image = dbUser.image;
					}
				} else {
					// For credentials-based login, use the user object directly
					token.id = user.id;
					token.role = user.role;
					token.username = user.username;
					token.name = user.name;
					token.image = user.image;
				}
			}
			return token;
		},
		async session({ session, token }) {
			if (token && session.user) {
				session.user.id = token.id;
				session.user.role = token.role as UserRole;
				session.user.username = token.username;
				session.user.name = token.name || token.username || "";
				session.user.image = token.image;
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
		maxAge: 7 * 24 * 60 * 60, // 7 days (reduced from 30 for security)
		updateAge: 24 * 60 * 60, // Refresh token every 24 hours
	},
	debug: process.env.NODE_ENV !== "production" && process.env.NEXTAUTH_DEBUG === "true",
	secret: process.env.NEXTAUTH_SECRET,
};

// UserRole is now imported from @prisma/client
