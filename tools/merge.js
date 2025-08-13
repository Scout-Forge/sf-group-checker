import fs from 'fs';

const nations = ['england','scotland','wales','roi','bso'];
let combined = { nations: [] };

nations.forEach(n => {
  const data = JSON.parse(fs.readFileSync(`data/${n}.json`,'utf8'));
  combined.nations.push(data);
});

fs.writeFileSync('data/groups.json', JSON.stringify(combined, null, 2));
console.log('groups.json updated');
