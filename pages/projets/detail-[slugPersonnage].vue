<script setup>
import { ref, onMounted, computed } from 'vue';
import { useConfirm } from '~/composables/useConfirm';
import { useToast } from '~/composables/useToast';
import { useRoute, useRouter } from 'vue-router';
import { usePersonnageStore } from '~/store/personnage';
import { useProjectStore } from '~/store/project';
import { useAuthStore } from '~/store/auth';
import { useMetadataStore } from '~/store/metadata';
import RichTextEditor from '~/components/RichTextEditor.vue';
import ImageUploader from '~/components/Project/ImageUploader.vue';
import ProjectSubMenu from '~/components/Project/SubMenu.vue';
import Lightbox from '~/components/Lightbox.vue';
import SequenceRefText from '~/components/Project/SequenceRefText.vue';
import MissingList from '~/components/Project/MissingList.vue';
import PersonnageCoverage from '~/components/Project/PersonnageCoverage.vue';
import { useImages } from '~/composables/useImages';
import { usePersonnageChecks } from '~/composables/usePersonnageChecks';
import { useActivityStore } from '~/store/activity';
import { useTodoStore } from '~/store/todo';

definePageMeta({
  middleware: 'auth'
});

const route = useRoute();
const router = useRouter();
const personnageStore = usePersonnageStore();
const { confirm } = useConfirm();
const toast = useToast();
const projectStore = useProjectStore();
const authStore = useAuthStore();
const metadataStore = useMetadataStore();
const activityStore = useActivityStore();
const todoStore = useTodoStore();

// Le slug est régénéré côté serveur à chaque sauvegarde, à partir du nom :
// le figer au montage rendait l'URL caduque dès le premier renommage.
const personnageSlug = ref(route.params.slugPersonnage);
const personnage = ref(null);
const project = ref(null);
const isEditing = ref(false);
// Ce que l'auteur déclare d'un côté, ce que le texte montre de l'autre
const activeTab = ref('auteur');
const editedPersonnage = ref({});
const lightboxImages = ref([]);
const lightboxIndex = ref(0);
const showLightbox = ref(false);
const loading = ref(true);
const error = ref(null);

// Gestion des arcs narratifs
const showNarrativeArcModal = ref(false);
const editingNarrativeArc = ref(null);
const projectSequences = ref([]);

// Composable pour gérer les images
const { getImageUrl, getImagesUrls } = useImages();

// Fonction pour ouvrir la lightbox
const openLightbox = (imageIndex) => {
  lightboxImages.value = getImagesUrls(personnage.value?.images);
  lightboxIndex.value = imageIndex;
  showLightbox.value = true;
};

// Fonction pour fermer la lightbox
const closeLightbox = () => {
  showLightbox.value = false;
};

// Fonction pour changer l'index de la lightbox
const updateLightboxIndex = (newIndex) => {
  lightboxIndex.value = newIndex;
};

// Fonction pour charger les détails du personnage depuis l'API
const loadPersonnageDetails = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    const config = useRuntimeConfig();
    
    // Debug pour voir le slug
    const response = await $fetch(`${config.public.apiBase}/personnage/${personnageSlug.value}/details`, {
      headers: { 'X-AUTH-TOKEN': authStore.token || '' },
    });
    
    personnage.value = response;
    project.value = response.project;
    editedPersonnage.value = { ...response };
    
  } catch (err) {
    error.value = err;
    console.error('Erreur lors du chargement du personnage:', err);

    // Retour à la liste des personnages du projet, le parent naturel de
    // cette fiche. On ne connaît le projet que si le store l'a déjà chargé —
    // sinon la liste des projets, faute de mieux.
    const projectSlug = project.value?.slug ?? projectStore.project?.slug;
    toast.error('Ce personnage est introuvable.');
    router.push(projectSlug ? `/projets/personnages-${projectSlug}` : '/projets/tous');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await Promise.all([
    loadPersonnageDetails(),
    metadataStore.fetchMetadata(),
  ]);

  // Charger les séquences du projet
  if (project.value?.slug) {
    await loadProjectSequences();
  }
});

// Charger les séquences du projet
const loadProjectSequences = async () => {
  try {
    await projectStore.fetchProject(project.value.slug);
    // Extraire toutes les séquences de toutes les parties
    const sequences = [];
    projectStore.parts.forEach(part => {
      if (part.sequences && part.sequences.length > 0) {
        part.sequences.forEach(sequence => {
          sequences.push({
            id: sequence.id,
            name: sequence.name,
            partName: part.name
          });
        });
      }
    });
    projectSequences.value = sequences;
  } catch (error) {
    console.error('Erreur lors du chargement des séquences:', error);
  }
};

const toggleEdit = () => {
  isEditing.value = !isEditing.value;
  if (isEditing.value) {
    editedPersonnage.value = {
      ...personnage.value,
      dramaticFunctionIds: personnage.value?.personnageDramaticFunctions
        ?.map(pdf => pdf.dramaticFunction.id) ?? []
    };
  }
};

const handleSave = async () => {
  try {
    const saved = await personnageStore.savePersonnage(editedPersonnage.value, project.value.id);

    if (!saved) {
      toast.error("L'enregistrement a échoué.");
      return;
    }

    // Renommer un personnage change son slug : sans mettre l'URL à jour, le
    // rechargement interrogeait l'ancienne adresse, échouait, et renvoyait
    // l'utilisateur à la liste des projets.
    if (saved.slug && saved.slug !== personnageSlug.value) {
      personnageSlug.value = saved.slug;
      await router.replace(`/projets/detail-${saved.slug}`);
    }

    isEditing.value = false;
    await loadPersonnageDetails();
    toast.success('Personnage enregistré');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    toast.error("L'enregistrement a échoué.");
  }
};

const handleImagesUpdated = (images) => {
  const newAvatar = images.length > 0 ? images[0] : null;
  // Réassigner les objets entiers pour garantir la réactivité Vue
  editedPersonnage.value = { ...editedPersonnage.value, images, avatar: newAvatar };
  if (personnage.value) {
    personnage.value = { ...personnage.value, images, avatar: newAvatar };
  }
};

// Schéma actantiel proposé par le modèle : le personnage est toujours le Sujet
const generatingSchema = ref(false);

const createActantielSchema = async () => {
  if (generatingSchema.value) return;
  generatingSchema.value = true;

  try {
    const config = useRuntimeConfig();
    const response = await activityStore.track(`Schéma actantiel de ${personnage.value.firstName}…`, () =>
      $fetch(`${config.public.apiBase}/personnage/${personnage.value.id}/analyse/actantiel-schema`, {
        method: 'POST',
        headers: { 'X-AUTH-TOKEN': authStore.token || '' },
      })
    );

    personnage.value = { ...personnage.value, actantialSchema: response.schema };
    toast.success('Schéma actantiel généré.');
  } catch (err) {
    // 422 : le personnage n'a rien d'analysable, le message l'explique
    toast.error(err?.data?.message || 'Le schéma actantiel n\'a pas pu être généré.');
  } finally {
    generatingSchema.value = false;
  }
};

// Vérification : tout ce qu'elle produit est de l'analyse et s'enregistre
// tel quel. Ce qui toucherait la fiche (ajouter un arc, une fonction,
// déplacer une étape) attend un clic de l'auteur dans l'onglet.
const verifying = ref(false);

const { boundsOf, arcChecks, globalChecks, todoDrafts } = usePersonnageChecks(personnage);

const runVerification = async () => {
  if (verifying.value || !personnage.value) return;
  verifying.value = true;
  activeTab.value = 'analyse';

  try {
    const config = useRuntimeConfig();
    await activityStore.track(`Analyse de ${personnage.value.firstName}…`, () =>
      $fetch(`${config.public.apiBase}/personnage/${personnage.value.id}/analyse/verification`, {
        method: 'POST',
        headers: { 'X-AUTH-TOKEN': authStore.token || '' },
      })
    );

    await loadPersonnageDetails();
    toast.success('Analyse enregistrée.');

    const added = await todoStore.addFromAnalysis(project.value.id, todoDrafts());
    if (added) toast.success(added > 1 ? `${added} tâches ajoutées à la todo.` : '1 tâche ajoutée à la todo.');
  } catch (err) {
    // 422 : rien d'écrit à vérifier, le message l'explique
    toast.error(err?.data?.message || 'L\'analyse n\'a pas pu aboutir.');
  } finally {
    verifying.value = false;
  }
};

const wasAutoPlaced = (pnaId, index) =>
  personnage.value?.verification?.autoPlaced?.some(p => p.personnageNarrativeArcId === pnaId && p.index === index);

const functionStillAssigned = (pdfId) => personnage.value?.personnageDramaticFunctions?.some(p => p.id === pdfId);

/** Bornes actuelles de la fonction, recalculées par chaque analyse */
const functionBounds = (pdfId) => {
  const pdf = personnage.value?.personnageDramaticFunctions?.find(p => p.id === pdfId);
  if (!pdf?.fromSequence) return null;
  return pdf.fromSequence.id === pdf.toSequence?.id || !pdf.toSequence
    ? pdf.fromSequence.name
    : `${pdf.fromSequence.name} → ${pdf.toSequence.name}`;
};

// ── Actions sur la fiche depuis l'analyse : toujours un clic de l'auteur ──
const applyingId = ref(null);

const narrativeArcRequest = async (path, body) => {
  const config = useRuntimeConfig();
  await $fetch(`${config.public.apiBase}/personnage/${personnage.value.id}/narrative-arc/${path}`, {
    method: 'POST',
    headers: { 'X-AUTH-TOKEN': authStore.token || '', 'Content-Type': 'application/json' },
    body
  });
};

