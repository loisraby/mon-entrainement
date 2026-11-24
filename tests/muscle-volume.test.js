const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const context = vm.createContext({
  localStorage: { getItem: () => null },
});
for (const file of ['exercise-catalog.js', 'workout-builder.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
}
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
vm.runInContext(app.slice(app.indexOf('function groupeMusculaire('), app.indexOf('function afficherAnalyse(')), context);
const call = (code) => vm.runInContext(code, context);

test('an added pull-up in a leg session contributes to back, not legs', () => {
  const legs = call('volumeMusculaireExercice({ nom: "Squat barre", seriesDetail: [{ charge: 80, repetitions: 8 }, { charge: 80, repetitions: 8 }] })');
  const back = call('volumeMusculaireExercice({ nom: "Tractions pronation", seriesDetail: [{ charge: 80, repetitions: 8 }, { charge: 80, repetitions: 6 }] })');
  assert.equal(legs.groupe, 'Quadriceps');
  assert.equal(legs.series, 2);
  assert.equal(back.groupe, 'Dos');
  assert.equal(back.series, 2);
  assert.equal(back.volume, 1120);
});

test('stored group wins for a custom exercise and empty sets do not count', () => {
  const result = call('volumeMusculaireExercice({ nom: "Tirage maison", groupePrincipal: "Dos", seriesDetail: [{ charge: 40, repetitions: 10 }, { charge: 20, repetitions: 10, echauffement: true }, { charge: 40, repetitions: 0 }] })');
  assert.equal(result.groupe, 'Dos');
  assert.equal(result.series, 1);
  assert.equal(result.volume, 400);
});

test('unknown historical exercises are never attributed to legs by default', () => {
  assert.equal(call('groupeMusculaire("Exercice inconnu")'), 'Autres / non classé');
  assert.equal(call('groupeMusculaire("Leg curl couché")'), 'Ischios-jambiers');
});
