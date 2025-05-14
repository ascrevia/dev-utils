require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const {TranslationServiceClient} = require('@google-cloud/translate');

const targetLanguages = process.env.TARGET_LANGUAGES?.split(',') || ['es', 'lt', 'pl'];

const translationClient = new TranslationServiceClient();

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const location = 'global';

async function translateText(text, targetLanguage) {
  const request = {
    parent: `projects/${projectId}/locations/${location}`,
    contents: [text],
    mimeType: 'text/plain',
    sourceLanguageCode: 'en',
    targetLanguageCode: targetLanguage,
  };

  try {
    const [response] = await translationClient.translateText(request);
    return response.translations[0].translatedText;
  } catch (error) {
    console.error(`Error translating text to ${targetLanguage}:`, error);
    return text;
  }
}

async function translateStrings() {
  const outputDir = path.resolve(__dirname, 'output');
  await fs.ensureDir(outputDir);

  const inputDir = path.resolve(__dirname, 'input');
  const inputFile = path.join(inputDir, 'en.json');
  
  if (!fs.existsSync(inputFile)) {
    console.error('Input file en.json not found. Please create an English strings file first.');
    return;
  }
  
  const englishStrings = await fs.readJson(inputFile);
  const stringEntries = Object.entries(englishStrings);
  
  console.log(`Loaded ${stringEntries.length} strings from en.json`);

  for (const lang of targetLanguages) {
    console.log(`Starting translation to ${lang}...`);
    const translations = {};
    
    for (let i = 0; i < stringEntries.length; i++) {
      const [key, value] = stringEntries[i];
      const translatedText = await translateText(value, lang);
      translations[key] = translatedText;
      console.log(`[${i+1}/${stringEntries.length}] Translated: ${key}: "${value}" -> "${translatedText}"`);
    }
    
    await fs.writeJson(path.join(outputDir, `${lang}.json`), translations, { spaces: 2 });
    console.log(`Completed translation to ${lang} and saved to output/${lang}.json`);
  }

  console.log('All translations complete!');
}

console.log(`Starting translation from en.json to ${targetLanguages.length} languages...`);
translateStrings().catch(error => {
  console.error('Translation failed:', error);
});
