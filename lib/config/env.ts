const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;

export function getEnv(name: (typeof requiredEnv)[number]) {
  const value = process.env[name];
  if (!value) {
    return ''; 
  }
  return value;
}

export function validateEnv() {
  const missing = requiredEnv.filter((key) => !process.env[key]);

  return {
    ok: missing.length === 0,
    missing,
  };
}
