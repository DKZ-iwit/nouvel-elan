import { h, clear, fmtDate, todayISO, addDays } from '../util.js';
import { S, saveProfile, companionProgress } from '../state.js';
import { ANIMALS, FUR_COLORS, SECONDARY_COLORS, stageOf } from '../companion/art.js';
import { ITEMS, ITEMS_BY_ID, COLLECTIONS, SLOTS, itemsAtLevel, MAX_LEVEL } from '../companion/wardrobe.js';
import { renderCompanion, companionName, confetti } from '../companion/view.js';
import { newCompanion, RULES, RULE_NOTES, LEVEL_THRESHOLDS } from '../engine/companion.js';
import { btn, iconBtn, icon, field, textInput, segmented, pageHeader, section, note, sheet, toast } from '../ui/components.js';
import { go, rerender } from '../router.js';

const defaultColors = (animal) => ({ fur: ANIMALS[animal].fur, secondary: ANIMALS[animal].secondary });

// Carte compacte (accueil)
export function companionCard(p, { compact = false } = {}) {
  const c = p.companion;
  const prog = companionProgress(p);
  const wrap = h('a', { class: 'card card-companion comp-card', href: '#/compagnon', style: { textDecoration: 'none', color: 'inherit' } });
  const reaction = S.pendingReaction || null;
  S.pendingReaction = null;
  const art = h('div', {}, renderCompanion(c, { level: prog.level, decor: false, reaction }));
  const pct = prog.isMax ? 100 : Math.round((prog.points - prog.prevAt) / (prog.nextAt - prog.prevAt) * 100);
  const nextItems = prog.isMax ? [] : itemsAtLevel(prog.level + 1);
  wrap.append(art, h('div', { class: 'stack-sm' },
    h('div', { class: 'row-between' }, h('span', { class: 'comp-name', text: companionName(c) }), h('span', { class: 'tag', text: `Niveau ${prog.level}` })),
    h('div', { class: 'xp', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': 'Progression vers le niveau suivant' }, h('span', { style: { width: pct + '%' } })),
    h('p', { class: 'fine', text: prog.isMax ? `${prog.points} points : toute la garde-robe est débloquée.` : `Encore ${prog.toNext} points pour le niveau ${prog.level + 1}${nextItems.length && !compact ? ` : ${nextItems.map(i => i.name.toLowerCase()).slice(0, 2).join(', ')}…` : '.'}` })));
  return wrap;
}

// Invitation à choisir un compagnon (non bloquante)
export function adoptInvite(p) {
  return h('div', { class: 'card card-companion' },
    h('p', { class: 'card-title', text: 'Choisis ton compagnon' }),
    h('div', { class: 'welcome-pets', 'aria-hidden': 'true' }, ...Object.keys(ANIMALS).map(a => renderCompanion({ animal: a }, { decor: false }))),
    h('p', { class: 'fine', text: 'Gorille, ours, chat, chien ou loutre : il évolue avec tes séances et tes activités. Le choix est purement esthétique.' }),
    h('div', { class: 'row' },
      btn('Choisir', () => go('#/compagnon'), { kind: 'primary', small: true, iconName: 'paw' }),
      btn('Plus tard', async () => { p.companionDeferredUntil = addDays(todayISO(), 7); await saveProfile(p, { rebuild: false }); rerender(); }, { small: true, kind: 'ghost' })));
}

export function shouldInvite(p) {
  return !p.companion && (!p.companionDeferredUntil || p.companionDeferredUntil <= todayISO());
}

// Célébration d'un passage de niveau (une seule fois)
export function celebrate(levelUp, newlyUnlocked) {
  const p = S.profile, c = p.companion;
  if (!levelUp || !c) return;
  const stage = h('div', { class: 'comp-stage' }, renderCompanion(c, { level: levelUp.to, reaction: 'auto' }));
  const items = (newlyUnlocked || []).map(id => ITEMS_BY_ID[id]).filter(Boolean);
  const sh = sheet({ title: `Niveau ${levelUp.to} !`, content: h('div', { class: 'stack' }, stage,
    h('p', { class: 'lead', text: `${companionName(c)} passe au niveau ${levelUp.to}.` }),
    items.length ? h('p', { class: 'muted', text: 'Nouveautés : ' + items.map(i => i.name.toLowerCase()).join(', ') + '.' }) : null),
  actions: [btn('Voir la garde-robe', () => { sh.close(); go('#/compagnon?onglet=garde-robe'); }), btn('Super', () => sh.close(), { kind: 'primary' })] });
  confetti(stage, c);
}

function welcomeSynthesis(c, prog) {
  const unlocked = c.unlocked.length;
  sheet({ title: `Bienvenue, ${companionName(c)} !`, content: h('div', { class: 'stack' },
    h('div', { class: 'comp-stage' }, renderCompanion(c, { level: prog.level, reaction: 'salut' })),
    prog.points ? h('p', { class: 'lead', text: `Ton historique compte déjà : ${prog.points} points, niveau ${prog.level}.` }) : h('p', { class: 'lead', text: 'Chaque séance terminée et chaque activité enregistrée le feront évoluer.' }),
    h('p', { class: 'muted', text: `${unlocked} pièce${unlocked > 1 ? 's' : ''} déjà disponible${unlocked > 1 ? 's' : ''} dans la garde-robe.` })),
  actions: [] });
}

function chooser(root, p, { change = false } = {}) {
  const cur = p.companion;
  let animal = cur?.animal || null;
  let name = cur?.name || '';
  const preview = h('div', { class: 'comp-stage' });
  const drawPreview = () => preview.replaceChildren(animal ? renderCompanion({ ...(cur || {}), animal, colors: change ? cur.colors : defaultColors(animal) }, { level: cur?.level || 1, reaction: 'salut' }) : h('p', { class: 'muted', text: 'Choisis un animal pour voir l’aperçu.' }));
  const grid = h('div', { class: 'animal-grid', role: 'group', 'aria-label': 'Animal' });
  const drawGrid = () => {
    clear(grid);
    for (const [k, A] of Object.entries(ANIMALS)) grid.append(h('button', { type: 'button', class: 'animal-btn', 'aria-pressed': String(animal === k), onclick: () => { animal = k; drawGrid(); drawPreview(); } },
      renderCompanion({ animal: k }, { decor: false }), h('span', { text: A.label })));
  };
  drawGrid(); drawPreview();
  root.append(preview, section(change ? 'Changer d’animal' : 'Ton compagnon', grid,
    h('p', { class: 'fine', text: 'Le choix est esthétique : tous les animaux suivent les mêmes règles, évoluent de la même façon et portent toutes les tenues.' }),
    field('Son nom', textInput(name, { placeholder: 'Facultatif', maxlength: 30, oninput: v => { name = v; } })),
    h('div', { class: 'form-actions' },
      change ? btn('Annuler', () => go('#/compagnon'), { kind: 'ghost' }) : null,
      btn(change ? 'Enregistrer' : 'Adopter', async () => {
        if (!animal) { toast('Choisis un animal.', { kind: 'error' }); return; }
        if (change) {
          // Points, niveau et pièces débloquées sont conservés ; seules l'espèce et les couleurs par défaut changent.
          const same = cur.animal === animal;
          p.companion = { ...cur, animal, name: name.trim(), colors: same ? cur.colors : { fur: null, secondary: null } };
          await saveProfile(p, { rebuild: false });
          toast('Compagnon mis à jour. Progression et garde-robe conservées.');
          go('#/compagnon');
          return;
        }
        const prog = companionProgress(p);
        p.companion = newCompanion({ animal, name: name.trim() }, prog);
        p.companion.welcomeShown = true;
        await saveProfile(p, { rebuild: false });
        go('#/compagnon');
        welcomeSynthesis(p.companion, prog);
      }, { kind: 'primary' }))));
}

function itemSheet(p, item, onDone) {
  const c = p.companion;
  const prog = companionProgress(p);
  const unlocked = c.unlocked.includes(item.id);
  const equipped = Object.values(c.equipped || {}).includes(item.id);
  const content = h('div', { class: 'stack' },
    h('div', { class: 'comp-stage' }, renderCompanion(c, { level: prog.level, tryOn: { [item.slot]: item.id, ...(item.slot === 'tenue' ? {} : {}) }, title: `Aperçu : ${item.name}` })),
    h('p', { class: 'muted', text: item.desc }),
    h('p', { class: 'fine', text: `${COLLECTIONS[item.collection]} · ${SLOTS[item.slot]} · ${unlocked ? 'débloquée' : `débloquée au niveau ${item.level}`}` }),
    item.slot === 'tenue' ? h('p', { class: 'fine', text: 'Une tenue complète remplace le haut et le bas portés.' }) : null,
    (item.slot === 'haut' || item.slot === 'bas') && c.equipped?.tenue ? h('p', { class: 'fine', text: 'Cette pièce retirera la tenue complète portée.' }) : null);
  const sh = sheet({ title: item.name, content, actions: [
    btn('Fermer', () => sh.close(), { kind: 'ghost' }),
    unlocked ? btn(equipped ? 'Retirer' : 'Équiper', async () => {
      const eq = { ...(c.equipped || {}) };
      let msg = '';
      if (equipped) { for (const [k, v] of Object.entries(eq)) if (v === item.id) delete eq[k]; msg = `${item.name} retiré.`; }
      else {
        if (item.slot === 'tenue' && (eq.haut || eq.bas)) { delete eq.haut; delete eq.bas; msg = ' Haut et bas retirés.'; }
        if ((item.slot === 'haut' || item.slot === 'bas') && eq.tenue) { delete eq.tenue; msg = ' Tenue complète retirée.'; }
        eq[item.slot] = item.id; msg = `${item.name} équipé.` + msg;
      }
      p.companion = { ...c, equipped: eq };
      await saveProfile(p, { rebuild: false });
      sh.close(); toast(msg);
      onDone && onDone(!equipped);
    }, { kind: 'primary' }) : btn(`Niveau ${item.level} requis`, () => {}, { disabled: true }),
  ] });
}

function wardrobeTab(body, p, prog) {
  let filter = 'tout';
  const c = p.companion;
  const stage = h('div', { class: 'comp-stage' }, renderCompanion(c, { level: prog.level }));
  const grid = h('div', { class: 'wardrobe' });
  const decor = h('div', { class: 'wardrobe' });
  const card = (item) => {
    const unlocked = c.unlocked.includes(item.id);
    const on = Object.values(c.equipped || {}).includes(item.id);
    return h('button', { type: 'button', class: `ward-item${unlocked ? '' : ' locked'}`, 'aria-pressed': String(on), onclick: () => itemSheet(p, item, (equippedNow) => { stage.replaceChildren(renderCompanion(p.companion, { level: prog.level, reaction: equippedNow ? 'joie' : null })); draw(); }) },
      renderCompanion({ ...c, equipped: item.slot === 'decor' ? { decor: item.id } : {} }, { level: 1, tryOn: item.slot === 'decor' ? {} : { [item.slot]: item.id }, decor: item.slot === 'decor', expression: 'calme', title: item.name }),
      h('span', { text: item.name }),
      h('span', { class: 'ward-state', text: on ? 'Porté' : unlocked ? 'Libre' : `Niv. ${item.level}` }));
  };
  const draw = () => {
    clear(grid); clear(decor);
    ITEMS.filter(i => i.collection !== 'decor' && (filter === 'tout' || i.collection === filter)).sort((a, b) => a.level - b.level || a.slot.localeCompare(b.slot)).forEach(i => grid.append(card(i)));
    ITEMS.filter(i => i.collection === 'decor').forEach(i => decor.append(card(i)));
  };
  draw();
  body.append(stage,
    segmented({ tout: 'Tout', feminin: 'Féminin', masculin: 'Masculin', neutre: 'Non genré' }, filter, v => { filter = v || 'tout'; draw(); }, { label: 'Filtrer la garde-robe', cls: 'seg-wrap' }),
    h('p', { class: 'fine', text: 'Les filtres servent seulement à parcourir : toutes les pièces se mélangent librement, quel que soit l’animal.' }),
    grid, h('h2', { class: 'block-title', text: 'Décors' }), decor);
}

function appearanceTab(body, p, prog) {
  const c = p.companion;
  const colors = { ...(c.colors || {}) };
  const stage = h('div', { class: 'comp-stage' });
  const draw = () => stage.replaceChildren(renderCompanion({ ...c, colors }, { level: prog.level }));
  draw();
  const sw = (list, key) => h('div', { class: 'swatches', role: 'group', 'aria-label': key === 'fur' ? 'Couleur principale' : 'Couleur secondaire' },
    ...list.map(col => h('button', { type: 'button', class: 'swatch', style: { background: col }, 'aria-label': col, 'aria-pressed': String((colors[key] || ANIMALS[c.animal][key]) === col), onclick: (e) => {
      colors[key] = col; e.currentTarget.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); draw();
    } })));
  body.append(stage,
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Pelage' }), sw(FUR_COLORS, 'fur')),
    h('div', { class: 'field' }, h('span', { class: 'label', text: 'Ventre et museau' }), sw(SECONDARY_COLORS, 'secondary')),
    h('div', { class: 'form-actions' },
      btn('Couleurs d’origine', async () => { p.companion = { ...c, colors: { fur: null, secondary: null } }; await saveProfile(p, { rebuild: false }); rerender(); }, { kind: 'ghost' }),
      btn('Enregistrer les couleurs', async () => { p.companion = { ...c, colors }; await saveProfile(p, { rebuild: false }); toast('Couleurs enregistrées.'); rerender(); }, { kind: 'primary' })),
    section('Animal et nom', h('p', { class: 'muted', text: `${companionName(c)}, ${ANIMALS[c.animal].label.toLowerCase()}.` }),
      btn('Changer d’animal ou de nom', () => go('#/compagnon?changer=1'), { iconName: 'swap' }),
      h('p', { class: 'fine', text: 'Les points, le niveau et les pièces débloquées sont conservés.' })),
    section('Affichage',
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !c.hidden, onchange: async (e) => { p.companion = { ...p.companion, hidden: !e.target.checked }; await saveProfile(p, { rebuild: false }); } }), ' Afficher sur l’accueil et pendant les séances'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: c.animations !== false, onchange: async (e) => { p.companion = { ...p.companion, animations: e.target.checked }; await saveProfile(p, { rebuild: false }); rerender(); } }), ' Animations'),
      h('p', { class: 'fine', text: 'Si ton téléphone demande de réduire les animations, elles restent coupées.' })));
}

