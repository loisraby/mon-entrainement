const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const storage = new Map();
const context = vm.createContext({
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  },
});
vm.runInContext(fs.readFileSync(path.join(root, 'exercise-catalog.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'workout-builder.js'), 'utf8'), context);
const call = (code) => vm.runInContext(code, context);

test('catalogue has structured, unique exercises and covers the shipped plan', () => {
  const catalogue = call('EXERCISE_CATALOG');
  assert.ok(catalogue.length >= 80);
  assert.equal(new Set(catalogue.map((item) => item.id)).size, catalogue.length);
  assert.equal(new Set(catalogue.map((item) => item.nom)).size, catalogue.length);
  const programme = JSON.parse(fs.readFileSync(path.join(root, 'programme.json'), 'utf8'));
  for (const seance of Object.values(programme.seances)) {
    for (const exercice of seance.exercises) {
      assert.ok(catalogue.some((item) => item.nom === exercice[0]), exercice[0]);
    }
  }
});

test('profiles distinguish compound and isolation and leave existing sets untouched', () => {
  assert.equal(call('reglagesSuggere(exerciceDuCatalogue("Squat barre"), "force").reps'), '3–6');
  assert.equal(call('reglagesSuggere(exerciceDuCatalogue("Leg extension"), "force").reps'), '8–12');
  assert.equal(call('reglagesSuggere(exerciceDuCatalogue("Squat barre"), "hypertrophie").repos'), 150);
});

test('weekly volume counts only direct working sets, including edits', () => {
  const value = call('seriesDirectesParGroupe({ Lun: { exercises: [["Squat barre", "3 × 8"]] }, Jeu: { exercises: [["Leg extension", "2 × 15"], ["Romanian deadlift", "3 × 10"]] } }, "Lun", [["Squat barre", "4 × 8"]])');
  assert.equal(value.Quadriceps.semaine, 6);
  assert.equal(value.Quadriceps.seance, 4);
  assert.equal(value['Ischios-jambiers'].semaine, 3);
});

test('custom exercises remain local and malformed entries are ignored', () => {
  const custom = { id: 'mine', nom: 'Mon exercice', groupe_principal: 'Dos', groupes_secondaires: ['Biceps'], categorie_mouvement: { type: 'Polyarticulaire', famille: 'Tirage' }, equipement: 'Poulie' };
  storage.set('exercices_personnalises_v1', JSON.stringify([custom, { nom: 'incomplet' }]));
  assert.equal(call('exercicesPersonnalises().length'), 1);
  assert.equal(call('exerciceDuCatalogue("Mon exercice").groupe_principal'), 'Dos');
});
