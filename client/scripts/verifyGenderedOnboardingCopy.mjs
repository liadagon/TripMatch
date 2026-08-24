import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [
  helperSource,
  questionnaireSource,
  registerSource,
  profileSource,
  previewSource,
  optionsSource,
] =
  await Promise.all([
    read("../src/utils/genderedHebrew.ts"),
    read("../src/Components/Questionnaire.tsx"),
    read("../src/Components/Register.tsx"),
    read("../src/Components/Profile.tsx"),
    read("../src/Components/MyProfilePreview.tsx"),
    read("../src/data/profileOptions.ts"),
  ]);

const compiled = ts.transpileModule(helperSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const helper = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const travelCopy = {
  male: "איך אני אוהב לטייל",
  female: "איך אני אוהבת לטייל",
  neutral: "סגנון הטיול שלי",
};

assert.equal(helper.getGenderedHebrewCopy("male", travelCopy), travelCopy.male);
assert.equal(
  helper.getGenderedHebrewCopy("female", travelCopy),
  travelCopy.female,
);
assert.equal(
  helper.getGenderedHebrewCopy("unknown", travelCopy),
  travelCopy.neutral,
);
assert.equal(helper.getGenderedHebrewCopy(undefined, travelCopy), travelCopy.neutral);

const storedCompanionScope = "גמישה, נראה איך זה מסתדר";
assert.equal(
  helper.getGenderedQuestionnaireOptionLabel(storedCompanionScope, "male"),
  "גמיש, נראה איך זה מסתדר",
);
assert.equal(
  helper.getGenderedQuestionnaireOptionLabel(storedCompanionScope, "female"),
  storedCompanionScope,
);
assert.equal(
  helper.getGenderedQuestionnaireOptionLabel(storedCompanionScope, "unknown"),
  "גמישות, נראה איך זה מסתדר",
);

const visiblyFeminineTokens = [
  "חייבת",
  "אוהבת",
  "מעדיפה",
  "מתכננת",
  "פתוחה",
  "מחפשת",
  "ספונטנית",
  "גמישה",
];
const genderedCanonicalOptions = [
  ...optionsSource.matchAll(/"([^"]+)"/g),
]
  .map((match) => match[1])
  .filter((value) =>
    visiblyFeminineTokens.some((token) => value.includes(token)),
  );
assert(genderedCanonicalOptions.length > 0);
for (const value of genderedCanonicalOptions) {
  assert.notEqual(
    helper.getGenderedQuestionnaireOptionLabel(value, "male"),
    value,
  );
  assert.notEqual(
    helper.getGenderedQuestionnaireOptionLabel(value, "unknown"),
    value,
  );
}

assert.match(questionnaireSource, /getGenderedHebrewCopy\(user\?\.gender/);
assert.match(
  questionnaireSource,
  /getGenderedQuestionnaireOptionLabel\((?:answer, user\?\.gender|option, gender)\)/,
);
assert.match(questionnaireSource, /questionnaire: \{/);
assert.doesNotMatch(questionnaireSource, /planningStyle/);
assert.doesNotMatch(profileSource, /planningStyle/);
assert.doesNotMatch(previewSource, /planningStyle/);
assert.doesNotMatch(questionnaireSource, /אוהב\/ת|מחפש\/ת|מעדיף\/ה|מתכנן\/ת/);
assert.doesNotMatch(registerSource, /מאשר\/ת|גר\/ה/);
assert.doesNotMatch(profileSource, /שותפ\/ה/);
assert.match(profileSource, /getGenderedQuestionnaireOptionLabel\(option, user\?\.gender\)/);
assert.match(previewSource, /getGenderedQuestionnaireOptionLabel/);
assert.match(optionsSource, /"גמישה, נראה איך זה מסתדר"/);

console.log("Gender-aware onboarding copy verification: PASS");
