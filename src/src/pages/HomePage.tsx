import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

/**
 * The scaffold's only page, and the pattern every other page copies.
 *
 * Two things about this file are load-bearing rather than decorative:
 * 1. It has a `default` export, so `App.tsx` can `React.lazy` it.
 * 2. It lives in `src/pages/`, so the directory already exists and an agent
 *    adding a second page has an obvious place to put it instead of growing
 *    `App.tsx` inline.
 *
 * Replace the body with the app's real home surface - compose `ui/` primitives
 * with semantic tokens (`bg-card`, `text-muted-foreground`), never raw hex.
 */
export default function HomePage() {
  return (
                            <section className="mx-auto flex w-full flex-col gap-6 p-6">
                        <header className="flex flex-col gap-2">
        header className="flex flex-col gap-2">
        header className="flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Home</h1>
                <p className="text-muted-foreground text-sm">
          Replace this page with the app's real home surface.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Add your first section</CardTitle>
          <CardDescription>
            Each route lives in its own file under <code>src/pages/</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-muted-foreground text-sm">
          <p>Build the surface here, then add sibling pages and register them in <code>src/App.tsx</code>.</p>
                              <Button asChild className="w-fit">Button asChild className="w-fit"><Link to="/draft-workbench">Mở biên tập bản nháp tập bản nháp tập bản nháp <ArrowUpRight data-icon="inline-end" /></Link></Button>
        </CardContent>
      </Card>
    </section>
  );
}
