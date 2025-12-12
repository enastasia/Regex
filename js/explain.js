class RegexStructureExplainer {
    constructor() {
        this.pattern = "";
        this.index = 0;
        this.parts = [];
    }

    explain(pattern) {
        this.pattern = pattern;
        this.index = 0;
        this.parts = [];

        if (!pattern) {
            return "Порожній вираз – нічого пояснювати 😊";
        }

        this.addSummary(pattern);
        this.parts.push("");

        while (this.index < this.pattern.length) {
            const ch = this.pattern[this.index];

            if (ch === "\\") {
                this.handleEscape();
            } else if (ch === "^" || ch === "$") {
                this.handleAnchor(ch);
                this.index++;
            } else if (ch === ".") {
                this.parts.push(". — будь-який символ (крім переводу рядка).");
                this.index++;
            } else if (ch === "[") {
                this.handleCharClass();
            } else if (ch === "(") {
                this.handleGroup();
            } else if (ch === "{") {
                this.handleCurlyQuantifier();
            } else if (ch === "?" || ch === "+" || ch === "*") {
                this.handleSimpleQuantifier(ch);
                this.index++;
            } else if (ch === "|") {
                this.parts.push("| — альтернатива (або ліва частина, або права).");
                this.index++;
            } else {
                this.handleLiteral(ch);
                this.index++;
            }
        }

        return this.parts.join("\n");
    }

    addSummary(pattern) {
        this.parts.push(`Початковий вираз: /${pattern}/`);
        this.parts.push("Загальна ідея: regex складається з послідовності символів, груп, класів символів і квантифікаторів, які разом визначають, які саме рядки вважаються валідними.");
    }

    handleEscape() {
        this.index++; // skip '\'
        if (this.index >= this.pattern.length) {
            this.parts.push("\\ — зворотний слеш (екранування символу).");
            return;
        }

        const ch = this.pattern[this.index];
        const seq = "\\" + ch;

        const map = {
            "d": "\\d — будь-яка цифра (0–9).",
            "D": "\\D — будь-який символ, крім цифри.",
            "w": "\\w — буква, цифра або підкреслення.",
            "W": "\\W — будь-що, крім \\w.",
            "s": "\\s — пробільний символ (пробіл, таб, перевід рядка).",
            "S": "\\S — будь-що, крім пробільних символів.",
            "t": "\\t — символ табуляції.",
            "n": "\\n — перевід рядка.",
            "r": "\\r — повернення каретки.",
            "b": "\\b — границя слова.",
            "B": "\\B — не границя слова."
        };

        if (map[ch]) {
            this.parts.push(map[ch]);
        } else {
            this.parts.push(`${seq} — екранований символ '${ch}' або спеціальна послідовність (залежить від контексту).`);
        }

        this.index++;
    }

    handleAnchor(ch) {
        if (ch === "^") {
            this.parts.push("^ — початок рядка.");
        } else if (ch === "$") {
            this.parts.push("$ — кінець рядка.");
        }
    }

    handleCharClass() {
        const start = this.index;
        let content = "";
        this.index++; // skip '['
        let closed = false;
        while (this.index < this.pattern.length) {
            const ch = this.pattern[this.index];
            if (ch === "\\" && this.index + 1 < this.pattern.length) {
                content += ch + this.pattern[this.index + 1];
                this.index += 2;
                continue;
            }
            if (ch === "]") {
                closed = true;
                this.index++;
                break;
            }
            content += ch;
            this.index++;
        }
        const full = this.pattern.slice(start, this.index);
        if (!closed) {
            this.parts.push(`${full} — незавершений клас символів (відсутня закриваюча ']').`);
            return;
        }

        const isNegated = content.startsWith("^");
        let desc = `${full} — клас символів, `;
        if (isNegated) {
            desc += "які НЕ входять до вказаного набору: ";
            content = content.slice(1);
        } else {
            desc += "які входять до вказаного набору: ";
        }

        if (content === "") {
            desc += "(порожній клас – зазвичай помилка).";
        } else {
            desc += content;
        }

        this.parts.push(desc);
    }

    handleGroup() {
        const start = this.index;
        this.index++; // skip '('

        if (this.pattern[this.index] === "?") {
            const next = this.pattern[this.index + 1];
            const next2 = this.pattern[this.index + 2];
            let typeDesc = null;

            if (next === ":") {
                typeDesc = "незапам'ятовуюча група (?:...) — групує вираз без створення окремого захопленого підвиразу.";
            } else if (next === "=") {
                typeDesc = "позитивний lookahead (?=...) — те, що має йти далі, але не включається до збігу.";
            } else if (next === "!") {
                typeDesc = "негативний lookahead (?!...) — те, чого НЕ повинно бути далі.";
            } else if (next === "<" && next2 === "=") {
                typeDesc = "позитивний lookbehind (?<=...) — те, що має бути перед позицією збігу.";
            } else if (next === "<" && next2 === "!") {
                typeDesc = "негативний lookbehind (?<!...) — те, чого НЕ повинно бути перед позицією збігу.";
            }

            const groupStartIndex = start;
            let depth = 1;
            while (this.index < this.pattern.length && depth > 0) {
                const ch = this.pattern[this.index];
                if (ch === "\\" && this.index + 1 < this.pattern.length) {
                    this.index += 2;
                    continue;
                }
                if (ch === "(") depth++;
                if (ch === ")") depth--;
                this.index++;
            }
            const full = this.pattern.slice(groupStartIndex, this.index);
            if (typeDesc) {
                this.parts.push(`${full} — ${typeDesc}`);
            } else {
                this.parts.push(`${full} — спецгрупа (починається з '(?)'), точне значення залежить від синтаксису.`);
            }
            return;
        }

        // Звичайна група
        let depth = 1;
        let content = "";
        while (this.index < this.pattern.length && depth > 0) {
            const ch = this.pattern[this.index];
            if (ch === "\\" && this.index + 1 < this.pattern.length) {
                content += ch + this.pattern[this.index + 1];
                this.index += 2;
                continue;
            }
            if (ch === "(") {
                depth++;
                content += ch;
            } else if (ch === ")") {
                depth--;
                if (depth > 0) content += ch;
            } else {
                content += ch;
            }
            this.index++;
        }
        const full = this.pattern.slice(start, this.index);
        this.parts.push(`${full} — група / підвираз. Вміст групи: "${content}".`);
    }

    handleCurlyQuantifier() {
        const start = this.index;
        let content = "";
        this.index++; // skip '{'
        while (this.index < this.pattern.length) {
            const ch = this.pattern[this.index];
            if (ch === "}") {
                this.index++;
                break;
            }
            content += ch;
            this.index++;
        }
        const full = this.pattern.slice(start, this.index);
        const match = content.match(/^(\d+)(,(\d*)?)?$/);
        if (!match) {
            this.parts.push(`${full} — квантифікатор у фігурних дужках, формат не {m} або {m,n}.`);
            return;
        }

        const m = match[1];
        const hasComma = !!match[2];
        const n = match[3];

        if (!hasComma) {
            this.parts.push(`${full} — рівно ${m} повторень попереднього елементу.`);
        } else if (hasComma && n === "") {
            this.parts.push(`${full} — як мінімум ${m} повторень попереднього елементу.`);
        } else {
            this.parts.push(`${full} — від ${m} до ${n} повторень попереднього елементу.`);
        }
    }

    handleSimpleQuantifier(ch) {
        if (ch === "?") {
            this.parts.push("? — 0 або 1 повторення попереднього елементу (необов'язковий елемент).");
        } else if (ch === "+") {
            this.parts.push("+ — 1 або більше повторень попереднього елементу.");
        } else if (ch === "*") {
            this.parts.push("* — 0 або більше повторень попереднього елементу.");
        }
    }

    handleLiteral(ch) {
        const special = "^$.*+?()[]{}|\\";
        if (special.includes(ch)) {
            this.parts.push(`${ch} — літерал спецсимволу (враховуй контекст та екранування).`);
        } else {
            this.parts.push(`${ch} — звичайний символ '${ch}'.`);
        }
    }
}
