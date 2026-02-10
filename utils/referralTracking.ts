
// referralTracking.ts

export const captureReferral = (refCode: string) => {
    if (!refCode) return;
    localStorage.setItem('magno_referral', refCode);
};

export const getReferral = () => {
    return localStorage.getItem('magno_referral');
};

export const captureLeadId = (leadId: string) => {
    if (!leadId) return;
    localStorage.setItem('magno_lead_id', leadId);
};

export const getLeadId = () => {
    return localStorage.getItem('magno_lead_id');
};
