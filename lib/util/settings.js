function settingFor(settings, propertyName, fallback) {
    const value = settings[`mocha/${propertyName}`];
    const mochaSettings = settings.mocha || {};

    return value || mochaSettings[propertyName] || fallback;
}

export function getAdditionalNames(settings) {
    const additionalCustomNames = settingFor(settings, 'additionalCustomNames', []);
    return additionalCustomNames;
}