/** Déplace l'étape là où le texte la joue */
const alignStep = async (pnaId, step) => {
  const pna = personnage.value?.personnageNarrativeArcs?.find(p => p.id === pnaId);
  const bounds = boundsOf(step.sequenceIds ?? []);
  if (!pna || !bounds) return;

  applyingId.value = `align-${pnaId}-${step.index}`;
  try {
    const source = pna.steps?.length ? pna.steps : (pna.narrativeArc?.steps ?? []).map(s => ({ step: s, fromSequenceId: null, toSequenceId: null }));
    const steps = source.map((s, i) => i === step.index ? { ...s, ...bounds } : s);
    await narrativeArcRequest(`${pnaId}/update`, {
      narrativeArcId: pna.narrativeArc.id,
      steps,
      fromSequenceId: pna.fromSequence?.id ?? null,
      toSequenceId: pna.toSequence?.id ?? null,
      weight: pna.weight,
      comment: pna.comment
    });
    await loadPersonnageDetails();
    toast.success('Étape placée là où le texte la joue.');
  } catch (err) {
    toast.error('Le déplacement de l\'étape a échoué.');
  } finally {
    applyingId.value = null;
  }
};

/** Ajoute à la fiche un arc détecté, ses étapes placées là où le texte les joue */
const addDetectedArc = async (arc) => {
  applyingId.value = `arc-${arc.narrativeArc.id}`;
  try {
    await narrativeArcRequest('add', {
      narrativeArcId: arc.narrativeArc.id,
      weight: arc.weight,
      comment: arc.comment,
      steps: arc.steps.map(s => ({ step: s.step, ...(boundsOf(s.sequenceIds) ?? { fromSequenceId: null, toSequenceId: null }) }))
    });
    await loadPersonnageDetails();
    toast.success(`Arc « ${arc.narrativeArc.name} » ajouté à la fiche.`);
  } catch (err) {
    toast.error('L\'ajout de l\'arc a échoué.');
  } finally {
    applyingId.value = null;
  }
};

/** Ajoute à la fiche une fonction détectée ; la prochaine analyse la vérifiera */
const addDetectedFunction = async (detected) => {
  applyingId.value = `function-${detected.dramaticFunction.id}`;
  try {
    const saved = await personnageStore.savePersonnage({
      id: personnage.value.id,
      firstName: personnage.value.firstName,
      lastName: personnage.value.lastName,
      dramaticFunctionIds: [
        ...(personnage.value.personnageDramaticFunctions ?? []).map(pdf => pdf.dramaticFunction.id),
        detected.dramaticFunction.id
      ]
    }, project.value.id);
    if (!saved) throw new Error();
    await loadPersonnageDetails();
    toast.success(`Fonction « ${detected.dramaticFunction.name} » ajoutée à la fiche.`);
  } catch (err) {
    toast.error('L\'ajout de la fonction a échoué.');
  } finally {
    applyingId.value = null;
  }
};

const isAssignedArc = (arcId) => personnage.value?.personnageNarrativeArcs?.some(p => p.narrativeArc.id === arcId);
const isAssignedFunction = (functionId) => personnage.value?.personnageDramaticFunctions?.some(p => p.dramaticFunction.id === functionId);

// Les six actants dans l'ordre du référentiel, même ceux que le modèle a laissés vides
const actantialRoles = computed(() => {
  const roles = personnage.value?.actantialSchema?.roles;
  if (!roles) return [];
  return metadataStore.actantialSchema.map(actant => ({
    ...actant,
    concerned: roles[actant.role]?.concerned || [],
    comment: roles[actant.role]?.comment || null,
  }));
});

// Le slug change au renommage : on le résout à l'affichage plutôt que de le stocker
const personnageSlugById = (id) => projectStore.personnages.find(p => p.id === id)?.slug;

// ── Analyse des arcs (onglet analyse) ──
const ARC_STATUS = {
  joue: { label: 'Jouée', classes: 'bg-green-100 text-green-800' },
  esquisse: { label: 'Esquissée', classes: 'bg-amber-100 text-amber-800' },
  absent: { label: 'Absente', classes: 'bg-red-100 text-red-700' },
};

const sequenceNameById = (id) => projectSequences.value.find(s => s.id === id)?.name ?? `#${id}`;
const sequenceRank = (id) => projectSequences.value.findIndex(s => s.id === id);

const arcStillAssigned = (pnaId) => personnage.value?.personnageNarrativeArcs?.some(p => p.id === pnaId);

/**
 * Place que l'auteur a donnée à l'étape, quand elle ne recouvre aucune des
 * séquences où le texte la joue. Calculé sur la fiche actuelle : un écart
 * corrigé depuis l'analyse disparaît de lui-même.
 */
const placementGap = (pnaId, step) => {
  if (!step.sequenceIds?.length) return null;
  const placed = personnage.value?.personnageNarrativeArcs?.find(p => p.id === pnaId)?.steps?.[step.index];
  const from = placed?.fromSequenceId ?? placed?.toSequenceId;
  const to = placed?.toSequenceId ?? placed?.fromSequenceId;
  if (!from) return null;

  const low = Math.min(sequenceRank(from), sequenceRank(to));
  const high = Math.max(sequenceRank(from), sequenceRank(to));
  const overlaps = step.sequenceIds.some(id => {
    const rank = sequenceRank(id);
    return rank >= low && rank <= high;
  });
  if (overlaps) return null;

  return from === to ? sequenceNameById(from) : `${sequenceNameById(from)} → ${sequenceNameById(to)}`;
};

const SEQUENCE_ROLES = {
  central: { label: 'Porte la séquence', classes: 'bg-indigo-100 text-indigo-800' },
  secondaire: { label: 'Y agit', classes: 'bg-gray-100 text-gray-700' },
  evoque: { label: 'Seulement évoqué', classes: 'bg-gray-50 text-gray-500 italic' },
};

/**
 * Détail séquence par séquence : le rôle et le résumé viennent de l'analyse,
 * les étapes d'arc et les fonctions jouées se déduisent de ses verdicts.
 */
const sequenceDetails = computed(() => {
  const verification = personnage.value?.verification;
  if (!verification?.sequences?.length) return [];

  return verification.sequences.map((entry) => {
    const id = entry.sequenceId;
    const steps = [
      ...(verification.arcs?.verdicts ?? []).flatMap(arc => (arc.steps ?? [])
        .filter(step => step.status !== 'absent' && step.sequenceIds?.includes(id))
        .map(step => ({ arcName: arc.arcName, index: step.index, step: step.step, status: step.status, detected: false }))),
      ...(verification.arcs?.detected ?? []).flatMap(arc => (arc.steps ?? [])
        .filter(step => step.sequenceIds?.includes(id))
        .map(step => ({ arcName: arc.narrativeArc.name, index: step.index, step: step.step, status: 'joue', detected: true }))),
    ];
    const functions = [
      ...(verification.functions?.verdicts ?? [])
        .filter(fn => fn.status !== 'absent' && fn.sequenceIds?.includes(id))
        .map(fn => ({ name: fn.functionName, status: fn.status, detected: false })),
      ...(verification.functions?.detected ?? [])
        .filter(fn => fn.sequenceIds?.includes(id))
        .map(fn => ({ name: fn.dramaticFunction.name, status: 'joue', detected: true })),
    ];
    return { ...entry, steps, functions };
  });
});

// ── Ce que dit l'analyse, en regard de la fiche (onglet auteur, lecture seule) ──
const arcVerdictFor = (pnaId) =>
  personnage.value?.verification?.arcs?.verdicts?.find(v => v.personnageNarrativeArcId === pnaId) ?? null;

const stepVerdictFor = (pnaId, index) =>
  arcVerdictFor(pnaId)?.steps?.find(s => s.index === index) ?? null;

const functionVerdictFor = (pdfId) =>
  personnage.value?.verification?.functions?.verdicts?.find(v => v.personnageDramaticFunctionId === pdfId) ?? null;

// Ce que l'analyse a détecté et qui n'est toujours pas sur la fiche
const detectedArcsOffSheet = computed(() =>
  (personnage.value?.verification?.arcs?.detected ?? []).filter(arc => !isAssignedArc(arc.narrativeArc.id))
);
const detectedFunctionsOffSheet = computed(() =>
  (personnage.value?.verification?.functions?.detected ?? []).filter(f => !isAssignedFunction(f.dramaticFunction.id))
);

const tendencyClasses = {
  positive: 'bg-green-50 border-green-200',
  negative: 'bg-red-50 border-red-200',
  ambiguous: 'bg-gray-50 border-gray-200',
};

const getLevelLabel = (level) => {
  const levels = {
    1: 'Personnage principal',
    2: 'Personnage secondaire', 
    3: 'Figurant',
    4: 'Mention/Référence'
  };
  return levels[level] || 'Non défini';
};

const getLevelColor = (level) => {
  const colors = {
    1: 'text-red-600 bg-red-100',
    2: 'text-orange-600 bg-orange-100',
    3: 'text-yellow-600 bg-yellow-100',
    4: 'text-gray-600 bg-gray-100'
  };
  return colors[level] || 'text-gray-600 bg-gray-100';
};

// Fonction pour obtenir l'avatar du personnage
const getPersonnageAvatar = (personnage) => {
  if (!personnage) return null;
  
  // Si l'API retourne déjà un avatar
  if (personnage.avatar) {
    return getImageUrl(personnage.avatar);
  }
  
  // Sinon on prend la première image
  const images = getImagesUrls(personnage.images);
  return images[0] || null;
};