function rewardsTab(body, p, prog) {
  const c = p.companion;
  const list = h('ul', { class: 'reward-list' });
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    const items = itemsAtLevel(lv);
    const reached = prog.level >= lv;
    list.append(h('li', {}, h('span', { class: 'reward-lv', text: `Niv. ${lv}` }),
      h('span', { class: 'grow' }, h('span', { class: 'block-txt', text: items.map(i => i.name).join(', ') }),
        h('span', { class: 'fine', text: `${LEVEL_THRESHOLDS[lv - 1]} points · étape d’évolution ${stageOf(lv)} sur 5${reached ? '' : ` · encore ${LEVEL_THRESHOLDS[lv - 1] - prog.points} points`}` })),
      reached ? icon('check', { size: 18 }) : null));
  }
  body.append(note('Chaque niveau débloque une pièce dans chacune des trois collections. Les étapes d’évolution ajoutent expressions, gestes et détails de décor ; la silhouette de l’animal ne change pas.'), list);
}

function rulesTab(body, p, prog) {
  const recent = prog.events.filter(e => e.points > 0).slice(-8).reverse();
  const ignored = prog.events.filter(e => e.points === 0).slice(-3).reverse();
  body.append(
    h('ul', { class: 'list' }, ...RULES.map(r => h('li', { class: 'list-row' }, h('span', { class: 'points-pill', text: `+${r.points}` }), h('span', { class: 'grow' }, h('span', { class: 'block-txt strong', text: r.label }), h('span', { class: 'fine', text: r.detail }))))),
    h('ul', { class: 'bullets fine' }, ...RULE_NOTES.map(t => h('li', { text: t }))),
    section('Derniers points gagnés', recent.length ? h('ul', { class: 'list' }, ...recent.map(e => h('li', { class: 'list-row' }, h('span', { class: 'grow' }, h('span', { class: 'block-txt', text: e.label }), h('span', { class: 'fine', text: fmtDate(e.date) })), h('span', { class: 'points-pill', text: `+${e.points}` })))) : h('p', { class: 'muted', text: 'Termine une séance ou enregistre une activité pour gagner tes premiers points.' }),
      ignored.length ? h('p', { class: 'fine', text: 'Sans points récemment : ' + ignored.map(e => `${e.label} du ${fmtDate(e.date)} (${e.note.toLowerCase()})`).join(' ; ') + '.' }) : null),
    h('p', { class: 'fine', text: 'Ta progression sportive (charges, régularité, mesures) se suit dans l’onglet Progrès. Le compagnon est un jeu et ne constitue pas une évaluation de ta santé.' }));
}

