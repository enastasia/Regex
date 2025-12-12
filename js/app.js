document.addEventListener("DOMContentLoaded", () => {
    new App();
});

class App {
    constructor() {
        this.mode = "explain";

        this.semanticAnalyzer = new RegexSemanticAnalyzer();
        this.structureExplainer = new RegexStructureExplainer();
        this.symbolDictionary = RegexSymbolDictionary;
        this.regexFromExamplesGenerator = new RegexFromExamplesGenerator();

        this.lastSemanticType = null;
        this.lastSemanticMeta = null;
        this.lastPattern = "";

        this.dom = {
            modeToggle: document.getElementById("modeToggle"),
            mainInput: document.getElementById("mainInput"),
            actionButton: document.getElementById("actionButton"),
            fillExampleButton: document.getElementById("fillExampleButton"),
            randomExampleButton: document.getElementById("randomExampleButton"),

            inputTitle: document.getElementById("inputTitle"),
            inputHint: document.getElementById("inputHint"),
            inputLabel: document.getElementById("inputLabel"),
            inputSubhint: document.getElementById("inputSubhint"),
            chipsContainer: document.getElementById("chipsContainer"),

            semanticTypeTag: document.getElementById("semanticTypeTag"),
            semanticRegex: document.getElementById("semanticRegex"),
            semanticDescription: document.getElementById("semanticDescription"),
            semanticExample: document.getElementById("semanticExample"),

            structureOutput: document.getElementById("structureOutput"),
            symbolsTable: document.getElementById("symbolsTable").querySelector("tbody"),

            statusText: document.getElementById("statusText"),
            statusTag: document.getElementById("statusTag"),
            statusTagText: document.getElementById("statusTagText"),
            modeLabel: document.getElementById("modeLabel")
        };

        this.initEvents();
        this.updateUIForMode();
        this.setIdleStatus();
    }

