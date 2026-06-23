import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

/** Placeholder page — wire to the corresponding API module next. */
export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-neutral-500">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-neutral-500">Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-400">
            This view is scaffolded. Connect it to the API module using the typed client in{' '}
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">shared/api/client</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
