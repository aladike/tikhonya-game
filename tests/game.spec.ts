import {test,expect} from '@playwright/test';
test('start, movement, jump, throw and help',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');await page.getByRole('button',{name:'Отправиться в приключение'}).click();
  await expect(page.locator('#hud')).toBeVisible();
  await page.keyboard.down('KeyW');await page.waitForTimeout(500);await page.keyboard.up('KeyW');
  await page.keyboard.press('Space');await page.keyboard.press('KeyQ');
  await expect(page.locator('#toast')).toContainText('Шишка');
  await page.getByRole('button',{name:'Как играть',exact:true}).click();await expect(page.locator('.help-grid')).toBeVisible();
  await page.getByRole('button',{name:'Закрыть',exact:true}).click();
  await page.screenshot({path:`test-results/play-${test.info().project.name}.png`});
  expect(errors).toEqual([]);
});
test('flower delivery and hiding keep the run playable',async({page})=>{
  await page.goto('./');await page.getByRole('button',{name:'Отправиться в приключение'}).click();
  await page.evaluate(async()=>{const game=(window as unknown as {__game: {position: {set: (x:number,y:number,z:number)=>void}}}).__game;game.position.set(0,0,-17);});
  await page.keyboard.press('KeyE');await expect(page.locator('#objective')).toHaveText('Отнеси цветок домой');
  await page.evaluate(async()=>{const game=(window as unknown as {__game: {position: {set: (x:number,y:number,z:number)=>void}}}).__game;game.position.set(-2,0,5);});
  await page.keyboard.press('KeyE');await expect(page.locator('#mode')).toHaveText('В укрытии');
  await page.keyboard.press('KeyE');await expect(page.locator('#mode')).not.toHaveText('В укрытии');
  await page.evaluate(async()=>{const game=(window as unknown as {__game: {position: {set: (x:number,y:number,z:number)=>void}}}).__game;game.position.set(0,0,10);});
  await page.keyboard.press('KeyE');await expect(page.locator('#toast')).toContainText('смелость');
  await expect(page.locator('#flower-count')).toHaveText('1');
});
test('helper finds resources, map unlocks and save survives reload',async({page})=>{
  await page.goto('./');await page.getByRole('button',{name:'Отправиться в приключение'}).click();
  await page.getByRole('button',{name:'Друзья'}).click();await page.locator('[data-command="fetch"]').click();
  await expect(page.locator('#toast')).toContainText('Палочка',{timeout:15000});
  await page.getByRole('button',{name:'Настройки',exact:true}).click();await expect(page.getByRole('button',{name:'Сохранить файл'})).toBeVisible();
  await page.reload();await page.getByRole('button',{name:'Отправиться в приключение'}).click();
  const wood=await page.evaluate(()=>JSON.parse(localStorage.getItem('tikhonya-save-v2')!).inventory.wood);expect(wood).toBeGreaterThan(0);
});
