class RegexSymbolDictionary {
    static tokenize(pattern) {
        const tokens = [];
        let i = 0;

        while (i < pattern.length) {
            const ch = pattern[i];

            // Escape-послідовність
            if (ch === "\\" && i + 1 < pattern.length) {
                tokens.push(pattern.slice(i, i + 2));
                i += 2;
                continue;
            }

            // Клас символів [...]
            if (ch === "[") {
                let j = i + 1;
                let content = "[";
                let closed = false;
                while (j < pattern.length) {
                    const cj = pattern[j];
                    content += cj;
                    if (cj === "\\" && j + 1 < pattern.length) {
                        content += pattern[j + 1];
                        j += 2;
                        continue;
                    }
                    if (cj === "]") {
                        closed = true;
                        j++;
                        break;
                    }
                    j++;
                }
                tokens.push(content);
                i = j;
                continue;
            }

            // Фігурний квантифікатор {m,n}
            if (ch === "{") {
                let j = i + 1;
                let content = "{";
                while (j < pattern.length && pattern[j] !== "}") {
                    content += pattern[j];
                    j++;
                }
                if (j < pattern.length && pattern[j] === "}") {
                    content += "}";
                    j++;
                }
                tokens.push(content);
                i = j;
                continue;
            }

            // Групи: (?:...), (?=...), (?!...), (?<=...), (?<!...)
            if (ch === "(") {
                if (pattern[i + 1] === "?" && i + 2 < pattern.length) {
                    // спец.-група — віддамо '(' як окремий токен, решту залишимо на токенізацію по символах
                    tokens.push("(");
                    i++;
                    continue;
                } else {
                    tokens.push("(");
                    i++;
                    continue;
                }
            }

            if (ch === ")") {
                tokens.push(")");
                i++;
                continue;
            }

            // Інші одиночні спецсимволи
            if ("^$.*+?|".includes(ch)) {
                tokens.push(ch);
                i++;
                continue;
            }

            // Звичайний символ
            tokens.push(ch);
            i++;
        }

        return tokens;
    }

    static explainToken(token) {
        // Часті escape-коди
        const escapeMap = {
            "\\d": "Будь-яка цифра (0–9).",
            "\\D": "Будь-який символ, крім цифри.",
            "\\w": "Будь-яка буква, цифра або підкреслення.",
            "\\W": "Будь-який символ, крім \\w.",
            "\\s": "Будь-який пробільний символ (пробіл, табуляція, перевід рядка).",
            "\\S": "Будь-який символ, крім пробільних.",
            "\\t": "Символ табуляції.",
            "\\n": "Перевід рядка (newline).",
            "\\r": "Повернення каретки.",
            "\\b": "Границя слова.",
            "\\B": "Не границя слова."
        };

        if (escapeMap[token]) {
            return escapeMap[token];
        }

        // Класи символів
        if (token.startsWith("[") && token.endsWith("]")) {
            if (token[1] === "^") {
                return `${token} — клас символів, які НЕ входять до вказаного набору.`;
            }
            return `${token} — клас символів, що можуть з'явитися на цій позиції.`;
        }

        // Фігурні квантифікатори
        if (token.startsWith("{") && token.endsWith("}")) {
            const content = token.slice(1, -1);
            const match = content.match(/^(\d+)(,(\d*)?)?$/);
            if (!match) {
                return `${token} — квантифікатор у фігурних дужках (нестандартний формат).`;
            }
            const m = match[1];
            const hasComma = !!match[2];
            const n = match[3];
            if (!hasComma) {
                return `${token} — рівно ${m} повторень попереднього елементу.`;
            } else if (hasComma && n === "") {
                return `${token} — як мінімум ${m} повторень попереднього елементу.`;
            } else {
                return `${token} — від ${m} до ${n} повторень попереднього елементу.`;
            }
        }

        // Групи / спецгрупи (спрощено)
        if (token === "(") {
            return "( — початок групи / підвиразу.";
        }
        if (token === ")") {
            return ") — кінець групи / підвиразу.";
        }

        // Якорі
        if (token === "^") {
            return "^ — початок рядка.";
        }
        if (token === "$") {
            return "$ — кінець рядка.";
        }

        // Інші спецсимволи
        if (token === ".") {
            return ". — будь-який символ (зазвичай крім переводу рядка).";
        }
        if (token === "*") {
            return "* — 0 або більше повторень попереднього елементу.";
        }
        if (token === "+") {
            return "+ — 1 або більше повторень попереднього елементу.";
        }
        if (token === "?") {
            return "? — 0 або 1 повторення попереднього елементу (необов'язковий елемент).";
        }
        if (token === "|") {
            return "| — альтернатива (або ліва частина, або права).";
        }

        // Зворотний слеш сам по собі
        if (token === "\\") {
            return "\\ — зворотний слеш, використовується для екранування символів.";
        }

        // Літерал
        return `${token} — звичайний символ '${token}'.`;
    }

    static classifyToken(token) {
        if (token === "^" || token === "$") {
            return "rx-anchor";
        }
        if (token === "*" || token === "+" || token === "?" ||
            (token.startsWith("{") && token.endsWith("}"))) {
            return "rx-quantifier";
        }
        if (token === "(" || token === ")") {
            return "rx-group";
        }
        if (token.startsWith("[") && token.endsWith("]")) {
            return "rx-class";
        }
        if (token === "|" ) {
            return "rx-alternative";
        }
        if (token.startsWith("\\")) {
            return "rx-escape";
        }
        return "rx-literal";
    }

    static highlight(pattern) {
        const tokens = this.tokenize(pattern);
        if (!tokens.length) return "";

        return tokens.map(token => {
            const cls = this.classifyToken(token);
            const escapedHtml = token
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            return `<span class="rx-token ${cls}">${escapedHtml}</span>`;
        }).join("");
    }

    static getSymbolExplanations(pattern) {
        const tokens = this.tokenize(pattern);
        const explanations = [];

        tokens.forEach(token => {
            const desc = this.explainToken(token);
            explanations.push({ token, description: desc });
        });

        return explanations;
    }
}
