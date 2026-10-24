async function test() {
  const restaurantId = 'b27cc519-73e3-400a-97c0-9c516907adb4';

  const res1 = await fetch(`http://localhost:3000/api/menu/items?restaurantId=${restaurantId}`);
  const json1 = await res1.json();
  console.log('GET /api/menu/items: total array length =', json1.data.length);
  const wagyuInItems = json1.data.find(i => i.name === 'Wagyu Beef Steak');
  console.log('Wagyu in items:', { name: wagyuInItems?.name, hasAr: wagyuInItems?.hasAr, modelUrl: wagyuInItems?.modelUrl });

  const res3 = await fetch(`http://localhost:3000/api/menu?restaurantId=${restaurantId}`);
  const json3 = await res3.json();
  const menuCategories = Object.keys(json3.menu || {});
  console.log('GET /api/menu: categories =', menuCategories);
  for (const cat of menuCategories) {
    const items = json3.menu[cat];
    const arItems = items.filter(i => i.hasAr);
    if (arItems.length > 0) {
      console.log(`Category "${cat}" has AR items:`, arItems.map(i => ({ name: i.name, hasAr: i.hasAr, modelUrl: i.modelUrl })));
    }
  }
}
test().catch(console.error);
