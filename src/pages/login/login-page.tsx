import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { useAuthStore } from '@/shared/api/auth-store';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

const ROLE_PRESETS = ['it-admin', 'security', 'hr', 'manager', 'employee'];

export function LoginPage() {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const [email, setEmail] = useState('admin@opshub.dev');
  const [roles, setRoles] = useState<string[]>(['it-admin']);
  const [loading, setLoading] = useState(false);

  const toggleRole = (role: string) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await api.POST('/v1/auth/dev-login', {
      body: { email, name: email.split('@')[0], roles },
    });
    setLoading(false);
    if (error || !data) {
      toast.error('Dev login failed. Is the API running on :3000?');
      return;
    }
    setToken(data.accessToken);
    navigate({ to: '/' });
  }

  return (
    <div className="flex h-full items-center justify-center bg-neutral-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">OpsHub — Dev Login</CardTitle>
          <p className="text-xs text-neutral-500">
            Scaffold auth. Production uses Entra ID (OIDC).
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-600">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-600">Roles</label>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_PRESETS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={
                      'rounded-full border px-2.5 py-1 text-xs ' +
                      (roles.includes(role)
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-white text-neutral-600')
                    }
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
