import {test,expect, type Page} from '@playwright/test';
async function records(page:Page) { return page.evaluate(async()=>{ const {db}=await import('/src/db/database.ts'); return db.vistorias.toArray(); }); }
async function start(page:Page, unit='101') {
 await page.getByPlaceholder('Nome do Condomínio').fill('TESTE AUTOMATIZADO');
 await page.getByPlaceholder('Ex: 132').fill(unit);
 await page.locator('select').first().selectOption('Geral');
 await page.getByRole('button',{name:'Iniciar Vistoria'}).click();
 await page.getByRole('button',{name:'Avançar',exact:true}).click();
 await page.getByRole('button',{name:'Avançar',exact:true}).click();
}
test('finalizar duas vistorias novas não sobrescreve registro, data, foto ou assinatura',async({page})=>{
 await page.clock.install({time:new Date('2026-11-13T14:00:00Z')});
 await page.goto('/'); await start(page);
 await page.getByRole('button',{name:'Finalizar Vistoria'}).click();
 await expect(page.getByRole('alert')).toContainText('parecer técnico');
 await page.locator('textarea').fill('Parecer de teste');
 const canvas=page.locator('canvas').first(); await canvas.scrollIntoViewIfNeeded();
 const box=(await canvas.boundingBox())!;
 for(let i=0;i<6;i++){await page.mouse.move(box.x+20,box.y+30+i*12);await page.mouse.down();await page.mouse.move(box.x+150,box.y+40+i*12,{steps:8});await page.mouse.up();}
 await page.setViewportSize({width:844,height:390});
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Finalizar Vistoria'}).click();
 await expect(page.getByRole('heading',{name:'Histórico de Vistorias'})).toBeVisible();
 let rows=await records(page);expect(rows).toHaveLength(1);expect(rows[0].assinatura_cliente).toMatch(/^data:image/);
 const first=rows[0];
 await page.clock.setSystemTime(new Date('2026-11-14T15:30:00Z'));
 await page.getByRole('button',{name:'Nova Vistoria',exact:true}).click();
 await expect(page.getByPlaceholder('Nome do Condomínio')).toHaveValue('');
 await start(page,'102');await page.locator('textarea').fill('Segundo parecer');
 await page.getByRole('button',{name:'Finalizar Vistoria'}).dblclick();
 await expect(page.getByRole('heading',{name:'Histórico de Vistorias'})).toBeVisible();
 rows=await records(page);expect(rows).toHaveLength(2);expect(rows[0]).toEqual(first);
 expect(rows[1].inspection_uid).not.toBe(first.inspection_uid);expect(rows[1].data).toBe('2026-11-14');expect(rows[1].hora).not.toBe(first.hora);expect(rows[1].assinatura_cliente).toBeUndefined();
 await page.reload();await page.getByRole('button',{name:'Ver Histórico'}).click();expect(await records(page)).toHaveLength(2);
});
test('editar conserva data original; Nova Vistoria não reutiliza id',async({page})=>{
 await page.goto('/');await start(page);await page.locator('textarea').fill('Original');await page.getByRole('button',{name:'Finalizar Vistoria'}).click();
 await expect(page.getByRole('heading',{name:'Histórico de Vistorias'})).toBeVisible();const old=(await records(page))[0];
 await page.getByRole('button',{name:'Editar',exact:true}).click();await expect(page.getByRole('status')).toContainText('Editando');
 await expect(page.locator('input[type=date]')).toHaveValue(old.data);
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Nova Vistoria',exact:true}).click();
 await start(page,'202');await page.locator('textarea').fill('Novo');await page.getByRole('button',{name:'Finalizar Vistoria'}).click();await expect(page.getByRole('heading',{name:'Histórico de Vistorias'})).toBeVisible();expect(await records(page)).toHaveLength(2);
});
test('falha de armazenamento mantém formulário e permite nova tentativa',async({page})=>{
 await page.goto('/');await start(page);await page.locator('textarea').fill('Não perder');
 await page.evaluate(async()=>{const {db}=await import('/src/db/database.ts');const original=db.vistorias.put.bind(db.vistorias);db.vistorias.put=async()=>{db.vistorias.put=original;throw new Error('QuotaExceededError de teste');};});
 await page.getByRole('button',{name:'Finalizar Vistoria'}).click();await expect(page.getByRole('alert')).toContainText('Seus dados continuam');await expect(page.locator('textarea')).toHaveValue('Não perder');
 await page.getByRole('button',{name:'Finalizar Vistoria'}).click();await expect(page.getByRole('heading',{name:'Histórico de Vistorias'})).toBeVisible();expect(await records(page)).toHaveLength(1);
});
test('nova vistoria pode ser cancelada sem descartar o formulário',async({page})=>{
 await page.goto('/');await page.getByPlaceholder('Nome do Condomínio').fill('Manter');page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Nova Vistoria',exact:true}).click();await expect(page.getByPlaceholder('Nome do Condomínio')).toHaveValue('Manter');
});
