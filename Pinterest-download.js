const https = require('https');

const getInitialAuth = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'id.pinterest.com',
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      },
    };

    https.get(options, (res) => {
      const cookies = res.headers['set-cookie'];
      if (cookies) {
        const csrfCookie = cookies.find(cookie => cookie.startsWith('csrftoken='));
        const pinterestSessCookie = cookies.find(cookie => cookie.startsWith('_pinterest_sess='));

        if (csrfCookie && pinterestSessCookie) {
          const csrftoken = csrfCookie.split(';')[0].split('=')[1];
          const sess = pinterestSessCookie.split(';')[0];
          resolve({ csrftoken, cookieHeader: `csrftoken=${csrftoken}; ${sess}` });
          return;
        }
      }
      reject(new Error('Gagal mendapatkan CSRF token atau session cookie.'));
    }).on('error', e => reject(e));
  });
};

const searchPinterestAPI = async (query, limit) => {
  try {
    const { csrftoken, cookieHeader } = await getInitialAuth();
    let results = [];
    let bookmark = null;
    let keepFetching = true;

    console.log('Berhasil mendapatkan token, memulai pengambilan data pin...');

    while (keepFetching && results.length < limit) {
      const postData = {
        options: {
          query: query,
          scope: 'pins',
          bookmarks: bookmark ? [bookmark] : [],
        },
        context: {},
      };
      
      const sourceUrl = `/search/pins/?q=${encodeURIComponent(query)}`;
      const dataString = `source_url=${encodeURIComponent(sourceUrl)}&data=${encodeURIComponent(JSON.stringify(postData))}`;

      const options = {
        hostname: 'id.pinterest.com',
        path: '/resource/BaseSearchResource/get/',
        method: 'POST',
        headers: {
          'Accept': 'application/json, text/javascript, */*, q=0.01',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': csrftoken,
          'X-Pinterest-Source-Url': sourceUrl,
          'Cookie': cookieHeader,
        },
      };

      const responseBody = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', chunk => (body += chunk));
          res.on('end', () => resolve(body));
        });
        req.on('error', e => reject(e));
        req.write(dataString);
        req.end();
      });

      const jsonResponse = JSON.parse(responseBody);

      if (jsonResponse.resource_response && jsonResponse.resource_response.data && jsonResponse.resource_response.data.results) {
        const pins = jsonResponse.resource_response.data.results;
        
        pins.forEach(pin => {
          if (pin.images && pin.images['736x']) {
            results.push(pin.images['736x'].url);
          } else if (pin.images && pin.images['orig']) {
            results.push(pin.images['orig'].url);
          }
        });
        
        bookmark = jsonResponse.resource_response.bookmark;
        if (!bookmark || pins.length === 0) {
          console.log('Tidak ada bookmark lagi atau tidak ada hasil tambahan.');
          keepFetching = false;
        } else {
           console.log(`Berhasil mendapatkan ${results.length} dari ${limit} gambar. Melanjutkan dengan bookmark berikutnya...`);
        }
      } else {
        console.log('Struktur respons tidak sesuai, menghentikan pencarian.');
        keepFetching = false;
      }
    }
    
    return results.slice(0, limit);

  } catch (error) {
    throw new Error(`Terjadi kesalahan: ${error.message}`);
  }
};

(async () => {
  const query = process.argv[2];
  const limit = parseInt(process.argv[3], 10) || 10;

  if (!query) {
    console.log(JSON.stringify({ error: 'Penggunaan: node pinn.js "query" [jumlah]' }, null, 2));
    process.exit(1);
  }

  try {
    console.log(`Mencari ${limit} gambar untuk query: "${query}"...`);
    const results = await searchPinterestAPI(query, limit);
    console.log(JSON.stringify(results, null, 2));
    console.log(`\nBerhasil mendapatkan ${results.length} gambar.`);
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }, null, 2));
  }
})();