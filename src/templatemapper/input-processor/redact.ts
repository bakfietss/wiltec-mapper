// Define redaction rules interface
interface RedactionRule {
    type: string;
    pattern: RegExp | string[];
    replacement: string;
    validate?: (value: any) => boolean;
}

// Configurable redaction rules
const defaultRedactionRules: RedactionRule[] = [
    {
        type: 'email',
        pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
        replacement: '<email>',
        validate: (value: any) => typeof value === 'string'
    },
    {
        type: 'name',
        pattern: [
            // English variations
            'name', 'firstname', 'lastname', 'middlename', 'surname', 'givenname',
            // Dutch variations
            'naam', 'voornaam', 'achternaam', 'voorvoegsel', 'roepnaam', 'tussenvoegsel',
            // Common variations
            'fullname', 'initials', 'prefix', 'suffix',
            // Field patterns
            'first', 'last', 'middle', 'given', 'family'
        ],
        replacement: '<name>',
        validate: (value: any) => {
            if (typeof value !== 'string') return false;
            const str = value.trim();
            return str.length >= 2 && !/\d/.test(str);
        }
    },
    // Add more default rules as needed
];

// Redaction configuration class
class RedactionConfig {
    private rules: RedactionRule[];

    constructor(customRules: RedactionRule[] = []) {
        this.rules = [...defaultRedactionRules, ...customRules];
    }

    addRule(rule: RedactionRule) {
        this.rules.push(rule);
    }

    getRules() {
        return this.rules;
    }
}

// Create default configuration
const defaultConfig = new RedactionConfig();

// Helper function to check if a value matches a rule
function matchesRule(key: string, value: any, rule: RedactionRule): boolean {
    if (rule.validate && !rule.validate(value)) return false;

    if (rule.pattern instanceof RegExp) {
        return rule.pattern.test(value);
    } else if (Array.isArray(rule.pattern)) {
        return rule.pattern.some(keyword => 
            key.toLowerCase().includes(keyword.toLowerCase())
        );
    }
    return false;
}

function redactValue(key: string, value: any, config: RedactionConfig = defaultConfig): any {
    if (Array.isArray(value)) {
        return value.map(item => redactValue(key, item, config));
    } else if (typeof value === 'object' && value !== null) {
        return redactSample(value, config);
    }

    // Apply all matching rules
    for (const rule of config.getRules()) {
        if (matchesRule(key, value, rule)) {
            return rule.replacement;
        }
    }

    return value;
}

export function redactSample(obj: Record<string, any>, config: RedactionConfig = defaultConfig): Record<string, any> {
    if (!obj || typeof obj !== 'object') return obj;
    
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
        result[key] = redactValue(key, val, config);
    }
    return result;
}

export function redactArray(data: any[] | Record<string, any>, config: RedactionConfig = defaultConfig): any[] | Record<string, any> {
    if (Array.isArray(data)) {
        return data.map(item => redactSample(item, config));
    }
    return redactSample(data, config);
}

// Export configuration for external use
export { RedactionRule, RedactionConfig, defaultConfig };