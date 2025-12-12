const EUROPE_PHONE_RULES = [
    {
        id: "phone-ua",
        countryKey: "ua",
        countryName: "Україна",
        flag: "\uD83C\uDDFA\uD83C\uDDE6",
        callingCode: "+380",
        regexPattern: /^\^?\+?380\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}\$?$/,
        sampleRegex: "^\\+380\\s?\\d{2}\\s?\\d{3}\\s?\\d{2}\\s?\\d{2}$",
        valuePattern: /^\+?380(?:[\s-]?\d){9}$/,
        format: "код оператора + абонентський номер",
        examples: [
            "+380 50 123 45 67",
            "+380671112233",
            "+38093 123 45 67"
        ]
    },
    {
        id: "phone-de",
        countryKey: "de",
        countryName: "Німеччина",
        flag: "\uD83C\uDDE9\uD83C\uDDEA",
        callingCode: "+49",
        regexPattern: /^\^?\+?49\s?(?:1[5-7]\d|[2-9]\d)\s?\d{3,8}\$?$/,
        sampleRegex: "^\\+49\\s?(1[5-7]\\d|[2-9]\\d)\\s?\\d{3,8}$",
        valuePattern: /^\+?49(?:[\s-]?\d){7,13}$/,
        format: "код оператора (мобільний або міський) + абонентський номер",
        examples: [
            "+49 151 23456789",
            "+49 30 1234567",
            "+49176 9876543"
        ]
    },
    {
        id: "phone-fr",
        countryKey: "fr",
        countryName: "Франція",
        flag: "\uD83C\uDDEB\uD83C\uDDF7",
        callingCode: "+33",
        regexPattern: /^\^?\+?33\s?[1-9](?:\s?\d{2}){4}\$?$/,
        sampleRegex: "^\\+33\\s?[1-9](\\s?\\d{2}){4}$",
        valuePattern: /^\+?33(?:[\s-]?\d){9}$/,
        format: "перший індекс оператора + абонентський номер у блоках по 2 цифри",
        examples: [
            "+33 6 12 34 56 78",
            "+33 1 23 45 67 89",
            "+33698765432"
        ]
    },
    {
        id: "phone-eu",
        countryKey: "eu",
        countryName: "Європа (країна не визначена)",
        flag: "\uD83C\uDDEA\uD83C\uDDFA",
        callingCode: "+(2|3|4)…",
        regexPattern: /^\^?\+?(?:2|3|4)\d{8,13}\$?$/,
        sampleRegex: "^\\+(?:2|3|4)\\d{8,13}$",
        valuePattern: /^\+(?:2|3|4)(?:[\s-]?\d){8,13}$/,
        format: "універсальний міжнародний формат для європейських телефонних кодів",
        examples: [
            "+421 901 123 456",
            "+34 612 34 56 78",
            "+358401234567"
        ]
    }
];

if (typeof window !== "undefined") {
    window.EUROPE_PHONE_RULES = EUROPE_PHONE_RULES;
}

class RegexSemanticAnalyzer {
    analyze(pattern) {
        const trimmed = pattern.trim();
        if (!trimmed) {
            return {
                type: "empty",
                label: "Тип: порожній",
                description: "Порожній вираз – немає, що аналізувати.",
                example: null,
                confidence: 0,
                meta: {}
            };
        }

        const validation = this.validate(trimmed);
        if (!validation.valid) {
            return {
                type: "invalid",
                label: "Тип: помилка синтаксису",
                description: `Regex не пройшов точну перевірку синтаксису: ${validation.errorMessage}`,
                example: null,
                confidence: 0,
                meta: {}
            };
        }

        const structuralSummary = this.buildStructuralSummary(trimmed);
        const detection = this.detectType(trimmed);
        const typeId = typeof detection === "string" ? detection : detection.id;
        const meta = typeof detection === "string" ? {} : detection;
        const description = this.describeType(detection, trimmed, structuralSummary);
        const example = this.getExampleForType(typeId, trimmed, meta);
        const label = meta.label || this.getLabelForType(typeId, meta);

        return {
            type: typeId,
            label,
            description,
            example,
            confidence: typeId === "unknown" ? 0.9 : 0.98,
            meta
        };
    }

    validate(pattern) {
        try {
            new RegExp(pattern);
            return { valid: true };
        } catch (error) {
            return { valid: false, errorMessage: error.message };
        }
    }

