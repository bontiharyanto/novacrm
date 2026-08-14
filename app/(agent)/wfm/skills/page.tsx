import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { listAssignableAgents } from '@/lib/profiles/actions';
import { listAgentSkills, listSkills } from '@/lib/wfm/actions';
import { WfmSkills } from '@/components/wfm/wfm-skills';

export default async function WfmSkillsPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) redirect('/dashboard');
  const [skills, agentSkills, staff] = await Promise.all([listSkills(), listAgentSkills(), listAssignableAgents()]);
  return (
    <WfmSkills
      skills={skills}
      agentSkills={agentSkills}
      staff={staff.map((agent) => ({ id: agent.id, fullName: agent.fullName }))}
      canEdit={canRole(session.profile.role, 'create', 'Wfm')}
    />
  );
}
