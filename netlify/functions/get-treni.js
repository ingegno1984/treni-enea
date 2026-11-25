const axios = require('axios');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const HOME = 'https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Home';
const BOARD = 'https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor?Arrivals=False&Search=&PlaceId=';

const LINE = [
  { k: 'campi',         l: 'Napoli Campi Flegrei',            b: /NAPOLI CAMPI F\.?/,                                              home: ['NAPOLI CAMPI FLEGREI'] },
  { k: 'leopardi',      l: 'Napoli Piazza Leopardi',          b: /NA P\.? LEOPARDI|NAPOLI PIAZZA LEOPARDI|P\.? LEOPARDI/,          home: ['NAPOLI PIAZZA LEOPARDI'], id: '1881' },
  { k: 'mergellina',    l: 'Napoli Mergellina',               b: /NA\.?MERGELLINA|NAPOLI MERGELLINA|MERGELLINA/,                   home: ['NAPOLI MERGELLINA'] },
  { k: 'amedeo',        l: 'Piazza Amedeo',                   b: /PIAZZA AMEDEO|AMEDEO/,                                           home: ['PIAZZA AMEDEO'] },
  { k: 'montesanto',    l: 'Napoli Montesanto',               b: /NA\.? MONTESANTO|NAPOLI MONTESANTO|MONTESANTO/,                  home: ['NAPOLI MONTESANTO'] },
  { k: 'cavour',        l: 'Piazza Cavour',                   b: /PIAZZA CAVOUR|CAVOUR/,                                           home: ['PIAZZA CAVOUR'] },
  { k: 'garibaldi',     l: 'Napoli Piazza Garibaldi',         b: /NA PIAZZA GARIB|NAPOLI PIAZZA GARIBALDI|PIAZZA GARIBALDI/,       home: ['NAPOLI PIAZZA GARIBALDI'] },
  { k: 'gianturco',     l: 'Napoli Gianturco',                b: /NAPOLI GIANTURCO|GIANTURCO/,                                     home: ['NAPOLI GIANTURCO'] },
  { k: 'barra',         l: 'Napoli San Giovanni Barra',       b: /NAPOLI S\.?G\.?BARRA|NAPOLI S\.?GIOVANNI BARRA|S\.?G\.?BARRA/,   home: ['NAPOLI S.GIOVANNI BARRA', 'NAPOLI SAN GIOVANNI BARRA'] },
  { k: 'pietrarsa',     l: 'Pietrarsa-San Giorgio a Cremano', b: /PIETRARSA/,                                                      home: ['PIETRARSA-S.GIORGIO A CREMANO', 'PIETRARSA SAN GIORGIO A CREMANO', 'PIETRARSA'] },
  { k: 'portici',       l: 'Portici-Ercolano',                b: /PORTICI ERCOLANO|PORTICI-ERCOLANO|PORTICI/,                      home: ['PORTICI-ERCOLANO', 'PORTICI ERCOLANO'], id: '2247' },
  { k: 'torregreco',    l: 'Torre del Greco',                 b: /TORRE DEL GRECO/,                                                home: ['TORRE DEL GRECO'] },
  { k: 'smbruna',       l: 'Santa Maria la Bruna',            b: /S\.?MARIA LA BRUNA|SANTA MARIA LA BRUNA/,                        home: ['S.MARIA LA BRUNA', 'SANTA MARIA LA BRUNA'] },
  { k: 'torrecitta',    l: 'Torre Annunziata Città',          b: /TORRE A\.?CITTA|TORRE ANNUNZIATA CITTA/,                         home: ["TORRE ANNUNZIATA CITTA'", 'TORRE ANNUNZIATA CITTA'] },
  { k: 'torrecentrale', l: 'Torre Annunziata Centrale',       b: /TORRE A\.?CENTRALE|TORRE ANNUNZIATA CENTRALE/,                   home: ['TORRE ANNUNZIATA CENTRALE'] },
  { k: 'pompei',        l: 'Pompei',                          b: /POMPEI/,                                                         home: ['POMPEI'] },
  { k: 'scafati',       l: 'Scafati',                         b: /SCAFATI/,                                                        home: ['SCAFATI'] },
  { k: 'angri',         l: 'Angri',                           b: /ANGRI/,                                                          home: ['ANGRI'] },
  { k: 'pagani',        l: 'Pagani',                          b: /PAGANI/,                                                         home: ['PAGANI'] },
  { k: 'nocerainf',     l: 'Nocera Inferiore',                b: /NOCERA INFERIORE/,                                               home: ['NOCERA INFERIORE'] },
  { k: 'nocerasup',     l: 'Nocera Superiore',                b: /NOCERA SUPERIORE/,                                               home: ['NOCERA SUPERIORE'] },
  { k: 'cava',          l: "Cava de' Tirreni",                b: /CAVA DEI TIRRENI|CAVA DE.? TIRRENI/,                             home: ["CAVA DE' TIRRENI", 'CAVA DEI TIRRENI'] },
  { k: 'vietri',        l: 'Vietri sul Mare-Amalfi',          b: /VIETRI SUL MARE/,                                                home: ['VIETRI SUL MARE-AMALFI', 'VIETRI SUL MARE'] },
  { k: 'duomo',         l: 'Duomo-Vietri Vernieri',           b: /DUOMO V\.?VERNIERI|DUOMO VIETRI VERNIERI/,                       home: ['DUOMO-VIETRI VERNIERI', 'DUOMO V.VERNIERI'] },
  { k: 'salerno',       l: 'Salerno',                         b: /SALERNO/,                                                        home: ['SALERNO'] }
];
const IDX = {}; LINE.forEach((s, i) => { IDX[s.k] = i; });