    detectType(pattern) {
        const normalized = pattern.replace(/\\\\/g, "\\");
        const corePattern = this.unwrapRegexDelimiters(normalized);

        const euPhone = this.detectEuropeanPhone(corePattern);
        if (euPhone) {
            return euPhone;
        }

        // URL (http/https)
        if (/https?\??:\\?\/\\?\/|https?\?:\/\/|^https?\b/.test(corePattern)) {
            return "url";
        }

        // Email
        if (/@/.test(corePattern) && /\\?@/.test(corePattern) || /\[A-Za-z\]\{2,}/.test(corePattern) || /@\[\\w.-]+/.test(corePattern)) {
            if (corePattern.includes("@") || /@\[\\w.-]+/.test(corePattern) || /\\@/.test(corePattern)) {
                return "email";
            }
        }

        // IPv4
        if (/25[0-5]|2[0-4]\d|\d{1,3}\./.test(corePattern) && corePattern.includes(".")) {
            if (/(\d{1,3}\.){3}\d{1,3}/.test(corePattern)) {
                return "ipv4";
            }
        }

        // IPv6
        if (corePattern.toLowerCase().includes(":[0-9a-f]") || /[0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4}/.test(corePattern)) {
            if (corePattern.includes(":") && /[0-9A-Fa-f]/.test(corePattern)) {
                return "ipv6";
            }
        }

        // HEX color
        if (/#\\?[0-9A-Fa-f]\{6}|#\[[0-9A-Fa-f]\{3,6}/.test(corePattern) || /#\[[0-9A-Fa-f]{3,6}]/.test(corePattern)) {
            return "hex-color";
        }
        if (/^#?\\?[0-9A-Fa-f]{3,6}$/.test(corePattern)) {
            return "hex-color";
        }

        // Телефон загальний (починається з +, містить від 10-15 цифр)
        if (/\\\+?\d{10,15}|^\+?\d{10,15}/.test(corePattern)) {
            return "phone";
        }

        // Дата YYYY-MM-DD
        if (/\\d{4}[-\/]\\d{2}[-\/]\\d{2}/.test(corePattern)) {
            return "date-ymd";
        }

        // Дата DD/MM/YYYY або DD.MM.YYYY
        if (/\\d{2}[.\/-]\\d{2}[.\/-]\\d{4}/.test(corePattern)) {
            return "date-dmy";
        }

        // Час HH:MM(:SS)?
        if (/\\d{2}:\\d{2}(:\\d{2})?/.test(corePattern)) {
            return "time";
        }

        // UUID v4 (дуже типова структура)
        if (/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/.test(corePattern)) {
            return "uuid-v4";
        }

        // Integer
        if (/^\^?\\d\+?\$?$/.test(corePattern) || /^\^?[-+]?\d+\$?$/.test(corePattern)) {
            return "integer";
        }

        // Float
        if (/\\d+\\.\\d+/.test(corePattern)) {
            return "float";
        }

        // Username / slug-like
        if (/\\w+\+?|[a-zA-Z0-9_-]\+/.test(corePattern) && /username|user/i.test(corePattern)) {
            return "username";
        }

        // Credit Card (16 цифр, групи по 4)
        if (/(\d{4}[- ]?){3}\d{4}/.test(corePattern) || /\\d{16}/.test(corePattern)) {
            return "credit-card";
        }

        return "unknown";
    }

    unwrapRegexDelimiters(pattern) {
        const match = pattern.match(/^\/(.*)\/[gimsuy]*$/);
        return match ? match[1] : pattern;
    }

    detectEuropeanPhone(pattern) {
        for (const rule of EUROPE_PHONE_RULES) {
            if (rule.regexPattern.test(pattern)) {
                return {
                    ...rule,
                    id: rule.id === "phone-eu" ? "phone-eu" : rule.id,
                    label: `Телефонний номер — ${rule.countryName} ${rule.flag}`
                };
            }
        }
        return null;
    }

