import { google } from 'googleapis';
import { logger } from "@/lib/logger";

export async function createGoogleUser(accessToken, userData) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const service = google.admin({ version: 'directory_v1', auth });

    try {
        const res = await service.users.insert({
            requestBody: {
                primaryEmail: userData.email,
                name: {
                    givenName: userData.firstName,
                    familyName: userData.lastName,
                },
                password: userData.password,
                changePasswordAtNextLogin: true,
                orgUnitPath: '/', // Default OU
                organizations: [
                    {
                        title: userData.jobTitle,
                        department: userData.department,
                        primary: true
                    }
                ]
            },
        });

        logger.info(`Google user created successfully: ${userData.email}`);
        return res.data;
    } catch (error) {
        logger.error(`Google user creation failed for ${userData.email}`, { error: error.message });

        if (error.response && error.response.data && error.response.data.error) {
            const apiError = error.response.data.error;

            if (apiError.code === 409) { // Conflict
                throw new Error(`User ${userData.email} already exists in Google Workspace.`);
            }

            if (apiError.code === 403) { // Forbidden
                throw new Error(`Insufficient permissions to create Google user. Please check your admin roles and scopes.`);
            }

            if (apiError.code === 400) { // Bad Request
                if (apiError.message.includes("Invalid password")) {
                    throw new Error(`Google Password Error: Password does not meet complexity requirements.`);
                }
                throw new Error(`Google Validation Error: ${apiError.message}`);
            }

            throw new Error(`Google Error (${apiError.code}): ${apiError.message}`);
        }

        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            throw new Error(`Network Error: Could not connect to Google API. Please check your internet connection.`);
        }

        throw new Error(`Google API Error: ${error.message}`);
    }
}
