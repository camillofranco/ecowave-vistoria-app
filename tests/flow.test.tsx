import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import {db} from '../src/db/database';
vi.mock('../src/components/Header',()=>({default:()=>null}));
vi.mock('../src/components/SignatureInput',()=>({default:()=>null}));
vi.mock('../src/components/PortalIntegration',()=>({PortalAccount:()=>null,PortalSend:()=>null}));
vi.mock('framer-motion',()=>({motion:{div:({children}: {children:React.ReactNode})=><div>{children}</div>}}));
const user=userEvent.setup();
beforeEach(async()=>{await db.vistorias.clear();vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-11-13T14:00:00Z'));});
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();});
async function start(unit='101'){
 await user.type(screen.getByPlaceholderText('Nome do Condomínio'),'TESTE');
 await user.type(screen.getByPlaceholderText('Ex: 132'),unit);
 await user.selectOptions(document.querySelector('select')!,'Geral');
 await user.click(screen.getByRole('button',{name:'Iniciar Vistoria'}));
 await user.click(screen.getByRole('button',{name:'Avançar',exact:true}));
 await user.click(screen.getByRole('button',{name:'Avançar',exact:true}));
}
async function finish(){await user.type(document.querySelector('textarea')!,'Parecer teste');await user.click(screen.getByRole('button',{name:'Finalizar Vistoria'}));await screen.findByRole('heading',{name:'Histórico de Vistorias'});}
describe('fluxo de vistorias com banco IndexedDB',()=>{
 it('troca registra antes/depois, volta sem perder dados e finaliza direto no parecer',async()=>{
  render(<App/>);
  await user.type(screen.getByPlaceholderText('Nome do Condomínio'),'TESTE TROCA');
  await user.type(screen.getByPlaceholderText('Ex: 132'),'301');
  await user.selectOptions(document.querySelector('select')!,'Troca de Equipamento');
  await user.selectOptions(document.querySelectorAll('select')[1],'Troca Completa');
  await user.click(screen.getByRole('button',{name:'Iniciar Vistoria'}));
  await user.type(screen.getByLabelText('Série do medidor retirado'),'ANTIGO');
  await user.type(screen.getByLabelText('Série do medidor instalado'),'NOVO');
  await user.type(screen.getByLabelText('Série do transmissor retirado'),'123');
  await user.type(screen.getByLabelText('Série do transmissor instalado'),'456');
  await user.type(screen.getByLabelText('Leitura antes da troca (m³)'),'12.5');
  await user.type(screen.getByLabelText('Leitura depois da troca (m³)'),'0');
  await user.click(screen.getByRole('button',{name:'Avançar para Parecer'}));
  expect(screen.getByRole('heading',{name:'Parecer Técnico & Assinaturas'})).toBeTruthy();
  await user.click(screen.getByRole('button',{name:'Voltar ao Passo Anterior'}));
  expect(screen.getByLabelText('Série do medidor instalado')).toHaveValue('NOVO');
  await user.click(screen.getByRole('button',{name:'Avançar para Parecer'}));
  await finish();
  const saved=(await db.vistorias.toArray())[0];
  expect(saved.tipo_vistoria).toBe('Troca de Equipamento');
  expect(saved.trocas).toEqual([{utilidade:'AF',medidor_antes:'ANTIGO',medidor_depois:'NOVO',transmissor_antes:'123',transmissor_depois:'456',leitura_antes:'12.5',leitura_depois:'0'}]);
 });

 it('salva duas consecutivas, com IDs/horários independentes e histórico preservado',async()=>{
 render(<App/>);await start();await finish();const first=(await db.vistorias.toArray())[0];
 vi.setSystemTime(new Date('2026-11-14T15:30:00Z'));await user.click(screen.getByRole('button',{name:'Nova Vistoria'}));await start('102');await finish();
 const all=await db.vistorias.toArray();expect(all).toHaveLength(2);expect(all[0]).toEqual(first);expect(all[1].inspection_uid).not.toBe(first.inspection_uid);expect(all[1].data).toBe('2026-11-14');expect(all[1].hora).not.toBe(first.hora);
 cleanup();render(<App/>);await user.click(screen.getByRole('button',{name:'Ver Histórico'}));await screen.findByText('102');
 });
 it('validação informa parecer ausente sem travar',async()=>{render(<App/>);await start();await user.click(screen.getByRole('button',{name:'Finalizar Vistoria'}));expect(screen.getByRole('alert')).toHaveTextContent('parecer técnico');expect(await db.vistorias.count()).toBe(0);await finish();});
 it('clique duplo grava só uma vez',async()=>{render(<App/>);await start();await user.type(document.querySelector('textarea')!,'Teste');await user.dblClick(screen.getByRole('button',{name:'Finalizar Vistoria'}));await screen.findByRole('heading',{name:'Histórico de Vistorias'});expect(await db.vistorias.count()).toBe(1);});
 it('falha de persistência preserva dados e permite tentar novamente',async()=>{render(<App/>);await start();await user.type(document.querySelector('textarea')!,'Não perder');vi.spyOn(db.vistorias,'put').mockRejectedValueOnce(new Error('QuotaExceededError'));await user.click(screen.getByRole('button',{name:'Finalizar Vistoria'}));await screen.findByRole('alert');expect(document.querySelector('textarea')).toHaveValue('Não perder');await user.click(screen.getByRole('button',{name:'Finalizar Vistoria'}));await screen.findByRole('heading',{name:'Histórico de Vistorias'});expect(await db.vistorias.count()).toBe(1);});
 it('editar preserva data e Nova não reutiliza ID',async()=>{render(<App/>);await start();await finish();const old=(await db.vistorias.toArray())[0];await user.click(screen.getByRole('button',{name:'Editar'}));expect(document.querySelector('input[type=date]')).toHaveValue(old.data);vi.setSystemTime(new Date('2026-11-15T16:00:00Z'));await user.click(screen.getByRole('button',{name:'Iniciar Vistoria'}));await user.click(screen.getByRole('button',{name:'Avançar',exact:true}));await user.click(screen.getByRole('button',{name:'Avançar',exact:true}));await user.click(screen.getByRole('button',{name:'Finalizar Vistoria'}));await screen.findByRole('heading',{name:'Histórico de Vistorias'});expect((await db.vistorias.toArray())[0].hora).toBe(old.hora);expect(await db.vistorias.count()).toBe(1);});
 it('cancelar Nova mantém formulário e confirmar cria limpo',async()=>{render(<App/>);await user.type(screen.getByPlaceholderText('Nome do Condomínio'),'Manter');const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);await user.click(screen.getByRole('button',{name:'Nova Vistoria'}));expect(screen.getByPlaceholderText('Nome do Condomínio')).toHaveValue('Manter');confirm.mockReturnValue(true);await user.click(screen.getByRole('button',{name:'Nova Vistoria'}));await waitFor(()=>expect(screen.getByPlaceholderText('Nome do Condomínio')).toHaveValue(''));});
});
