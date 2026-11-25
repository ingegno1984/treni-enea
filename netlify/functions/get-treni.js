   const axios = require('axios');
   const cheerio = require('cheerio');

   exports.handler = async (event) => {
     try {
       const placeId = event.queryStringParameters?.placeId || '2247';
       if (!['2247', '1881'].includes(placeId)) {
         return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'PlaceId non valido' }) };
       }
       const url = 'https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor?Arrivals=False&Search=&PlaceId=' + placeId;
       const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } });
       const $ = cheerio.load(data);
       const treni = [];
       $('table tbody tr').each((i, el) => {
         const cols = $(el).find('td');
         if (cols.length >= 7) {
           const treno = $(cols[2]).text().trim();
           if (!/^\d+$/.test(treno)) return;
           const rit = $(cols[5]).text().trim();
           treni.push({
             treno,
             destinazione: $(cols[3]).text().trim(),
             orario: $(cols[4]).text().trim(),
             ritardo: rit ? (/^\d+$/.test(rit) ? rit + ' min' : rit) : 'In orario',
             binario: $(cols[6]).text().trim()
           });
         }
       });
       return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ treni }) };
     } catch (error) {
       return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message }) };
     }
   };
