const CUSTOM_EXERCISES_KEY = "exercices_personnalises_v1";
const TRAINING_PROFILES = {
  hypertrophie: {
    label: "Hypertrophie",
    polyarticulaire: { series: 3, reps: "6–12", repos: 150, rir: "1–3" },
    isolation: { series: 2, reps: "10–20", repos: 90, rir: "1–3" },
  },
  force: {
    label: "Force",
    polyarticulaire: { series: 3, reps: "3–6", repos: 210, rir: "2–3" },
    isolation: { series: 2, reps: "8–12", repos: 120, rir: "1–3" },
  },
  endurance: {
    label: "Endurance musculaire",
    polyarticulaire: { series: 2, reps: "15–25", repos: 90, rir: "2–3" },
    isolation: { series: 2, reps: "15–25", repos: 60, rir: "2–3" },
  },
  personnalise: {
    label: "Personnalisé",
    polyarticulaire: { series: 3, reps: "8–12", repos: 120, rir: "2" },
    isolation: { series: 2, reps: "10–15", repos: 90, rir: "2" },
  },
};

function exercicesPersonnalises() {
  try {
    const valeurs = JSON.parse(localStorage.getItem(CUSTOM_EXERCISES_KEY) || "[]");
    return Array.isArray(valeurs) ? valeurs.filter(exercicePersonnaliseValide) : [];
  } catch { return []; }
}

function exercicePersonnaliseValide(exercice) {
  return exercice && typeof exercice.id === "string" && typeof exercice.nom === "string"
    && exercice.nom.trim().length > 0 && exercice.nom.length <= 80
    && typeof exercice.groupe_principal === "string" && exercice.groupe_principal.length <= 40
    && Array.isArray(exercice.groupes_secondaires) && exercice.groupes_secondaires.every((groupe) => typeof groupe === "string")
    && ["Polyarticulaire", "Isolation"].includes(exercice.categorie_mouvement?.type)
    && ["Poussée", "Tirage", "Jambes", "Tronc"].includes(exercice.categorie_mouvement?.famille)
    && typeof exercice.equipement === "string" && exercice.equipement.length <= 40;
}

function catalogueComplet() {
  return [...EXERCISE_CATALOG, ...exercicesPersonnalises()];
}

function exerciceDuCatalogue(nom) {
  const cle = String(nom || "").trim().toLocaleLowerCase("fr-FR");
  return catalogueComplet().find((exercice) => exercice.nom.toLocaleLowerCase("fr-FR") === cle);
}

function reglagesSuggere(exercice, profil) {
  const style = TRAINING_PROFILES[profil] || TRAINING_PROFILES.hypertrophie;
  const type = exercice.categorie_mouvement.type === "Polyarticulaire" ? "polyarticulaire" : "isolation";
  return style[type];
}

function seriesDirectesParGroupe(seances, jourEdite, exerciceEdite = null) {
  const volumes = {};
  Object.entries(seances).forEach(([jour, seance]) => {
    (jour === jourEdite && exerciceEdite !== null ? exerciceEdite : seance.exercises || []).forEach((exercice) => {
      const reference = exerciceDuCatalogue(exercice[0]);
      if (!reference) return;
      const series = Number(String(exercice[1]).split(" ")[0]);
      if (!Number.isFinite(series) || series <= 0) return;
      volumes[reference.groupe_principal] ||= { semaine: 0, seance: 0 };
      volumes[reference.groupe_principal].semaine += series;
      if (jour === jourEdite) volumes[reference.groupe_principal].seance += series;
    });
  });
  return volumes;
}
