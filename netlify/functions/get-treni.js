const axios = require('axios');
const cheerio = require('cheerio');

const CONFIG = {
  'portici-napoli': {
    placeId: '2247',
    label: 'Portici-Ercolano → Napoli',
    test: (dest, fermate) => /NAPOLI/.test(dest) || /PIETRARSA|NA PIAZZA GARIB|NAPOLI GIANTURCO|NAPOLI S\.G\.BARRA/.test(fermate)
  },
  'napoli-portici': {
    placeId: '1881',
    label: 'Napoli P.za Leopardi → Portici',
    test: (dest, fermate) => /PORTICI/.test(fermate) || /SALERNO/.test(dest)
  }
};

exports.handler = async (event) => {
  try {
    const dir = event.queryStringParameters?.dir || 'portici-napoli';
    const cfg = CONFIG[dir];
    if (!cfg) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Tratta non valida' }) };
    }
    const url = 'https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor?Arrivals=False&Search=&PlaceId=' + cfg.placeId;
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const $ = cheerio.load(data);
    const treni = [];
    $('table tbody tr').each((i, el) => {
      const c = $(el).find('td');
      if (c.length < 7) return;
      const treno = $(c[2]).text().trim();
      if (!/^\d+$/.test(treno)) return;
      const dest = $(c[3]).text().trim();
      const fermate = c.length > 8 ? $(c[8]).text().replace(/\s+/g, ' ').trim() : '';
      if (!cfg.test(dest, fermate)) return;
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
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ treni, tratta: cfg.label }) };
  } catch (error) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message }) };
  }
};
