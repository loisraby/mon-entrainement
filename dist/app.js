const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DRAFT_KEY = "seance_en_cours";
const PROGRAMMES_KEY = "programmes_entrainement_v1";
const PROGRAMME_ACTIF_KEY = "programme_actif_v1";
const NOTES_EXERCICES_KEY = "notes_exercices_v1";
const MESURES_KEY = "mesures_corporelles_v1";
const BACKUP_SESSIONS_KEY = "seances_lors_derniere_sauvegarde_v1";
const BACKUP_DATE_KEY = "date_derniere_sauvegarde_v1";
let sessions = {};
let programmeActif = null;
let timerInterval = null;
let timerEndAt = null;
let audioRepos = null;
let timerExerciseCard = null;

const RESSENTIS = {
  tres_facile: "🟢 Trop facile",
  facile: "🟢 Facile",
  bien: "🔵 Bien maîtrisé",
  pile: "🟡 Tout pile",
  difficile: "🟠 Difficile",
  galere: "🔴 Galère",
};

const VARIANTES = {
  "Développé couché barre": ["Développé couché haltères", "Chest press machine"],
  "Développé incliné haltères": ["Développé incliné barre", "Chest press inclinée"],
  "Développé militaire haltères": ["Développé militaire barre", "Shoulder press machine"],
  "Développé militaire barre": ["Développé militaire haltères", "Shoulder press machine"],
  "Écarté poulie haute (pecs)": ["Pec deck", "Écarté haltères incliné"],
  "Écarté poulie basse (pecs)": ["Pec deck", "Écarté haltères incliné"],
  "Élévations latérales haltères": ["Élévations latérales câble", "Machine élévations latérales"],
  "Élévations latérales câble": ["Élévations latérales haltères", "Machine élévations latérales"],
  "Extensions triceps poulie haute": ["Pushdown triceps barre droite", "Extensions triceps haltère"],
  "Dips lestés ou barre": ["Dips assistés", "Développé serré"],
  "Squat barre": ["Hack squat", "Squat Smith machine"],
  "Romanian deadlift": ["Soulevé de terre jambes tendues", "Leg curl assis"],
  "Presse à cuisses": ["Hack squat", "Squat Smith machine"],
  "Leg curl couché": ["Leg curl assis", "Leg curl debout"],
  "Fente marchée haltères": ["Split squat bulgare", "Fentes Smith machine"],
  "Hip thrust barre": ["Hip thrust machine", "Glute bridge barre"],
  "Rowing barre pronation": ["Rowing T-bar", "Rowing machine"],
  "Traction lestée ou assistée": ["Tirage poulie haute prise neutre", "Tractions assistées"],
  "Rowing haltère unilatéral": ["Rowing machine", "Rowing poulie basse unilatéral"],
  "Tirage poulie haute prise neutre": ["Traction assistée", "Tirage poulie haute prise large"],
  "Tirage poulie basse serré": ["Rowing machine", "Tirage poulie basse prise large"],
  "Curl barre droite": ["Curl barre EZ", "Curl poulie basse"],
  "Curl marteau haltères": ["Curl marteau corde", "Curl machine"],
  "Rowing machine (Hammer Strength)": ["Rowing haltère unilatéral", "Rowing T-bar"],
  "Tirage poulie haute prise large": ["Traction assistée", "Tirage poulie haute prise neutre"],
  "Pull-over câble": ["Pull-over machine", "Pull-over haltère"],
};

const selector = document.querySelector("#day-selector");
const workout = document.querySelector("#workout");
const template = document.querySelector("#exercise-template");
const historyPanel = document.querySelector("#history-panel");
const historyList = document.querySelector("#history-list");
const statsPanel = document.querySelector("#stats-panel");
const statsContent = document.querySelector("#stats-content");
const analysisPanel = document.querySelector("#analysis-panel");
const analysisContent = document.querySelector("#analysis-content");
const programsPanel = document.querySelector("#programs-panel");
const programList = document.querySelector("#program-list");
const programEditor = document.querySelector("#program-editor");
let jourEdite = "Lun";
const draftPanel = document.querySelector("#draft-panel");
const draftMessage = document.querySelector("#draft-message");
const todayIndex = (new Date().getDay() + 6) % 7;

document.querySelector("#history-button").addEventListener("click", () => afficherHistorique());
document.querySelector("#stats-button").addEventListener("click", () => afficherStatistiques());
document.querySelector("#analysis-button").addEventListener("click", () => afficherAnalyse());
document.querySelector("#programs-button").addEventListener("click", () => afficherProgrammes());
document.querySelector("#duplicate-program").addEventListener("click", copierProgrammeActif);
document.querySelector("#create-strength-program").addEventListener("click", creerProgrammeForce);
document.querySelector("#edit-program").addEventListener("click", ouvrirEditeurProgramme);
document.querySelector("#deload-toggle").addEventListener("click", basculerSemaineLegere);
document.querySelector("#export-button").addEventListener("click", exporterHistorique);
document.querySelector("#import-input").addEventListener("change", importerHistorique);
document.querySelector("#resume-draft").addEventListener("click", reprendreSeanceEnCours);
document.querySelector("#discard-draft").addEventListener("click", annulerSeanceEnCours);

function getHistorique() {
  return JSON.parse(localStorage.getItem("historique") || "[]");
}

function getMesures() {
  try { return JSON.parse(localStorage.getItem(MESURES_KEY) || "[]"); } catch { return []; }
}

function rappelSauvegarde(historique = getHistorique()) {
  const nombreLorsDerniereSauvegarde = Number(localStorage.getItem(BACKUP_SESSIONS_KEY));
  return historique.length - nombreLorsDerniereSauvegarde >= 5
    ? "\n\nPense à télécharger une sauvegarde : 5 nouvelles séances ont été enregistrées depuis la dernière."
    : "";
}

function mettreAJourStatutSauvegarde() {
  const statut = document.querySelector("#backup-status");
  const date = localStorage.getItem(BACKUP_DATE_KEY);
  statut.textContent = date
    ? `Dernière sauvegarde téléchargée : ${new Date(date).toLocaleString("fr-FR")}.`
    : "Aucune sauvegarde téléchargée sur cet appareil.";
}

function texteDernierePerformance(performance) {
  if (!performance) return "Aucune performance enregistrée.";
  const series = resumeSeries(performance);
  const ressenti = performance.ressenti ? ` · ${RESSENTIS[performance.ressenti]}` : "";
  const commentaire = performance.commentaire ? ` — ${performance.commentaire}` : "";
  return `Dernière fois : ${series}${ressenti}${commentaire}`;
}

function getNotesExercices() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_EXERCICES_KEY) || "{}");
  } catch {
    return {};
  }
}

function sauvegarderNoteExercice(nom, note) {
  const notes = getNotesExercices();
  if (note.trim()) notes[nom] = note.trim();
  else delete notes[nom];
  localStorage.setItem(NOTES_EXERCICES_KEY, JSON.stringify(notes));
}

function hautDeFourchette(objectif) {
  const resultat = String(objectif || "").match(/×\s*\d+\s*[–-]\s*(\d+)/);
  return resultat ? Number(resultat[1]) : null;
}

function conseilProgression(performance, objectif) {
  if (!performance) return "Première séance : choisis une charge propre et note ton ressenti.";
  const serie = resumeSeries(performance);
  const dernierRir = performance.seriesDetail?.filter((item) => !item.echauffement).at(-1)?.rir ?? performance.rir;
  const haut = hautDeFourchette(objectif);
  const seriesTravail = performance.seriesDetail?.filter((item) => !item.echauffement) || [];
  const hautAtteint = haut && seriesTravail.length && seriesTravail.every((item) => Number(item.repetitions) >= haut);
  if (hautAtteint && Number(dernierRir) >= 2) return `Objectif atteint : ${serie}. Tu peux tester le plus petit incrément de charge disponible, puis repartir vers le bas de la fourchette.`;
  if (Number(dernierRir) <= 1 && dernierRir !== null && dernierRir !== "" && dernierRir !== undefined) return `Dernière fois : ${serie}. Dernière série à RIR ${dernierRir} : garde la charge et vise une exécution aussi propre avant de chercher à progresser.`;
  if (Number(dernierRir) >= 3) return `Dernière fois : ${serie}. Dernière série à RIR ${dernierRir} : tu as de la marge, ajoute 1 rep par série ou augmente légèrement la charge.`;
  if (performance.ressenti === "facile") return `Dernière fois : ${serie}. Tu peux viser +1 rep par série, ou augmenter légèrement la charge si tu étais déjà au haut de ta fourchette.`;
  if (performance.ressenti === "galere") return `Dernière fois : ${serie}. Garde la charge et cherche surtout des reps propres ; ne force pas une hausse aujourd’hui.`;
  return `Dernière fois : ${serie}. Garde la charge et essaie d’ajouter 1 rep au total si la forme reste bonne.`;
}

function resumeSeries(performance) {
  const seriesTravail = performance.seriesDetail?.filter((serie) => !serie.echauffement);
  return seriesTravail?.length
    ? seriesTravail.map((serie) => `${serie.charge} kg × ${serie.repetitions}${serie.rir !== undefined && serie.rir !== null && serie.rir !== "" ? ` (RIR ${serie.rir})` : ""}`).join(" · ")
    : `${performance.series} × ${performance.repetitions} à ${performance.charge} kg`;
}

function configurerRessenti(zone, ressenti, commentaire, onChange, selecteurCommentaire = ".exercise-comment") {
  const appliquer = (valeur) => {
    zone.dataset.ressenti = valeur || "";
    zone.querySelectorAll("[data-feeling]").forEach((button) => {
      const selected = button.dataset.feeling === valeur;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", selected);
    });
  };

  appliquer(ressenti);
  const champCommentaire = zone.querySelector(selecteurCommentaire);
  if (champCommentaire) champCommentaire.value = commentaire || "";
  zone.querySelectorAll("[data-feeling]").forEach((button) => {
    button.addEventListener("click", () => {
      appliquer(zone.dataset.ressenti === button.dataset.feeling ? "" : button.dataset.feeling);
      onChange();
    });
  });
  if (champCommentaire) champCommentaire.addEventListener("input", onChange);
}

function getSeanceEnCours() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
  } catch {
    return null;
  }
}

