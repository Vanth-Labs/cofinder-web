import { redirect } from 'next/navigation';

// Keep existing bookmarks and notification links pointing to the unified inbox.
export default function MatchesPage() {
  redirect('/chat?tab=individual');
}
