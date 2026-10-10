import { h } from '../util.js';
import { sheet, btn } from '../ui/components.js';
import { draftSession } from '../state.js';
import { openMeasure } from './measures.js';
import { go } from '../router.js';

// Menu compact « Ajouter » : séance, activité hors salle, mesure.
export function openAddMenu() {
  const draft = draftSession();
  const sh = sheet({ title: 'Ajouter', content: h('div', { class: 'add-menu' },
    btn(draft ? 'Reprendre ma séance en salle' : 'Séance en salle', () => { sh.close(); go('#/seance'); }, { iconName: 'seance' }),
    btn('Activité hors salle', () => { sh.close(); go('#/activite/nouvelle'); }, { iconName: 'bike' }),
    btn('Mesure (poids, tour de taille…)', () => { sh.close(); openMeasure(null); }, { iconName: 'scale' })) });
}
