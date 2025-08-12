import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Cliente para componentes (App Router). Persistência de sessão é habilitada por padrão.
export const supabase = createClientComponentClient();