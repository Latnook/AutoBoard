"use client";

import { useState, useEffect, memo } from "react";
import { useSession } from "next-auth/react";

function OnboardingForm({ isUnified, onUserCreated }) {
    const { data: session } = useSession();
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        jobTitle: "",
        department: "",
        assignLicense: true,
        usageLocation: "", // No default - user must select
        useCustomOU: false, // Toggle for custom OU path (Google)
        orgUnitPath: "/", // Default to root OU (Google)
        useAdminUnit: false, // Toggle for Administrative Unit (Microsoft)
        administrativeUnitId: "", // Administrative Unit ID (Microsoft)
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [countries, setCountries] = useState(null);

    // Lazy load countries only when needed (for Microsoft forms)
    useEffect(() => {
        if ((isUnified || session?.provider === 'azure-ad') && !countries) {
            import('@/lib/constants').then((mod) => {
                setCountries(mod.COUNTRIES);
            });
        }
    }, [isUnified, session?.provider, countries]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Auto-lowercase email
        if (name === "email") {
            setFormData((prev) => ({ ...prev, [name]: value.toLowerCase() }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setResult(null);

        let endpoint;
        if (isUnified) {
            endpoint = "/api/onboard/unified";
        } else {
            endpoint = session?.provider === "google"
                ? "/api/onboard/google"
                : "/api/onboard/microsoft";
        }

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                // If it's a 500 with a specific error message, throw it
                throw new Error(data.error || "Failed to create user");
            }

            setResult(data);
            if (onUserCreated) {
                onUserCreated();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (result) {
        const hasErrors = result.errors && result.errors.length > 0;
        const isPartial = hasErrors && result.success;

        return (
            <div className={`card ${isPartial ? 'warning-card' : 'success-card'}`} style={{
                borderLeft: isPartial ? '4px solid #f59e0b' : '4px solid #10b981'
            }}>
                <h2 style={{ color: isPartial ? '#f59e0b' : '#10b981' }}>
                    {isPartial ? "Partial Success" : "Success!"}
                </h2>

                {result.warning && (
                    <div className="warning-msg">
                        ⚠️ {result.warning}
                    </div>
                )}

                {hasErrors && (
                    <div className="error-msg" style={{ marginBottom: '1rem' }}>
                        <p style={{ fontWeight: 'bold' }}>The following issues occurred:</p>
                        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                            {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                    </div>
                )}

                {result.results ? (
                    // Unified Result
                    <div>
                        <div style={{ marginBottom: '1rem' }}>
                            <p style={{ fontSize: '1.1em', marginBottom: '0.75rem' }}>
                                <strong>Username:</strong> {result.results.google?.primaryEmail || result.results.microsoft?.userPrincipalName}
                            </p>
                            <p><strong>Google:</strong> {result.results.google ? "✅ Created" : "❌ Failed/Skipped"}</p>
                            <p><strong>Microsoft:</strong> {result.results.microsoft ? "✅ Created" : "❌ Failed/Skipped"}</p>
                            {result.results.microsoft && (
                                <p style={{ marginLeft: '1rem', fontSize: '0.9em' }}>
                                    License: {result.results.microsoft.licenseAssigned ? "✅ Assigned" : "❌ Failed"}
                                </p>
                            )}
                        </div>

                        <div className="password-box">
                            <p>Temporary Password:</p>
                            <code>{result.temporaryPassword}</code>
                        </div>
                    </div>
                ) : (
                    // Single Result
                    <div>
                        <p>User <strong>{result.user.primaryEmail || result.user.userPrincipalName}</strong> created.</p>
                        <div className="password-box">
                            <p>Temporary Password:</p>
                            <code>{result.temporaryPassword}</code>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <button onClick={() => setResult(null)} className="btn btn-primary">
                        Onboard Another User
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="form-card">
            <h2>{isUnified ? "Unified Onboarding" : "Onboard New Employee"}</h2>

            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
                <label>First Name</label>
                <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                />
            </div>

            <div className="form-group">
                <label>Last Name</label>
                <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                />
            </div>

            <div className="form-group">
                <label>Email / Username</label>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="john.doe@company.com"
                />
                <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Automatically converts to lowercase</small>
            </div>

            <div className="form-group">
                <label>Job Title</label>
                <input
                    type="text"
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleChange}
                    required
                />
            </div>

            <div className="form-group">
                <label>Department</label>
                <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                />
            </div>

            {(isUnified || session?.provider === 'google') && (
                <>
                    <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            name="useCustomOU"
                            checked={formData.useCustomOU}
                            onChange={(e) => setFormData(prev => ({ ...prev, useCustomOU: e.target.checked }))}
                            style={{ width: 'auto', margin: 0 }}
                        />
                        <label style={{ margin: 0, cursor: 'pointer' }} onClick={() => setFormData(prev => ({ ...prev, useCustomOU: !prev.useCustomOU }))}>
                            Specify Google Workspace Organizational Unit
                        </label>
                    </div>

                    {formData.useCustomOU && (
                        <div className="form-group">
                            <label>Organizational Unit Path</label>
                            <input
                                type="text"
                                name="orgUnitPath"
                                value={formData.orgUnitPath}
                                onChange={handleChange}
                                placeholder="/Sales/Eastern Region"
                            />
                            <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                                Enter the full OU path (e.g., /Sales or /Engineering/Backend). Default is / (root).
                            </small>
                        </div>
                    )}
                </>
            )}

            {(isUnified || session?.provider === 'azure-ad') && (
                <>
                    <div className="form-group">
                        <label>Location (Microsoft Requirement)</label>
                        <select
                            name="usageLocation"
                            value={formData.usageLocation}
                            onChange={handleChange}
                            required
                            disabled={!countries}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                backgroundColor: '#334155',
                                border: '1px solid #475569',
                                color: 'white',
                                fontSize: '1rem'
                            }}
                        >
                            {!countries ? (
                                <option>Loading countries...</option>
                            ) : (
                                countries.map(country => (
                                    <option key={country.code} value={country.code}>
                                        {country.name}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            name="useAdminUnit"
                            checked={formData.useAdminUnit}
                            onChange={(e) => setFormData(prev => ({ ...prev, useAdminUnit: e.target.checked }))}
                            style={{ width: 'auto', margin: 0 }}
                        />
                        <label style={{ margin: 0, cursor: 'pointer' }} onClick={() => setFormData(prev => ({ ...prev, useAdminUnit: !prev.useAdminUnit }))}>
                            Assign to Administrative Unit (Entra ID)
                        </label>
                    </div>

                    {formData.useAdminUnit && (
                        <div className="form-group">
                            <label>Administrative Unit ID</label>
                            <input
                                type="text"
                                name="administrativeUnitId"
                                value={formData.administrativeUnitId}
                                onChange={handleChange}
                                placeholder="e.g., 12345678-1234-1234-1234-123456789012"
                            />
                            <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                                Enter the Administrative Unit ID (GUID). Find it in Entra ID &gt; Identity &gt; Administrative units.
                            </small>
                        </div>
                    )}
                </>
            )}

            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
                <input
                    type="checkbox"
                    name="assignLicense"
                    checked={formData.assignLicense}
                    onChange={(e) => setFormData(prev => ({ ...prev, assignLicense: e.target.checked }))}
                    style={{ width: 'auto', margin: 0 }}
                />
                <label style={{ margin: 0, cursor: 'pointer' }} onClick={() => setFormData(prev => ({ ...prev, assignLicense: !prev.assignLicense }))}>
                    Assign License (Uncheck for test users)
                </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? "Creating User..." : "Create User"}
                </button>
            </div>
        </form>
    );
}

export default memo(OnboardingForm);
