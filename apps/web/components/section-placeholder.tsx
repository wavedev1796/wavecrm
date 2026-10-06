import { Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { COMUN, MARCA } from '@/content/comun';

export function SectionPlaceholder({
  title,
  description,
}: Readonly<{ title: string; description: string }>) {
  return (
    <Card className="empty-state">
      <span className="empty-mark">{MARCA.inicial}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <Button disabled><Plus />{COMUN.proximoSprint}</Button>
    </Card>
  );
}