function sauvegarderSeanceEnCours(day, session) {
  const ancienneSeance = getSeanceEnCours();
  const exercices = [...workout.querySelectorAll(".exercise-card")].map((card) => {
    const donnees = lireExercice(card);
    return {
      nom: card.querySelector(".exercise-name").textContent,
      programmeNom: card.dataset.programmeName,
      ...donnees,
      termine: card.classList.contains("completed"),
      passe: card.classList.contains("skipped"),
      ressenti: card.querySelector(".feeling-area").dataset.ressenti || null,
      commentaire: card.querySelector(".exercise-comment").value.trim(),
    };
  });
  const brouillon = {
    programmeId: programmeActif?.id || null,
    programme: programmeActif?.nom || null,
    jour: day,
    nom: session.title,
    commenceeLe: ancienneSeance?.commenceeLe || workout.dataset.commenceeLe || new Date().toISOString(),
    modifieeLe: new Date().toISOString(),
    exercices,
    ressentiSeance: workout.querySelector(".session-feedback")?.dataset.ressenti || null,
    energie: Number(workout.querySelector(".session-energy")?.value) || null,
    sommeil: Number(workout.querySelector(".session-sleep")?.value) || null,
    commentaireSeance: workout.querySelector(".session-comment")?.value.trim() || "",
  };
  workout.dataset.commenceeLe = brouillon.commenceeLe;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(brouillon));
  const statut = workout.querySelector("#session-save-status");
  if (statut) {
    statut.textContent = `Sauvegardé sur cet appareil à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  }
}

function afficherSeanceEnCours() {
  const brouillon = getSeanceEnCours();
  if (!brouillon) {
    draftPanel.classList.add("hidden");
    return;
  }
  draftMessage.textContent = `${brouillon.nom} · dernière sauvegarde : ${new Date(brouillon.modifieeLe).toLocaleString("fr-FR")}`;
  draftPanel.classList.remove("hidden");
}

function reprendreSeanceEnCours() {
  const brouillon = getSeanceEnCours();
  if (!brouillon) return;
  const programmes = getProgrammes();
  const programmeDuBrouillon = programmes.find((programme) => programme.id === brouillon.programmeId);
  if (programmeDuBrouillon) activerProgramme(programmeDuBrouillon.id, false);
  if (!sessions[brouillon.jour]) return;
  draftPanel.classList.add("hidden");
  renderDay(brouillon.jour, brouillon);
}

function annulerSeanceEnCours() {
  const brouillon = getSeanceEnCours();
  if (!brouillon) return;
  if (!confirm(`Annuler la séance « ${brouillon.nom} » ? Les charges et reps saisies seront effacées.`)) return;
  localStorage.removeItem(DRAFT_KEY);
  draftPanel.classList.add("hidden");
  renderDay(days[todayIndex]);
}

function exporterHistorique() {
  const sauvegarde = {
    version: 3,
    exporteeLe: new Date().toISOString(),
    historique: getHistorique(),
    programmes: getProgrammes(),
    programmeActif: localStorage.getItem(PROGRAMME_ACTIF_KEY),
    notesExercices: getNotesExercices(),
    mesures: getMesures(),
    seanceEnCours: getSeanceEnCours(),
  };
  const fichier = new Blob([JSON.stringify(sauvegarde, null, 2)], {
    type: "application/json",
  });
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(fichier);
  lien.download = `sauvegarde-entrainement-${dateKey(new Date())}.json`;
  lien.click();
  URL.revokeObjectURL(lien.href);
  localStorage.setItem(BACKUP_SESSIONS_KEY, String(getHistorique().length));
  localStorage.setItem(BACKUP_DATE_KEY, new Date().toISOString());
  mettreAJourStatutSauvegarde();
}

function importerHistorique(event) {
  const fichier = event.target.files[0];
  if (!fichier) return;

  const lecteur = new FileReader();
  lecteur.addEventListener("load", () => {
    try {
      const contenu = JSON.parse(lecteur.result);
      const historique = Array.isArray(contenu) ? contenu : contenu.historique;
      if (!Array.isArray(historique)) throw new Error("format inconnu");
      const sauvegardeComplete = Array.isArray(contenu.programmes);
      if (!confirm(`Restaurer ${historique.length} séance(s)${sauvegardeComplete ? " et tous les programmes" : ""} ? Les données actuelles correspondantes de cet appareil seront remplacées.`)) return;
      localStorage.setItem("historique", JSON.stringify(historique));
      localStorage.setItem(BACKUP_SESSIONS_KEY, String(historique.length));
      localStorage.setItem(BACKUP_DATE_KEY, new Date().toISOString());
      if (sauvegardeComplete) {
        localStorage.setItem(PROGRAMMES_KEY, JSON.stringify(contenu.programmes));
        if (typeof contenu.programmeActif === "string") localStorage.setItem(PROGRAMME_ACTIF_KEY, contenu.programmeActif);
        else localStorage.removeItem(PROGRAMME_ACTIF_KEY);
        if (contenu.notesExercices && typeof contenu.notesExercices === "object") localStorage.setItem(NOTES_EXERCICES_KEY, JSON.stringify(contenu.notesExercices));
        else localStorage.removeItem(NOTES_EXERCICES_KEY);
        if (Array.isArray(contenu.mesures)) localStorage.setItem(MESURES_KEY, JSON.stringify(contenu.mesures));
        if (contenu.seanceEnCours && typeof contenu.seanceEnCours === "object") localStorage.setItem(DRAFT_KEY, JSON.stringify(contenu.seanceEnCours));
        else localStorage.removeItem(DRAFT_KEY);
      }
      alert("Sauvegarde restaurée !");
      chargerProgramme();
      afficherHistorique(true);
    } catch {
      alert("Ce fichier n’est pas une sauvegarde valide de Mon entraînement.");
    } finally {
      event.target.value = "";
    }
  });
  lecteur.readAsText(fichier);
}

function formatKg(value) {
  return Math.round(value).toLocaleString("fr-FR");
}

function formatDuree(secondes) {
  const total = Math.max(0, Math.round(Number(secondes) || 0));
  const heures = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (heures) return `${heures} h ${minutes.toString().padStart(2, "0")}`;
  if (minutes) return `${minutes} min`;
  return `${total} s`;
}

function comparaisonSeancePrecedente(precedente, volume, dureeSecondes) {
  if (!precedente) return "";
  const variationVolume = volume - (Number(precedente.volume) || 0);
  const variationDuree = dureeSecondes - (Number(precedente.dureeSecondes) || 0);
  const volumeTexte = `${variationVolume >= 0 ? "+" : ""}${formatKg(variationVolume)} kg`;
  const dureeTexte = precedente.dureeSecondes
    ? `${variationDuree >= 0 ? "+" : "−"}${formatDuree(Math.abs(variationDuree))}`
    : "durée précédente indisponible";
  return `\nComparaison dernière séance : ${volumeTexte} de volume · ${dureeTexte}.`;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function debutSemaine(date) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function updateVolume(card) {
  const { volume } = lireExercice(card);
  card.querySelector(".volume").textContent = `Volume : ${formatKg(volume)} kg`;
  updateTotalVolume();
}

function updateTotalVolume() {
  let total = 0;
  document.querySelectorAll(".exercise-card").forEach((card) => {
    total += lireExercice(card).volume;
  });
  document.querySelector("#session-total").textContent = `Volume total : ${formatKg(total)} kg`;
  return total;
}

function lireExercice(card) {
  const seriesDetail = [...card.querySelectorAll(".series-row")].map((row) => ({
    charge: Number(row.querySelector(".set-weight").value) || 0,
    repetitions: Number(row.querySelector(".set-reps").value) || 0,
    echauffement: row.querySelector(".set-warmup").checked,
    rir: row.querySelector(".set-rir").value === "" ? null : Number(row.querySelector(".set-rir").value),
    terminee: row.classList.contains("set-completed"),
  }));
  const seriesTravail = seriesDetail.filter((serie) => !serie.echauffement);
  const volume = seriesTravail.reduce((total, serie) => total + serie.charge * serie.repetitions, 0);
  const charge = Math.max(...seriesTravail.map((serie) => serie.charge), 0);
  const repetitions = seriesTravail.length
    ? Math.round((seriesTravail.reduce((total, serie) => total + serie.repetitions, 0) / seriesTravail.length) * 10) / 10
    : 0;
  return { charge, series: seriesTravail.length, repetitions, seriesDetail, volume: card.classList.contains("skipped") ? 0 : volume, passe: card.classList.contains("skipped"), raisonPassage: card.dataset.skipReason || "" };
}

function ajouterSerie(card, charge, repetitions = "", echauffement = false, rir = "", terminee = false) {
  const list = card.querySelector(".series-list");
  const row = document.createElement("div");
  row.className = `series-row${echauffement ? " warmup-row" : ""}${terminee ? " set-completed" : ""}`;
  row.innerHTML = `<span class="series-number"></span><label>Charge (kg)<input class="set-weight" type="number" step="0.5" min="0"></label><label>Reps<input class="set-reps" type="number" step="1" min="0" max="100"></label><label>RIR<select class="set-rir"><option value="">—</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4+</option></select></label><label class="warmup-toggle"><input class="set-warmup" type="checkbox"> Échauff.</label><button class="set-done" type="button">${terminee ? "À refaire" : "✓ Série faite"}</button>`;
  row.querySelector(".series-number").textContent = echauffement ? "Échauff." : `Série ${list.children.length + 1}`;
  row.querySelector(".set-weight").value = charge;
  row.querySelector(".set-reps").value = repetitions;
  row.querySelector(".set-warmup").checked = echauffement;
  row.querySelector(".set-rir").value = rir ?? "";
  row.querySelectorAll("input, select").forEach((input) => input.addEventListener(input.type === "checkbox" || input.tagName === "SELECT" ? "change" : "input", () => {
    const exerciseCard = input.closest(".exercise-card");
    row.classList.toggle("warmup-row", row.querySelector(".set-warmup").checked);
    row.querySelector(".series-number").textContent = row.querySelector(".set-warmup").checked ? "Échauff." : `Série ${[...list.children].filter((item) => !item.querySelector(".set-warmup").checked).indexOf(row) + 1}`;
    updateVolume(exerciseCard);
    sauvegarderSeanceEnCours(exerciseCard.dataset.day, sessions[exerciseCard.dataset.day]);
  }));
  row.querySelector(".set-done").addEventListener("click", () => {
    const terminee = row.classList.toggle("set-completed");
    row.querySelector(".set-done").textContent = terminee ? "À refaire" : "✓ Série faite";
    const exerciseCard = row.closest(".exercise-card");
    sauvegarderSeanceEnCours(exerciseCard.dataset.day, sessions[exerciseCard.dataset.day]);
    if (terminee) demarrerMinuteur(Number(exerciseCard.dataset.restSeconds) || 90, exerciseCard);
  });
  list.append(row);
}

function updateSessionProgress() {
  const cards = [...workout.querySelectorAll(".exercise-card")];
  const completed = cards.filter((card) => card.classList.contains("completed") || card.classList.contains("skipped")).length;
  const passes = cards.filter((card) => card.classList.contains("skipped")).length;
  const progress = workout.querySelector("#session-progress");
  if (progress) progress.textContent = `${completed} / ${cards.length} exercices faits${passes ? ` · ${passes} passé${passes > 1 ? "s" : ""}` : ""}`;
  return { completed, total: cards.length };
}

function groupeMusculaire(nom) {
  const texte = nom.toLowerCase();
  if (/curl|biceps/.test(texte)) return "Biceps";
  if (/triceps|dips/.test(texte)) return "Triceps";
  if (/développé|écarté|pec deck|chest press/.test(texte)) return "Pectoraux";
  if (/rowing|tirage|traction|pull-over|face pull|shrugs/.test(texte)) return "Dos";
  if (/élévation|oiseau|militaire|shoulder/.test(texte)) return "Épaules";
  return "Jambes et fessiers";
}

function afficherAnalyse(forceOpen = false, programmeFiltre = "tous") {
  if (!forceOpen && !analysisPanel.classList.contains("hidden")) {
    analysisPanel.classList.add("hidden");
    return;
  }
  historyPanel.classList.add("hidden");
  statsPanel.classList.add("hidden");
  programsPanel.classList.add("hidden");
  analysisPanel.classList.add("hidden");
  const historiqueComplet = getHistorique();
  const programmesHistorique = [...new Map(historiqueComplet.map((seance) => [
    seance.programmeId || seance.programme || "sans-programme",
    seance.programme || "Anciennes séances",
  ])).entries()];
  const historique = programmeFiltre === "tous"
    ? historiqueComplet
    : historiqueComplet.filter((seance) => (seance.programmeId || seance.programme || "sans-programme") === programmeFiltre);
  const performances = new Map();
  historique.forEach((seance) => {
    (seance.exercices || []).forEach((exercice, ordre) => {
      if (exercice.passe) return;
      const volume = Number(exercice.volume) || (exercice.seriesDetail || []).reduce((total, serie) => total + serie.charge * serie.repetitions, 0);
      const rir = exercice.seriesDetail?.filter((serie) => !serie.echauffement).at(-1)?.rir ?? exercice.rir ?? null;
      const nomSuivi = exercice.programmeNom || exercice.nom;
      if (!performances.has(nomSuivi)) performances.set(nomSuivi, []);
      performances.get(nomSuivi).push({ volume, rir, ressenti: exercice.ressenti, nomEffectue: exercice.nom, ordre, total: seance.exercices.length, energie: seance.energie, sommeil: seance.sommeil, semaineLegere: seance.semaineLegere });
    });
  });
  if (performances.size === 0) {
    analysisContent.innerHTML = "<p class='muted'>Enregistre quelques séances pour lancer l’analyse.</p>";
  } else {
    const tendances = [];
    const lignes = [...performances.entries()].sort().map(([nom, valeurs]) => {
      const groupe = groupeMusculaire(nom);
      const valeursComparables = valeurs.filter((item) => !item.semaineLegere);
      if (valeursComparables.length < 4) return `<article class="analysis-entry"><strong>${nom}</strong><p class="muted">${groupe} · ${valeursComparables.length} passage(s) comparables : encore trop tôt pour conclure.</p></article>`;
      const recent = valeursComparables.slice(-3).reduce((total, item) => total + item.volume, 0) / 3;
      const precedent = valeursComparables.slice(-6, -3).reduce((total, item) => total + item.volume, 0) / 3;
      const evolution = precedent ? ((recent - precedent) / precedent) * 100 : 0;
      const passagesRecents = valeursComparables.slice(-3);
      const moyenneRecente = (cle) => {
        const valeursNumeriques = passagesRecents
          .map((item) => item[cle])
          .filter((valeur) => valeur !== null && valeur !== undefined && valeur !== "")
          .map(Number)
          .filter(Number.isFinite);
        return valeursNumeriques.length
          ? valeursNumeriques.reduce((total, valeur) => total + valeur, 0) / valeursNumeriques.length
          : null;
      };
      const energieRecente = moyenneRecente("energie");
      const sommeilRecent = moyenneRecente("sommeil");
      const rirRecent = moyenneRecente("rir");
      const derniere = valeursComparables.at(-1);
      const finDeSeance = derniere.ordre >= derniere.total / 2;
      const recuperationBasse = (energieRecente !== null && energieRecente <= 2.5)
        || (sommeilRecent !== null && sommeilRecent <= 2.5);
      const effortEleve = rirRecent !== null && rirRecent <= 1.5;
      const fatiguePossible = evolution <= 3 && recuperationBasse && effortEleve;
      const classe = fatiguePossible ? "trend-alert" : evolution > 3 ? "trend-up" : evolution < -3 ? "trend-down" : "trend-flat";
      const etat = fatiguePossible
        ? "Stagnation avec fatigue possible"
        : evolution > 3 ? "Progression visible" : evolution < -3 ? "Baisse à surveiller" : "Stable : possible stagnation";
      tendances.push({ nom, evolution, fatiguePossible, etat });
      const contextes = [];
      if (finDeSeance) contextes.push("Exercice de fin de séance : la fatigue peut expliquer une partie du résultat.");
      if (derniere.rir !== null && derniere.rir !== undefined && derniere.rir <= 1) contextes.push(`Dernière série proche de l’échec (RIR ${derniere.rir}).`);
      if (derniere.energie && derniere.energie <= 2) contextes.push(`Énergie basse (${derniere.energie}/5).`);
      if (derniere.sommeil && derniere.sommeil <= 2) contextes.push(`Sommeil bas (${derniere.sommeil}/5).`);
      const variantesUtilisees = [...new Set(valeurs.map((item) => item.nomEffectue).filter((nomEffectue) => nomEffectue !== nom))];
      if (variantesUtilisees.length) contextes.push(`Variantes prises en compte : ${variantesUtilisees.join(", ")}.`);
      if (fatiguePossible) contextes.push(`Sur les 3 derniers passages : ${energieRecente !== null ? `énergie ${energieRecente.toFixed(1).replace(".", ",")}/5` : ""}${energieRecente !== null && sommeilRecent !== null ? " · " : ""}${sommeilRecent !== null ? `sommeil ${sommeilRecent.toFixed(1).replace(".", ",")}/5` : ""}${(energieRecente !== null || sommeilRecent !== null) && rirRecent !== null ? " · " : ""}${rirRecent !== null ? `RIR ${rirRecent.toFixed(1).replace(".", ",")}` : ""}.`);
      const contexte = contextes.length ? ` ${contextes.join(" ")}` : "";
      return `<article class="analysis-entry"><strong>${nom}</strong><p class="${classe}">${etat} (${evolution > 0 ? "+" : ""}${Math.round(evolution)} % sur les 3 derniers passages).</p><p class="muted">${groupe}.${contexte}</p></article>`;
    }).join("");
    const filtre = programmesHistorique.length > 1 ? `<label class="history-filter">Programme
      <select id="analysis-program-filter">
        <option value="tous">Tous les programmes</option>
        ${programmesHistorique.map(([id, nom]) => `<option value="${id}"${id === programmeFiltre ? " selected" : ""}>${nom}</option>`).join("")}
      </select>
    </label>` : "";
    const meilleureTendance = tendances.reduce((meilleure, tendance) => !meilleure || tendance.evolution > meilleure.evolution ? tendance : meilleure, null);
    const aSurveiller = tendances.filter((tendance) => tendance.evolution <= 3).sort((a, b) => a.evolution - b.evolution)[0];
    const synthese = tendances.length ? `<div class="analysis-summary">
      <article><span>Progression la plus visible</span><strong>${meilleureTendance.nom}</strong><p>${meilleureTendance.evolution >= 0 ? "+" : ""}${Math.round(meilleureTendance.evolution)} %</p></article>
      <article><span>À surveiller</span><strong>${aSurveiller ? aSurveiller.nom : "Aucun"}</strong><p>${aSurveiller ? aSurveiller.etat : "Tendances positives"}</p></article>
    </div>` : "";
    analysisContent.innerHTML = `${filtre}${synthese}<p class="muted">Cette analyse compare des tendances, pas une séance isolée. Une alerte de fatigue n’apparaît que si la progression stagne et que récupération basse + effort élevé se répètent.</p>${lignes}`;
    analysisContent.querySelector("#analysis-program-filter")?.addEventListener("change", (event) => {
      afficherAnalyse(true, event.target.value);
    });
  }
  analysisPanel.classList.remove("hidden");
  analysisPanel.scrollIntoView({ behavior: "smooth" });
}

function afficherHistorique(forceOpen = false) {
  if (!forceOpen && !historyPanel.classList.contains("hidden")) {
    historyPanel.classList.add("hidden");
    document.querySelector("#history-button").scrollIntoView({ behavior: "smooth" });
    return;
  }

  statsPanel.classList.add("hidden");
  analysisPanel.classList.add("hidden");
  programsPanel.classList.add("hidden");
  const historique = getHistorique();
  historyList.innerHTML = "";

  if (historique.length === 0) {
    historyList.innerHTML = "<p class='muted'>Aucune séance sauvegardée pour le moment.</p>";
  } else {
    historyList.insertAdjacentHTML("beforeend", "<input id='history-search' class='history-search' type='search' placeholder='Rechercher une séance ou un exercice' aria-label='Rechercher dans l’historique' />");
    const programmesHistorique = [...new Map(historique.map((seance) => [
      encodeURIComponent(seance.programmeId || seance.programme || "sans-programme"),
      seance.programme || "Anciennes séances",
    ])).entries()];
    if (programmesHistorique.length > 1) {
      historyList.insertAdjacentHTML("beforeend", `
        <label class="history-filter">Programme
          <select id="history-program-filter">
            <option value="tous">Tous les programmes</option>
            ${programmesHistorique.map(([id, nom]) => `<option value="${id}">${nom}</option>`).join("")}
          </select>
        </label>
      `);
    }
    [...historique].reverse().forEach((seance) => {
      const date = new Date(seance.date).toLocaleString("fr-FR");
      const details = (seance.exercices || []).map((exercice) => `
        <p class="history-exercise">${exercice.nom}${exercice.programmeNom && exercice.programmeNom !== exercice.nom ? ` <span class="variant-history">(variante de ${exercice.programmeNom})</span>` : ""} : ${exercice.passe ? `Exercice passé${exercice.raisonPassage ? ` — ${exercice.raisonPassage}` : ""}` : exercice.seriesDetail?.length ? exercice.seriesDetail.map((serie) => `${serie.echauffement ? "Échauff. " : ""}${serie.charge} kg × ${serie.repetitions}${serie.rir !== undefined && serie.rir !== null ? ` (RIR ${serie.rir})` : ""}`).join(" · ") : `${exercice.series} × ${exercice.repetitions} à ${exercice.charge} kg`}${exercice.rir !== undefined && exercice.rir !== null ? ` · RIR ${exercice.rir}` : ""}${exercice.ressenti ? ` · ${RESSENTIS[exercice.ressenti]}` : ""}${exercice.commentaire ? ` — ${exercice.commentaire}` : ""}</p>
      `).join("") || "<p class='muted'>Détails non enregistrés pour cette ancienne séance.</p>";
      const bilan = seance.ressentiSeance || seance.energie || seance.sommeil || seance.commentaireSeance
        ? `<p class="session-history">Bilan : ${seance.ressentiSeance ? RESSENTIS[seance.ressentiSeance] : "non renseigné"}${seance.energie ? ` · énergie ${seance.energie}/5` : ""}${seance.sommeil ? ` · sommeil ${seance.sommeil}/5` : ""}${seance.commentaireSeance ? ` — ${seance.commentaireSeance}` : ""}</p>`
        : "";
      const deleteId = seance.id || seance.date;
      historyList.insertAdjacentHTML("beforeend", `
        <article class="history-entry" data-programme="${encodeURIComponent(seance.programmeId || seance.programme || "sans-programme")}" data-recherche="${`${seance.nom || ""} ${seance.programme || ""} ${(seance.exercices || []).map((exercice) => exercice.nom).join(" ")}`.toLocaleLowerCase("fr-FR")}">
          <strong>${seance.nom}</strong>
          <p class="muted">${date} · ${seance.programme ? `${seance.programme} · ` : ""}${seance.semaineLegere ? "Semaine légère · " : ""}Volume : ${formatKg(seance.volume)} kg${seance.dureeSecondes ? ` · ${formatDuree(seance.dureeSecondes)}` : ""}</p>
          ${bilan}
          ${details}
          <button class="delete-session" data-id="${deleteId}">Supprimer</button>
        </article>
      `);
    });

    const appliquerFiltresHistorique = () => {
      const programmeChoisi = historyList.querySelector("#history-program-filter")?.value || "tous";
      const recherche = historyList.querySelector("#history-search").value.trim().toLocaleLowerCase("fr-FR");
      historyList.querySelectorAll(".history-entry").forEach((entree) => {
        const mauvaisProgramme = programmeChoisi !== "tous" && entree.dataset.programme !== programmeChoisi;
        const introuvable = recherche && !entree.dataset.recherche.includes(recherche);
        entree.hidden = mauvaisProgramme || introuvable;
      });
    };
    historyList.querySelector("#history-program-filter")?.addEventListener("change", appliquerFiltresHistorique);
    historyList.querySelector("#history-search").addEventListener("input", appliquerFiltresHistorique);

    historyList.querySelectorAll(".delete-session").forEach((button) => {
      button.addEventListener("click", () => {
        if (!confirm("Supprimer définitivement cette séance ?")) return;
        const id = button.dataset.id;
        const updated = historique.filter((seance) => String(seance.id || seance.date) !== id);
        localStorage.setItem("historique", JSON.stringify(updated));
        afficherHistorique(true);
      });
    });
  }

  historyPanel.classList.remove("hidden");
  historyPanel.scrollIntoView({ behavior: "smooth" });
}

function creerCalendrierActivite(volumesParJour, year) {
  const start = new Date(year, 0, 1);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(year, 11, 31);
  end.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));
  let cells = "";

  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const volume = volumesParJour.get(dateKey(date)) || 0;
    const level = volume === 0 ? 0 : volume < 3000 ? 1 : volume < 7000 ? 2 : 3;
    const title = `${date.toLocaleDateString("fr-FR")} : ${formatKg(volume)} kg`;
    cells += `<span class="activity-cell level-${level}" title="${title}"></span>`;
  }
  return cells;
}

function creerGraphiqueHebdomadaire(volumesParSemaine) {
  const currentWeek = debutSemaine(new Date());
  const weeks = [];
  for (let offset = 11; offset >= 0; offset--) {
    const date = new Date(currentWeek);
    date.setDate(date.getDate() - offset * 7);
    weeks.push({
      label: date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      volume: volumesParSemaine.get(dateKey(date)) || 0,
    });
  }
  const max = Math.max(...weeks.map((week) => week.volume), 1);
  return weeks.map((week) => {
    const height = Math.max((week.volume / max) * 100, week.volume ? 6 : 1);
    return `<div class="week-bar-wrap" title="${week.label} : ${formatKg(week.volume)} kg"><div class="week-bar" style="height: ${height}%"></div><span>${week.label}</span></div>`;
  }).join("");
}

function creerGraphiqueMesure(mesures, cle, unite) {
  const valeurs = mesures.filter((mesure) => Number(mesure[cle]) > 0).slice(-12);
  if (valeurs.length < 2) return "<p class='muted'>Ajoute au moins deux mesures pour voir une évolution.</p>";
  const nombres = valeurs.map((mesure) => Number(mesure[cle]));
  const min = Math.min(...nombres);
  const max = Math.max(...nombres);
  const ecart = max - min || 1;
  return `<div class="measure-chart">${valeurs.map((mesure) => {
    const valeur = Number(mesure[cle]);
    const hauteur = 20 + ((valeur - min) / ecart) * 80;
    const date = new Date(mesure.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    return `<div class="measure-bar-wrap"><span>${valeur} ${unite}</span><div class="measure-bar" style="height:${hauteur}%" title="${date} : ${valeur} ${unite}"></div><small>${date}</small></div>`;
  }).join("")}</div>`;
}

function afficherProgressionExercice(nomExercice, historique, zone) {
  const performances = [];

  historique.forEach((seance) => {
    const exercice = (seance.exercices || []).find(
      (item) => item.nom === nomExercice,
    );
    if (exercice) {
      performances.push({ ...exercice, date: new Date(seance.date) });
    }
  });

  if (performances.length === 0) {
    zone.innerHTML = "<p class='muted'>Pas encore de donnée pour cet exercice.</p>";
    return;
  }

  const derniere = performances.at(-1);
  const meilleureCharge = Math.max(...performances.map((item) => item.charge));
  const dernieresPerformances = performances.slice(-12);
  const maxCharge = Math.max(...dernieresPerformances.map((item) => item.charge), 1);
  const bars = dernieresPerformances.map((item) => {
    const height = Math.max((item.charge / maxCharge) * 100, 6);
    const label = item.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    return `<div class="progress-bar-wrap" title="${label} : ${resumeSeries(item)}"><div class="progress-bar" style="height: ${height}%"></div><span>${label}</span></div>`;
  }).join("");

  zone.innerHTML = `
    <div class="exercise-summary">
      <span>Dernière performance<strong>${resumeSeries(derniere)}</strong></span>
      <span>Meilleure charge<strong>${meilleureCharge} kg</strong></span>
    </div>
    <div class="exercise-progress-chart">${bars}</div>
  `;
}

function afficherStatistiques(forceOpen = false, programmeFiltre = "tous") {
  if (!forceOpen && !statsPanel.classList.contains("hidden")) {
    statsPanel.classList.add("hidden");
    document.querySelector("#stats-button").scrollIntoView({ behavior: "smooth" });
    return;
  }

  historyPanel.classList.add("hidden");
  analysisPanel.classList.add("hidden");
  programsPanel.classList.add("hidden");
  const historiqueComplet = getHistorique();
  const programmesHistorique = [...new Map(historiqueComplet.map((seance) => [
    seance.programmeId || seance.programme || "sans-programme",
    seance.programme || "Anciennes séances",
  ])).entries()];
  const historique = programmeFiltre === "tous"
    ? historiqueComplet
    : historiqueComplet.filter((seance) => (seance.programmeId || seance.programme || "sans-programme") === programmeFiltre);
  if (historique.length === 0) {
    statsContent.innerHTML = "<p class='muted'>Enregistre une première séance pour voir tes statistiques.</p>";
  } else {
    const now = new Date();
    const startOfWeek = debutSemaine(now);
    const volumesParJour = new Map();
    const volumesParSemaine = new Map();
    const meilleuresCharges = new Map();
    const groupesCetteSemaine = new Map();
    const groupesQuatreSemaines = new Map();
    const debutQuatreSemaines = new Date(startOfWeek);
    debutQuatreSemaines.setDate(debutQuatreSemaines.getDate() - 21);
    let volumeTotal = 0;
    let volumeCetteSemaine = 0;
    const seancesCetteSemaine = historique.filter((seance) => new Date(seance.date) >= startOfWeek);
    const dureesEnregistrees = historique
      .map((seance) => Number(seance.dureeSecondes))
      .filter((duree) => Number.isFinite(duree) && duree > 0);
    const dureeMoyenne = dureesEnregistrees.length
      ? dureesEnregistrees.reduce((total, duree) => total + duree, 0) / dureesEnregistrees.length
      : null;
    const joursEntrainesCetteSemaine = [...new Set(seancesCetteSemaine.map((seance) => {
      const indexJour = (new Date(seance.date).getDay() + 6) % 7;
      return days[indexJour];
    }))];
    const seancesPrevuesJusquaAujourdhui = Object.keys(sessions)
      .filter((jour) => days.indexOf(jour) <= todayIndex).length;

    historique.forEach((seance) => {
      const date = new Date(seance.date);
      const volume = Number(seance.volume) || 0;
      const day = dateKey(date);
      const week = dateKey(debutSemaine(date));
      volumeTotal += volume;
      volumesParJour.set(day, (volumesParJour.get(day) || 0) + volume);
      volumesParSemaine.set(week, (volumesParSemaine.get(week) || 0) + volume);
      if (date >= startOfWeek) volumeCetteSemaine += volume;

      (seance.exercices || []).forEach((exercice) => {
        if (exercice.passe) return;
        const meilleure = meilleuresCharges.get(exercice.nom);
        if (!meilleure || exercice.charge > meilleure.charge) {
          meilleuresCharges.set(exercice.nom, exercice);
        }
        if (date >= debutQuatreSemaines) {
          const groupe = groupeMusculaire(exercice.nom);
          const volumeExercice = Number(exercice.volume) || (exercice.seriesDetail || []).filter((serie) => !serie.echauffement).reduce((total, serie) => total + serie.charge * serie.repetitions, 0);
          const seriesExercice = exercice.seriesDetail?.filter((serie) => !serie.echauffement).length || Number(exercice.series) || 0;
          const recent = groupesQuatreSemaines.get(groupe) || { volume: 0, series: 0 };
          groupesQuatreSemaines.set(groupe, { volume: recent.volume + volumeExercice, series: recent.series + seriesExercice });
          if (date >= startOfWeek) {
            const actuel = groupesCetteSemaine.get(groupe) || { volume: 0, series: 0 };
            groupesCetteSemaine.set(groupe, { volume: actuel.volume + volumeExercice, series: actuel.series + seriesExercice });
          }
        }
      });
    });

    const records = [...meilleuresCharges.entries()]
      .sort((a, b) => b[1].charge - a[1].charge)
      .slice(0, 5)
      .map(([nom, performance]) => `<li>${nom}<strong>${performance.charge} kg</strong></li>`)
      .join("");
    const optionsExercices = [...meilleuresCharges.keys()]
      .sort()
      .map((nom) => `<option value="${nom}">${nom}</option>`)
      .join("");
    const groupes = [...groupesCetteSemaine.entries()].sort((a, b) => b[1].series - a[1].series)
      .map(([groupe, donnees]) => `<li>${groupe}<strong>${donnees.series} séries · ${formatKg(donnees.volume)} kg</strong></li>`)
      .join("");
    const equilibre = [...groupesQuatreSemaines.entries()].sort((a, b) => b[1].series - a[1].series)
      .map(([groupe, donnees]) => {
        const cetteSemaine = groupesCetteSemaine.get(groupe)?.series || 0;
        return `<li>${groupe}<strong>${donnees.series} séries · ~${(donnees.series / 4).toFixed(1).replace(".", ",")}/sem · ${cetteSemaine} cette sem.</strong></li>`;
      })
      .join("");
    const seriesPrevuesParGroupe = new Map();
    Object.values(sessions).forEach((seance) => (seance.exercises || []).forEach(([nom, objectif]) => {
      const seriesPrevues = Number(String(objectif).match(/^\s*(\d+)/)?.[1]) || 0;
      const groupe = groupeMusculaire(nom);
      seriesPrevuesParGroupe.set(groupe, (seriesPrevuesParGroupe.get(groupe) || 0) + seriesPrevues);
    }));
    const comparaisonProgramme = [...seriesPrevuesParGroupe.entries()].sort((a, b) => b[1] - a[1])
      .map(([groupe, prevu]) => {
        const realise = (groupesQuatreSemaines.get(groupe)?.series || 0) / 4;
        const etat = realise < prevu * 0.75 ? "à rattraper" : "dans le repère";
        return `<li>${groupe}<strong>~${realise.toFixed(1).replace(".", ",")} / ${prevu} séries · ${etat}</strong></li>`;
      }).join("");
    const mesures = getMesures();
    const derniereMesure = mesures.at(-1);
    const premiereMesure = mesures[0];
    const evolutionMesure = (cle, unite) => {
      if (!premiereMesure || !derniereMesure || !premiereMesure[cle] || !derniereMesure[cle]) return "";
      const variation = Number(derniereMesure[cle]) - Number(premiereMesure[cle]);
      return `${variation > 0 ? "+" : ""}${variation.toFixed(1).replace(".", ",")} ${unite}`;
    };
    const evolutionsMesures = [evolutionMesure("poids", "kg"), evolutionMesure("taille", "cm")].filter(Boolean).join(" · ");
    const graphiquePoids = creerGraphiqueMesure(mesures, "poids", "kg");
    const graphiqueTaille = creerGraphiqueMesure(mesures, "taille", "cm");
    const mesuresRecentes = mesures.map((mesure, index) => ({ mesure, index })).slice(-5).reverse()
      .map(({ mesure, index }) => `<li>${new Date(mesure.date).toLocaleDateString("fr-FR")}<strong>${mesure.poids ? `${mesure.poids} kg` : "—"}${mesure.taille ? ` · taille ${mesure.taille} cm` : ""}</strong><button class="delete-measure" data-index="${index}" aria-label="Supprimer cette mesure">×</button></li>`).join("");
    const seancesRecentes = historique.slice(-5);
    const valeursRenseignees = (valeurs) => valeurs
      .filter((valeur) => valeur !== null && valeur !== undefined && valeur !== "")
      .map(Number)
      .filter(Number.isFinite);
    const moyenne = (valeurs) => valeurs.length
      ? valeurs.reduce((total, valeur) => total + valeur, 0) / valeurs.length
      : null;
    const energieMoyenne = moyenne(valeursRenseignees(seancesRecentes.map((seance) => seance.energie)));
    const sommeilMoyen = moyenne(valeursRenseignees(seancesRecentes.map((seance) => seance.sommeil)));
    const rirMoyen = moyenne(valeursRenseignees(seancesRecentes.flatMap((seance) =>
      (seance.exercices || []).filter((exercice) => !exercice.passe).flatMap((exercice) =>
        (exercice.seriesDetail || [])
          .filter((serie) => !serie.echauffement)
          .map((serie) => serie.rir)
      )
    )));
    const formatMoyenne = (valeur) => valeur === null ? "—" : valeur.toFixed(1).replace(".", ",");
    const donneesRecuperation = [energieMoyenne, sommeilMoyen, rirMoyen].filter((valeur) => valeur !== null).length;
    let messageRecuperation = "Renseigne énergie, sommeil et RIR sur quelques séances pour voir une tendance utile.";
    if (donneesRecuperation >= 2 && (energieMoyenne !== null && energieMoyenne <= 2.5 || sommeilMoyen !== null && sommeilMoyen <= 2.5)) {
      messageRecuperation = "Récupération basse sur les dernières séances : adapte l’effort si besoin et surveille l’évolution.";
    } else if (rirMoyen !== null && rirMoyen <= 1.2) {
      messageRecuperation = "Effort récent très élevé. Si l’énergie ou le sommeil baissent aussi, surveille ta récupération.";
    } else if (donneesRecuperation >= 2) {
      messageRecuperation = "Récupération récente plutôt stable d’après les informations enregistrées.";
    }

    statsContent.innerHTML = `
      <div class="stats-grid">
        <article class="stat-card"><span>Séances</span><strong>${historique.length}</strong></article>
        <article class="stat-card"><span>Volume total</span><strong>${formatKg(volumeTotal)} kg</strong></article>
        <article class="stat-card"><span>Cette semaine</span><strong>${formatKg(volumeCetteSemaine)} kg</strong></article>
      </div>
      ${programmesHistorique.length > 1 ? `<label class="history-filter">Programme
        <select id="stats-program-filter">
          <option value="tous">Tous les programmes</option>
          ${programmesHistorique.map(([id, nom]) => `<option value="${id}"${id === programmeFiltre ? " selected" : ""}>${nom}</option>`).join("")}
        </select>
      </label>` : ""}
      <h3>Ma semaine</h3>
      <div class="week-recap">
        <strong>${seancesCetteSemaine.length} séance${seancesCetteSemaine.length > 1 ? "s" : ""} enregistrée${seancesCetteSemaine.length > 1 ? "s" : ""}</strong>
        <p class="muted">Jours entraînés : ${joursEntrainesCetteSemaine.length ? joursEntrainesCetteSemaine.join(" · ") : "aucun pour le moment"}. Ton programme prévoit ${seancesPrevuesJusquaAujourdhui} séance${seancesPrevuesJusquaAujourdhui > 1 ? "s" : ""} jusqu’à aujourd’hui.${dureeMoyenne ? ` Durée moyenne : ${formatDuree(dureeMoyenne)}.` : ""}</p>
      </div>
      <h3>Activité ${now.getFullYear()}</h3>
      <div class="activity-calendar">${creerCalendrierActivite(volumesParJour, now.getFullYear())}</div>
      <p class="calendar-legend muted">Plus la case est verte, plus le volume du jour est élevé.</p>
      <h3>Volume hebdomadaire</h3>
      <div class="weekly-chart">${creerGraphiqueHebdomadaire(volumesParSemaine)}</div>
      <h3>Meilleures charges</h3>
      <ul class="records-list">${records || "<li>Aucune charge enregistrée.</li>"}</ul>
      <h3>Groupes musculaires — cette semaine</h3>
      <ul class="records-list">${groupes || "<li>Aucune séance cette semaine.</li>"}</ul>
      <h3>Équilibre musculaire — 4 semaines</h3>
      <ul class="records-list">${equilibre || "<li>Enregistre quelques séances pour voir la répartition.</li>"}</ul>
      <h3>Réalisé vs programme actif</h3>
      <ul class="records-list">${comparaisonProgramme || "<li>Programme sans séries définies.</li>"}</ul>
      <h3>Récupération récente</h3>
      <div class="stats-grid recovery-grid">
        <article class="stat-card"><span>Énergie moyenne</span><strong>${formatMoyenne(energieMoyenne)}${energieMoyenne === null ? "" : "/5"}</strong></article>
        <article class="stat-card"><span>Sommeil moyen</span><strong>${formatMoyenne(sommeilMoyen)}${sommeilMoyen === null ? "" : "/5"}</strong></article>
        <article class="stat-card"><span>RIR moyen</span><strong>${formatMoyenne(rirMoyen)}</strong></article>
      </div>
      <p class="recovery-note">Sur les ${seancesRecentes.length} dernières séances : ${messageRecuperation}</p>
      <h3>Poids et mensurations</h3>
      <button id="add-measurement" class="backup-button">Ajouter une mesure</button>
      <p class="muted">Dernière mesure : ${derniereMesure ? `${derniereMesure.poids || "—"} kg${derniereMesure.taille ? ` · taille ${derniereMesure.taille} cm` : ""}` : "aucune"}</p>
      ${evolutionsMesures ? `<p class="muted">Évolution depuis la première mesure : ${evolutionsMesures}</p>` : ""}
      <ul class="records-list">${mesuresRecentes || "<li>Aucune mesure enregistrée.</li>"}</ul>
      <h4>Évolution du poids</h4>
      ${graphiquePoids}
      <h4>Évolution du tour de taille</h4>
      ${graphiqueTaille}
      <h3>Progression par exercice</h3>
      <select id="exercise-select" class="exercise-select">${optionsExercices}</select>
      <div id="exercise-progress"></div>
    `;

    const selectExercice = statsContent.querySelector("#exercise-select");
    const progression = statsContent.querySelector("#exercise-progress");
    const mettreAJourProgression = () =>
      afficherProgressionExercice(selectExercice.value, historique, progression);
    selectExercice.addEventListener("change", mettreAJourProgression);
    statsContent.querySelector("#stats-program-filter")?.addEventListener("change", (event) => {
      afficherStatistiques(true, event.target.value);
    });
    statsContent.querySelector("#add-measurement").addEventListener("click", () => {
      const poids = Number(prompt("Poids du jour en kg (facultatif) :", derniereMesure?.poids || ""));
      const taille = Number(prompt("Tour de taille en cm (facultatif) :", derniereMesure?.taille || ""));
      if (!poids && !taille) return;
      mesures.push({ date: new Date().toISOString(), poids: poids || null, taille: taille || null });
      localStorage.setItem(MESURES_KEY, JSON.stringify(mesures));
      afficherStatistiques(true, programmeFiltre);
    });
    statsContent.querySelectorAll(".delete-measure").forEach((button) => button.addEventListener("click", () => {
      if (!confirm("Supprimer cette mesure ?")) return;
      mesures.splice(Number(button.dataset.index), 1);
      localStorage.setItem(MESURES_KEY, JSON.stringify(mesures));
      afficherStatistiques(true, programmeFiltre);
    }));
    mettreAJourProgression();
  }
  statsPanel.classList.remove("hidden");
  statsPanel.scrollIntoView({ behavior: "smooth" });
}

function getProgrammes() {
  try {
    return JSON.parse(localStorage.getItem(PROGRAMMES_KEY) || "[]");
  } catch {
    return [];
  }
}

function sauvegarderProgrammes(programmes) {
  localStorage.setItem(PROGRAMMES_KEY, JSON.stringify(programmes));
}

function activerProgramme(id, afficher = true) {
  const programme = getProgrammes().find((item) => item.id === id);
  if (!programme) return;
  programmeActif = programme;
  sessions = programme.seances;
  localStorage.setItem(PROGRAMME_ACTIF_KEY, id);
  if (afficher) renderDay(days[todayIndex]);
}

function sauvegarderProgrammeActif() {
  if (!programmeActif) return;
  const programmes = getProgrammes();
  const index = programmes.findIndex((programme) => programme.id === programmeActif.id);
  if (index === -1) return;
  programmes[index] = programmeActif;
  sauvegarderProgrammes(programmes);
}

function basculerSemaineLegere() {
  if (!programmeActif) return;
  programmeActif.semaineLegere = !programmeActif.semaineLegere;
  sauvegarderProgrammeActif();
  document.querySelector("#deload-toggle").textContent = programmeActif.semaineLegere ? "Désactiver la semaine légère" : "Activer la semaine légère";
  renderDay(days[todayIndex]);
}

function afficherProgrammes() {
  if (!programsPanel.classList.contains("hidden")) {
    programsPanel.classList.add("hidden");
    return;
  }
  historyPanel.classList.add("hidden");
  statsPanel.classList.add("hidden");
  analysisPanel.classList.add("hidden");
  programEditor.classList.add("hidden");
  document.querySelector("#deload-toggle").textContent = programmeActif?.semaineLegere ? "Désactiver la semaine légère" : "Activer la semaine légère";
  programList.innerHTML = "";
  const dernierDeload = [...getHistorique()].reverse().find((seance) => seance.semaineLegere && seance.programmeId === programmeActif?.id);
  const texteDeload = dernierDeload
    ? `Dernière semaine légère enregistrée : ${new Date(dernierDeload.date).toLocaleDateString("fr-FR")}.`
    : "Aucune semaine légère enregistrée pour ce programme. À envisager si fatigue et stagnation s’installent, pas juste par automatisme.";
  programList.insertAdjacentHTML("beforeend", `<p class="deload-reminder">${texteDeload}</p>`);
  getProgrammes().forEach((programme) => {
    const ligne = document.createElement("article");
    ligne.className = "program-entry";
    const texte = document.createElement("div");
    const titre = document.createElement("strong");
    titre.textContent = programme.nom;
    const details = document.createElement("p");
    details.className = "muted";
    details.textContent = `${Object.values(programme.seances || {}).length} séances${programme.id === programmeActif?.id ? " · actif" : ""}`;
    texte.append(titre, details);
    const actions = document.createElement("div");
    actions.className = "program-entry-actions";
    const bouton = document.createElement("button");
    bouton.className = "select-program";
    bouton.textContent = programme.id === programmeActif?.id ? "Actif" : "Utiliser";
    bouton.disabled = programme.id === programmeActif?.id;
    bouton.addEventListener("click", () => {
      activerProgramme(programme.id);
      afficherProgrammes();
    });
    actions.append(bouton);
    if (programme.id !== "hypertrophie") {
      const supprimer = document.createElement("button");
      supprimer.className = "delete-program";
      supprimer.textContent = "Supprimer";
      supprimer.addEventListener("click", () => supprimerProgramme(programme.id));
      actions.append(supprimer);
    }
    ligne.append(texte, actions);
    programList.append(ligne);
  });
  programsPanel.classList.remove("hidden");
  programsPanel.scrollIntoView({ behavior: "smooth" });
}

function copierProgrammeActif() {
  if (!programmeActif) return;
  const nom = prompt("Nom du nouveau programme :", `${programmeActif.nom} — copie`);
  if (!nom?.trim()) return;
  const programmes = getProgrammes();
  const copie = {
    id: `programme-${Date.now()}`,
    nom: nom.trim(),
    seances: JSON.parse(JSON.stringify(programmeActif.seances)),
  };
  programmes.push(copie);
  sauvegarderProgrammes(programmes);
  activerProgramme(copie.id);
  programsPanel.classList.add("hidden");
  afficherProgrammes();
}

function creerProgrammeForce() {
  if (!programmeActif) return;
  const nom = prompt("Nom du programme force :", `${programmeActif.nom} — Force`);
  if (!nom?.trim()) return;
  const estPrincipal = (exercice) => /développé|squat|deadlift|rowing|traction|tirage/.test(exercice.toLowerCase());
  const seancesForce = Object.fromEntries(Object.entries(programmeActif.seances).map(([jour, seance]) => [jour, {
    ...seance,
    duration: seance.duration,
    exercises: seance.exercises.map(([exercice, cible, charge, note]) => {
      const principal = estPrincipal(exercice);
      return [
        exercice,
        principal ? "4 × 3–5" : "3 × 6–8",
        charge,
        `${note || ""}${note ? " · " : ""}Base force : ajuste charge et volume selon ta progression.`,
        principal ? 180 : 120,
      ];
    }),
  }]));
  const programmes = getProgrammes();
  const force = { id: `programme-force-${Date.now()}`, nom: nom.trim(), seances: seancesForce };
  programmes.push(force);
  sauvegarderProgrammes(programmes);
  activerProgramme(force.id);
  programsPanel.classList.add("hidden");
  alert("Base force créée. Ton programme hypertrophie est conservé ; ouvre l’éditeur pour ajuster les exercices et volumes avant de l’utiliser.");
}

function supprimerProgramme(id) {
  const programmes = getProgrammes();
  const programme = programmes.find((item) => item.id === id);
  if (!programme || programme.id === "hypertrophie") return;
  if (!confirm(`Supprimer le programme « ${programme.nom} » ? Les séances déjà enregistrées dans l’historique ne seront pas supprimées.`)) return;
  const restants = programmes.filter((item) => item.id !== id);
  sauvegarderProgrammes(restants);
  if (programmeActif?.id === id) {
    activerProgramme(restants[0].id);
  }
  programsPanel.classList.add("hidden");
  afficherProgrammes();
}

function ouvrirEditeurProgramme() {
  if (!programmeActif) return;
  jourEdite = days.find((day) => sessions[day]) || days[0];
  programList.classList.add("hidden");
  document.querySelector("#duplicate-program").parentElement.classList.add("hidden");
  afficherEditeurProgramme();
  programEditor.classList.remove("hidden");
}

function fermerEditeurProgramme() {
  programEditor.classList.add("hidden");
  programList.classList.remove("hidden");
  document.querySelector("#duplicate-program").parentElement.classList.remove("hidden");
  programsPanel.classList.add("hidden");
  afficherProgrammes();
  renderDay(jourEdite);
}

function creerChamp(label, valeur, classe, type = "text") {
  const bloc = document.createElement("label");
  bloc.textContent = label;
  const input = document.createElement("input");
  input.type = type;
  input.className = classe;
  input.value = valeur ?? "";
  if (type === "number") input.step = "0.5";
  bloc.append(input);
  return bloc;
}

function sauvegarderModificationsEditeur(alerter = false) {
  if (!programmeActif) return;
  const champNom = programEditor.querySelector(".program-name-input");
  if (champNom) programmeActif.nom = champNom.value.trim() || programmeActif.nom;
  const seanceEditee = sessions[jourEdite];
  if (seanceEditee) {
    seanceEditee.title = programEditor.querySelector(".session-title-input").value.trim() || `Séance ${jourEdite}`;
    seanceEditee.duration = programEditor.querySelector(".session-duration-input").value.trim();
    seanceEditee.exercises = [...programEditor.querySelectorAll(".editor-exercise")].map((ligne) => [
      ligne.querySelector(".edit-exercise-name").value.trim() || "Exercice",
      ligne.querySelector(".edit-exercise-target").value.trim() || "3 × 10",
      Number(ligne.querySelector(".edit-exercise-weight").value) || 0,
      ligne.querySelector(".edit-exercise-note").value.trim(),
      Number(ligne.querySelector(".edit-exercise-rest").value) || 90,
    ]);
  }
  sauvegarderProgrammeActif();
  if (alerter) alert("Programme enregistré !");
}

function afficherEditeurProgramme() {
  const session = sessions[jourEdite];
  programEditor.innerHTML = "";
  const titre = document.createElement("h3");
  titre.textContent = "Modifier le programme";
  const nomProgramme = creerChamp("Nom du programme", programmeActif.nom, "program-name-input");
  const jours = document.createElement("div");
  jours.className = "editor-days";
  days.forEach((day) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.textContent = day;
    bouton.classList.toggle("active", day === jourEdite);
    bouton.addEventListener("click", () => {
      sauvegarderModificationsEditeur();
      jourEdite = day;
      afficherEditeurProgramme();
    });
    jours.append(bouton);
  });
  programEditor.append(titre, nomProgramme, jours);

  if (!session) {
    const texte = document.createElement("p");
    texte.className = "muted";
    texte.textContent = "Aucune séance prévue ce jour-là.";
    const ajouter = document.createElement("button");
    ajouter.className = "backup-button";
    ajouter.textContent = "Ajouter une séance ce jour";
    ajouter.addEventListener("click", () => {
      sessions[jourEdite] = { title: `Séance ${jourEdite}`, duration: "", exercises: [] };
      sauvegarderProgrammeActif();
      afficherEditeurProgramme();
    });
    programEditor.append(texte, ajouter);
  } else {
    const titreSeance = creerChamp("Nom de la séance", session.title, "session-title-input");
    const duree = creerChamp("Durée / indication", session.duration, "session-duration-input");
    const exercices = document.createElement("div");
    exercices.className = "editor-exercises";
    session.exercises.forEach((exercice, index) => {
      const ligne = document.createElement("article");
      ligne.className = "editor-exercise";
      ligne.append(
        creerChamp("Exercice", exercice[0], "edit-exercise-name"),
        creerChamp("Objectif", exercice[1], "edit-exercise-target"),
        creerChamp("Charge", exercice[2], "edit-exercise-weight", "number"),
        creerChamp("Note", exercice[3], "edit-exercise-note"),
        creerChamp("Repos (s)", exercice[4] ?? 90, "edit-exercise-rest", "number"),
      );
      const ordre = document.createElement("div");
      ordre.className = "editor-exercise-actions";
      const monter = document.createElement("button");
      monter.type = "button";
      monter.className = "backup-button";
      monter.textContent = "↑ Monter";
      monter.disabled = index === 0;
      monter.addEventListener("click", () => {
        sauvegarderModificationsEditeur();
        [session.exercises[index - 1], session.exercises[index]] = [session.exercises[index], session.exercises[index - 1]];
        sauvegarderProgrammeActif();
        afficherEditeurProgramme();
      });
      const descendre = document.createElement("button");
      descendre.type = "button";
      descendre.className = "backup-button";
      descendre.textContent = "↓ Descendre";
      descendre.disabled = index === session.exercises.length - 1;
      descendre.addEventListener("click", () => {
        sauvegarderModificationsEditeur();
        [session.exercises[index], session.exercises[index + 1]] = [session.exercises[index + 1], session.exercises[index]];
        sauvegarderProgrammeActif();
        afficherEditeurProgramme();
      });
      const supprimer = document.createElement("button");
      supprimer.type = "button";
      supprimer.className = "delete-program";
      supprimer.textContent = "Retirer";
      supprimer.addEventListener("click", () => {
        if (!confirm(`Retirer « ${exercice[0]} » de cette séance ?`)) return;
        session.exercises.splice(index, 1);
        sauvegarderProgrammeActif();
        afficherEditeurProgramme();
      });
      ordre.append(monter, descendre, supprimer);
      ligne.append(ordre);
      exercices.append(ligne);
    });
    const ajouterExercice = document.createElement("button");
    ajouterExercice.type = "button";
    ajouterExercice.className = "backup-button";
    ajouterExercice.textContent = "+ Ajouter un exercice";
    ajouterExercice.addEventListener("click", () => {
      session.exercises.push(["Nouvel exercice", "3 × 10", 0, "", 90]);
      sauvegarderProgrammeActif();
      afficherEditeurProgramme();
    });
    programEditor.append(titreSeance, duree, exercices, ajouterExercice);
  }

  const actions = document.createElement("div");
  actions.className = "program-actions";
  const enregistrer = document.createElement("button");
  enregistrer.type = "button";
  enregistrer.className = "finish-button";
  enregistrer.textContent = "Enregistrer les modifications";
  enregistrer.addEventListener("click", () => sauvegarderModificationsEditeur(true));
  const fermer = document.createElement("button");
  fermer.type = "button";
  fermer.className = "backup-button";
  fermer.textContent = "Fermer l’éditeur";
  fermer.addEventListener("click", fermerEditeurProgramme);
  actions.append(enregistrer, fermer);
  programEditor.append(actions);
}

async function chargerProgramme() {
  const reponse = await fetch("programme.json");
  const programmeSource = await reponse.json();
  let programmes = getProgrammes();
  if (programmes.length === 0) {
    programmes = [{ id: "hypertrophie", nom: "Hypertrophie", seances: programmeSource.seances }];
    sauvegarderProgrammes(programmes);
  }
  const idActif = localStorage.getItem(PROGRAMME_ACTIF_KEY);
  activerProgramme(programmes.some((programme) => programme.id === idActif) ? idActif : programmes[0].id, false);
  renderDay(days[todayIndex]);
  afficherSeanceEnCours();
  mettreAJourStatutSauvegarde();
}

function trouverDernierePerformance(nomExercice) {
  const historique = getHistorique();
  for (let index = historique.length - 1; index >= 0; index--) {
    const performance = (historique[index].exercices || []).find((exercice) => exercice.nom === nomExercice && !exercice.passe);
    if (performance) return performance;
  }
  return null;
}

function trouverDerniereSeance(jour) {
  const historique = getHistorique();
  for (let index = historique.length - 1; index >= 0; index--) {
    const seance = historique[index];
    const memeProgramme = seance.programmeId
      ? seance.programmeId === programmeActif?.id
      : seance.programme === programmeActif?.nom;
    if (seance.jour === jour && memeProgramme) return seance;
  }
  return null;
}

function texteDerniereSeance(seance) {
  if (!seance) return "";
  const date = new Date(seance.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  const ressenti = seance.ressentiSeance ? ` · ${RESSENTIS[seance.ressentiSeance]}` : "";
  const duree = seance.dureeSecondes ? ` · ${formatDuree(seance.dureeSecondes)}` : "";
  return `Dernière séance : ${date} · ${formatKg(seance.volume)} kg${duree}${ressenti}`;
}

function derniersPassages(nomExercice) {
  return getHistorique()
    .flatMap((seance) => (seance.exercices || []).filter((exercice) => exercice.nom === nomExercice && !exercice.passe).map((exercice) => ({ exercice, date: new Date(seance.date) })))
    .slice(-5)
    .reverse();
}

function afficherDerniersPassages(nomExercice, zone) {
  const passages = derniersPassages(nomExercice);
  zone.innerHTML = passages.length
    ? passages.map(({ exercice, date }) => `<p>${date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} · ${resumeSeries(exercice)}${exercice.ressenti ? ` · ${RESSENTIS[exercice.ressenti]}` : ""}</p>`).join("")
    : "<p>Aucun passage enregistré.</p>";
}

function afficherTempsRepos(restant) {
  const texte = `${Math.floor(restant / 60)}:${String(restant % 60).padStart(2, "0")}`;
  document.querySelector("#timer-display").textContent = texte;
  const minuteurExercice = timerExerciseCard?.querySelector(".exercise-timer");
  if (minuteurExercice) minuteurExercice.querySelector("strong").textContent = texte;
}

function demarrerMinuteur(secondes, exerciseCard = null) {
  try {
    audioRepos ||= new AudioContext();
    audioRepos.resume();
  } catch {}
  clearInterval(timerInterval);
  timerExerciseCard?.querySelector(".exercise-timer")?.classList.add("hidden");
  timerExerciseCard = exerciseCard;
  timerExerciseCard?.querySelector(".exercise-timer")?.classList.remove("hidden");
  timerEndAt = Date.now() + secondes * 1000;
  function afficherTemps() {
    const restant = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
    afficherTempsRepos(restant);
    if (restant === 0) {
      clearInterval(timerInterval);
      timerEndAt = null;
      const minuteurExercice = timerExerciseCard?.querySelector(".exercise-timer");
      if (minuteurExercice) minuteurExercice.innerHTML = "Repos terminé ✓";
      signalerFinRepos();
    }
  }
  afficherTemps();
  timerInterval = setInterval(afficherTemps, 1000);
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && timerEndAt) {
    const restant = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
    afficherTempsRepos(restant);
    if (restant === 0) {
      clearInterval(timerInterval);
      timerEndAt = null;
      const minuteurExercice = timerExerciseCard?.querySelector(".exercise-timer");
      if (minuteurExercice) minuteurExercice.innerHTML = "Repos terminé ✓";
      signalerFinRepos();
    }
  }
});

function signalerFinRepos() {
  navigator.vibrate?.([180, 90, 180]);
  try {
    const oscillateur = audioRepos.createOscillator();
    const gain = audioRepos.createGain();
    oscillateur.frequency.value = 880;
    gain.gain.setValueAtTime(0.06, audioRepos.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioRepos.currentTime + 0.3);
    oscillateur.connect(gain).connect(audioRepos.destination);
    oscillateur.start();
    oscillateur.stop(audioRepos.currentTime + 0.3);
  } catch {}
  alert("Repos terminé !");
}

function renderDay(day, brouillon = null) {
  selector.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.textContent === day);
  });
  workout.innerHTML = "";
  const session = sessions[day];
  if (!session) {
    workout.innerHTML = "<p class='rest'>Aujourd’hui : récupération, course ou mobilité selon ton programme.</p>";
    return;
  }

  const semaineLegere = Boolean(programmeActif?.semaineLegere);
  const derniereSeance = trouverDerniereSeance(day);
  workout.insertAdjacentHTML("beforeend", `<h2>${session.title}</h2><p class="workout-meta">${session.duration}</p>${derniereSeance ? `<p class="last-session">${texteDerniereSeance(derniereSeance)}</p>` : ""}${semaineLegere ? "<p class='deload-banner'>Semaine légère : environ −10 % de charge et une série de moins. Ajuste librement selon ta forme.</p>" : ""}<p id="session-total" class="muted">Volume total : 0 kg</p><p id="session-progress" class="session-progress">0 / 0 exercices terminés</p><p id="session-save-status" class="save-status">Sauvegarde automatique active</p>`);
  const brouillonTrouve = brouillon || getSeanceEnCours();
  const seanceEnCours = brouillonTrouve && (!brouillonTrouve.programmeId || brouillonTrouve.programmeId === programmeActif?.id)
    ? brouillonTrouve
    : null;
  workout.dataset.commenceeLe = seanceEnCours?.commenceeLe || "";
  session.exercises.forEach(([name, target, weight, note, restSeconds = 90]) => {
    const card = template.content.cloneNode(true);
    const exerciseCard = card.querySelector(".exercise-card");
    exerciseCard.dataset.programmeName = name;
    exerciseCard.dataset.day = day;
    exerciseCard.dataset.restSeconds = restSeconds;
    card.querySelector(".exercise-note").textContent = note;
    card.querySelector(".target").textContent = target;
    const boutonReposConseille = card.querySelector('[data-seconds="90"]');
    boutonReposConseille.dataset.seconds = restSeconds;
    boutonReposConseille.textContent = `Repos conseillé : ${restSeconds} s`;
    const ancienExercice = seanceEnCours?.jour === day
      ? (seanceEnCours.exercices || []).find((exercice) => exercice.programmeNom === name || exercice.nom === name)
      : null;
    const nomEffectif = ancienExercice?.nom || name;
    card.querySelector(".exercise-name").textContent = nomEffectif;
    const dernierePerformance = trouverDernierePerformance(nomEffectif);
    card.querySelector(".last-performance").textContent = texteDernierePerformance(dernierePerformance);
    card.querySelector(".progression-advice").textContent = conseilProgression(dernierePerformance, target);
    afficherDerniersPassages(nomEffectif, card.querySelector(".exercise-history-list"));
    const notePermanente = card.querySelector(".exercise-memory-input");
    notePermanente.value = getNotesExercices()[nomEffectif] || "";
    notePermanente.addEventListener("input", () => sauvegarderNoteExercice(exerciseCard.querySelector(".exercise-name").textContent, notePermanente.value));

    const selectVariante = card.querySelector(".variant-select");
    const variantes = [...new Set([name, ...(VARIANTES[name] || []), nomEffectif])];
    variantes.forEach((variante) => {
      const option = document.createElement("option");
      option.value = variante;
      option.textContent = variante === name ? `${variante} (prévu)` : variante;
      selectVariante.append(option);
    });
    const autreOption = document.createElement("option");
    autreOption.value = "__autre__";
    autreOption.textContent = "Autre exercice…";
    selectVariante.append(autreOption);
    selectVariante.value = nomEffectif;

    card.querySelector(".variant-button").addEventListener("click", (event) => {
      event.currentTarget.closest(".exercise-card").querySelector(".variant-picker").classList.toggle("hidden");
    });
    selectVariante.addEventListener("change", (event) => {
      const exerciseCard = event.currentTarget.closest(".exercise-card");
      let nouveauNom = selectVariante.value;
      if (nouveauNom === "__autre__") {
        nouveauNom = prompt("Nom de l’exercice alternatif :", "");
        if (!nouveauNom) {
          selectVariante.value = exerciseCard.querySelector(".exercise-name").textContent;
          return;
        }
        const option = document.createElement("option");
        option.value = nouveauNom;
        option.textContent = nouveauNom;
        selectVariante.insertBefore(option, autreOption);
        selectVariante.value = nouveauNom;
      }
      exerciseCard.querySelector(".exercise-name").textContent = nouveauNom;
      const derniere = trouverDernierePerformance(nouveauNom);
      exerciseCard.querySelector(".last-performance").textContent = texteDernierePerformance(derniere);
      exerciseCard.querySelector(".progression-advice").textContent = conseilProgression(derniere, target);
      afficherDerniersPassages(nouveauNom, exerciseCard.querySelector(".exercise-history-list"));
      notePermanente.value = getNotesExercices()[nouveauNom] || "";
      if (derniere?.seriesDetail?.length) {
        exerciseCard.querySelector(".series-list").innerHTML = "";
        derniere.seriesDetail.forEach((serie) => {
          ajouterSerie(exerciseCard, serie.charge, serie.repetitions, serie.echauffement, serie.rir);
        });
        updateVolume(exerciseCard);
      }
      sauvegarderSeanceEnCours(day, session);
    });

    const performanceDeDepart = ancienExercice || dernierePerformance;
    const seriesInitiales = performanceDeDepart?.seriesDetail?.length
      ? performanceDeDepart.seriesDetail
      : Array.from({ length: semaineLegere ? Math.max(1, (Number(target.split(" ")[0]) || 3) - 1) : (Number(ancienExercice?.series || target.split(" ")[0]) || 3) }, () => ({
        charge: performanceDeDepart?.charge ?? (semaineLegere ? Math.round(Number(weight) * 0.9 * 2) / 2 : weight),
        repetitions: performanceDeDepart?.repetitions ?? "",
      }));
    seriesInitiales.forEach((serie) => ajouterSerie(exerciseCard, serie.charge, serie.repetitions, serie.echauffement, serie.rir, serie.terminee));
    if (ancienExercice?.termine) {
      card.querySelector(".exercise-card").classList.add("completed");
      card.querySelector(".complete-exercise").textContent = "Modifier l’exercice";
      card.querySelector(".exercise-status").textContent = "Terminé ✓";
    }
    if (ancienExercice?.passe) {
      card.querySelector(".exercise-card").classList.add("skipped");
      card.querySelector(".exercise-card").dataset.skipReason = ancienExercice.raisonPassage || "";
      card.querySelector(".skip-exercise").textContent = "Faire l’exercice";
      card.querySelector(".exercise-status").textContent = "Passé";
    }
    configurerRessenti(
      card.querySelector(".feeling-area"),
      ancienExercice?.ressenti,
      ancienExercice?.commentaire,
      () => sauvegarderSeanceEnCours(day, session),
    );
    card.querySelector(".add-set").addEventListener("click", (event) => {
      const cible = event.currentTarget.closest(".exercise-card");
      const dernierPoids = cible.querySelector(".series-row:last-child .set-weight")?.value || weight;
      ajouterSerie(cible, dernierPoids);
      updateVolume(cible);
      sauvegarderSeanceEnCours(day, session);
    });
    card.querySelector(".warmup-set").addEventListener("click", (event) => {
      const cible = event.currentTarget.closest(".exercise-card");
      const premiereCharge = Number(cible.querySelector(".set-weight")?.value) || Number(weight) || 0;
      ajouterSerie(cible, Math.round(premiereCharge * 0.5 * 2) / 2, 10, true);
      updateVolume(cible);
      sauvegarderSeanceEnCours(day, session);
    });
    const estMouvementPrincipal = /développé|squat|deadlift|rowing|traction|tirage/.test(name.toLowerCase());
    const boutonEchauffementConseille = card.querySelector(".suggest-warmup");
    boutonEchauffementConseille.classList.toggle("hidden", !estMouvementPrincipal);
    boutonEchauffementConseille.addEventListener("click", (event) => {
      const cible = event.currentTarget.closest(".exercise-card");
      if (cible.querySelector(".warmup-row")) return;
      const charge = Number(cible.querySelector(".set-weight")?.value) || Number(weight) || 0;
      if (!charge) return;
      [[0.4, 10], [0.6, 5], [0.75, 3]].forEach(([ratio, reps]) => {
        ajouterSerie(cible, Math.round(charge * ratio * 2) / 2, reps, true);
      });
      event.currentTarget.textContent = "Échauffement ajouté ✓";
      updateVolume(cible);
      sauvegarderSeanceEnCours(day, session);
    });
    card.querySelector(".remove-set").addEventListener("click", (event) => {
      const cible = event.currentTarget.closest(".exercise-card");
      if (cible.querySelectorAll(".series-row").length <= 1) return;
      cible.querySelector(".series-row:last-child").remove();
      updateVolume(cible);
      sauvegarderSeanceEnCours(day, session);
    });
    card.querySelectorAll(".rest-button").forEach((button) => button.addEventListener("click", (event) => demarrerMinuteur(Number(button.dataset.seconds), event.currentTarget.closest(".exercise-card"))));
    card.querySelector(".complete-exercise").addEventListener("click", (event) => {
      const exerciseCard = event.currentTarget.closest(".exercise-card");
      exerciseCard.classList.remove("skipped");
      exerciseCard.querySelector(".skip-exercise").textContent = "Passer";
      const completed = exerciseCard.classList.toggle("completed");
      event.currentTarget.textContent = completed ? "Modifier l’exercice" : "Exercice terminé";
      exerciseCard.querySelector(".exercise-status").textContent = completed ? "Terminé ✓" : "";
      updateSessionProgress();
      sauvegarderSeanceEnCours(day, session);
      if (completed) demarrerMinuteur(restSeconds, exerciseCard);
    });
    card.querySelector(".skip-exercise").addEventListener("click", (event) => {
      const exerciseCard = event.currentTarget.closest(".exercise-card");
      const passe = exerciseCard.classList.toggle("skipped");
      if (passe) {
        const raison = prompt("Pourquoi passer cet exercice ? (facultatif)", exerciseCard.dataset.skipReason || "");
        if (raison === null) {
          exerciseCard.classList.remove("skipped");
          return;
        }
        exerciseCard.dataset.skipReason = raison.trim();
        exerciseCard.classList.remove("completed");
        exerciseCard.querySelector(".complete-exercise").textContent = "Exercice terminé";
      } else {
        delete exerciseCard.dataset.skipReason;
      }
      event.currentTarget.textContent = passe ? "Faire l’exercice" : "Passer";
      exerciseCard.querySelector(".exercise-status").textContent = passe ? "Passé" : "";
      updateVolume(exerciseCard);
      updateSessionProgress();
      sauvegarderSeanceEnCours(day, session);
    });
    workout.append(card);
  });

  workout.querySelectorAll(".exercise-card").forEach(updateVolume);
  updateSessionProgress();
  workout.insertAdjacentHTML("beforeend", `
    <section class="session-feedback" aria-label="Bilan de la séance">
      <h3>Bilan de la séance</h3>
      <p class="muted">Ces informations aideront à remettre une séance moins bonne dans son contexte.</p>
      <span>Ressenti global</span>
      <div class="feeling-buttons">
        <button type="button" data-feeling="tres_facile" aria-pressed="false">🟢 Trop facile</button>
        <button type="button" data-feeling="facile" aria-pressed="false">🟢 Facile</button>
        <button type="button" data-feeling="bien" aria-pressed="false">🔵 Bien maîtrisé</button>
        <button type="button" data-feeling="pile" aria-pressed="false">🟡 Tout pile</button>
        <button type="button" data-feeling="difficile" aria-pressed="false">🟠 Difficile</button>
        <button type="button" data-feeling="galere" aria-pressed="false">🔴 Galère</button>
      </div>
      <div class="session-scores">
        <label>Énergie
          <select class="session-energy"><option value="">Non renseignée</option><option value="1">1 / 5</option><option value="2">2 / 5</option><option value="3">3 / 5</option><option value="4">4 / 5</option><option value="5">5 / 5</option></select>
        </label>
        <label>Sommeil
          <select class="session-sleep"><option value="">Non renseigné</option><option value="1">1 / 5</option><option value="2">2 / 5</option><option value="3">3 / 5</option><option value="4">4 / 5</option><option value="5">5 / 5</option></select>
        </label>
      </div>
      <input class="session-comment" type="text" maxlength="200" placeholder="Note facultative : fatigue, stress, douleur, forme…" />
    </section>
  `);
  const bilan = workout.querySelector(".session-feedback");
  bilan.querySelector(".session-energy").value = seanceEnCours?.energie || "";
  bilan.querySelector(".session-sleep").value = seanceEnCours?.sommeil || "";
  configurerRessenti(
    bilan,
    seanceEnCours?.ressentiSeance,
    seanceEnCours?.commentaireSeance,
    () => sauvegarderSeanceEnCours(day, session),
    ".session-comment",
  );
  bilan.querySelectorAll("select").forEach((select) => select.addEventListener("change", () => sauvegarderSeanceEnCours(day, session)));
  workout.insertAdjacentHTML("beforeend", "<button id='finish-button' class='finish-button'>Terminer la séance</button>");
  workout.querySelector("#finish-button").addEventListener("click", () => {
    const progress = updateSessionProgress();
    const exercicesNonTermines = [...workout.querySelectorAll(".exercise-card")]
      .filter((card) => !card.classList.contains("completed") && !card.classList.contains("skipped"))
      .map((card) => card.querySelector(".exercise-name").textContent);
    const rappel = exercicesNonTermines.length
      ? `\n\nPas encore terminés :\n• ${exercicesNonTermines.join("\n• ")}`
      : "";
    if (!confirm(`Enregistrer cette séance ? ${progress.completed} / ${progress.total} exercices sont marqués comme terminés.${rappel}`)) return;
    const volume = updateTotalVolume();
    const exercices = [...workout.querySelectorAll(".exercise-card")].map((card) => {
      const donnees = lireExercice(card);
      return {
        nom: card.querySelector(".exercise-name").textContent,
        programmeNom: card.dataset.programmeName,
        ...donnees,
        passe: card.classList.contains("skipped"),
        ressenti: card.querySelector(".feeling-area").dataset.ressenti || null,
        commentaire: card.querySelector(".exercise-comment").value.trim(),
      };
    });
    const historique = getHistorique();
    const dureeSecondes = Math.max(
      0,
      workout.dataset.commenceeLe
        ? Math.round((Date.now() - new Date(workout.dataset.commenceeLe).getTime()) / 1000)
        : 0,
    );
    const seanceTerminee = {
      id: Date.now(),
      date: new Date().toISOString(),
      programmeId: programmeActif?.id || null,
      programme: programmeActif?.nom || null,
      semaineLegere,
      jour: day,
      nom: session.title,
      volume,
      dureeSecondes,
      exercices,
      ressentiSeance: bilan.dataset.ressenti || null,
      energie: Number(bilan.querySelector(".session-energy").value) || null,
      sommeil: Number(bilan.querySelector(".session-sleep").value) || null,
      commentaireSeance: bilan.querySelector(".session-comment").value.trim(),
    };
    historique.push(seanceTerminee);
    localStorage.setItem("historique", JSON.stringify(historique));
    localStorage.removeItem(DRAFT_KEY);
    draftPanel.classList.add("hidden");
    const finishButton = workout.querySelector("#finish-button");
    finishButton.disabled = true;
    finishButton.textContent = "Séance enregistrée ✓";
    alert(`Séance enregistrée !\n${seanceTerminee.nom}\nVolume total : ${formatKg(volume)} kg\nDurée : ${formatDuree(dureeSecondes)}\nSéances sauvegardées : ${historique.length}${comparaisonSeancePrecedente(derniereSeance, volume, dureeSecondes)}${rappelSauvegarde(historique)}`);
  });
}

days.forEach((day) => {
  const button = document.createElement("button");
  button.textContent = day;
  button.addEventListener("click", () => renderDay(day));
  selector.append(button);
});

chargerProgramme();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
}
