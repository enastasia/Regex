class RegexFromExamplesGenerator {
    generateFromExamples(text) {
        const lines = text
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l.length > 0);

        if (lines.length === 0) {
            return {
                regex: "",
                explanation: "Не виявлено жодного непорожнього рядка. Додай хоча б один приклад."
            };
        }

        if (lines.length === 1) {
            return this.generateForSingle(lines[0]);
        }

        return this.generateForMultiple(lines);
    }

    escapeRegexLiteral(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    // --------------------------------------------------
    // 1) Один приклад → намагаємось розпізнати структуру
    // --------------------------------------------------
    generateForSingle(line) {
        const escaped = this.escapeRegexLiteral(line);

        // Типові введення
        if (/^\d+$/.test(line)) {
            return {
                regex: `^\\d{${line.length}}$`,
                explanation:
                    `Вихідний рядок: "${line}"\n` +
                    `Розпізнано: рядок із ${line.length} цифр.\n` +
                    `Regex: /^\\d{${line.length}}$/`
            };
        }

        if (/^[A-Za-z]+$/.test(line)) {
            return {
                regex: `^[A-Za-z]{${line.length}}$`,
                explanation:
                    `Вихідний рядок: "${line}"\n` +
                    `Розпізнано: рядок із ${line.length} латинських букв.\n` +
                    `Regex: /^[A-Za-z]{${line.length}}$/`
            };
        }

        if (/^\d{2,4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(line)) {
            return {
                regex: "^\\d{2,4}[-/.]\\d{1,2}[-/.]\\d{1,2}$",
                explanation:
                    `Вихідний рядок: "${line}"\n` +
                    "Розпізнано як дату (формат може бути YYYY-MM-DD або DD/MM/YYYY).\n" +
                    "Regex: /^\\d{2,4}[-/.]\\d{1,2}[-/.]\\d{1,2}$/"
            };
        }

        if (/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(line)) {
            return {
                regex: "^[\\w.-]+@[\\w.-]+\\.[A-Za-z]{2,}$",
                explanation:
                    `Вихідний рядок: "${line}"\n` +
                    "Розпізнано як email.\n" +
                    "Regex: /^[\\w.-]+@[\\w.-]+\\.[A-Za-z]{2,}$/"
            };
        }

        // Якщо нічого не розпізнано → буквальний regex
        return {
            regex: `^${escaped}$`,
            explanation:
                `Вихідний рядок: "${line}"\n` +
                "Не вдалося розпізнати шаблон — створено буквальний regex, що відповідає рядку повністю.\n" +
                `Regex: /^${escaped}$/`
        };
    }

    // --------------------------------------------------
    // 2) БАГАТО рядків → шукаємо спільний префікс, суфікс і ядро
    // --------------------------------------------------
    generateForMultiple(lines) {
        const lengths = lines.map(l => l.length);
        const minLen = Math.min(...lengths);

        // ---- Спільний префікс ----
        let prefixLen = 0;
        for (let i = 0; i < minLen; i++) {
            const char = lines[0][i];
            if (lines.every(l => l[i] === char)) prefixLen++;
            else break;
        }

        // ---- Спільний суфікс ----
        let suffixLen = 0;
        for (let i = 0; i < minLen - prefixLen; i++) {
            const idx = lines[0].length - 1 - i;
            const char = lines[0][idx];
            if (lines.every(l => l[l.length - 1 - i] === char)) suffixLen++;
            else break;
        }

        const prefix = lines[0].slice(0, prefixLen);
        const suffix = suffixLen > 0 ? lines[0].slice(lines[0].length - suffixLen) : "";

        const middleParts = lines.map(
            l => l.slice(prefixLen, l.length - suffixLen)
        );

        const coreRegex = this.buildCorePattern(middleParts);
        const prefixRegex = this.escapeRegexLiteral(prefix);
        const suffixRegex = this.escapeRegexLiteral(suffix);

        const pattern =
            "^" +
            (prefixRegex || "") +
            coreRegex +
            (suffixRegex || "") +
            "$";

        // --------------------------------------------------
        // генеруємо пояснення — тепер БЕЗ помилки лапок
        // --------------------------------------------------
        const explanation =
            "Приклади:\n" +
            lines.map(l => "  • " + l).join("\n") +
            "\n\nАлгоритм:\n" +
            `- Спільний префікс: "${prefix}"\n` +
            `- Спільний суфікс: "${suffix}"\n` +
            "- Середня частина узагальнена за типами символів.\n\n" +
            `Згенерований regex:\n/${pattern}/`;

        return { regex: pattern, explanation };
    }

    // --------------------------------------------------
    // 3) Аналіз “ядра” — середньої частини
    // --------------------------------------------------
    buildCorePattern(parts) {
        if (parts.length === 0) return "";

        // Якщо всі частини тільки цифри
        if (parts.every(p => /^\d+$/.test(p))) {
            const min = Math.min(...parts.map(p => p.length));
            const max = Math.max(...parts.map(p => p.length));
            return min === max ? `\\d{${min}}` : `\\d{${min},${max}}`;
        }

        // Якщо всі тільки букви
        if (parts.every(p => /^[A-Za-z]+$/.test(p))) {
            const min = Math.min(...parts.map(p => p.length));
            const max = Math.max(...parts.map(p => p.length));
            return min === max
                ? `[A-Za-z]{${min}}`
                : `[A-Za-z]{${min},${max}}`;
        }

        // Якщо частини різні → будуємо альтернативи
        const alternatives = parts
            .map(p => this.escapeRegexLiteral(p))
            .filter((v, i, arr) => arr.indexOf(v) === i);

        return alternatives.length === 1
            ? alternatives[0]
            : `(?:${alternatives.join("|")})`;
    }
}
