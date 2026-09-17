import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import Home, { LoginScreen } from "./pages/Home";

function LoadingScreen() {
  return <div className="grid min-h-screen place-items-center bg-[#102e38]"><div className="flex items-center gap-3 text-[12px] font-bold text-white"><Loader2 size={18} className="animate-spin text-[#9dd8c7]" />Checking secure session…</div></div>;
}

export default function App() {
  const auth = useAuth();
  const workspace = trpc.workspace.me.useQuery(undefined, { enabled: auth.isAuthenticated, retry: false });
  if (auth.loading || (auth.isAuthenticated && workspace.isLoading)) return <LoadingScreen />;
  if (!auth.isAuthenticated || !auth.user) return <LoginScreen />;
  if (workspace.error) return <div className="grid min-h-screen place-items-center bg-[#f4f8f6] p-6 text-center"><div><p className="font-display text-[20px] font-extrabold text-[#173842]">Workspace could not load</p><p className="mt-2 text-[12px] text-slate-500">{workspace.error.message}</p><button onClick={() => workspace.refetch()} className="mt-5 rounded-xl bg-[#173f47] px-4 py-2.5 text-[11px] font-bold text-white">Try again</button></div></div>;
  return <Home user={auth.user} memberships={workspace.data?.memberships ?? []} onLogout={auth.logout} />;
}
