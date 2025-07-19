interface RedactionSettings {
  enabled: boolean;
  rules: {
    names: boolean;
    emails: boolean;
    phoneNumbers: boolean;
    addresses: boolean;
    personalIds: boolean;
  };
  customPatterns: Array<{
    name: string;
    pattern: string;
    enabled: boolean;
  }>;
  redactionLevel: 'strict' | 'moderate' | 'minimal';
}