import { computed, type Ref } from 'vue';
import { useProjectStore } from '~/store/project';
import type { TodoDraft } from '~/types';

type ArcStep = { step: string; fromSequenceId: number | null; toSequenceId: number | null };

/**
 * Contrôles immédiats, sans modèle, sur ce que l'auteur a saisi (arcs et
 * présence dans le récit), et traduction de la dernière vérification en
 * tâches de la todo.
 */
export function usePersonnageChecks(personnage: Ref<any>) {
  const projectStore = useProjectStore();

  /** Rang de chaque séquence dans le récit */
  const order = computed(() => {
    const map = new Map<number, { index: number; name: string }>();
    let index = 0;
    projectStore.parts.forEach((part: any) => {
      (part.sequences ?? []).forEach((sequence: any) => {
        map.set(sequence.id, { index: index++, name: sequence.name });
      });
    });
    return map;
  });

  /** Rangs des séquences où le personnage est assigné */
  const appearances = computed(() => {
    const indices = new Set<number>();
    projectStore.parts.forEach((part: any) => {
      (part.sequences ?? []).forEach((sequence: any) => {
        if ((sequence.sequencePersonnages ?? []).some((l: any) => l.personnage?.id === personnage.value?.id)) {
          const rank = order.value.get(sequence.id);
          if (rank) indices.add(rank.index);
        }
      });
    });
    return indices;
  });

  const sequenceName = (id: number) => order.value.get(id)?.name ?? `#${id}`;

  /** Étapes de l'arc, rattachées par l'auteur ou à défaut celles du référentiel */
  const stepsOf = (pna: any): ArcStep[] => {
    const source = pna.steps?.length ? pna.steps : (pna.narrativeArc?.steps ?? []);
    return source.map((s: any) => typeof s === 'string'
      ? { step: s, fromSequenceId: null, toSequenceId: null }
      : { step: s.step ?? '', fromSequenceId: s.fromSequenceId ?? null, toSequenceId: s.toSequenceId ?? null });
  };

  /** Première et dernière séquence d'une liste, dans l'ordre du récit */
  const boundsOf = (sequenceIds: number[]) => {
    const ranked = sequenceIds
      .filter(id => order.value.has(id))
      .sort((a, b) => order.value.get(a)!.index - order.value.get(b)!.index);
    return ranked.length
      ? { fromSequenceId: ranked[0], toSequenceId: ranked[ranked.length - 1] }
      : null;
  };

  /** Constats sur la saisie des arcs, étape par étape, indexés par arc */
  const arcChecks = computed(() => {
    const map = new Map<number, { issues: string[]; stepIssues: Map<number, string[]> }>();

    (personnage.value?.personnageNarrativeArcs ?? []).forEach((pna: any) => {
      const issues: string[] = [];
      const stepIssues = new Map<number, string[]>();
      const pushStep = (index: number, issue: string) => {
        if (!stepIssues.has(index)) stepIssues.set(index, []);
        stepIssues.get(index)!.push(issue);
      };

      const from = pna.fromSequence ? order.value.get(pna.fromSequence.id)?.index : undefined;
      const to = pna.toSequence ? order.value.get(pna.toSequence.id)?.index : undefined;
      if (from !== undefined && to !== undefined && to < from) {
        issues.push('L\'arc se termine avant de commencer.');
      }

      let previousStart: number | null = null;
      stepsOf(pna).forEach((step, index) => {
        const start = step.fromSequenceId ? order.value.get(step.fromSequenceId)?.index : undefined;
        const end = step.toSequenceId ? order.value.get(step.toSequenceId)?.index : undefined;

        if (start === undefined && end === undefined) {
          pushStep(index, 'Aucune séquence rattachée.');
          return;
        }

        const low = start ?? end!;
        const high = end ?? start!;
        if (high < low) pushStep(index, 'La séquence de fin précède celle de début.');

        if (previousStart !== null && low < previousStart) {
          pushStep(index, 'Placée avant l\'étape précédente.');
        }
        previousStart = low;

        // Le personnage doit être présent là où son arc se joue
        let present = false;
        for (let i = Math.min(low, high); i <= Math.max(low, high); i++) {
          if (appearances.value.has(i)) { present = true; break; }
        }
        if (!present) pushStep(index, 'Le personnage n\'est assigné à aucune de ces séquences.');
      });

      map.set(pna.id, { issues, stepIssues });
    });

    return map;
  });

  const globalChecks = computed(() => {
    const issues: string[] = [];
    if (personnage.value?.level === 1 && !personnage.value?.personnageNarrativeArcs?.length) {
      issues.push('Personnage principal sans arc narratif.');
    }
    if (personnage.value?.level === 1 && !personnage.value?.personnageDramaticFunctions?.length) {
      issues.push('Personnage principal sans fonction dramatique.');
    }
    if (!appearances.value.size) {
      issues.push('Le personnage n\'est assigné à aucune séquence.');
    }
    return issues;
  });

  /**
   * Chaque constat devient une tâche de la todo. La clé reprend le constat
   * lui-même : relancer l'analyse ne recrée ni ce qui est ouvert, ni ce que
   * l'auteur a déjà coché ou supprimé.
   */
  const todoDrafts = (): TodoDraft[] => {
    const p = personnage.value;
    const verification = p?.verification;
    const name = `${p.firstName} ${p.lastName ?? ''}`.trim();
    const key = (...parts: Array<string | number>) => `perso:${p.id}:` + parts.join(':').toLowerCase();
    const base = { origin: 'verification-personnage', personnageId: p.id };
    const drafts: TodoDraft[] = [];

    globalChecks.value.forEach(issue => drafts.push({
      ...base, category: 'personnage', label: `${name} : ${issue}`, dedupeKey: key('global', issue)
    }));

    (p.personnageNarrativeArcs ?? []).forEach((pna: any) => {
      const arcName = pna.narrativeArc?.name ?? 'Arc';
      const checks = arcChecks.value.get(pna.id);
      const verdict = verification?.arcs?.verdicts?.find((v: any) => v.personnageNarrativeArcId === pna.id);

      checks?.issues.forEach(issue => drafts.push({
        ...base, category: 'structure', label: `${name}, arc « ${arcName} » : ${issue}`, dedupeKey: key('arc', pna.id, issue)
      }));

      stepsOf(pna).forEach((step, index) => {
        (checks?.stepIssues.get(index) ?? []).forEach(issue => drafts.push({
          ...base,
          category: 'structure',
          label: `${name}, étape « ${step.step} » : ${issue}`,
          dedupeKey: key('arc', pna.id, 'step', index, issue),
          sequenceId: step.fromSequenceId
        }));

        const stepVerdict = verdict?.steps?.find((s: any) => s.index === index);
        if (stepVerdict?.status === 'absent') drafts.push({
          ...base,
          category: 'personnage',
          label: `${name}, étape « ${step.step} » absente du texte${stepVerdict.suggestion ? ` — piste : ${stepVerdict.suggestion.text}` : ''}`,
          dedupeKey: key('arc', pna.id, 'step', index, 'absent'),
          sequenceId: stepVerdict.suggestion?.sequenceId ?? step.fromSequenceId
        });
      });
    });

    (verification?.functions?.verdicts ?? []).forEach((verdict: any) => {
      if (verdict.status !== 'absent') return;
      drafts.push({
        ...base,
        category: 'personnage',
        label: `${name}, fonction « ${verdict.functionName} » absente du texte${verdict.suggestion ? ` — piste : ${verdict.suggestion.text}` : ''}`,
        dedupeKey: key('fonction', verdict.personnageDramaticFunctionId, 'absent'),
        sequenceId: verdict.suggestion?.sequenceId ?? null
      });
    });

    (verification?.contradictions ?? []).forEach((text: string) => drafts.push({
      ...base, category: 'continuite', label: `${name} : ${text}`, dedupeKey: key('contradiction', text)
    }));
    (verification?.novelties ?? []).forEach((text: string) => drafts.push({
      ...base, category: 'personnage', label: `${name}, à reporter dans la fiche : ${text}`, dedupeKey: key('nouveaute', text)
    }));

    return drafts;
  };

  return { order, sequenceName, stepsOf, boundsOf, arcChecks, globalChecks, todoDrafts };
}
