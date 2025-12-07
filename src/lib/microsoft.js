import { Client } from "@microsoft/microsoft-graph-client";
import { logger } from "@/lib/logger";

export async function createMicrosoftUser(accessToken, userData) {
    const client = Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        },
    });

    const user = {
        accountEnabled: true,
        displayName: userData.displayName,
        mailNickname: userData.mailNickname,
        userPrincipalName: userData.userPrincipalName,
        passwordProfile: {
            forceChangePasswordNextSignIn: true,
            password: userData.password,
        },
        jobTitle: userData.jobTitle,
        department: userData.department,
        usageLocation: userData.usageLocation || "US", // Default to US if not provided, required for licenses
        givenName: userData.firstName,
        surname: userData.lastName,
    };

    try {
        const newUser = await client.api("/users").post(user);
        logger.info(`Microsoft user created successfully: ${userData.userPrincipalName}`);
        return newUser;
    } catch (error) {
        logger.error(`Microsoft user creation failed for ${userData.userPrincipalName}`, { error: error.message });
        // Improve error handling
        if (error.body) {
            try {
                const body = JSON.parse(error.body);
                if (body.error) {
                    const errCode = body.error.code;
                    const errMessage = body.error.message;

                    if (errMessage.includes("userPrincipalName already exists") || errCode === "Request_BadRequest" && errMessage.includes("Another object with the same value for property userPrincipalName already exists")) {
                        throw new Error(`User ${userData.userPrincipalName} already exists in Microsoft 365.`);
                    }

                    if (errCode === "Authorization_RequestDenied") {
                        throw new Error(`Insufficient permissions to create Microsoft user. Please ensure the app has 'User.ReadWrite.All' and 'Directory.ReadWrite.All' permissions.`);
                    }

                    if (errCode === "Request_BadRequest") {
                        if (errMessage.includes("Password")) {
                            throw new Error(`Microsoft Password Error: Password does not meet complexity requirements.`);
                        }
                        throw new Error(`Microsoft Validation Error: ${errMessage}`);
                    }

                    if (errCode === "Directory_QuotaExceeded") {
                        throw new Error(`Microsoft Quota Exceeded: You have reached the maximum number of objects in your directory.`);
                    }

                    throw new Error(`Microsoft Error (${errCode}): ${errMessage}`);
                }
            } catch (parseError) {
                // If body isn't JSON, fall through
            }
        }
        throw new Error(`Microsoft API Error: ${error.message}`);
    }
}

export async function getLicenseStatus(accessToken) {
    const client = Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        },
    });

    const response = await client.api("/subscribedSkus").get();
    const licenses = response.value.map(sku => {
        return {
            skuPartNumber: sku.skuPartNumber,
            total: sku.prepaidUnits.enabled,
            consumed: sku.consumedUnits,
            remaining: sku.prepaidUnits.enabled - sku.consumedUnits
        };
    });
    return licenses;
}

export const MICROSOFT_BUSINESS_STANDARD_SKU = "O365_BUSINESS_PREMIUM";

export async function assignLicense(accessToken, userId, skuPartNumber) {
    const client = Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        },
    });

    // 1. Resolve the SKU ID (GUID) from the Part Number (String)
    let skuIdResolved;
    try {
        const subscribedSkus = await client.api("/subscribedSkus").get();
        console.log(`Looking for SKU: '${skuPartNumber}'`);
        console.log(`Available SKUs: ${subscribedSkus.value.map(s => `'${s.skuPartNumber}'`).join(", ")}`);

        const sku = subscribedSkus.value.find(s =>
            s.skuPartNumber.trim().toLowerCase() === skuPartNumber.trim().toLowerCase()
        );

        if (sku) {
            skuIdResolved = sku.skuId;
            console.log(`Resolved SKU ID: ${skuIdResolved}`);
        } else {
            const availableSkus = subscribedSkus.value.map(s => s.skuPartNumber).join(", ");
            throw new Error(`SKU '${skuPartNumber}' not found. Available SKUs: ${availableSkus}`);
        }
    } catch (error) {
        console.error("Failed to resolve SKU ID:", error);
        throw new Error(`Failed to resolve SKU ID: ${error.message}`);
    }

    const assignment = {
        addLicenses: [
            {
                disabledPlans: [],
                skuId: skuIdResolved,
            },
        ],
        removeLicenses: [],
    };

    try {
        await client.api(`/users/${userId}/assignLicense`).post(assignment);
        logger.info(`License ${skuPartNumber} assigned to user ${userId}`);
        return true;
    } catch (error) {
        logger.error(`License assignment failed for user ${userId}`, { error: error.message, sku: skuPartNumber });
        console.error(`Failed to assign license ${skuPartNumber} (${skuIdResolved}) to user ${userId}:`, error);

        if (error.body) {
            try {
                const body = JSON.parse(error.body);
                if (body.error) {
                    const errCode = body.error.code;
                    const errMessage = body.error.message;

                    if (errCode === "CountViolation") {
                        throw new Error(`License Error: No available seats for license '${skuPartNumber}'. Please purchase more licenses.`);
                    }

                    if (errCode === "MutuallyExclusiveViolation") {
                        throw new Error(`License Error: The license '${skuPartNumber}' conflicts with an existing license assigned to the user.`);
                    }

                    throw new Error(`License Assignment Error (${errCode}): ${errMessage}`);
                }
            } catch (parseError) {
                // Fall through
            }
        }

        throw new Error(`Failed to assign license: ${error.message}`);
    }
}

export async function addUserToAdministrativeUnit(accessToken, administrativeUnitId, userId) {
    const client = Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        },
    });

    try {
        // Add user to administrative unit as a member
        await client.api(`/administrativeUnits/${administrativeUnitId}/members/$ref`).post({
            "@odata.id": `https://graph.microsoft.com/v1.0/users/${userId}`
        });

        logger.info(`User ${userId} added to Administrative Unit ${administrativeUnitId}`);
        return true;
    } catch (error) {
        logger.error(`Failed to add user ${userId} to Administrative Unit ${administrativeUnitId}`, { error: error.message });
        console.error(`Failed to add user to Administrative Unit:`, error);

        if (error.body) {
            try {
                const body = JSON.parse(error.body);
                if (body.error) {
                    const errCode = body.error.code;
                    const errMessage = body.error.message;

                    if (errCode === "Request_ResourceNotFound") {
                        throw new Error(`Administrative Unit not found. Please verify the Administrative Unit ID is correct.`);
                    }

                    if (errCode === "Authorization_RequestDenied") {
                        throw new Error(`Insufficient permissions to add user to Administrative Unit. Please ensure the app has 'AdministrativeUnit.ReadWrite.All' permission.`);
                    }

                    if (errMessage.includes("already exists") || errMessage.includes("One or more added object references already exist")) {
                        throw new Error(`User is already a member of this Administrative Unit.`);
                    }

                    throw new Error(`Administrative Unit Error (${errCode}): ${errMessage}`);
                }
            } catch (parseError) {
                // Fall through
            }
        }

        throw new Error(`Failed to add user to Administrative Unit: ${error.message}`);
    }
}
