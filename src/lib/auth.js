import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";

// Lazy-load logger to reduce initial bundle
let logger;
function getLogger() {
  if (!logger) {
    logger = require("@/lib/logger").logger;
  }
  return logger;
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/admin.directory.user",
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    AzureADProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      tenantId: process.env.MICROSOFT_TENANT_ID,
      authorization: {
        params: {
          scope: "openid profile email User.ReadWrite.All Directory.ReadWrite.All offline_access",
          prompt: "consent",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hour max session (in seconds)
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // No maxAge = session cookie (expires when browser closes)
      },
    },
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          expiresAt: Math.floor(Date.now() / 1000 + account.expires_in),
          refreshToken: account.refresh_token,
          provider: account.provider,
        };
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < token.expiresAt * 1000) {
        return token;
      }

      // Access token has expired, try to update it
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken,
        provider: token.provider,
        error: token.error,
      };
    },
  },
};

async function refreshAccessToken(token) {
  try {
    if (!token.refreshToken) {
      console.error("No refresh token available for provider:", token.provider);
      // If no refresh token, mark token as expired but don't crash
      // User will need to sign in again
      return {
        ...token,
        error: "RefreshAccessTokenError",
      };
    }

    const url =
      token.provider === "google"
        ? "https://oauth2.googleapis.com/token"
        : `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
      client_id:
        token.provider === "google"
          ? process.env.GOOGLE_CLIENT_ID
          : process.env.MICROSOFT_CLIENT_ID,
      client_secret:
        token.provider === "google"
          ? process.env.GOOGLE_CLIENT_SECRET
          : process.env.MICROSOFT_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    });

    if (token.provider === "azure-ad") {
      // Microsoft requires scope for refresh
      body.append("scope", "openid profile email User.ReadWrite.All Directory.ReadWrite.All offline_access");
    }

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      body,
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error("Refresh token response failed:", refreshedTokens);
      throw refreshedTokens;
    }

    getLogger().info(`Token refreshed successfully for provider: ${token.provider}`);

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
      // Fall back to old refresh token if new one is not returned
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    getLogger().error("Error refreshing access token:", { error: error.message || error, provider: token.provider });
    console.error("Error refreshing access token:", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}
