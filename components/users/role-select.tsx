import { Select } from '@/components/ui/select';
import { ROLE_HINT, ROLE_LABEL, assignableRoles, type AppRole } from '@/lib/rbac/roles';

export function RoleSelect({
  value,
  onChange,
  actorRole,
  id,
  disabled,
}: {
  value: AppRole;
  onChange: (role: AppRole) => void;
  actorRole: AppRole;
  id?: string;
  disabled?: boolean;
}) {
  const options = assignableRoles(actorRole);
  const current = options.includes(value) ? options : [value, ...options];
  return (
    <Select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as AppRole)}>
      {current.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABEL[role]} — {ROLE_HINT[role]}
        </option>
      ))}
    </Select>
  );
}
