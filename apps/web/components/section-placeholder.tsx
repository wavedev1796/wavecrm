import { Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

export function SectionPlaceholder({
  title,
  description,
}: Readonly<{ title: string; description: string }>) {
  return (
    <Card className="empty-state">
      <span className="empty-mark">W</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <Button disabled><Plus />Disponible en el próximo sprint</Button>
    </Card>
  );
}

