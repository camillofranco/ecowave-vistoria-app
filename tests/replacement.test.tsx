import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReplacementForm from '../src/components/ReplacementForm';
vi.mock('../src/components/CameraInput',()=>({default:()=>null}));
afterEach(cleanup);
it('troca de transmissor não pede medidor; preserva outras utilidades',async()=>{
 const onChange=vi.fn();render(<ReplacementForm subtipo="Troca de Transmissor - Gás" value={[{utilidade:'AF',medidor_antes:'ANTIGO'}]} onChange={onChange}/>);
 expect(screen.queryByLabelText('Série do medidor retirado')).toBeNull();
 await userEvent.type(screen.getByLabelText('Série do transmissor retirado'),'1');
 expect(onChange).toHaveBeenLastCalledWith([{utilidade:'AF',medidor_antes:'ANTIGO'},{utilidade:'Gás',transmissor_antes:'1'}]);
 expect(screen.getByLabelText('Leitura antes da troca (m³)')).toBeTruthy();
});
it('troca completa pede séries anteriores e novas de ambos equipamentos',()=>{
 render(<ReplacementForm subtipo="Troca Completa - AF" onChange={()=>{}}/>);
 for(const label of ['Série do medidor retirado','Série do medidor instalado','Série do transmissor retirado','Série do transmissor instalado']) expect(screen.getByLabelText(label)).toBeTruthy();
 expect(screen.queryByText('Ponto de Consumo')).toBeNull();
});
