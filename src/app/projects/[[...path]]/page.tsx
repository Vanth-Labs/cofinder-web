import { redirect } from 'next/navigation';
export default async function LegacyProjects({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  redirect(`/ideas/${path.map(encodeURIComponent).join('/')}`);
}
