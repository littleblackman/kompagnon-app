import { computed } from 'vue';
import { useProjectStore } from '~/store/project';
import { useMetadataStore } from '~/store/metadata';
import { usePersonnageStore } from '~/store/personnage';
import { toRoman } from '~/utils/roman';

export type FindingLevel = 'info' | 'warning' | 'serious';

export interface Finding {
  id: string;
  level: FindingLevel;
  /** Séquence concernée, quand le constat en vise une */
  sequenceId?: number;
  title: string;
  detail?: string;
}

/** Seuils : au-delà, le constat mérite d'être signalé */
const PLATEAU_LENGTH = 4;      // séquences consécutives à la même note
const LONG_ABSENCE = 4;        // séquences sans le personnage, entre deux apparitions
const IMBALANCE_SPREAD = 8;    // écart entre le critère le plus haut et le plus bas
const CLIMAX_POSITION = 0.6;   // part du récit avant laquelle un pic surprend

/**
 * Constats calculés sur le projet — aucun modèle, aucun appel réseau.
 *
 * Tout ce qui est ici est vérifiable et reproductible : un plateau, une
 * absence, un trou de notation. L'appréciation du contenu lui-même
 * (« ce texte tient-il son intention ? ») relève d'un modèle et n'a pas
 * sa place dans ce calcul.
 */
