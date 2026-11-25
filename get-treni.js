const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async (event) => {
  try {
    // Leggiamo il placeId dalla URL (?placeId=2247 o ?placeId=1881)
    const placeId = event.queryStringParameters?.placeId || '2247';
    
    // Validazione: accettiamo solo placeId noti per sicurezza
    const placeIdsValidi = ['2247', '1881'];
    if (!placeIdsValidi.includes(placeId)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'PlaceId non valido' })
      };
    }

    // URL dinamica in base alla stazione scelta
    const url = `https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor?Arrivals=False&Search=&PlaceId=${placeId}`;
    
    // Scarichiamo la pagina fingendo di essere un browser normale
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
      }
    });

    // Carichiamo l'HTML in cheerio per leggerlo facilmente
    const $ = cheerio.load(data);
    const treni = [];
    
    // Leggiamo ogni riga della tabella dei treni
    $('table tbody tr').each((i, el) => {
      const cols = $(el).find('td');
      if (cols.length >= 7) {
        const treno = $(cols[2]).text().trim();
        const destinazione = $(cols[3]).text().trim();
        const orario = $(cols[4]).text().trim();
        const ritardo = $(cols[5]).text().trim() || 'In orario';
        const binario = $(cols[6]).text().trim();
        
        // Aggiungiamo tutti i treni (il filtraggio a 3 lo farà il frontend)
        treni.push({ treno, destinazione, orario, ritardo, binario });
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ treni, stazione: placeId })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};