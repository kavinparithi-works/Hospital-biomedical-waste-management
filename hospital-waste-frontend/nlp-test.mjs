// Classifier regression test for the chatbot rule engine: `node nlp-test.mjs`
import { processChatMessage } from './src/services/nlpEngine.js';

const CASES = [
  // [input, expected bin, lang]
  ['blood cotton', 'Yellow'], ['blood soaked cotton', 'Yellow'], ['blood stained cloth', 'Yellow'], ['Where to dispose blood stained gauze?', 'Yellow'],
  ['soiled bandage dressing', 'Yellow'], ['placenta', 'Yellow'], ['expired tablets', 'Yellow'], ['expired medicine', 'Yellow'],
  ['used needle', 'White'], ['syringe with needle', 'White'], ['surgical blade', 'White'], ['scalpel', 'White'], ['scissors and stitch cutter', 'White'],
  ['syringe without needle', 'Red'], ['used gloves', 'Red'], ['IV tubing', 'Red'], ['catheter', 'Red'],
  ['broken glass vial', 'Blue'], ['glass ampoule', 'Blue'], ['empty medicine vial', 'Blue'],
  ['food packaging', 'Green'], ['paper wrapper', 'Green'],
  ['ரத்தம் படிந்த துணி', 'Yellow', 'ta'], ['ரத்தம் படிந்த பஞ்சு', 'Yellow', 'ta'], ['பயன்படுத்திய ஊசி', 'White', 'ta'], ['கையுறை', 'Red', 'ta'], ['உடைந்த கண்ணாடி', 'Blue', 'ta'],
  ['खून लगा कपड़ा', 'Yellow', 'hi'], ['खून लगी रुई', 'Yellow', 'hi'], ['सुई', 'White', 'hi'], ['दस्ताने', 'Red', 'hi'], ['टूटा कांच', 'Blue', 'hi'],
  ['రక్తం అంటిన బట్ట', 'Yellow', 'te'], ['సూది', 'White', 'te'],
  ['രക്തം പുരണ്ട തുണി', 'Yellow', 'ml'], ['സൂചി', 'White', 'ml'],
  ['ರಕ್ತ ಅಂಟಿದ ಬಟ್ಟೆ', 'Yellow', 'kn'], ['ಸೂಜಿ', 'White', 'kn'],
];

const NO_RESULT = [
  ['hello', 'en'], ['I have a doubt', 'en'], ['thanks', 'en'], ['what is this', 'en'], ['', 'en']
];

let fail = 0;
for (const [input, bin, lang = 'en'] of CASES) {
  const r = processChatMessage(input, false, lang);
  const got = r.result?.bin;
  const ok = got === bin;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${input.padEnd(42)} → ${String(got).padEnd(7)} (expected ${bin})${r.result ? `  [${r.result.category}]` : ''}`);
}
console.log('\nPhoto with no description must NOT produce a guess:');
for (const [input, lang] of NO_RESULT) {
  const r = processChatMessage(input, true, lang);
  const ok = !r.result;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  "${input}" + image → ${r.result ? 'GUESSED ' + r.result.bin : 'no classification (asks for description)'}`);
}
console.log(fail ? `\n${fail} FAILED` : '\nAll classifier tests passed.');
process.exit(fail ? 1 : 0);