// Fonction pour obtenir toutes les images du personnage
const getPersonnageImages = (personnage) => {
  return getImagesUrls(personnage?.images);
};

// Gestion des arcs narratifs
const openNarrativeArcModal = (arc = null) => {
  if (arc) {
    editingNarrativeArc.value = {
      id: arc.id,
      narrativeArcId: arc.narrativeArc.id,
      steps: arc.steps || [],
      fromSequenceId: arc.fromSequence?.id || null,
      toSequenceId: arc.toSequence?.id || null,
      weight: arc.weight || 50,
      comment: arc.comment || ''
    };
  } else {
    editingNarrativeArc.value = {
      narrativeArcId: null,
      steps: [],
      fromSequenceId: null,
      toSequenceId: null,
      weight: 50,
      comment: ''
    };
  }
  showNarrativeArcModal.value = true;
};

const closeNarrativeArcModal = () => {
  showNarrativeArcModal.value = false;
  editingNarrativeArc.value = null;
};

const saveNarrativeArc = async () => {
  try {
    const config = useRuntimeConfig();

    const payload = {
      personnageId: personnage.value.id,
      narrativeArcId: editingNarrativeArc.value.narrativeArcId,
      steps: editingNarrativeArc.value.steps,
      fromSequenceId: editingNarrativeArc.value.fromSequenceId,
      toSequenceId: editingNarrativeArc.value.toSequenceId,
      weight: editingNarrativeArc.value.weight,
      comment: editingNarrativeArc.value.comment
    };

    const url = editingNarrativeArc.value.id
      ? `${config.public.apiBase}/personnage/${personnage.value.id}/narrative-arc/${editingNarrativeArc.value.id}/update`
      : `${config.public.apiBase}/personnage/${personnage.value.id}/narrative-arc/add`;

    await $fetch(url, {
      method: 'POST',
      headers: {
        'X-AUTH-TOKEN': authStore.token || '',
        'Content-Type': 'application/json'
      },
      body: payload
    });

    await loadPersonnageDetails();
    closeNarrativeArcModal();
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'arc narratif:', error);
  }
};

const deleteNarrativeArc = async (arcId) => {
  const ok = await confirm({ title: 'Supprimer cet arc narratif ?', danger: true, confirmLabel: 'Supprimer' });
  if (!ok) return;

  try {
    const config = useRuntimeConfig();

    await $fetch(`${config.public.apiBase}/personnage/${personnage.value.id}/narrative-arc/${arcId}/delete`, {
      method: 'DELETE',
      headers: {
        'X-AUTH-TOKEN': authStore.token || ''
      }
    });

    await loadPersonnageDetails();
    toast.success('Arc retiré de la fiche.');
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'arc narratif:', error);
    toast.error('L\'arc n\'a pas pu être supprimé.');
  }
};

// Une fonction à la fois : la sauvegarde de la fiche recréerait les autres
const deleteDramaticFunction = async (pdfId) => {
  const ok = await confirm({ title: 'Retirer cette fonction dramatique ?', danger: true, confirmLabel: 'Retirer' });
  if (!ok) return;

  try {
    const config = useRuntimeConfig();
    await $fetch(`${config.public.apiBase}/personnage/${personnage.value.id}/dramatic-function/${pdfId}/delete`, {
      method: 'DELETE',
      headers: { 'X-AUTH-TOKEN': authStore.token || '' }
    });
    await loadPersonnageDetails();
    toast.success('Fonction retirée de la fiche.');
  } catch (error) {
    console.error('Erreur lors de la suppression de la fonction dramatique:', error);
    toast.error('La fonction n\'a pas pu être retirée.');
  }
};

// Computed pour obtenir les steps de l'arc sélectionné
const selectedArcSteps = computed(() => {
  if (!editingNarrativeArc.value?.narrativeArcId) return [];

  const arc = metadataStore.narrativeArcs.find(a => a.id === editingNarrativeArc.value.narrativeArcId);
  return arc?.steps || [];
});

// Initialiser les steps avec les étapes de l'arc
const initializeStepsFromArc = () => {
  if (!editingNarrativeArc.value?.narrativeArcId) return;

  const arc = metadataStore.narrativeArcs.find(a => a.id === editingNarrativeArc.value.narrativeArcId);
  if (!arc || !arc.steps) return;

  // Si aucun step n'est défini, créer un tableau vide pour chaque étape
  if (!editingNarrativeArc.value.steps || editingNarrativeArc.value.steps.length === 0) {
    editingNarrativeArc.value.steps = arc.steps.map(step => ({
      step: step,
      fromSequenceId: null,
      toSequenceId: null
    }));
  }
};

// Ajouter/modifier un step
const updateStep = (index, field, value) => {
  // S'assurer que le tableau steps existe
  if (!editingNarrativeArc.value.steps) {
    editingNarrativeArc.value.steps = [];
  }

  // Créer l'objet step s'il n'existe pas
  if (!editingNarrativeArc.value.steps[index]) {
    editingNarrativeArc.value.steps[index] = {
      step: selectedArcSteps.value[index],
      fromSequenceId: null,
      toSequenceId: null
    };
  }

  // Mettre à jour le champ
  editingNarrativeArc.value.steps[index][field] = value;
};
</script>

