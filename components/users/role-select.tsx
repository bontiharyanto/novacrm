import { Select } from '@/components/ui/select';
import { useI18n } from '@/components/layout/preferences-provider';
import { localizedRole, localizedRoleHint } from '@/lib/i18n/labels';
import { assignableRoles, type AppRole } from '@/lib/rbac/roles';

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
  const { t } = useI18n();
  const options = assignableRoles(actorRole);
  const current = options.includes(value) ? options : [value, ...options];
  return (
    <Select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as AppRole)}>
      {current.map((role) => (
        <option key={role} value={role}>
          {localizedRole(t, role)} — {localizedRoleHint(t, role)}
        </option>
      ))}
    </Select>
  );
}
