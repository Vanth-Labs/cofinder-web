'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';

import { useRequireAuth } from '@/hooks/use-require-auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/ui/image-upload';
import { MultiImageUpload } from '@/components/ui/multi-image-upload';

const MAX_GALLERY = 6;

const STAGES = ['IDEA', 'PROTOTYPE', 'MVP', 'REVENUE'] as const;

const PRESET_CATEGORIES = [
  'AI', 'Fintech', 'EdTech', 'HealthTech', 'E-commerce',
  'SaaS', 'Gaming', 'Social', 'Sostenibilidad', 'Logística',
  'Real Estate', 'Agro', 'Seguridad', 'IoT', 'Entretenimiento',
];

const ROLES_OPTIONS = [
  'Backend Developer', 'Frontend Developer', 'Mobile Developer',
  'Designer', 'Product Manager', 'Marketing', 'Sales',
  'Data Scientist', 'DevOps', 'Finance', 'Legal',
];

export default function NewProjectPage() {
  const router = useRouter();
  const { hasHydrated, isAuthenticated } = useRequireAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState<string>('IDEA');
  const [categories, setCategories] = useState<string[]>([]);
  const [customCat, setCustomCat] = useState('');
  const [budget, setBudget] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState<'USD' | 'PEN'>('USD');
  const [rolesNeeded, setRolesNeeded] = useState<string[]>([]);
  const [coverKey, setCoverKey] = useState<string | null>(null);
  const [mediaKeys, setMediaKeys] = useState<string[]>([]);

  const toggleCategory = (cat: string) =>
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );

  const addCustomCategory = () => {
    const trimmed = customCat.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories((prev) => [...prev, trimmed]);
    }
    setCustomCat('');
  };

  const toggleRole = (role: string) =>
    setRolesNeeded((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );

  const { mutate, isPending, error } = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/ideas', {
        title,
        description,
        stage,
        categories,
        budget: budget ? parseFloat(parseFloat(budget).toFixed(2)) : undefined,
        budgetCurrency: budget ? budgetCurrency : undefined,
        coverKey: coverKey ?? undefined,
        mediaKeys,
        openings: rolesNeeded.map((title) => ({ title })),
      });
      return data;
    },
    onSuccess: () => router.push('/ideas/mine'),
  });

  if (!hasHydrated || !isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold">Nueva idea</h1>
          <p className="text-sm text-muted-foreground">Puedes tener varias ideas activas.</p>
        </div>

        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => { e.preventDefault(); mutate(); }}
        >
          <div className="flex flex-col gap-1.5">
            <Label>Foto principal</Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Es la que se ve en la card cuando otros hacen swipe.
            </p>
            <ImageUpload
              value={coverKey}
              onChange={setCoverKey}
              target="project"
              aspect="aspect-[4/5]"
              className="max-w-56"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Más fotos (opcional)</Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Se ven en el detalle de la idea. Hasta {MAX_GALLERY}.
            </p>
            <MultiImageUpload
              value={mediaKeys}
              onChange={setMediaKeys}
              target="project"
              max={MAX_GALLERY}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Nombre *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={100} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required minLength={20} maxLength={1000} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Etapa *</Label>
            <div className="flex gap-2 flex-wrap">
              {STAGES.map((s) => (
                <Badge key={s} variant={stage === s ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setStage(s)}>
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Categorías *</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_CATEGORIES.map((cat) => (
                <Badge key={cat} variant={categories.includes(cat) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleCategory(cat)}>
                  {cat}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value)}
                placeholder="Otra categoría..."
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomCategory(); } }}
              />
              <Button type="button" variant="outline" onClick={addCustomCategory}>+</Button>
            </div>
            {categories.filter((c) => !PRESET_CATEGORIES.includes(c)).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.filter((c) => !PRESET_CATEGORIES.includes(c)).map((c) => (
                  <Badge key={c} variant="default" className="cursor-pointer" onClick={() => toggleCategory(c)}>
                    {c} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget">Presupuesto (opcional)</Label>
            <div className="flex gap-2">
              <select
                value={budgetCurrency}
                onChange={(e) => setBudgetCurrency(e.target.value as 'USD' | 'PEN')}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="USD">USD ($)</option>
                <option value="PEN">PEN (S/)</option>
              </select>
              <Input id="budget" type="number" min={0.01} step={0.01} value={budget} onChange={(e) => setBudget(e.target.value)} className="flex-1" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Convocatorias: roles que buscas *</Label>
            <div className="flex flex-wrap gap-2">
              {ROLES_OPTIONS.map((r) => (
                <Badge key={r} variant={rolesNeeded.includes(r) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleRole(r)}>
                  {r}
                </Badge>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">Error al crear la idea. Verifica los campos.</p>}

          <Button type="submit" disabled={isPending || categories.length === 0 || rolesNeeded.length === 0}>
            {isPending ? 'Creando...' : 'Crear idea'}
          </Button>
        </form>
      </div>
    </main>
  );
}
