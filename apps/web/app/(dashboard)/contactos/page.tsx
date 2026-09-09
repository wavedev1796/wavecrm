import { Filter, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table } from '@/components/ui/table';

const contacts = [
  ['MC', 'María Cordero', 'maria.cordero@andina.ec', 'Comercial Andina', 'Pichincha', 'Cliente'],
  ['JV', 'Jorge Vera', 'jvera@distribsur.com', 'Distribuidora Sur', 'Guayas', 'Activo'],
  ['AL', 'Ana López', 'ana.lopez@agromanabi.ec', 'Agro Manabí', 'Manabí', 'Prospecto'],
  ['RP', 'Ricardo Paz', 'rpaz@farmaciavida.ec', 'Farmacia Vida', 'Azuay', 'Cliente'],
  ['CS', 'Carla Suárez', 'csuarez@construgye.com', 'Constructora GYE', 'Guayas', 'Nuevo'],
];

export default function ContactsPage() {
  return (
    <Card className="data-card">
      <div className="table-toolbar">
        <label className="table-search"><Search /><span className="sr-only">Buscar contacto</span><Input placeholder="Nombre, empresa o correo…" /></label>
        <div><Button variant="secondary"><Filter />Filtrar</Button><Button><Plus />Nuevo contacto</Button></div>
      </div>
      <Table>
        <thead><tr><th>Contacto</th><th>Empresa</th><th>Provincia</th><th>Estado</th><th>Responsable</th></tr></thead>
        <tbody>{contacts.map(([initials, name, email, company, province, status]) => (
          <tr key={email}>
            <td><div className="contact-cell"><span className="avatar">{initials}</span><span><strong>{name}</strong><small>{email}</small></span></div></td>
            <td>{company}</td><td>{province}</td>
            <td><Badge tone={status === 'Activo' ? 'success' : status === 'Prospecto' ? 'warning' : status === 'Nuevo' ? 'neutral' : 'blue'}>{status}</Badge></td>
            <td><span className="avatar avatar--small">EG</span></td>
          </tr>
        ))}</tbody>
      </Table>
      <footer className="table-footer"><span>Mostrando 1–5 de 248</span><div><Button variant="secondary" disabled>Anterior</Button><Button variant="secondary">Siguiente</Button></div></footer>
    </Card>
  );
}

