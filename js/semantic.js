class RegexSemanticAnalyzer {
    analyze(pattern) {
        const trimmed = pattern.trim();
        if (!trimmed) {
            return {
                type: "empty",
                description: "Порожній вираз – немає, що аналізувати.",
                example: null,
                confidence: 0
            };
        }

        const type = this.detectType(trimmed);
        const description = this.describeType(type, trimmed);
        const example = this.getExampleForType(type, trimmed);

        return {
            type,
            description,
            example,
            confidence: type === "unknown" ? 0.1 : 0.85
        };
    }

    detectType(pattern) {
        // URL (http/https)
        if (/https?\??:\\?\/\\?\/|https?\?:\/\/|^https?\b/.test(pattern)) {
            return "url";
        }

        // Email
        if (/@/.test(pattern) && /\\?@/.test(pattern) || /\[A-Za-z\]\{2,}/.test(pattern) || /@\[\\w.-]+/.test(pattern)) {
            if (pattern.includes("@") || /@\[\\w.-]+/.test(pattern) || /\\@/.test(pattern)) {
                return "email";
            }
        }

        // IPv4
        if (/25[0-5]|2[0-4]\d|\d{1,3}\./.test(pattern) && pattern.includes(".")) {
            if (/(\d{1,3}\.){3}\d{1,3}/.test(pattern)) {
                return "ipv4";
            }
        }

        // IPv6
        if (pattern.toLowerCase().includes(":[0-9a-f]") || /[0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4}/.test(pattern)) {
            if (pattern.includes(":") && /[0-9A-Fa-f]/.test(pattern)) {
                return "ipv6";
            }
        }

        // HEX color
        if (/#\\?[0-9A-Fa-f]\{6}|#\[[0-9A-Fa-f]\{3,6}/.test(pattern) || /#\[[0-9A-Fa-f]{3,6}]/.test(pattern)) {
            return "hex-color";
        }
        if (/^#?\\?[0-9A-Fa-f]{3,6}$/.test(pattern)) {
            return "hex-color";
        }

        // Український телефон (+380...)
        if (/\\\+?380\\d{9}|^\+?380\\d{9}|380\\d{9}/.test(pattern)) {
            return "ua-phone";
        }

        // Телефон загальний (починається з +, містить від 10-15 цифр)
        if (/\\\+?\d{10,15}|^\+?\d{10,15}/.test(pattern)) {
            return "phone";
        }

        // Дата YYYY-MM-DD
        if (/\\d{4}[-\/]\\d{2}[-\/]\\d{2}/.test(pattern)) {
            return "date-ymd";
        }

        // Дата DD/MM/YYYY або DD.MM.YYYY
        if (/\\d{2}[.\/-]\\d{2}[.\/-]\\d{4}/.test(pattern)) {
            return "date-dmy";
        }

        // Час HH:MM(:SS)?
        if (/\\d{2}:\\d{2}(:\\d{2})?/.test(pattern)) {
            return "time";
        }

        // UUID v4 (дуже типова структура)
        if (/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/.test(pattern)) {
            return "uuid-v4";
        }

        // Integer
        if (/^\^?\\d\+?\$?$/.test(pattern) || /^\^?[-+]?\d+\$?$/.test(pattern)) {
            return "integer";
        }

        // Float
        if (/\\d+\\.\\d+/.test(pattern)) {
            return "float";
        }

        // Username / slug-like
        if (/\\w+\+?|[a-zA-Z0-9_-]\+/.test(pattern) && /username|user/i.test(pattern)) {
            return "username";
        }

        // Credit Card (16 цифр, групи по 4)
        if (/(\d{4}[- ]?){3}\d{4}/.test(pattern) || /\\d{16}/.test(pattern)) {
            return "credit-card";
        }

        return "unknown";
    }

    describeType(type, pattern) {
        switch (type) {
            case "url":
                return "Regex описує URL-адресу (web-посилання):, як правило, з протоколом http або https, доменом, зоною (TLD), а інколи й шляхом (path) чи параметрами.";
            case "email":
                return "Regex описує email-адресу: локальна частина (ім'я поштової скриньки) + символ '@' + домен.";
            case "ipv4":
                return "Regex описує IPv4-адресу: 4 блоки чисел від 0 до 255, розділені крапками.";
            case "ipv6":
                return "Regex описує IPv6-адресу: послідовність шістнадцяткових чисел, розділених двокрапками.";
            case "hex-color":
                return "Regex описує HEX-колір, як у CSS: #RRGGBB або #RGB.";
            case "ua-phone":
                return "Regex описує український номер телефону у форматі +380XXXXXXXXX (код країни + код оператора + номер).";
            case "phone":
                return "Regex описує міжнародний номер телефону, зазвичай з початковим '+' та 10–15 цифрами.";
            case "date-ymd":
                return "Regex описує дату у форматі YYYY-MM-DD (рік-місяць-день).";
            case "date-dmy":
                return "Regex описує дату у форматі DD/MM/YYYY або DD.MM.YYYY (день-місяць-рік).";
            case "time":
                return "Regex описує час у форматі HH:MM або HH:MM:SS (години та хвилини, інколи з секундами).";
            case "uuid-v4":
                return "Regex описує UUID версії 4 — універсальний унікальний ідентифікатор у форматі 8-4-4-4-12 шістнадцяткових символів.";
            case "integer":
                return "Regex описує ціле число (integer), можливо з необов'язковим знаком '+/-'.";
            case "float":
                return "Regex описує дійсне число з плаваючою крапкою (float), наприклад 3.14 або 0.001.";
            case "username":
                return "Regex описує username / нікнейм, який складається з латинських букв, цифр, знаків '_' або '-'.";
            case "credit-card":
                return "Regex описує номер платіжної картки (часто 16 цифр, інколи з пробілами або дефісами між блоками по 4 цифри).";
            case "empty":
                return "Порожній вираз – немає, що аналізувати.";
            case "unknown":
            default:
                return "Не вдалося впевнено розпізнати категорію даних. Це може бути спеціалізований або дуже загальний regex.";
        }
    }

    getExampleForType(type, pattern) {
        switch (type) {
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
            case "ua-phone":
                return this.randomFrom([
                    "+380501234567",
                    "+380671112233",
                    "+380931234567"
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
