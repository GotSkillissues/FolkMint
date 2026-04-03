const https = require('https');
https.get('https://www.aarong.com/bgd/home-decor/decor/vases', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    let matches = [];
    const regex = /<img.*?class="product-image-photo[^"]*".*?src="([^"]+)".*?alt="([^"]+)"/g;
    let m;
    while ((m = regex.exec(data)) !== null) {
      if(m[1].includes('catalog/product')) {
        matches.push({img: m[1], name: m[2]});
      }
    }
    
    // Fallback if structured differently:
    if(matches.length === 0) {
      const imgRegex = /<img.*?src="([^"]+)".*?alt="([^"]+)"/g;
      while ((m = imgRegex.exec(data)) !== null) {
        if(m[1].includes('aarong.com/media/catalog/product')) {
          matches.push({img: m[1], name: m[2]});
        }
      }
    }
    console.log(JSON.stringify(matches.slice(0, 10), null, 2));
  });
});