    initEvents() {
        this.dom.modeToggle.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-mode]");
            if (!btn) return;
            this.setMode(btn.getAttribute("data-mode"));
        });

        this.dom.actionButton.addEventListener("click", () => {
            this.handleAction();
        });

        this.dom.fillExampleButton.addEventListener("click", () => {
            this.fillExampleForMode();
        });

        this.dom.randomExampleButton.addEventListener("click", () => {
            this.generateRandomExampleValue();
        });

        this.dom.mainInput.addEventListener("input", () => {
            const value = this.dom.mainInput.value.trim();
            if (value.length === 0) {
                this.setIdleStatus();
                this.clearOutputs();
            } else {
                this.setTypingStatus();
            }
        });
    }

    setMode(mode) {
        if (mode !== "explain" && mode !== "generate") return;
        this.mode = mode;

        const buttons = this.dom.modeToggle.querySelectorAll("button[data-mode]");
        buttons.forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-mode") === mode);
        });

        this.updateUIForMode();
        this.setIdleStatus();
        this.clearOutputs();
    }

    updateUIForMode() {
        if (this.mode === "explain") {
            this.dom.inputTitle.textContent = "Ввід регулярного виразу";
            this.dom.inputHint.innerHTML = 'Наприклад: <code class="inline">^https?:\\/\\/[\\w.-]+\\.[A-Za-z]{2,}(\\/\\S*)?$</code>';
            this.dom.inputLabel.textContent = "Regex";
            this.dom.inputSubhint.textContent = "Введи будь-який регулярний вираз (JS-синтаксис).";
            this.dom.actionButton.innerHTML = '<span class="icon">🧠</span>Пояснити regex';
            this.dom.modeLabel.textContent = "explain";
            this.dom.chipsContainer.style.display = "flex";
        } else {
            this.dom.inputTitle.textContent = "Ввід прикладів для побудови regex";
            this.dom.inputHint.innerHTML = 'Кожен приклад з нового рядка: <code class="inline">user-01</code>, <code class="inline">user-12</code>…';
            this.dom.inputLabel.textContent = "Приклади рядків";
            this.dom.inputSubhint.textContent = "Напиши 1 або кілька прикладів рядків, для яких потрібен один regex.";
            this.dom.actionButton.innerHTML = '<span class="icon">✨</span>Згенерувати regex';
            this.dom.modeLabel.textContent = "generate";
            this.dom.chipsContainer.style.display = "none";
        }
    }

    handleAction() {
        const value = this.dom.mainInput.value.trim();
        if (!value) {
            this.setErrorStatus("Поле вводу порожнє. Заповни його, будь ласка.");
            this.clearOutputs();
            return;
        }

        if (this.mode === "explain") {
            this.explainRegex(value);
        } else {
            this.generateRegexFromExamples(value);
        }
    }

    explainRegex(pattern) {
        // Перевіримо валідність
        try {
            new RegExp(pattern);
        } catch (e) {
            this.setErrorStatus("Схоже, що regex містить синтаксичну помилку для JS.");
            this.dom.semanticRegex.textContent = pattern;
            this.dom.semanticDescription.textContent =
                "JS не може створити об'єкт RegExp з цього виразу. Перевір дужки, класи символів, фігурні дужки та екранування.";
            this.dom.semanticTypeTag.textContent = "Тип: помилка синтаксису";
            this.dom.semanticExample.textContent = "—";
            this.dom.structureOutput.textContent = e.message;
            this.dom.structureOutput.classList.remove("empty");
            this.fillSymbolsTable([]);
            return;
        }

        this.lastPattern = pattern;

        // 1) Семантика
        const semantic = this.semanticAnalyzer.analyze(pattern);
        this.lastSemanticType = semantic.type;
        this.lastSemanticMeta = semantic.meta;

        this.dom.semanticTypeTag.textContent =
            semantic.label || (semantic.type === "unknown" ? "Тип: невідомий / загальний" : `Тип: ${semantic.type}`);
        this.dom.semanticRegex.innerHTML =
            "/" + RegexSymbolDictionary.highlight(pattern) + "/";

        this.dom.semanticDescription.textContent = semantic.description;
        this.dom.semanticExample.textContent = semantic.example || "—";

        // 2) Структура
        const structureText = this.structureExplainer.explain(pattern);
        this.dom.structureOutput.textContent = structureText;
        this.dom.structureOutput.classList.remove("empty");

        // 3) Таблиця символів
        const symbols = this.symbolDictionary.getSymbolExplanations(pattern);
        this.fillSymbolsTable(symbols);

        this.setSuccessStatus("Regex успішно проаналізовано й пояснено.");
    }

    generateRegexFromExamples(text) {
        const { regex, explanation } = this.regexFromExamplesGenerator.generateFromExamples(text);

        if (!regex) {
            this.setErrorStatus("Не вдалося побудувати вираз – замало або дивні дані.");
            this.dom.semanticRegex.textContent = "—";
            this.dom.semanticDescription.textContent = explanation;
            this.dom.semanticTypeTag.textContent = "Тип: неможливо визначити";
            this.dom.semanticExample.textContent = "—";
            this.dom.structureOutput.textContent = explanation;
            this.dom.structureOutput.classList.remove("empty");
            this.fillSymbolsTable([]);
            return;
        }

        // Показуємо згенерований regex і одразу пропускаємо через explain-пайплайн,
        // щоб користувач міг побачити всі ті ж пояснення.
        this.dom.semanticRegex.innerHTML =
            "/" + RegexSymbolDictionary.highlight(regex) + "/";
        this.dom.semanticDescription.textContent =
            "Згенерований regex на основі наданих прикладів.\n\n" + explanation;
        this.dom.semanticTypeTag.textContent = "Тип: (буде визначено за regex)";
        this.dom.semanticExample.textContent = "—";

        // Додатково: зробимо семантичний аналіз згенерованого regex
        const semantic = this.semanticAnalyzer.analyze(regex);
        this.lastSemanticType = semantic.type;
        this.lastSemanticMeta = semantic.meta;
        this.lastPattern = regex;

        this.dom.semanticTypeTag.textContent =
            semantic.label || (semantic.type === "unknown" ? "Тип: невідомий / загальний" : `Тип: ${semantic.type}`);
        if (semantic.example) {
            this.dom.semanticExample.textContent = semantic.example;
        }

        const structureText = this.structureExplainer.explain(regex);
        this.dom.structureOutput.textContent = structureText;
        this.dom.structureOutput.classList.remove("empty");

        const symbols = this.symbolDictionary.getSymbolExplanations(regex);
        this.fillSymbolsTable(symbols);

        this.setSuccessStatus("Regex згенеровано з прикладів і проаналізовано.");
    }

    fillSymbolsTable(symbols) {
        const tbody = this.dom.symbolsTable;
        tbody.innerHTML = "";

        if (!symbols || symbols.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 2;
            td.className = "empty-cell";
            td.textContent = "Немає даних для відображення. Введи regex, щоб побачити токени.";
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }

        symbols.forEach(({ token, description }) => {
            const tr = document.createElement("tr");
            const tdToken = document.createElement("td");
            const tdDesc = document.createElement("td");

            tdToken.textContent = token;
            tdDesc.textContent = description;

            tr.appendChild(tdToken);
            tr.appendChild(tdDesc);
            tbody.appendChild(tr);
        });
    }

    generateRandomExampleValue() {
        if (!this.lastPattern) {
            this.setErrorStatus("Спочатку введи regex і натисни «Пояснити regex».");
            return;
        }
        const type = this.lastSemanticType || "unknown";
        const example = this.semanticAnalyzer.getExampleForType(type, this.lastPattern, this.lastSemanticMeta || {});
        if (!example) {
            this.setErrorStatus("Для цього типу шаблону важко згенерувати надійний приклад автоматично.");
            return;
        }
        this.dom.semanticExample.textContent = example;
        this.setSuccessStatus("Згенеровано приклад значення для розпізнаного типу.");
    }

    fillExampleForMode() {
        if (this.mode === "explain") {
            const examples = [
                "^https?:\\/\\/[\\w.-]+\\.[A-Za-z]{2,}(\\/\\S*)?$", // URL
                "^[\\w.-]+@[\\w.-]+\\.[A-Za-z]{2,}$",             // Email
                "^\\+380\\s?\\d{2}\\s?\\d{3}\\s?\\d{2}\\s?\\d{2}$", // UA phone
                "^\\+49\\s?(1[5-7]\\d|[2-9]\\d)\\s?\\d{3,8}$",        // DE phone
                "^\\+33\\s?[1-9](\\s?\\d{2}){4}$",                        // FR phone
                "^\\d{4}-\\d{2}-\\d{2}$",                         // Date YYYY-MM-DD
                "^(?=.*\\d)(?=.*[A-Z]).{8,}$"                     // Strong password (умовно)
            ];
            const ex = examples[Math.floor(Math.random() * examples.length)];
            this.dom.mainInput.value = ex;
            this.setTypingStatus();
            this.setOutputHint("Приклад regex підставлено. Натисни «Пояснити regex» 😉");
        } else {
            const exampleSets = [
                "user-01\nuser-12\nuser-99",
                "2023-12-01\n2024-01-30\n2025-02-15",
                "abc123\nxyz456\nqwe789",
                "INV-2023-001\nINV-2023-102\nINV-2024-777",
                "+380 50 123 45 67",
                "+49 151 23456789",
                "+33 6 12 34 56 78"
            ];
            const ex = exampleSets[Math.floor(Math.random() * exampleSets.length)];
            this.dom.mainInput.value = ex;
            this.setTypingStatus();
            this.setOutputHint("Приклади рядків підставлено. Натисни «Згенерувати regex» ✨");
        }
    }

    setOutputHint(text) {
        this.dom.structureOutput.textContent = text;
        this.dom.structureOutput.classList.remove("empty");
    }

    clearOutputs() {
        this.dom.semanticTypeTag.textContent = "Тип: невідомо";
        this.dom.semanticRegex.textContent =
            "Введи regex ліворуч, щоб побачити пояснення.";
        this.dom.semanticDescription.textContent =
            "Тут буде людське пояснення того, які дані описує цей регулярний вираз.";
        this.dom.semanticExample.textContent = "—";

        this.dom.structureOutput.textContent =
            "Тут буде покроковий розбір: групи, класи символів, квантифікатори, lookahead'и…";
        this.dom.structureOutput.classList.add("empty");

        this.fillSymbolsTable([]);
        this.lastPattern = "";
        this.lastSemanticType = null;
        this.lastSemanticMeta = null;
    }

    setIdleStatus() {
        this.dom.statusText.textContent = "Очікую на дані…";
        this.dom.statusText.className = "status-text";
        this.dom.statusTagText.textContent = "пасивний режим";
        const dot = this.dom.statusTag.querySelector(".tag-dot");
        if (dot) dot.className = "tag-dot";
    }

    setTypingStatus() {
        this.dom.statusText.textContent =
            this.mode === "explain"
                ? "Можеш натиснути «Пояснити regex»."
                : "Можеш натиснути «Згенерувати regex».";
        this.dom.statusText.className = "status-text";
        this.dom.statusTagText.textContent = "ввід даних…";
        const dot = this.dom.statusTag.querySelector(".tag-dot");
        if (dot) dot.className = "tag-dot";
    }

    setErrorStatus(message) {
        this.dom.statusText.textContent = message;
        this.dom.statusText.className = "status-text error";
        this.dom.statusTagText.textContent = "помилка";
        const dot = this.dom.statusTag.querySelector(".tag-dot");
        if (dot) {
            dot.className = "tag-dot error";
        }
    }

    setSuccessStatus(message) {
        this.dom.statusText.textContent = message;
        this.dom.statusText.className = "status-text success";
        this.dom.statusTagText.textContent = "готово";
        const dot = this.dom.statusTag.querySelector(".tag-dot");
        if (dot) {
            dot.className = "tag-dot success";
        }
    }
}