let homeCache = { at: 0, map: null };
function norm(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

async function getHomeMap() {
  if (homeCache.map && Date.now() - homeCache.at < 6 * 3600e3) return homeCache.map;
  const { data } = await axios.get(HOME, { headers: { 'User-Agent': UA } });
  const map = {};
  let m;
  const re = /<a[^>]*[?&]placeId=(\d+)[^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = re.exec(data))) { const n = norm(m[2].replace(/<[^>]*>/g, '')); if (n && !map[n]) map[n] = m[1]; }
  if (!Object.keys(map).length) {
    const re2 = /placeId=(\d+)[^>]*>\s*([^<]{4,})</gi;
    while ((m = re2.exec(data))) { const n = norm(m[2]); if (n && !map[n]) map[n] = m[1]; }
  }
  homeCache = { at: Date.now(), map };
  return map;
}

async function resolveId(stop) {
  if (stop.id) return stop.id;
  let map;
  try { map = await getHomeMap(); } catch (e) { return null; }
  const aliases = stop.home.map(norm);
  for (const a of aliases) if (map[a]) return map[a];
  for (const a of aliases) for (const key in map) if (a.length >= 6 && (key.includes(a) || a.includes(key))) return map[key];
  return null;
}

exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const from = LINE.find(s => s.k === (q.from || 'portici'));
    const to = LINE.find(s => s.k === (q.to || 'garibaldi'));
    if (!from || !to) return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Stazione non valida' }) };
    if (from.k === to.k) return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Partenza e arrivo coincidono' }) };

    const id = await resolveId(from);
    if (!id) return { statusCode: 502, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Impossibile risolvere la stazione di partenza: ' + from.l }) };

    const { data } = await axios.get(BOARD + id, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(data);
    const oIdx = IDX[from.k], tIdx = IDX[to.k];
    const treni = [];

    $('table tbody tr').each((i, el) => {
      const c = $(el).find('td');
      if (c.length < 7) return;
      const treno = $(c[2]).text().trim();
      if (!/^\d+$/.test(treno)) return;
      const dest = $(c[3]).text().trim();
      const fermate = c.length > 8 ? $(c[8]).text().replace(/\s+/g, ' ').trim() : '';

      let include = false;
      if (fermate) {
        include = to.b.test(fermate);
      } else {
        let fIdx = -1;
        for (let j = 0; j < LINE.length; j++) { if (LINE[j].b.test(dest)) { fIdx = j; break; } }
        const south = fIdx === -1 ? false : fIdx > oIdx;
        include = south ? (tIdx > oIdx && tIdx <= fIdx) : (tIdx < oIdx && tIdx >= fIdx);
      }
      if (!include) return;

      const rit = $(c[5]).text().trim();
      treni.push({
        treno,
        destinazione: dest,
        orario: $(c[4]).text().trim(),
        ritardo: rit ? (/^\d+$/.test(rit) ? rit + ' min' : rit) : 'In orario',
        binario: $(c[6]).text().trim(),
        vettore: $(c[0]).text().trim(),
        categoria: $(c[1]).text().trim(),
        fermate
      });
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ treni, tratta: from.l + ' → ' + to.l, from: from.k, to: to.k, fromLabel: from.l, toLabel: to.l })
    };
  } catch (error) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message }) };
  }
};