export const useProjectDiagnostics = () => {
  const projectStore = useProjectStore();
  const metadataStore = useMetadataStore();
  const personnageStore = usePersonnageStore();

  const sequences = computed(() => {
    const rows: Array<{ id: number; label: string; name: string; sequence: any }> = [];

    projectStore.parts.forEach((part, partIndex) => {
      (part.sequences ?? []).forEach((sequence: any, index: number) => {
        rows.push({
          id: sequence.id,
          label: `${toRoman(partIndex + 1)}.${index + 1}`,
          name: sequence.name,
          sequence
        });
      });
    });

    return rows;
  });

  const ratingsFor = (sequence: any): Map<number, number> => {
    const map = new Map<number, number>();
    (sequence.sequenceCriterias ?? []).forEach((link: any) => {
      if (link.criteria?.id != null && typeof link.rating === 'number') {
        map.set(link.criteria.id, link.rating);
      }
    });
    return map;
  };

  // Le critère de tension porte la lecture dramaturgique ; à défaut, le premier
  const tensionCriteria = computed(() => {
    const list = metadataStore.criterias ?? [];
    return list.find((c: any) => /dramatique/i.test(c.name)) ?? list[0] ?? null;
  });

  /** Constats portant sur une séquence donnée */
  const findingsBySequence = computed(() => {
    const byId = new Map<number, Finding[]>();
    const push = (sequenceId: number, finding: Finding) => {
      if (!byId.has(sequenceId)) byId.set(sequenceId, []);
      byId.get(sequenceId)!.push(finding);
    };

    sequences.value.forEach(({ id, sequence }) => {
      const ratings = ratingsFor(sequence);
      const scenes = sequence.scenes ?? [];

      // Une séquence sans scène est une intention restée lettre morte
      if (!scenes.length) {
        push(id, {
          id: `${id}-vide`,
          level: 'warning',
          sequenceId: id,
          title: 'Aucune scène',
          detail: 'Cette séquence est annoncée mais rien n\'y est encore écrit.'
        });
      } else {
        const written = scenes.filter((s: any) => s.content?.replace(/<[^>]*>/g, '').trim());
        if (!written.length) {
          push(id, {
            id: `${id}-sans-contenu`,
            level: 'warning',
            sequenceId: id,
            title: 'Scènes vides',
            detail: `${scenes.length} scène${scenes.length > 1 ? 's' : ''} sans texte.`
          });
        }
      }

      if (!ratings.size) {
        push(id, {
          id: `${id}-non-notee`,
          level: 'info',
          sequenceId: id,
          title: 'Intensités non notées',
          detail: 'Sans notation, cette séquence reste absente des courbes.'
        });
      } else if (ratings.size >= 3) {
        // Un écart extrême entre critères signale un profil très typé :
        // parfois voulu, parfois le signe d'une séquence à une seule note.
        const values = [...ratings.values()];
        const spread = Math.max(...values) - Math.min(...values);
        if (spread >= IMBALANCE_SPREAD) {
          push(id, {
            id: `${id}-desequilibre`,
            level: 'info',
            sequenceId: id,
            title: 'Profil très contrasté',
            detail: `Écart de ${spread} points entre le critère le plus haut et le plus bas.`
          });
        }
      }

      // Les trois champs de contexte : renseignés, ils guident l'écriture
      const missing = [
        !sequence.intention?.trim() && 'intention',
        !sequence.aesthetic_idea?.trim() && 'idée esthétique',
        !sequence.information?.trim() && 'information'
      ].filter(Boolean) as string[];

      if (missing.length === 3) {
        push(id, {
          id: `${id}-sans-contexte`,
          level: 'info',
          sequenceId: id,
          title: 'Aucun cadrage',
          detail: 'Ni intention, ni idée esthétique, ni information.'
        });
      }
    });

    return byId;
  });

  /** Constats portant sur l'ensemble du récit */
  const globalFindings = computed(() => {
    const findings: Finding[] = [];
    const rows = sequences.value;
    if (rows.length < 3) return findings;

    const criteria = tensionCriteria.value;
    if (criteria) {
      const curve = rows.map(row => ratingsFor(row.sequence).get(criteria.id) ?? null);
      const rated = curve.filter(v => v !== null) as number[];

      if (rated.length >= 3) {
        // Plateau : la tension n'évolue plus sur une longue portion
        let runStart = 0;
        for (let i = 1; i <= curve.length; i++) {
          const same = i < curve.length && curve[i] !== null && curve[i] === curve[runStart];
          if (!same) {
            const length = i - runStart;
            if (curve[runStart] !== null && length >= PLATEAU_LENGTH) {
              findings.push({
                id: `plateau-${runStart}`,
                level: 'warning',
                sequenceId: rows[runStart].id,
                title: `${criteria.name} figée sur ${length} séquences`,
                detail: `De ${rows[runStart].label} à ${rows[i - 1].label}, la note ne bouge pas (${curve[runStart]}).`
              });
            }
            runStart = i;
          }
        }

        // Placement du pic : un sommet trop tôt laisse la suite retomber
        const peak = Math.max(...rated);
        const peakIndex = curve.findIndex(v => v === peak);
        if (peakIndex >= 0 && peakIndex < rows.length * CLIMAX_POSITION) {
          findings.push({
            id: 'pic-precoce',
            level: 'info',
            sequenceId: rows[peakIndex].id,
            title: 'Sommet de tension précoce',
            detail: `Le maximum (${peak}) tombe en ${rows[peakIndex].label}, soit au premier ${Math.round(CLIMAX_POSITION * 100)} % du récit.`
          });
        }
      }

      const unrated = curve.filter(v => v === null).length;
      if (unrated && unrated < rows.length) {
        findings.push({
          id: 'notation-partielle',
          level: 'info',
          title: `${unrated} séquence${unrated > 1 ? 's' : ''} sans note de ${criteria.name.toLowerCase()}`,
          detail: 'Les courbes s\'interrompent sur ces séquences.'
        });
      }
    }

    // Absences prolongées : un personnage qui disparaît trop longtemps sort
    // de la mémoire du lecteur avant de revenir.
    const presence = new Map<number, { personnage: any; indices: number[] }>();
    rows.forEach((row, index) => {
      (row.sequence.sequencePersonnages ?? []).forEach((link: any) => {
        if (!link.personnage) return;
        const entry = presence.get(link.personnage.id)
          ?? { personnage: link.personnage, indices: [] };
        entry.indices.push(index);
        presence.set(link.personnage.id, entry);
      });
    });

    presence.forEach(({ personnage, indices }) => {
      for (let i = 1; i < indices.length; i++) {
        const gap = indices[i] - indices[i - 1] - 1;
        if (gap >= LONG_ABSENCE) {
          findings.push({
            id: `absence-${personnage.id}-${i}`,
            level: 'info',
            sequenceId: rows[indices[i]].id,
            title: `${personnageStore.getPersonnageName(personnage)} absent ${gap} séquences`,
            detail: `Entre ${rows[indices[i - 1]].label} et ${rows[indices[i]].label}.`
          });
          break; // un signalement par personnage suffit
        }
      }
    });

    return findings;
  });

  const allFindings = computed(() => [
    ...globalFindings.value,
    ...[...findingsBySequence.value.values()].flat()
  ]);

  const countFor = (sequenceId: number) => findingsBySequence.value.get(sequenceId)?.length ?? 0;

  return { sequences, findingsBySequence, globalFindings, allFindings, countFor };
};
