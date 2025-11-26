import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { logger } from "@/lib/logger";
import { validateEnvVariables, getSetupInstructions } from "@/lib/env-validator";

// Validate environment variables on startup
const validation = validateEnvVariables();
if (!validation.isValid || validation.warnings.length > 0) {
  console.log('\n' + getSetupInstructions(validation.errors, validation.warnings));
}

// Build providers array dynamically based on available credentials
function getProviders() {
  const providers = [];

  // Add Google provider if credentials are available
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
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
      })
    );
  }

  // Add Microsoft provider if credentials are available
  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET && process.env.MICROSOFT_TENANT_ID) {
    providers.push(
      AzureADProvider({
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        tenantId: process.env.MICROSOFT_TENANT_ID,
        authorization: {
          params: {
            scope: "openid profile email User.ReadWrite.All Directory.ReadWrite.All",
          },
        },
      })
    );
  }

  return providers;
}

export const authOptions = {
  providers: getProviders(),
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign in
      if (account) {
        return {
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
      session.accessToken = token.accessToken;
      session.provider = token.provider;
      session.error = token.error;
      return session;
    },
  },
};

async function refreshAccessToken(token) {
  try {
    if (!token.refreshToken) {
      console.error("No refresh token available for provider:", token.provider);
      throw new Error("No refresh token available");
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

    logger.info(`Token refreshed successfully for provider: ${token.provider}`);

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
      // Fall back to old refresh token if new one is not returned
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    logger.error("Error refreshing access token:", { error: error.message || error, provider: token.provider });
    console.error("Error refreshing access token:", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}
