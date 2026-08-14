import { redirect } from 'next/navigation';
import { AssistantChat } from '@/components/assistant/assistant-chat';
import { listAssistantThreads } from '@/lib/assistant/store';
import { getSessionProfile } from '@/lib/auth/session';

export default async function AssistantPage() {
  const session = await getSessionProfile();
  if (!session) redirect('/login');
  const firstName = session.profile.fullName.split(' ')[0] || session.profile.fullName;
  const history = await listAssistantThreads();
  return (
    <AssistantChat
      firstName={firstName}
      initialThread={history.data.current}
      initialThreads={history.data.threads}
    />
  );
}