    describeType(type, pattern, structuralSummary) {
        const guaranteedSummary =
            ` Детальний синтаксичний розбір підтверджує валідність: ${structuralSummary}`;
        const typeId = typeof type === "string" ? type : type.id;
        const meta = typeof type === "string" ? {} : type;

        if (typeId === "phone-eu" || typeId === "phone-ua" || typeId === "phone-de" || typeId === "phone-fr") {
            return this.describeEuropeanPhone(meta, guaranteedSummary);
        }

        switch (typeId) {
            case "url":
                return "Regex описує URL-адресу (web-посилання):, як правило, з протоколом http або https, доменом, зоною (TLD), а інколи й шляхом (path) чи параметрами." + guaranteedSummary;
            case "email":
                return "Regex описує email-адресу: локальна частина (ім'я поштової скриньки) + символ '@' + домен." + guaranteedSummary;
            case "ipv4":
                return "Regex описує IPv4-адресу: 4 блоки чисел від 0 до 255, розділені крапками." + guaranteedSummary;
            case "ipv6":
                return "Regex описує IPv6-адресу: послідовність шістнадцяткових чисел, розділених двокрапками." + guaranteedSummary;
            case "hex-color":
                return "Regex описує HEX-колір, як у CSS: #RRGGBB або #RGB." + guaranteedSummary;
            case "phone":
                return "Regex описує міжнародний номер телефону, зазвичай з початковим '+' та 10–15 цифрами." + guaranteedSummary;
            case "date-ymd":
                return "Regex описує дату у форматі YYYY-MM-DD (рік-місяць-день)." + guaranteedSummary;
            case "date-dmy":
                return "Regex описує дату у форматі DD/MM/YYYY або DD.MM.YYYY (день-місяць-рік)." + guaranteedSummary;
            case "time":
                return "Regex описує час у форматі HH:MM або HH:MM:SS (години та хвилини, інколи з секундами)." + guaranteedSummary;
            case "uuid-v4":
                return "Regex описує UUID версії 4 — універсальний унікальний ідентифікатор у форматі 8-4-4-4-12 шістнадцяткових символів." + guaranteedSummary;
            case "integer":
                return "Regex описує ціле число (integer), можливо з необов'язковим знаком '+/-'." + guaranteedSummary;
            case "float":
                return "Regex описує дійсне число з плаваючою крапкою (float), наприклад 3.14 або 0.001." + guaranteedSummary;
            case "username":
                return "Regex описує username / нікнейм, який складається з латинських букв, цифр, знаків '_' або '-'." + guaranteedSummary;
            case "credit-card":
                return "Regex описує номер платіжної картки (часто 16 цифр, інколи з пробілами або дефісами між блоками по 4 цифри)." + guaranteedSummary;
            case "empty":
                return "Порожній вираз – немає, що аналізувати.";
            case "unknown":
            default:
                return "Валідний regex загального призначення: жодна з відомих категорій (URL, email тощо) не співпала. Він описує довільний шаблон, що визначається комбінацією груп, класів і квантифікаторів." + guaranteedSummary;
        }
    }

    getLabelForType(typeId, meta = {}) {
        const countryLabel = meta.countryName ? `Телефонний номер — ${meta.countryName} ${meta.flag || ""}` : null;
        switch (typeId) {
            case "phone-ua":
            case "phone-de":
            case "phone-fr":
            case "phone-eu":
                return countryLabel || "Тип: телефонний номер";
            case "url":
                return "Тип: URL";
            case "email":
                return "Тип: Email";
            case "ipv4":
                return "Тип: IPv4";
            case "ipv6":
                return "Тип: IPv6";
            case "hex-color":
                return "Тип: HEX-колір";
            case "phone":
                return "Тип: телефонний номер";
            case "date-ymd":
            case "date-dmy":
                return "Тип: дата";
            case "time":
                return "Тип: час";
            case "uuid-v4":
                return "Тип: UUID";
            case "integer":
                return "Тип: ціле число";
            case "float":
                return "Тип: дійсне число";
            case "username":
                return "Тип: ім'я користувача";
            case "credit-card":
                return "Тип: платіжна картка";
            default:
                return "Тип: невідомий / загальний";
        }
    }

    describeEuropeanPhone(meta, guaranteedSummary) {
        const country = meta.countryName || "Європа";
        const flag = meta.flag ? ` ${meta.flag}` : "";
        const callingCode = meta.callingCode ? `Міжнародний код: ${meta.callingCode}.` : "";
        const format = meta.format ? `Формат: ${meta.format}.` : "";
        return [
            `Тип: Телефонний номер`,
            `Країна: ${country}${flag}.`,
            callingCode,
            format,
            guaranteedSummary
        ].filter(Boolean).join(" ");
    }