<template>
  <div>
    <ProjectSubMenu v-if="project" :project-slug="project.slug" />
    
    <!-- Loading state -->
    <div v-if="loading" class="min-h-screen bg-gray-50 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
        <p class="text-gray-600">Chargement du personnage...</p>
      </div>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="min-h-screen bg-gray-50 flex items-center justify-center">
      <div class="text-center">
        <div class="text-red-500 text-4xl mb-4">⚠️</div>
        <h2 class="text-xl font-bold text-gray-800 mb-2">Erreur de chargement</h2>
        <p class="text-gray-600 mb-4">Impossible de charger les détails du personnage</p>
        <button 
          @click="loadPersonnageDetails" 
          class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
    
    <!-- Main content -->
    <div v-else class="bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div class="max-w-7xl mx-auto">
      
      <!-- Header avec navigation -->
      <div class="mb-8">
        <nav class="flex items-center space-x-2 text-sm text-gray-600 mb-4">
          <NuxtLink :to="`/projets/projet-${project?.slug}`" class="hover:text-amber-600 transition-colors">
            {{ project?.title }}
          </NuxtLink>
          <span>→</span>
          <NuxtLink :to="`/projets/personnages-${project?.slug}`" class="hover:text-amber-600 transition-colors">
            Personnages
          </NuxtLink>
          <span>→</span>
          <span class="text-amber-800 font-medium">{{ personnage?.firstName }} {{ personnage?.lastName }}</span>
        </nav>
        
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <!-- Avatar style photo d'identité -->
            <div class="w-32 h-40 rounded-lg overflow-hidden bg-gray-200 border-4 border-white shadow-xl">
              <img 
                v-if="getPersonnageAvatar(personnage)" 
                :src="getPersonnageAvatar(personnage)" 
                :alt="`${personnage.firstName} ${personnage.lastName ?? ''}`.trim()"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-400 text-4xl font-bold">
                {{ personnage?.firstName?.[0] }}{{ personnage?.lastName?.[0] }}
              </div>
            </div>
            
            <div>
              <!-- Nom — lecture -->
              <h1 v-if="!isEditing" class="text-3xl font-bold text-amber-900">
                {{ personnage?.firstName }} {{ personnage?.lastName }}
              </h1>
              <!-- Nom — édition -->
              <div v-else class="flex gap-2 mb-2">
                <input
                  v-model="editedPersonnage.firstName"
                  placeholder="Prénom"
                  class="text-xl font-bold text-amber-900 border-b-2 border-amber-300 bg-transparent focus:outline-none focus:border-amber-500 w-32"
                />
                <input
                  v-model="editedPersonnage.lastName"
                  placeholder="Nom"
                  class="text-xl font-bold text-amber-900 border-b-2 border-amber-300 bg-transparent focus:outline-none focus:border-amber-500 w-32"
                />
              </div>

              <div class="flex items-center space-x-3 mt-2">
                <!-- Âge — lecture -->
                <span v-if="!isEditing && personnage?.age" class="text-gray-600">{{ personnage.age }} ans</span>
                <!-- Âge — édition -->
                <div v-if="isEditing" class="flex items-center gap-1">
                  <input
                    v-model.number="editedPersonnage.age"
                    type="number"
                    min="0"
                    max="999"
                    placeholder="Âge"
                    class="w-16 text-sm text-gray-600 border-b border-gray-300 bg-transparent focus:outline-none focus:border-amber-400 text-center"
                  />
                  <span class="text-sm text-gray-500">ans</span>
                </div>

                <!-- Niveau — lecture -->
                <span
                  v-if="!isEditing && personnage?.level"
                  :class="`px-3 py-1 rounded-full text-xs font-medium ${getLevelColor(personnage.level)}`"
                >
                  {{ getLevelLabel(personnage.level) }}
                </span>

                <!-- Niveau — édition -->
                <select
                  v-else-if="isEditing"
                  v-model.number="editedPersonnage.level"
                  class="px-3 py-1 rounded-lg text-xs font-medium border border-amber-300 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  <option :value="1">Protagoniste</option>
                  <option :value="2">Secondaire</option>
                  <option :value="3">Tertiaire</option>
                  <option :value="4">Figurant</option>
                </select>
              </div>

              <!-- Fonctions dramatiques — lecture -->
              <div
                v-if="!isEditing && personnage?.personnageDramaticFunctions && personnage.personnageDramaticFunctions.length > 0"
                class="flex flex-wrap gap-2 mt-3"
              >
                <span
                  v-for="pdf in personnage.personnageDramaticFunctions"
                  :key="pdf.dramaticFunction.id"
                  data-controller="tooltip" :title="`${pdf.dramaticFunction.description || ''}\n\nCaractéristiques:\n${Array.isArray(pdf.dramaticFunction.characteristics) ? pdf.dramaticFunction.characteristics.join('\n• ') : pdf.dramaticFunction.characteristics || ''}\n\nTendance: ${pdf.dramaticFunction.tendency || 'N/A'}`"
                  class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-full bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-all cursor-help"
                >
                  <span class="text-base">🎭</span>
                  {{ pdf.dramaticFunction.name }}
                  <!-- Verdict de l'analyse : tenue, esquissée ou absente dans le texte -->
                  <span
                    v-if="functionVerdictFor(pdf.id)"
                    class="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    :class="ARC_STATUS[functionVerdictFor(pdf.id).status]?.classes"
                    data-controller="tooltip"
                    :title="`Selon le texte : ${functionVerdictFor(pdf.id).comment || ARC_STATUS[functionVerdictFor(pdf.id).status]?.label}`"
                  >🤖 {{ ARC_STATUS[functionVerdictFor(pdf.id).status]?.label }}</span>
                  <button
                    type="button"
                    @click.stop="deleteDramaticFunction(pdf.id)"
                    class="ml-1 rounded-full px-1 leading-none text-purple-200 hover:bg-purple-800 hover:text-white"
                    data-controller="tooltip"
                    title="Retirer cette fonction"
                    aria-label="Retirer cette fonction"
                  >×</button>
                </span>
              </div>

              <!-- Fonctions tenues dans le texte, absentes de la fiche : signalées, ajout dans l'onglet analyse -->
              <div v-if="!isEditing && detectedFunctionsOffSheet.length" class="flex flex-wrap items-center gap-2 mt-2">
                <span class="text-xs text-sky-700">🤖 Le texte lui prête aussi :</span>
                <button
                  v-for="detected in detectedFunctionsOffSheet"
                  :key="detected.dramaticFunction.id"
                  type="button"
                  @click="activeTab = 'analyse'"
                  data-controller="tooltip"
                  :title="`${detected.comment || ''}\n\nCorrespondance ${detected.weight} % — voir l'analyse pour l'ajouter`"
                  class="inline-flex items-center gap-1 rounded-full border border-dashed border-sky-400 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 hover:bg-sky-100"
                >
                  🎭 {{ detected.dramaticFunction.name }}
                </button>
              </div>

              <!-- Fonctions dramatiques — édition -->
              <div v-if="isEditing && metadataStore.dramaticFunctions?.length" class="mt-3">
                <p class="text-xs text-gray-500 mb-2">Fonctions dramatiques</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="df in metadataStore.dramaticFunctions"
                    :key="df.id"
                    type="button"
                    data-controller="tooltip" :title="df.description"
                    @click="editedPersonnage.dramaticFunctionIds?.includes(df.id)
                      ? editedPersonnage.dramaticFunctionIds = editedPersonnage.dramaticFunctionIds.filter(id => id !== df.id)
                      : editedPersonnage.dramaticFunctionIds = [...(editedPersonnage.dramaticFunctionIds ?? []), df.id]"
                    :class="[
                      'inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-full transition-all',
                      editedPersonnage.dramaticFunctionIds?.includes(df.id)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    ]"
                  >
                    🎭 {{ df.name }}
                  </button>
                </div>
              </div>

              <!-- Arcs narratifs -->
              <div
                v-if="personnage?.personnageNarrativeArcs && personnage.personnageNarrativeArcs.length > 0"
                class="flex flex-wrap gap-2 mt-3"
              >
                <span
                  v-for="pna in personnage.personnageNarrativeArcs"
                  :key="pna.id"
                  data-controller="tooltip" :title="`${pna.narrativeArc.description || ''}\n\nÉtapes:\n${Array.isArray(pna.narrativeArc.steps) ? pna.narrativeArc.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') : ''}\n\nTendance: ${pna.narrativeArc.tendency === 'positive' ? '↗️ Positive' : pna.narrativeArc.tendency === 'negative' ? '↘️ Négative' : '↔️ Ambiguë'}`"
                  class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all cursor-help"
                >
                  <span class="text-base">
                    {{ pna.narrativeArc.tendency === 'positive' ? '↗️' : pna.narrativeArc.tendency === 'negative' ? '↘️' : '↔️' }}
                  </span>
                  {{ pna.narrativeArc.name }}
                </span>
              </div>

              <div v-if="!isEditing && detectedArcsOffSheet.length" class="flex flex-wrap items-center gap-2 mt-2">
                <span class="text-xs text-sky-700">🤖 Arcs qui se dessinent dans le texte :</span>
                <button
                  v-for="arc in detectedArcsOffSheet"
                  :key="arc.narrativeArc.id"
                  type="button"
                  @click="activeTab = 'analyse'"
                  data-controller="tooltip"
                  :title="`${arc.comment || ''}\n\nCorrespondance ${arc.weight} % — voir l'analyse pour l'ajouter`"
                  class="inline-flex items-center gap-1 rounded-full border border-dashed border-sky-400 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 hover:bg-sky-100"
                >
                  {{ arc.narrativeArc.tendency === 'positive' ? '↗️' : arc.narrativeArc.tendency === 'negative' ? '↘️' : '↔️' }}
                  {{ arc.narrativeArc.name }}
                </button>
              </div>

              <!-- Niveaux de langage : lus dans les répliques, rien ne se saisit -->
              <div v-if="!isEditing && personnage?.personnageLanguageLevels?.length" class="flex flex-wrap items-center gap-2 mt-2">
                <span class="text-xs text-sky-700">🤖 Parle :</span>
                <span
                  v-for="pll in personnage.personnageLanguageLevels"
                  :key="pll.id"
                  data-controller="tooltip"
                  :title="[pll.comment, pll.quote && `« ${pll.quote} »`].filter(Boolean).join('\n\n')"
                  class="inline-flex items-center gap-1 rounded-full border border-dashed border-sky-400 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 cursor-help"
                >
                  💬 {{ pll.languageLevel.name }}
                  <span class="font-normal opacity-70">{{ pll.weight }} %</span>
                </span>
              </div>
            </div>
          </div>
          
          <div class="flex space-x-3">
            <button 
              v-if="!isEditing"
              @click="toggleEdit"
              class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
            >
              Modifier
            </button>
            <template v-else>
              <button 
                @click="handleSave"
                class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Sauvegarder
              </button>
              <button 
                @click="toggleEdit"
                class="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- Onglets : la fiche de l'auteur d'un côté, ce que le texte montre de l'autre -->
      <div class="mb-6 flex gap-1 border-b border-gray-200" role="tablist">
        <button
          v-for="tab in [{ key: 'auteur', label: 'Détail du perso' }, { key: 'analyse', label: 'Analyse du perso' }]"
          :key="tab.key"
          role="tab"
          :aria-selected="activeTab === tab.key"
          @click="activeTab = tab.key"
          :class="[
            '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            activeTab === tab.key
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="activeTab === 'auteur'" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Colonne gauche - Petite colonne -->
        <div class="space-y-6">
          
          <!-- Forces et Faiblesses -->
          <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
            <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span class="mr-2">⚔️</span>
              Forces & Faiblesses
            </h2>
            
            <div class="space-y-3">
              <div>
                <h3 class="font-semibold text-green-700 mb-2 text-sm flex items-center">
                  <span class="mr-1">💪</span>
                  Forces
                </h3>
                <div v-if="!isEditing" class="p-2 bg-green-50 rounded border border-green-200">
                  <p class="text-gray-800 text-sm whitespace-pre-wrap">{{ personnage?.strength || 'Aucune force définie' }}</p>
                </div>
                <textarea
                  v-else
                  v-model="editedPersonnage.strength"
                  class="w-full h-16 p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-amber-500/30 transition-all resize-none"
                  placeholder="Forces..."
                ></textarea>
              </div>
              
              <div>
                <h3 class="font-semibold text-red-700 mb-2 text-sm flex items-center">
                  <span class="mr-1">⚠️</span>
                  Faiblesses
                </h3>
                <div v-if="!isEditing" class="p-2 bg-red-50 rounded border border-red-200">
                  <p class="text-gray-800 text-sm whitespace-pre-wrap">{{ personnage?.weakness || 'Aucune faiblesse définie' }}</p>
                </div>
                <textarea
                  v-else
                  v-model="editedPersonnage.weakness"
                  class="w-full h-16 p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-amber-500/30 transition-all resize-none"
                  placeholder="Faiblesses..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Galerie d'images -->
          <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
            <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span class="mr-2">🖼️</span>
              Photos
            </h2>
            
            <div v-if="isEditing && personnage?.id">
              <ImageUploader
                :personnage-id="personnage.id"
                :images="editedPersonnage.images || []"
                @images-updated="handleImagesUpdated"
              />
            </div>
            
            <div v-else-if="getPersonnageImages(personnage).length > 0" class="space-y-3 max-h-96 overflow-y-auto">
              <div 
                v-for="(image, index) in getPersonnageImages(personnage)" 
                :key="index"
                class="w-full aspect-square overflow-hidden rounded-lg border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                @click="openLightbox(index)"
              >
                <img 
                  :src="image" 
                  :alt="`Image ${index + 1} de ${personnage.firstName} ${personnage.lastName ?? ''}`.trim()"
                  class="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </div>
            </div>
            
            <div v-else class="text-center py-6">
              <div class="text-gray-400 text-2xl mb-2">🖼️</div>
              <p class="text-gray-500 text-sm">Aucune image</p>
              <p v-if="!isEditing" class="text-xs text-gray-400 mt-1">Modifier pour ajouter</p>
            </div>
          </div>

          <!-- Statistiques -->
          <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-indigo-500">
            <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span class="mr-2">📊</span>
              Stats
            </h2>
            
            <div class="space-y-3">
              <div class="flex justify-between items-center p-2 bg-indigo-50 rounded">
                <span class="text-gray-700 text-sm">Séquences</span>
                <span class="font-bold text-indigo-600">
                  {{ personnage?.stats?.sequenceCount || 0 }}
                </span>
              </div>
              
              <div class="flex justify-between items-center p-2 bg-indigo-50 rounded">
                <span class="text-gray-700 text-sm">Images</span>
                <span class="font-bold text-indigo-600">
                  {{ personnage?.stats?.imageCount || 0 }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Colonne droite - Grande colonne -->
        <div class="lg:col-span-2 space-y-6">
          
      
          <!-- Histoire et Background -->
          <div class="bg-white rounded-lg shadow-lg border-l-4 border-green-500">
            <div class="p-6">
              <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span class="mr-2">📖</span>
                Background
              </h2>
              
              <div v-if="!isEditing" class="bg-green-50 rounded-lg border border-green-200 p-4">
                <div 
                  v-if="personnage?.background"
                  class="prose prose-sm max-w-none"
                  v-html="personnage.background"
                >
                </div>
                <p v-else class="text-gray-500 italic">Aucun background défini</p>
              </div>

              <div v-else class="min-h-96">
                <RichTextEditor 
                  v-model="editedPersonnage.background" 
                  class="border border-gray-300 rounded-lg h-96" 
                />
              </div>

              <!-- Écarts relevés par l'analyse : votre texte n'est pas touché -->
              <div
                v-if="!isEditing && (personnage?.verification?.novelties?.length || personnage?.verification?.contradictions?.length)"
                class="mt-4 rounded-lg border border-dashed border-sky-300 bg-sky-50/50 p-3"
              >
                <p class="mb-2 text-xs font-semibold text-sky-800">🤖 Selon le texte</p>
                <div v-if="personnage.verification.novelties?.length" class="mb-2">
                  <p class="text-xs font-medium text-blue-800">Ce que le récit apprend, absent du background</p>
                  <ul class="mt-1 list-disc space-y-0.5 pl-5">
                    <li v-for="(item, i) in personnage.verification.novelties" :key="i" class="text-sm text-gray-700"><SequenceRefText :text="item" /></li>
                  </ul>
                </div>
                <div v-if="personnage.verification.contradictions?.length">
                  <p class="text-xs font-medium text-red-700">Ce que le récit contredit</p>
                  <ul class="mt-1 list-disc space-y-0.5 pl-5">
                    <li v-for="(item, i) in personnage.verification.contradictions" :key="i" class="text-sm text-gray-700"><SequenceRefText :text="item" /></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Arcs narratifs détaillés -->
          <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-indigo-500">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-gray-800 flex items-center">
                <span class="mr-2">📈</span>
                Arcs narratifs
              </h2>
              <button
                @click="openNarrativeArcModal()"
                class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-1"
              >
                <span>+</span>
                Ajouter un arc
              </button>
            </div>

            <div v-if="personnage?.personnageNarrativeArcs && personnage.personnageNarrativeArcs.length > 0" class="space-y-6">
              <div
                v-for="pna in personnage.personnageNarrativeArcs"
                :key="pna.id"
                class="p-4 bg-indigo-50 rounded-lg border border-indigo-200"
              >
                <!-- En-tête de l'arc -->
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold text-indigo-900 flex items-center gap-2">
                      <span class="text-xl">
                        {{ pna.narrativeArc.tendency === 'positive' ? '↗️' : pna.narrativeArc.tendency === 'negative' ? '↘️' : '↔️' }}
                      </span>
                      {{ pna.narrativeArc.name }}
                    </h3>
                    <p class="text-sm text-gray-700 mt-1 italic">{{ pna.narrativeArc.description }}</p>
                    <p v-if="arcVerdictFor(pna.id)?.comment" class="mt-2 rounded border border-dashed border-sky-300 bg-sky-50/60 px-2 py-1 text-xs text-sky-900">
                      🤖 <SequenceRefText :text="arcVerdictFor(pna.id).comment" />
                    </p>
                    <MissingList title="Pour avancer et boucler l'arc" :items="arcVerdictFor(pna.id)?.missing ?? []" />
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-1 text-xs font-medium rounded bg-indigo-200 text-indigo-800">
                      Poids: {{ pna.weight }}%
                    </span>
                    <button
                      @click="openNarrativeArcModal(pna)"
                      class="px-2 py-1 text-xs bg-white hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-300 transition-colors"
                      data-controller="tooltip" title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      @click="deleteNarrativeArc(pna.id)"
                      class="px-2 py-1 text-xs bg-white hover:bg-red-100 text-red-700 rounded border border-red-300 transition-colors"
                      data-controller="tooltip" title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <!-- Séquences globales (si définies) -->
                <div v-if="pna.fromSequence || pna.toSequence" class="mb-3 p-2 bg-indigo-50 rounded text-xs text-gray-700">
                  <span class="font-semibold">Arc complet:</span>
                  <span v-if="pna.fromSequence" class="ml-2">De: <strong>{{ pna.fromSequence.name }}</strong></span>
                  <span v-if="pna.fromSequence && pna.toSequence" class="mx-2">→</span>
                  <span v-if="pna.toSequence">À: <strong>{{ pna.toSequence.name }}</strong></span>
                </div>

                <!-- Étapes de l'arc avec séquences -->
                <div v-if="pna.steps && pna.steps.length > 0" class="mb-3">
                  <h4 class="text-sm font-semibold text-gray-800 mb-2">Progression de l'arc :</h4>
                  <div class="space-y-2">
                    <div
                      v-for="(stepData, index) in pna.steps"
                      :key="index"
                      class="p-2 bg-white rounded border border-indigo-200"
                    >
                      <div class="flex flex-wrap items-baseline gap-2 text-sm font-medium text-indigo-900 mb-1">
                        <span>{{ index + 1 }}. {{ stepData.step }}</span>
                        <span
                          v-if="stepVerdictFor(pna.id, index)"
                          class="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                          :class="ARC_STATUS[stepVerdictFor(pna.id, index).status]?.classes"
                          data-controller="tooltip"
                          :title="stepVerdictFor(pna.id, index).comment || ''"
                        >🤖 {{ ARC_STATUS[stepVerdictFor(pna.id, index).status]?.label }}</span>
                      </div>
                      <div v-if="stepData.fromSequenceId || stepData.toSequenceId" class="text-xs text-gray-600 ml-4">
                        <span v-if="stepData.fromSequenceId">
                          Seq. {{ projectSequences.find(s => s.id === stepData.fromSequenceId)?.name || stepData.fromSequenceId }}
                        </span>
                        <span v-if="stepData.fromSequenceId && stepData.toSequenceId"> → </span>
                        <span v-if="stepData.toSequenceId">
                          Seq. {{ projectSequences.find(s => s.id === stepData.toSequenceId)?.name || stepData.toSequenceId }}
                        </span>
                      </div>
                      <!-- Où le texte la joue, quand ce n'est pas là où vous l'avez placée -->
                      <p
                        v-if="stepVerdictFor(pna.id, index) && placementGap(pna.id, stepVerdictFor(pna.id, index))"
                        class="ml-4 mt-1 text-xs text-amber-700"
                      >
                        🤖 Jouée dans le texte en <SequenceRefText :ids="stepVerdictFor(pna.id, index).sequenceIds" />
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Variantes -->
                <div v-if="pna.narrativeArc.variants && pna.narrativeArc.variants.length > 0">
                  <h4 class="text-sm font-semibold text-gray-800 mb-2">Variantes :</h4>
                  <div class="space-y-2">
                    <div
                      v-for="(variant, index) in pna.narrativeArc.variants"
                      :key="index"
                      class="p-2 bg-white rounded border border-indigo-100"
                    >
                      <h5 class="text-xs font-semibold text-indigo-700">{{ variant.name }}</h5>
                      <p class="text-xs text-gray-600 mt-1">{{ variant.description }}</p>
                    </div>
                  </div>
                </div>

                <!-- Commentaire (si présent) -->
                <div v-if="pna.comment" class="mt-3 pt-3 border-t border-indigo-200">
                  <p class="text-xs text-gray-600 italic">💬 {{ pna.comment }}</p>
                </div>
              </div>
            </div>

            <!-- Message si aucun arc -->
            <div v-else class="text-center py-8 text-gray-500">
              <p class="text-sm">Aucun arc narratif défini pour ce personnage.</p>
              <p class="text-xs mt-1">Cliquez sur "+ Ajouter un arc" pour commencer.</p>
            </div>
          </div>

          <!-- ── Ce que l'IA a lu dans le texte : lecture seule, tout se lance depuis l'onglet analyse ── -->
          <div
            v-if="!isEditing && !personnage?.analysis && !personnage?.languageAnalysis && !personnage?.actantialSchema && !personnage?.verification"
            class="rounded-lg border border-dashed border-sky-300 bg-sky-50/40 p-4 text-sm text-sky-900"
          >
            🤖 Aucune analyse IA pour ce personnage.
            <button @click="activeTab = 'analyse'" class="ml-1 font-medium underline hover:no-underline">Lancer une analyse</button>
          </div>

          <template v-if="!isEditing">
            <div v-if="personnage?.analysis" class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-sky-400">
              <div class="mb-3 flex items-center justify-between gap-2">
                <h2 class="text-lg font-bold text-gray-800 flex items-center">
                  <span class="mr-2" data-controller="tooltip" title="Produit par l'analyse IA">🤖</span>
                  Analyse du texte
                </h2>
                <button @click="activeTab = 'analyse'" class="text-xs text-sky-700 hover:underline">Voir l'analyse</button>
              </div>
              <div class="prose prose-sm max-w-none rounded-lg border border-dashed border-sky-300 bg-sky-50/40 p-4"><SequenceRefText :text="personnage.analysis" html /></div>
            </div>

            <div v-if="personnage?.languageAnalysis || personnage?.personnageLanguageLevels?.length" class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-sky-400">
              <div class="mb-3 flex items-center justify-between gap-2">
                <h2 class="text-lg font-bold text-gray-800 flex items-center">
                  <span class="mr-2" data-controller="tooltip" title="Produit par l'analyse IA">🤖</span>
                  Langage
                </h2>
                <button @click="activeTab = 'analyse'" class="text-xs text-sky-700 hover:underline">Voir l'analyse</button>
              </div>
              <div v-if="personnage.personnageLanguageLevels?.length" class="mb-3 space-y-1.5">
                <div v-for="pll in personnage.personnageLanguageLevels" :key="pll.id" class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
                  <span class="font-semibold text-gray-900">{{ pll.languageLevel.name }}</span>
                  <span class="text-xs tabular-nums text-gray-500">{{ pll.weight }} %</span>
                  <span v-if="pll.comment" class="text-gray-600"><SequenceRefText :text="pll.comment" /></span>
                  <span v-if="pll.quote" class="w-full border-l-2 border-sky-300 pl-2 text-xs italic text-gray-500">« {{ pll.quote }} »</span>
                </div>
              </div>
              <div
                v-if="personnage.languageAnalysis"
                class="prose prose-sm max-w-none rounded-lg border border-dashed border-sky-300 bg-sky-50/40 p-4"><SequenceRefText :text="personnage.languageAnalysis" html /></div>
            </div>

            <div v-if="personnage?.actantialSchema" class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-sky-400">
              <div class="mb-3 flex items-center justify-between gap-2">
                <h2 class="text-lg font-bold text-gray-800 flex items-center">
                  <span class="mr-2" data-controller="tooltip" title="Produit par l'analyse IA">🤖</span>
                  Schéma actantiel
                </h2>
                <button @click="activeTab = 'analyse'" class="text-xs text-sky-700 hover:underline">Voir l'analyse</button>
              </div>
              <dl class="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div v-for="actant in actantialRoles" :key="actant.role">
                  <dt class="text-xs uppercase tracking-wide text-gray-500">{{ actant.role }}</dt>
                  <dd class="text-gray-900">
                    {{ actant.concerned.length ? actant.concerned.map(c => c.name).join(', ') : '—' }}
                  </dd>
                </div>
              </dl>
            </div>
          </template>

        </div>
      </div>

      <!-- Onglet analyse : tout ce qui est tiré du texte, rien de déclaré -->
      <div v-else class="space-y-6">
        <div class="flex flex-col gap-3 rounded-lg bg-white p-4 shadow sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-gray-600">
            Lu dans les séquences où le personnage apparaît. Votre fiche n'est jamais réécrite.
            <span v-if="personnage?.verification?.analyzedAt" class="block text-xs text-gray-400">
              Dernière analyse le {{ new Date(personnage.verification.analyzedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) }}
            </span>
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              @click="createActantielSchema"
              :disabled="generatingSchema"
              class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-wait text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span>🎭</span>
              {{ generatingSchema ? 'Analyse en cours…' : personnage?.actantialSchema ? 'Régénérer le schéma actantiel' : 'Créer le schéma actantiel' }}
            </button>
            <button
              @click="runVerification"
              :disabled="verifying"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-wait text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span>📈</span>
              {{ verifying ? 'Analyse en cours…' : 'Analyser le personnage' }}
            </button>
          </div>
        </div>

        <!-- Ce que l'analyse lira, et les séquences qui le nomment sans l'avoir assigné -->
        <PersonnageCoverage v-if="personnage?.id" :personnage="personnage" />

        <!-- Analyse du texte : produite par « Analyser le personnage », jamais relue en entrée -->
        <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span class="mr-2">🔍</span>
            Analyse du texte
          </h2>
          <div
            class="p-4 bg-blue-50 rounded-lg border border-blue-200 min-h-[120px]"
            >
            <SequenceRefText v-if="personnage?.analysis" :text="personnage.analysis" html />
            <em v-else class="text-gray-500">Aucune analyse : lancez « Analyser le personnage ».</em>
          </div>
        </div>

        <!-- Contrôles de la fiche : calculés sans modèle, sur ce que l'auteur a saisi -->
        <div v-if="globalChecks.length" class="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 class="mb-1 text-sm font-semibold text-red-800">À vérifier sur la fiche</h2>
          <ul class="space-y-0.5">
            <li v-for="issue in globalChecks" :key="issue" class="text-sm text-red-700">⚠ {{ issue }}</li>
          </ul>
        </div>

        <!-- Fonctions dramatiques : déclarées par l'auteur, vérifiées dans le texte -->
        <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-fuchsia-500">
          <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span class="mr-2">🎭</span>
            Fonctions dramatiques
          </h2>

          <p v-if="!personnage?.verification" class="text-sm italic text-gray-500">
            Aucune analyse : lancez « Analyser le personnage ».
          </p>

          <template v-else>
            <p v-if="!personnage.verification.functions?.verdicts?.length" class="mb-3 text-sm italic text-gray-400">
              Aucune fonction sur la fiche au moment de l'analyse.
            </p>

            <div
              v-for="verdict in personnage.verification.functions?.verdicts ?? []"
              :key="verdict.personnageDramaticFunctionId"
              class="mb-3 rounded-lg border border-fuchsia-200 bg-fuchsia-50/40 p-4"
            >
              <div class="flex flex-wrap items-baseline gap-2">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="ARC_STATUS[verdict.status]?.classes">
                  {{ ARC_STATUS[verdict.status]?.label }}
                </span>
                <h3 class="font-semibold text-fuchsia-900">{{ verdict.functionName }}</h3>
                <button
                  v-if="functionStillAssigned(verdict.personnageDramaticFunctionId)"
                  @click="deleteDramaticFunction(verdict.personnageDramaticFunctionId)"
                  class="ml-auto rounded border border-red-200 bg-white px-2 py-0.5 text-xs text-red-700 transition-colors hover:bg-red-50"
                >Retirer de la fiche</button>
                <span v-if="functionBounds(verdict.personnageDramaticFunctionId)" class="text-xs text-gray-500">
                  — {{ functionBounds(verdict.personnageDramaticFunctionId) }}
                </span>
              </div>
              <p v-if="!functionStillAssigned(verdict.personnageDramaticFunctionId)" class="text-xs italic text-gray-400">
                Fonction retirée de la fiche depuis cette analyse.
              </p>
              <p v-if="verdict.comment" class="mt-1 text-sm text-gray-700"><SequenceRefText :text="verdict.comment" /></p>
              <p v-if="verdict.suggestion" class="mt-2 rounded border border-dashed border-amber-300 bg-amber-50/60 px-3 py-1.5 text-xs text-amber-900">
                <span class="font-semibold text-amber-700">Piste<template v-if="verdict.suggestion.sequenceId"> (<SequenceRefText :ids="[verdict.suggestion.sequenceId]" />)</template> :</span>
                <SequenceRefText :text="verdict.suggestion.text" />
              </p>
              <MissingList title="Pour remplir la fonction" :items="verdict.missing ?? []" />
            </div>

            <h3 class="mb-2 mt-5 text-sm font-semibold text-gray-700">Fonctions tenues dans le texte, absentes de votre fiche</h3>
            <p v-if="!personnage.verification.functions?.detected?.length" class="text-sm italic text-gray-400">
              Le personnage ne tient aucune autre fonction du référentiel.
            </p>
            <div
              v-for="detected in personnage.verification.functions?.detected ?? []"
              :key="detected.dramaticFunction.id"
              class="mb-3 rounded-lg border border-gray-200 p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h4 class="font-semibold text-gray-900">{{ detected.dramaticFunction.name }}</h4>
                <div class="flex items-center gap-3">
                  <span class="text-xs text-gray-500">Correspondance {{ detected.weight }} %</span>
                  <span v-if="isAssignedFunction(detected.dramaticFunction.id)" class="text-xs text-green-700">✓ Sur la fiche</span>
                  <button
                    v-else
                    @click="addDetectedFunction(detected)"
                    :disabled="!!applyingId"
                    class="rounded-lg bg-fuchsia-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-fuchsia-700 disabled:opacity-50"
                  >
                    {{ applyingId === `function-${detected.dramaticFunction.id}` ? 'Ajout…' : 'Ajouter à la fiche' }}
                  </button>
                </div>
              </div>
              <p v-if="detected.comment" class="mt-1 text-sm text-gray-700"><SequenceRefText :text="detected.comment" /></p>
              <p v-if="detected.sequenceIds?.length" class="mt-1 text-xs text-gray-500">
                Dans le texte : <SequenceRefText :ids="detected.sequenceIds" />
              </p>
              <MissingList title="Pour remplir la fonction" :items="detected.missing ?? []" />
            </div>
          </template>
        </div>

        <!-- Arcs : déclarés par l'auteur, vérifiés étape par étape dans le texte -->
        <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-indigo-500">
          <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span class="mr-2">📈</span>
            Analyse des arcs
          </h2>

          <p v-if="!personnage?.verification" class="text-sm italic text-gray-500">
            Aucune analyse : lancez « Analyser le personnage ».
          </p>

          <template v-else>
            <div
              v-for="verdict in personnage.verification.arcs?.verdicts ?? []"
              :key="verdict.personnageNarrativeArcId"
              class="mb-4 rounded-lg border border-indigo-200 bg-indigo-50/40 p-4"
            >
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <h3 class="font-semibold text-indigo-900">{{ verdict.arcName }}</h3>
                <button
                  v-if="arcStillAssigned(verdict.personnageNarrativeArcId)"
                  @click="deleteNarrativeArc(verdict.personnageNarrativeArcId)"
                  class="rounded border border-red-200 bg-white px-2 py-0.5 text-xs text-red-700 transition-colors hover:bg-red-50"
                >Retirer de la fiche</button>
              </div>
              <p v-if="!arcStillAssigned(verdict.personnageNarrativeArcId)" class="text-xs italic text-gray-400">
                Arc retiré de la fiche depuis cette analyse.
              </p>
              <p
                v-for="issue in arcChecks.get(verdict.personnageNarrativeArcId)?.issues ?? []"
                :key="issue"
                class="mt-1 text-sm text-red-600"
              >⚠ {{ issue }}</p>
              <p v-if="verdict.comment" class="mt-1 text-sm text-gray-700"><SequenceRefText :text="verdict.comment" /></p>
              <MissingList title="Pour avancer et boucler l'arc" :items="verdict.missing ?? []" />

              <ol class="mt-3 space-y-2">
                <li v-for="step in verdict.steps" :key="step.index" class="text-sm">
                  <div class="flex flex-wrap items-baseline gap-2">
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="ARC_STATUS[step.status]?.classes">
                      {{ ARC_STATUS[step.status]?.label }}
                    </span>
                    <span class="font-medium text-gray-900">{{ step.index + 1 }}. {{ step.step }}</span>
                    <span v-if="step.sequenceIds?.length" class="text-xs text-gray-500">— <SequenceRefText :ids="step.sequenceIds" /></span>
                    <span
                      v-if="wasAutoPlaced(verdict.personnageNarrativeArcId, step.index)"
                      class="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700"
                      data-controller="tooltip"
                      title="Vous ne l'aviez pas placée : l'analyse l'a rattachée aux séquences où le texte la joue"
                    >placée par l'analyse</span>
                  </div>
                  <p v-if="step.comment" class="ml-1 mt-0.5 text-xs text-gray-600"><SequenceRefText :text="step.comment" /></p>
                  <p
                    v-for="issue in arcChecks.get(verdict.personnageNarrativeArcId)?.stepIssues.get(step.index) ?? []"
                    :key="issue"
                    class="ml-1 mt-0.5 text-xs text-red-600"
                  >⚠ {{ issue }}</p>
                  <!-- Écart avec la place que l'auteur lui a donnée, recalculé sur la fiche actuelle -->
                  <div v-if="placementGap(verdict.personnageNarrativeArcId, step)" class="ml-1 mt-1 flex flex-wrap items-center gap-2 text-xs text-amber-700">
                    <span>⚠ Placée par vous en {{ placementGap(verdict.personnageNarrativeArcId, step) }}, jouée ailleurs dans le texte.</span>
                    <button
                      v-if="arcStillAssigned(verdict.personnageNarrativeArcId)"
                      @click="alignStep(verdict.personnageNarrativeArcId, step)"
                      :disabled="!!applyingId"
                      class="rounded-full border border-amber-300 bg-white px-2 py-0.5 font-medium text-amber-800 transition-colors hover:bg-amber-50 disabled:opacity-50"
                    >
                      {{ applyingId === `align-${verdict.personnageNarrativeArcId}-${step.index}` ? 'Déplacement…' : 'Aligner sur le texte' }}
                    </button>
                  </div>
                  <p v-if="step.suggestion" class="ml-1 mt-1 rounded border border-dashed border-amber-300 bg-amber-50/60 px-3 py-1.5 text-xs text-amber-900">
                    <span class="font-semibold text-amber-700">Piste<template v-if="step.suggestion.sequenceId"> (<SequenceRefText :ids="[step.suggestion.sequenceId]" />)</template> :</span>
                    <SequenceRefText :text="step.suggestion.text" />
                  </p>
                </li>
              </ol>
            </div>

            <h3 class="mb-2 mt-5 text-sm font-semibold text-gray-700">Arcs détectés dans le texte, absents de votre fiche</h3>
            <p v-if="!personnage.verification.arcs?.detected?.length" class="text-sm italic text-gray-400">
              Aucun autre arc du référentiel ne se dessine dans le texte.
            </p>
            <div
              v-for="arc in personnage.verification.arcs?.detected ?? []"
              :key="arc.narrativeArc.id"
              class="mb-3 rounded-lg border border-gray-200 p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h4 class="font-semibold text-gray-900">
                  {{ arc.narrativeArc.tendency === 'positive' ? '↗️' : arc.narrativeArc.tendency === 'negative' ? '↘️' : '↔️' }}
                  {{ arc.narrativeArc.name }}
                </h4>
                <div class="flex items-center gap-3">
                  <span class="text-xs text-gray-500">Correspondance {{ arc.weight }} %</span>
                  <span v-if="isAssignedArc(arc.narrativeArc.id)" class="text-xs text-green-700">✓ Sur la fiche</span>
                  <button
                    v-else
                    @click="addDetectedArc(arc)"
                    :disabled="!!applyingId"
                    class="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {{ applyingId === `arc-${arc.narrativeArc.id}` ? 'Ajout…' : 'Ajouter à la fiche' }}
                  </button>
                </div>
              </div>
              <p v-if="arc.comment" class="mt-1 text-sm text-gray-700"><SequenceRefText :text="arc.comment" /></p>
              <MissingList title="Pour boucler l'arc" :items="arc.missing ?? []" />
              <ol class="mt-2 space-y-0.5">
                <li v-for="step in arc.steps" :key="step.index" class="text-xs" :class="step.sequenceIds.length ? 'text-gray-700' : 'text-gray-400'">
                  {{ step.index + 1 }}. {{ step.step }}
                  <span v-if="step.sequenceIds.length" class="text-gray-500">— <SequenceRefText :ids="step.sequenceIds" /></span>
                  <span v-else>— pas encore dans le texte</span>
                </li>
              </ol>
            </div>
          </template>
        </div>

        <!-- Séquence par séquence : ce que l'analyse lit dans chaque séquence où il apparaît -->
        <div v-if="sequenceDetails.length" class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-slate-400">
          <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span class="mr-2">🗂️</span>
            Séquence par séquence
          </h2>
          <ol class="space-y-3">
            <li v-for="entry in sequenceDetails" :key="entry.sequenceId" class="rounded-lg border border-gray-200 p-3">
              <div class="flex flex-wrap items-baseline gap-2">
                <SequenceRefText :ids="[entry.sequenceId]" />
                <span class="font-medium text-gray-900">{{ sequenceNameById(entry.sequenceId) }}</span>
                <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="SEQUENCE_ROLES[entry.role]?.classes">
                  {{ SEQUENCE_ROLES[entry.role]?.label }}
                </span>
              </div>
              <p v-if="entry.summary" class="mt-1 text-sm text-gray-700"><SequenceRefText :text="entry.summary" /></p>
              <div v-if="entry.steps.length || entry.functions.length" class="mt-2 flex flex-wrap gap-1.5">
                <span
                  v-for="(step, i) in entry.steps"
                  :key="`s${i}`"
                  class="rounded-full border px-2 py-0.5 text-xs"
                  :class="step.detected ? 'border-dashed border-sky-300 bg-sky-50 text-sky-800' : 'border-indigo-200 bg-indigo-50 text-indigo-800'"
                  data-controller="tooltip"
                  :title="step.detected ? 'Arc détecté, absent de votre fiche' : ARC_STATUS[step.status]?.label"
                >📈 {{ step.arcName }} · {{ step.index + 1 }}. {{ step.step }}</span>
                <span
                  v-for="(fn, i) in entry.functions"
                  :key="`f${i}`"
                  class="rounded-full border px-2 py-0.5 text-xs"
                  :class="fn.detected ? 'border-dashed border-sky-300 bg-sky-50 text-sky-800' : 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800'"
                  data-controller="tooltip"
                  :title="fn.detected ? 'Fonction détectée, absente de votre fiche' : ARC_STATUS[fn.status]?.label"
                >🎭 {{ fn.name }}</span>
              </div>
            </li>
          </ol>
        </div>

        <!-- Écarts avec la fiche : signalés, jamais tranchés à la place de l'auteur -->
        <div
          v-if="personnage?.verification?.novelties?.length || personnage?.verification?.contradictions?.length"
          class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-amber-500"
        >
          <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span class="mr-2">⚖️</span>
            Écarts avec la fiche
          </h2>
          <div v-if="personnage.verification.novelties?.length" class="mb-4">
            <h3 class="mb-1 text-sm font-semibold text-blue-800">Ce que le texte apprend, absent de la fiche</h3>
            <ul class="space-y-1 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <li v-for="(item, i) in personnage.verification.novelties" :key="i" class="text-sm text-blue-800"><SequenceRefText :text="item" /></li>
            </ul>
          </div>
          <div v-if="personnage.verification.contradictions?.length">
            <h3 class="mb-1 text-sm font-semibold text-red-800">Ce que le texte contredit</h3>
            <ul class="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3">
              <li v-for="(item, i) in personnage.verification.contradictions" :key="i" class="text-sm text-red-800"><SequenceRefText :text="item" /></li>
            </ul>
          </div>
        </div>

        <!-- Schéma actantiel -->
        <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span class="mr-2">🎭</span>
            Schéma actantiel
          </h2>

          <p v-if="!personnage?.actantialSchema && !generatingSchema" class="text-gray-500 italic text-sm">
            Aucun schéma : lancez « Créer le schéma actantiel ».
          </p>

          <div v-if="generatingSchema && !personnage?.actantialSchema" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div v-for="n in 6" :key="n" class="h-24 rounded-lg bg-gray-100 animate-pulse"></div>
          </div>

          <template v-else-if="personnage?.actantialSchema">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" :class="{ 'opacity-50': generatingSchema }">
              <div
                v-for="actant in actantialRoles"
                :key="actant.role"
                class="p-3 rounded-lg border"
                :class="tendencyClasses[actant.tendency] || tendencyClasses.ambiguous"
              >
                <div class="flex items-baseline justify-between gap-2 mb-1">
                  <h3 class="font-semibold text-gray-800">{{ actant.role }}</h3>
                  <span class="text-xs text-gray-500 text-right">{{ actant.description }}</span>
                </div>

                <div v-if="actant.concerned.length" class="flex flex-wrap gap-1.5 mb-2">
                  <template v-for="(entity, i) in actant.concerned" :key="i">
                    <NuxtLink
                      v-if="entity.personnage_id && personnageSlugById(entity.personnage_id)"
                      :to="`/projets/detail-${personnageSlugById(entity.personnage_id)}`"
                      class="px-2 py-0.5 text-sm rounded bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
                    >
                      {{ entity.name }}
                    </NuxtLink>
                    <span v-else class="px-2 py-0.5 text-sm rounded bg-white text-gray-700 border border-gray-200">
                      {{ entity.name }}
                    </span>
                  </template>
                </div>
                <p v-else class="text-sm text-gray-400 italic mb-2">Non identifié dans le texte</p>

                <p v-if="actant.comment" class="text-sm text-gray-700"><SequenceRefText :text="actant.comment" /></p>
              </div>
            </div>

            <p v-if="personnage.actantialSchema.comment" class="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200 text-sm text-gray-800">
              <SequenceRefText :text="personnage.actantialSchema.comment" />
            </p>
          </template>
        </div>

        <!-- Langage -->
        <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-teal-500">
          <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span class="mr-2">💬</span>
            Langage
          </h2>

          <!-- Lu dans les répliques du personnage, rien ne se saisit -->
          <div v-if="personnage?.personnageLanguageLevels?.length" class="space-y-2 mb-4">
            <div
              v-for="pll in personnage.personnageLanguageLevels"
              :key="pll.id"
              class="rounded-lg border border-teal-200 bg-teal-50/50 p-3"
            >
              <div class="flex items-center gap-3">
                <span
                  class="text-sm font-semibold text-teal-900 cursor-help"
                  data-controller="tooltip" :title="pll.languageLevel.description"
                >{{ pll.languageLevel.name }}</span>
                <!-- Le poids se lit d'un coup d'œil : lequel domine -->
                <div class="h-1.5 flex-1 max-w-40 rounded-full bg-teal-100">
                  <div class="h-1.5 rounded-full bg-teal-500" :style="{ width: `${pll.weight}%` }"></div>
                </div>
                <span class="text-xs tabular-nums text-gray-500">{{ pll.weight }} %</span>
              </div>
              <p v-if="pll.comment" class="mt-1 text-sm text-gray-700"><SequenceRefText :text="pll.comment" /></p>
              <p v-if="pll.quote" class="mt-1.5 border-l-2 border-teal-300 pl-2 text-sm italic text-gray-500">« {{ pll.quote }} »</p>
            </div>
          </div>
          <p v-else class="text-gray-500 italic text-sm mb-4">Aucun niveau de langage relevé</p>

          <div
            v-if="personnage?.languageAnalysis"
            class="prose prose-sm max-w-none rounded-lg border border-teal-200 bg-teal-50/30 p-4"><SequenceRefText :text="personnage.languageAnalysis" html /></div>
          <p v-else class="text-xs text-gray-400">
            L'analyse du langage se génère depuis « Analyser le personnage ».
          </p>

        </div>
      </div>
    </div>
    </div>
    
    <!-- Lightbox component -->
    <Lightbox
      :images="lightboxImages"
      :current-index="lightboxIndex"
      :show="showLightbox"
      @close="closeLightbox"
      @update:current-index="updateLightboxIndex"
    />


    <!-- Modal Arc Narratif -->
    <div
      v-if="showNarrativeArcModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeNarrativeArcModal"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 class="text-xl font-bold text-gray-900">
            {{ editingNarrativeArc?.id ? 'Modifier l\'arc narratif' : 'Ajouter un arc narratif' }}
          </h3>
          <button
            @click="closeNarrativeArcModal"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div class="p-6 space-y-4">
          <!-- Sélection de l'arc -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Arc narratif <span class="text-red-500">*</span>
            </label>
            <select
              v-model="editingNarrativeArc.narrativeArcId"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option :value="null">Sélectionnez un arc narratif</option>
              <option
                v-for="arc in metadataStore.narrativeArcs"
                :key="arc.id"
                :value="arc.id"
              >
                {{ arc.name }} ({{ arc.tendency === 'positive' ? '↗️' : arc.tendency === 'negative' ? '↘️' : '↔️' }})
              </option>
            </select>
          </div>

          <!-- Séquences globales de l'arc -->
          <div class="border-t border-b border-gray-200 py-4 my-4">
            <label class="block text-sm font-medium text-gray-700 mb-3">
              Séquences globales de l'arc complet (optionnel)
            </label>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-gray-600 mb-1">De (séquence)</label>
                <select
                  v-model="editingNarrativeArc.fromSequenceId"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option :value="null">Aucune</option>
                  <option
                    v-for="seq in projectSequences"
                    :key="seq.id"
                    :value="seq.id"
                  >
                    {{ seq.partName }} → {{ seq.name }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs text-gray-600 mb-1">À (séquence)</label>
                <select
                  v-model="editingNarrativeArc.toSequenceId"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option :value="null">Aucune</option>
                  <option
                    v-for="seq in projectSequences"
                    :key="seq.id"
                    :value="seq.id"
                  >
                    {{ seq.partName }} → {{ seq.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Étapes détaillées avec séquences -->
          <div v-if="selectedArcSteps.length > 0">
            <div class="flex items-center justify-between mb-3">
              <label class="block text-sm font-medium text-gray-700">
                Définir les séquences pour chaque étape
              </label>
              <button
                type="button"
                @click="initializeStepsFromArc"
                class="text-xs px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded transition-colors"
              >
                Initialiser toutes les étapes
              </button>
            </div>

            <div class="space-y-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div
                v-for="(stepName, index) in selectedArcSteps"
                :key="index"
                class="p-3 bg-white rounded-md border border-gray-300"
              >
                <div class="text-sm font-medium text-gray-900 mb-2">
                  {{ index + 1 }}. {{ stepName }}
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs text-gray-600 mb-1">De</label>
                    <select
                      :value="editingNarrativeArc.steps[index]?.fromSequenceId || null"
                      @change="updateStep(index, 'fromSequenceId', parseInt($event.target.value) || null)"
                      class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option :value="null">-</option>
                      <option
                        v-for="seq in projectSequences"
                        :key="seq.id"
                        :value="seq.id"
                      >
                        {{ seq.name }}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-xs text-gray-600 mb-1">À</label>
                    <select
                      :value="editingNarrativeArc.steps[index]?.toSequenceId || null"
                      @change="updateStep(index, 'toSequenceId', parseInt($event.target.value) || null)"
                      class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option :value="null">-</option>
                      <option
                        v-for="seq in projectSequences"
                        :key="seq.id"
                        :value="seq.id"
                      >
                        {{ seq.name }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Poids -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Poids (importance) : {{ editingNarrativeArc.weight }}%
            </label>
            <input
              v-model.number="editingNarrativeArc.weight"
              type="range"
              min="0"
              max="100"
              class="w-full"
            />
          </div>

          <!-- Commentaire -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Commentaire
            </label>
            <textarea
              v-model="editingNarrativeArc.comment"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Notes sur cet arc narratif..."
            ></textarea>
          </div>
        </div>

        <div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            @click="closeNarrativeArcModal"
            class="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            @click="saveNarrativeArc"
            :disabled="!editingNarrativeArc?.narrativeArcId"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prose {
  max-width: none;
}

.prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
  color: #1f2937;
  font-weight: 600;
}

.prose p {
  color: #374151;
  margin-bottom: 1rem;
}

.prose ul, .prose ol {
  color: #374151;
}

.prose strong {
  color: #111827;
  font-weight: 600;
}

.prose em {
  color: #6b7280;
}
</style>