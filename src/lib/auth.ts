import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "./db";

// Custom adapter: auto-generates a username for Google sign-ups
const prismaAdapter = PrismaAdapter(db);
const customAdapter = {
  ...prismaAdapter,
  createUser: async (data: Record<string, unknown>) => {
    const base = ((data.email as string)?.split("@")[0] ?? "user")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .toLowerCase()
      .slice(0, 20);
    let username = base;
    let i = 1;
    while (await db.user.findUnique({ where: { username } })) {
      username = `${base}${i++}`;
    }
    return (prismaAdapter.createUser as Function)({ ...data, username });
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: customAdapter,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          username: user.username,
        };
      },
    }),
  ],
  callbacks: {
    async signIn() {
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username?: string }).username;
      }
      // For Google users, username may not be on the user object — fetch from DB
      if (token.id && !token.username) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { username: true },
        });
        token.username = dbUser?.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { username?: string }).username =
          token.username as string;
      }
      return session;
    },
  },
});