export function renderCompanionView(root, params) {
  const p = S.profile;
  if (!p.companion || params.get('changer')) {
    root.append(pageHeader(p.companion ? 'Mon compagnon' : 'Choisis ton compagnon', { back: p.companion ? '#/compagnon' : '#/accueil' }));
    chooser(root, p, { change: !!p.companion });
    return;
  }
  const c = p.companion;
  const prog = companionProgress(p);
  const tab = params.get('onglet') || 'apercu';
  root.append(pageHeader(companionName(c), { back: '#/profil', sub: `${ANIMALS[c.animal].label}, niveau ${prog.level}` }));
  const tabs = { apercu: 'Aperçu', 'garde-robe': 'Garde-robe', apparence: 'Apparence', recompenses: 'Récompenses', regles: 'Règles' };
  root.append(h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Rubriques du compagnon' }, ...Object.entries(tabs).map(([k, l]) => h('button', { type: 'button', role: 'tab', class: 'tab-btn', 'aria-selected': String(k === tab), onclick: () => go(`#/compagnon?onglet=${k}`) }, l))));
  const body = h('div', { class: 'stack', role: 'tabpanel' });
  root.append(body);
  if (tab === 'garde-robe') return wardrobeTab(body, p, prog);
  if (tab === 'apparence') return appearanceTab(body, p, prog);
  if (tab === 'recompenses') return rewardsTab(body, p, prog);
  if (tab === 'regles') return rulesTab(body, p, prog);
  const pct = prog.isMax ? 100 : Math.round((prog.points - prog.prevAt) / (prog.nextAt - prog.prevAt) * 100);
  const next = prog.isMax ? [] : itemsAtLevel(prog.level + 1);
  body.append(h('div', { class: 'comp-stage' }, renderCompanion(c, { level: prog.level })),
    h('div', { class: 'card' },
      h('div', { class: 'row-between' }, h('span', { class: 'card-title', text: `Niveau ${prog.level}` }), h('span', { class: 'points-pill', text: `${prog.points} points` })),
      h('div', { class: 'xp', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': 'Progression vers le niveau suivant' }, h('span', { style: { width: pct + '%' } })),
      h('p', { class: 'muted', text: prog.isMax ? 'Niveau maximal atteint : toute la garde-robe est débloquée.' : `Prochaine étape : niveau ${prog.level + 1} dans ${prog.toNext} points.` }),
      next.length ? h('p', { class: 'fine', text: 'À débloquer : ' + next.map(i => i.name.toLowerCase()).join(', ') + '.' }) : null),
    h('div', { class: 'row' },
      btn('Garde-robe', () => go('#/compagnon?onglet=garde-robe'), { iconName: 'shirt' }),
      btn('Comment gagner des points', () => go('#/compagnon?onglet=regles'), { iconName: 'info' })),
    h('p', { class: 'fine', text: `${c.unlocked.length} pièce(s) et décor(s) débloqué(s) sur ${ITEMS.length}.` }));
}

// Notification courte de points gagnés (activité, mesure) ; célébration si changement de niveau.
export function rewardToast(res) {
  if (!res || !S.profile?.companion) return;
  const pts = (res.newEvents || []).reduce((a, e) => a + e.points, 0);
  if (pts > 0) S.pendingReaction = 'salut';
  if (pts > 0) toast(`+${pts} points pour ${companionName(S.profile.companion)} (${res.newEvents.map(e => e.label.toLowerCase()).join(', ')})`, { kind: 'reward' });
  if (res.levelUp) setTimeout(() => celebrate(res.levelUp, res.newlyUnlocked), 400);
}
