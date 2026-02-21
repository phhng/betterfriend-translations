import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import template from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findMissingKeys(templateValue, translationValue, currentPath) {
  const missing = [];

  function compare(tValue, trValue, pathSoFar) {
    if (Array.isArray(tValue)) {
      if (!Array.isArray(trValue)) {
        if (pathSoFar) {
          missing.push(pathSoFar);
        }
        for (let index = 0; index < tValue.length; index += 1) {
          compare(tValue[index], undefined, pathSoFar + "[" + index + "]");
        }
        return;
      }

      for (let index = 0; index < tValue.length; index += 1) {
        compare(tValue[index], trValue[index], pathSoFar + "[" + index + "]");
      }
      return;
    }

    if (tValue && typeof tValue === "object") {
      const keys = Object.keys(tValue);

      for (const key of keys) {
        const nextPath = pathSoFar ? pathSoFar + "." + key : key;
        const nextTemplateValue = tValue[key];
        const nextTranslationValue =
          trValue && typeof trValue === "object" ? trValue[key] : undefined;

        compare(nextTemplateValue, nextTranslationValue, nextPath);
      }
      return;
    }

    if (trValue === undefined && pathSoFar) {
      missing.push(pathSoFar);
    }
  }

  compare(templateValue, translationValue, currentPath || "");

  return missing;
}

async function validateTranslations() {
  const i18nDirectory = __dirname;
  const entries = fs.readdirSync(i18nDirectory);
  const translationFiles = entries.filter(
    (file) =>
      file.endsWith(".js") && file !== "en.js" && file !== "validator.js",
  );

  if (translationFiles.length === 0) {
    console.error("No translation files found to validate.");
    process.exitCode = 1;
    return;
  }

  const templateData = template;
  let hasErrors = false;

  for (const file of translationFiles) {
    const moduleUrl = new URL("./" + file, import.meta.url);
    const module = await import(moduleUrl.href);
    const translationData = module.default || module;
    const missingKeys = findMissingKeys(templateData, translationData, "");

    if (missingKeys.length > 0) {
      hasErrors = true;
      console.error("Missing keys in " + file + ":");

      for (const key of missingKeys) {
        console.error("  " + key);
      }
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
  } else {
    console.log("All translation files contain all template keys.");
  }
}

validateTranslations().catch((error) => {
  console.error("Error running i18n validator:", error);
  process.exit(1);
});