    buildStructuralSummary(pattern) {
        const tokens = RegexSymbolDictionary.tokenize(pattern);
        const stats = {
            anchors: 0,
            groups: 0,
            classes: 0,
            quantifiers: 0,
            alternatives: 0,
            escapes: 0,
            literals: 0
        };

        tokens.forEach((token) => {
            const cls = RegexSymbolDictionary.classifyToken(token);
            if (cls === "rx-anchor") stats.anchors++;
            else if (cls === "rx-class") stats.classes++;
            else if (cls === "rx-quantifier") stats.quantifiers++;
            else if (cls === "rx-alternative") stats.alternatives++;
            else if (cls === "rx-escape") stats.escapes++;
            else if (cls === "rx-group" && token === "(") stats.groups++;
            else if (cls === "rx-literal") stats.literals++;

        });

        const lookarounds = (pattern.match(/\(\?(?:[:=!]|<?[=!])/g) || []).length;
        const namedCaptures = (pattern.match(/\(\?<[^>]+>/g) || []).length;

        const summaryParts = [];
        summaryParts.push(`Валідний JS-regex довжиною ${pattern.length} символів.`);
        summaryParts.push(`Токенів: ${tokens.length}.`);

        summaryParts.push(
            stats.groups
                ? `Груп: ${stats.groups} (спецгруп/оглядів: ${lookarounds}, іменованих: ${namedCaptures}).`
                : "Груп немає — шаблон лінійний."
        );
        summaryParts.push(
            stats.classes
                ? `Класи символів: ${stats.classes} (узгоджують дозволені набори символів).`
                : "Без явних класів символів."
        );
        summaryParts.push(
            stats.quantifiers
                ? `Квантифікатори: ${stats.quantifiers} (контролюють повторення).`
                : "Квантифікатори відсутні — фіксована довжина елементів."
        );
        summaryParts.push(
            stats.alternatives
                ? `Альтернатив: ${stats.alternatives} (|).`
                : "Без альтернатив (|) — єдиний шлях збігу."
        );
        summaryParts.push(`Екранованих послідовностей: ${stats.escapes}.`);
        summaryParts.push(`Звичайних літералів: ${stats.literals}.`);

        return summaryParts.join(" ");
    }

    getExampleForType(type, pattern, meta = {}) {
        switch (type) {
            case "phone-ua":
            case "phone-de":
            case "phone-fr":
            case "phone-eu": {
                const rule = EUROPE_PHONE_RULES.find(r => r.id === type) || meta;
                const pool = rule && rule.examples
                    ? rule.examples
                    : [];
                if (pool.length) return this.randomFrom(pool);
                break;
            }
            case "url":
                return this.randomFrom([
                    "https://example.com",
                    "http://my-site.org/path/to/page",
                    "https://sub.domain.ua/docs?id=42"
                ]);
            case "email":
                return this.randomFrom([
                    "user@example.com",
                    "student.2025@university.ua",
                    "dev-team+regex@my-company.org"
                ]);
            case "ipv4":
                return this.randomFrom([
                    "192.168.0.1",
                    "10.0.0.42",
                    "8.8.8.8"
                ]);
            case "ipv6":
                return this.randomFrom([
                    "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
                    "fe80::1",
                    "2a00:1450:4009:80b::200e"
                ]);
            case "hex-color":
                return this.randomFrom([
                    "#ff00ff",
                    "#1e293b",
                    "#09f",
                    "#22c55e"
                ]);
            case "phone":
                return this.randomFrom([
                    "+12025550123",
                    "+442071838750",
                    "+4915112345678"
                ]);
            case "date-ymd":
                return this.randomFrom([
                    "2025-12-12",
                    "2023-01-01",
                    "1999-07-24"
                ]);
            case "date-dmy":
                return this.randomFrom([
                    "31.12.2025",
                    "01/01/2023",
                    "24-07-1999"
                ]);
            case "time":
                return this.randomFrom([
                    "09:30",
                    "23:59:59",
                    "14:05"
                ]);
            case "uuid-v4":
                return this.randomFrom([
                    "550e8400-e29b-41d4-a716-446655440000",
                    "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                    "6ba7b810-9dad-11d1-80b4-00c04fd430c8".replace("1-80b4", "4-8ab4")
                ]);
            case "integer":
                return this.randomFrom([
                    "0",
                    "42",
                    "-13",
                    "+2025"
                ]);
            case "float":
                return this.randomFrom([
                    "3.14",
                    "0.001",
                    "-2.71828"
                ]);
            case "username":
                return this.randomFrom([
                    "nastia_dev",
                    "regex_master-01",
                    "user123"
                ]);
            case "credit-card":
                return this.randomFrom([
                    "4111 1111 1111 1111",
                    "5500-0000-0000-0004",
                    "4000000000000002"
                ]);
            default:
                // fallback: якщо regex валідний — повернути щось схоже
                try {
                    new RegExp(pattern);
                } catch {
                    return null;
                }
                return "Приклад залежить від конкретного шаблону. Спробуй протестувати regex у своєму середовищі.";
        }
    }

    randomFrom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
}
