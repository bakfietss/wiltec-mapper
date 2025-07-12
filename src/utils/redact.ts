const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

function isEmail(value: any): boolean {
    return typeof value === "string" && EMAIL_REGEX.test(value);
}

function isLikelyName(key: string, value: any): boolean {
    const nameKeywords = ["name", "roepnaam", "achternaam", "voorvoegsel", "firstname", "lastname", "middlename"];
    return typeof value === "string" && nameKeywords.some(k => key.toLowerCase().includes(k));
}

function isLikelyPhoneNumber(value: any): boolean {
    if (typeof value !== "string") return false;
    // Simple phone number detection
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanValue = value.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanValue) && cleanValue.length >= 8;
}

function isLikelyAddress(key: string, value: any): boolean {
    const addressKeywords = ["address", "adres", "street", "straat", "city", "stad", "postal", "postcode", "zip"];
    return typeof value === "string" && addressKeywords.some(k => key.toLowerCase().includes(k));
}

function isLikelyPersonalId(key: string, value: any): boolean {
    const idKeywords = ["bsn", "ssn", "id", "personeelsnummer", "employeeid"];
    return typeof value === "string" && idKeywords.some(k => key.toLowerCase().includes(k));
}

export function redactSample(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, val] of Object.entries(obj)) {
        if (isEmail(val)) {
            result[key] = "<email>";
        } else if (isLikelyName(key, val)) {
            result[key] = "<name>";
        } else if (isLikelyPhoneNumber(val)) {
            result[key] = "<phone>";
        } else if (isLikelyAddress(key, val)) {
            result[key] = "<address>";
        } else if (isLikelyPersonalId(key, val)) {
            result[key] = "<personal_id>";
        } else {
            result[key] = val;
        }
    }
    
    return result;
}

export function redactArray(data: Record<string, any>[]): Record<string, any>[] {
    return data.map(item => redactSample(item));
}