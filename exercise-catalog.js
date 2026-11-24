// Catalogue local : aucune connexion ni compte nécessaires.
// Format : id | nom | groupe principal | groupes secondaires | type | famille | équipement.
const EXERCISE_CATALOG = `
bench-bar|Développé couché barre|Pectoraux|Triceps,Épaules|Polyarticulaire|Poussée|Barre
bench-db|Développé couché haltères|Pectoraux|Triceps,Épaules|Polyarticulaire|Poussée|Haltères
incline-bar|Développé incliné barre|Pectoraux|Triceps,Épaules|Polyarticulaire|Poussée|Barre
incline-db|Développé incliné haltères|Pectoraux|Triceps,Épaules|Polyarticulaire|Poussée|Haltères
chest-machine|Chest press machine|Pectoraux|Triceps,Épaules|Polyarticulaire|Poussée|Machine
incline-machine|Chest press inclinée|Pectoraux|Triceps,Épaules|Polyarticulaire|Poussée|Machine
pushup|Pompes|Pectoraux|Triceps,Épaules|Polyarticulaire|Poussée|Poids du corps
incline-pushup|Pompes inclinées|Pectoraux|Triceps,Épaules|Polyarticulaire|Poussée|Poids du corps
dips|Dips lestés ou barre|Pectoraux|Triceps,Épaules|Polyarticulaire|Poussée|Poids du corps
dips-assist|Dips assistés|Pectoraux|Triceps,Épaules|Polyarticulaire|Poussée|Machine
fly-high|Écarté poulie haute (pecs)|Pectoraux|Épaules|Isolation|Poussée|Poulie
fly-low|Écarté poulie basse (pecs)|Pectoraux|Épaules|Isolation|Poussée|Poulie
pec-deck|Pec deck|Pectoraux||Isolation|Poussée|Machine
fly-db|Écarté haltères|Pectoraux|Épaules|Isolation|Poussée|Haltères
pullup|Traction lestée ou assistée|Dos|Biceps,Épaules|Polyarticulaire|Tirage|Poids du corps
pullup-body|Tractions pronation|Dos|Biceps|Polyarticulaire|Tirage|Poids du corps
chinup|Tractions supination|Dos|Biceps|Polyarticulaire|Tirage|Poids du corps
lat-wide|Tirage poulie haute prise large|Dos|Biceps|Polyarticulaire|Tirage|Poulie
lat-neutral|Tirage poulie haute prise neutre|Dos|Biceps|Polyarticulaire|Tirage|Poulie
lat-close|Tirage poulie haute prise serrée|Dos|Biceps|Polyarticulaire|Tirage|Poulie
row-bar|Rowing barre pronation|Dos|Biceps,Épaules|Polyarticulaire|Tirage|Barre
row-db|Rowing haltère unilatéral|Dos|Biceps,Épaules|Polyarticulaire|Tirage|Haltères
row-machine|Rowing machine (Hammer Strength)|Dos|Biceps,Épaules|Polyarticulaire|Tirage|Machine
row-cable|Tirage poulie basse serré|Dos|Biceps,Épaules|Polyarticulaire|Tirage|Poulie
row-cable-wide|Tirage poulie basse prise large|Dos|Biceps,Épaules|Polyarticulaire|Tirage|Poulie
row-chest|Rowing poitrine appuyée|Dos|Biceps,Épaules|Polyarticulaire|Tirage|Machine
pullover-cable|Pull-over câble|Dos|Pectoraux|Isolation|Tirage|Poulie
pullover-db|Pull-over haltère|Dos|Pectoraux|Isolation|Tirage|Haltères
shrug-db|Shrugs haltères|Dos|Épaules|Isolation|Tirage|Haltères
deadlift|Soulevé de terre|Dos|Fessiers,Ischios-jambiers,Quadriceps|Polyarticulaire|Jambes|Barre
ohp-bar|Développé militaire barre|Épaules|Triceps|Polyarticulaire|Poussée|Barre
ohp-db|Développé militaire haltères|Épaules|Triceps|Polyarticulaire|Poussée|Haltères
shoulder-machine|Shoulder press machine|Épaules|Triceps|Polyarticulaire|Poussée|Machine
arnold-press|Développé Arnold|Épaules|Triceps|Polyarticulaire|Poussée|Haltères
lateral-db|Élévations latérales haltères|Épaules||Isolation|Poussée|Haltères
lateral-cable|Élévations latérales câble|Épaules||Isolation|Poussée|Poulie
lateral-machine|Machine élévations latérales|Épaules||Isolation|Poussée|Machine
front-cable|Élévations frontales câble|Épaules||Isolation|Poussée|Poulie
reverse-fly|Oiseau haltères|Épaules|Dos|Isolation|Tirage|Haltères
reverse-pec|Pec deck reverse fly|Épaules|Dos|Isolation|Tirage|Machine
face-pull|Face pull câble|Épaules|Dos|Isolation|Tirage|Poulie
face-pull-rope|Face pull câble prise corde|Épaules|Dos|Isolation|Tirage|Poulie
curl-bar|Curl barre droite|Biceps||Isolation|Tirage|Barre
curl-ez|Curl barre EZ|Biceps||Isolation|Tirage|Barre
curl-db|Curl haltères|Biceps||Isolation|Tirage|Haltères
curl-incline|Curl incliné haltères|Biceps||Isolation|Tirage|Haltères
curl-hammer|Curl marteau haltères|Biceps||Isolation|Tirage|Haltères
curl-concentration|Curl concentré haltère|Biceps||Isolation|Tirage|Haltères
curl-cable|Curl poulie basse|Biceps||Isolation|Tirage|Poulie
curl-machine|Curl machine|Biceps||Isolation|Tirage|Machine
triceps-push|Extensions triceps poulie haute|Triceps||Isolation|Poussée|Poulie
triceps-bar|Pushdown triceps barre droite|Triceps||Isolation|Poussée|Poulie
triceps-rope|Pushdown triceps corde|Triceps||Isolation|Poussée|Poulie
triceps-overhead|Extensions triceps au-dessus tête|Triceps||Isolation|Poussée|Poulie
triceps-db|Extensions triceps haltère|Triceps||Isolation|Poussée|Haltères
close-bench|Développé serré|Triceps|Pectoraux,Épaules|Polyarticulaire|Poussée|Barre
squat-bar|Squat barre|Quadriceps|Fessiers,Ischios-jambiers|Polyarticulaire|Jambes|Barre
front-squat|Front squat|Quadriceps|Fessiers|Polyarticulaire|Jambes|Barre
goblet|Goblet squat|Quadriceps|Fessiers|Polyarticulaire|Jambes|Haltères
hack|Hack squat|Quadriceps|Fessiers|Polyarticulaire|Jambes|Machine
leg-press|Presse à cuisses|Quadriceps|Fessiers,Ischios-jambiers|Polyarticulaire|Jambes|Machine
split-squat|Squat bulgare|Quadriceps|Fessiers|Polyarticulaire|Jambes|Haltères
walking-lunge|Fente marchée haltères|Quadriceps|Fessiers|Polyarticulaire|Jambes|Haltères
reverse-lunge|Fente arrière haltères|Quadriceps|Fessiers|Polyarticulaire|Jambes|Haltères
step-up|Step-up|Quadriceps|Fessiers,Mollets|Polyarticulaire|Jambes|Poids du corps
step-down|Step-down|Quadriceps|Fessiers|Polyarticulaire|Jambes|Poids du corps
leg-extension|Leg extension|Quadriceps||Isolation|Jambes|Machine
rdl|Romanian deadlift|Ischios-jambiers|Fessiers,Dos|Polyarticulaire|Jambes|Barre
rdl-db|Romanian deadlift haltères|Ischios-jambiers|Fessiers,Dos|Polyarticulaire|Jambes|Haltères
leg-curl-lying|Leg curl couché|Ischios-jambiers||Isolation|Jambes|Machine
leg-curl-seated|Leg curl assis|Ischios-jambiers||Isolation|Jambes|Machine
nordic-curl|Nordic curl|Ischios-jambiers|Fessiers|Isolation|Jambes|Poids du corps
hip-thrust|Hip thrust barre|Fessiers|Ischios-jambiers|Polyarticulaire|Jambes|Barre
hip-thrust-machine|Hip thrust machine|Fessiers|Ischios-jambiers|Polyarticulaire|Jambes|Machine
glute-bridge|Pont fessier|Fessiers|Ischios-jambiers|Polyarticulaire|Jambes|Poids du corps
cable-kickback|Kickback poulie|Fessiers||Isolation|Jambes|Poulie
abductor|Abducteurs machine|Fessiers||Isolation|Jambes|Machine
adductor|Adducteurs|Adducteurs||Isolation|Jambes|Machine
calf-standing|Calf raise machine|Mollets||Isolation|Jambes|Machine
calf-seated|Mollets assis (soléaire)|Mollets||Isolation|Jambes|Machine
calf-single|Mollet unilatéral genou tendu|Mollets||Isolation|Jambes|Poids du corps
tibialis|Relevés de pointes (tibial)|Tibial antérieur||Isolation|Jambes|Poids du corps
plank|Planche|Abdominaux||Isolation|Tronc|Poids du corps
side-plank|Planche latérale|Abdominaux|Fessiers|Isolation|Tronc|Poids du corps
crunch|Crunch|Abdominaux||Isolation|Tronc|Poids du corps
cable-crunch|Crunch poulie|Abdominaux||Isolation|Tronc|Poulie
leg-raise|Abdos relevé de jambes|Abdominaux||Isolation|Tronc|Poids du corps
dead-bug|Dead bug|Abdominaux||Isolation|Tronc|Poids du corps
pallof|Pallof press|Abdominaux||Isolation|Tronc|Poulie
back-extension|Extensions lombaires|Dos|Fessiers,Ischios-jambiers|Polyarticulaire|Tronc|Poids du corps
`.trim().split("\n").map((row) => {
  const [id, nom, groupe_principal, secondaires, type, famille, equipement] = row.split("|");
  return {
    id, nom, groupe_principal,
    groupes_secondaires: secondaires ? secondaires.split(",") : [],
    categorie_mouvement: { type, famille }, equipement,
  };
});
