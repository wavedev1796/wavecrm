import { ArrowUpRight, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const stages = [
  { name: 'Contactado', color: '#C9C7BC', count: 12, deals: [['Comercial Andina', '$4.200', 'EG'], ['Distribuidora Sur', '$2.800', 'ZM']] },
  { name: 'Negociación', color: '#E0B15A', count: 9, deals: [['Textiles Pichincha', '$12.500', 'EG'], ['Agro Manabí', '$6.900', 'EG']] },
  { name: 'Propuesta', color: '#6F9FD8', count: 7, deals: [['Farmacia Vida', '$9.300', 'RM'], ['Grupo Horizonte', '$7.100', 'EG']] },
  { name: 'Ganado', color: '#2F6F8F', count: 9, deals: [['Constructora GYE', '$8.100', 'ZM'], ['Novatech Ecuador', '$5.700', 'RM']] },
];

export default function PipelinePage() {
  return (
    <>
      <section className="page-actions">
        <div>
          <Badge>Pipeline principal</Badge>
          <p>Última actualización hace 4 minutos</p>
        </div>
        <Button><Plus />Nuevo negocio</Button>
      </section>

      <section className="kpi-grid" aria-label="Resumen comercial">
        <Card className="kpi-card"><span>Negocios abiertos</span><strong>37</strong><small><ArrowUpRight /> 8% este mes</small></Card>
        <Card className="kpi-card"><span>Valor del pipeline</span><strong>$84.5k</strong><small><ArrowUpRight /> 12% este mes</small></Card>
        <Card className="kpi-card kpi-card--accent"><span>Ganados este mes</span><strong>$15.9k</strong><small>69% de la meta mensual</small></Card>
      </section>

      <section className="pipeline-board" aria-label="Etapas del pipeline">
        {stages.map((stage) => (
          <div className="pipeline-column" key={stage.name}>
            <header><h2><i style={{ background: stage.color }} />{stage.name}</h2><span>{stage.count}</span></header>
            {stage.deals.map(([company, amount, owner], index) => (
              <Card className={stage.name === 'Negociación' && index === 0 ? 'deal-card deal-card--featured' : 'deal-card'} key={company}>
                <div><strong>{company}</strong><small>{index === 0 ? 'Cierre estimado · 18 sep' : 'Seguimiento pendiente'}</small></div>
                <footer><b>{amount}</b><span className="avatar avatar--small">{owner}</span></footer>
              </Card>
            ))}
            <button className="add-deal"><Plus /> Añadir negocio</button>
          </div>
        ))}
      </section>
    </>
  );
}

