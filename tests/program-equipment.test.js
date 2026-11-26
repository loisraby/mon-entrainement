const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const storage = new Map();
const read = (key, fallback) => JSON.parse(storage.get(key) || fallback);
const context = vm.createContext({
  PROGRAMME_ACTIF_KEY: 'active',
  DRAFT_KEY: 'draft',
  NOTES_EXERCICES_KEY: 'notes',
  PROGRAMME_DEBUTANTE: { id: 'debutante' },
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  },
  getProgrammes: () => read('programs', '[]'),
  sauvegarderProgrammes: (programs) => storage.set('programs', JSON.stringify(programs)),
  getHistorique: () => read('historique', '[]'),
  getSeanceEnCours: () => read('draft', 'null'),
  getNotesExercices: () => read('notes', '{}'),
});
vm.runInContext(source.slice(source.indexOf('const ADAPTATIONS_SALLE ='), source.indexOf('const SEANCE_LIBRE_JOUR')), context);
vm.runInContext(source.slice(source.indexOf('function remplacerExercicePlanifie('), source.indexOf('function terminerRepriseExpiree(')), context);

test('permanent replacement keeps targets and updates superset references', () => {
  const session = { exercises: [
    ['Écarté poulie basse (pecs)', '2 × 12–15', 18, 'Note', 75, 2.2, ''],
    ['Extensions triceps', '2 × 10', null, '', 75, 1, 'Écarté poulie basse (pecs)'],
  ] };
  context.session = session;
  assert.equal(vm.runInContext('remplacerExercicePlanifie(session, 0, "Écarté poulie basse (pecs)", "Pec deck")', context), true);
  assert.deepEqual(session.exercises[0], ['Pec deck', '2 × 12–15', null, 'Note', 75, 1, '']);
  assert.equal(session.exercises[1][6], 'Pec deck');
  assert.equal(vm.runInContext('remplacerExercicePlanifie(session, 1, "Extensions triceps", "Pec deck")', context), false);
});

test('existing user program and seated-curl records are corrected without losing sets', () => {
  storage.clear();
  storage.set('active', 'pplpp-user');
  storage.set('programs', JSON.stringify([{
    id: 'pplpp-user', type: 'pplpp-equilibre-v1', sourceProgrammeId: 'hypertrophie',
    seances: { Lun: { exercises: [['Écarté poulie haute (pecs)', '2 × 15', 18, '', 75, 1, '']] },
      Jeu: { exercises: [['Leg curl couché', '3 × 12', 45, '', 90, 1, ''], ['Écarté poulie basse (pecs)', '2 × 15', 4.5, '', 75, 1, '']] } },
  }]));
  storage.set('historique', JSON.stringify([{ programmeId: 'hypertrophie', exercices: [{ nom: 'Leg curl couché', programmeNom: 'Leg curl couché', seriesDetail: [{ charge: 49.5, repetitions: 12 }], volume: 594 }] }]));
  storage.set('draft', JSON.stringify({ programmeId: 'pplpp-user', exercices: [{ nom: 'Leg curl couché', programmeNom: 'Leg curl couché', seriesDetail: [{ charge: 45, repetitions: 10 }] }] }));
  storage.set('notes', JSON.stringify({ 'Leg curl couché': 'Réglage 4' }));
  vm.runInContext('adapterExercicesSalle()', context);
  const program = read('programs', '[]')[0];
  assert.equal(program.seances.Lun.exercises[0][0], 'Pec deck');
  assert.equal(program.seances.Jeu.exercises[0][0], 'Leg curl assis');
  assert.equal(program.seances.Jeu.exercises[1][0], 'Pec deck');
  assert.equal(program.seances.Jeu.exercises[1][2], null);
  assert.equal(read('historique', '[]')[0].exercices[0].seriesDetail[0].charge, 49.5);
  assert.equal(read('historique', '[]')[0].exercices[0].nom, 'Leg curl assis');
  assert.equal(read('draft', 'null').exercices[0].nom, 'Leg curl assis');
  assert.equal(read('notes', '{}')['Leg curl assis'], 'Réglage 4');
  vm.runInContext('adapterExercicesSalle()', context);
  assert.equal(read('historique', '[]')[0].exercices[0].seriesDetail.length, 1);
});

test('a shared program on another phone is left alone', () => {
  storage.clear();
  storage.set('active', 'shared');
  storage.set('programs', JSON.stringify([{ id: 'shared', seances: { Jeu: { exercises: [['Leg curl couché', '2 × 10']] } } }]));
  storage.set('historique', JSON.stringify([{ programmeId: 'shared', exercices: [{ nom: 'Leg curl couché' }] }]));
  vm.runInContext('adapterExercicesSalle()', context);
  assert.equal(read('programs', '[]')[0].seances.Jeu.exercises[0][0], 'Leg curl couché');
  assert.equal(read('historique', '[]')[0].exercices[0].nom, 'Leg curl couché');
});
